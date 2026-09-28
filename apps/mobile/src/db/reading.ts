/**
 * Reading: someone starts a title, updates how far they got (page ↔ percent kept in step when the
 * title has a page count; volumes for sets), and ends with finished / partly read / stopped, with
 * an optional rating and note. Every update is logged for streaks, goals and points.
 * Challenges and the points settings are the parents' (the server only accepts them from admins).
 */
import { MOTIVATION_ID } from '@maktabatna/shared';
import { randomUUID } from 'expo-crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from './client';
import { created } from './mutations';
import { books, challenges, motivation, readingLogs, readings, userSettings } from './schema';

export type ReadingStatus = 'reading' | 'finished' | 'partial' | 'abandoned';

const clock = (fields: string[], now: number) =>
  sql`json_patch(field_clock, ${JSON.stringify(Object.fromEntries(fields.map((f) => [f, now])))})`;

/** Local calendar day, YYYY-MM-DD. */
export function localDay(ms = Date.now()): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Keeps page and percent in step. Given what the person entered (a page, a percent, or volumes
 * done for a set), returns both, bounded to the book.
 */
export function syncProgress(
  input: { page?: number | null; percent?: number | null; volumesDone?: number | null },
  book: { pageCount: number | null; totalVolumes: number },
): { page: number | null; percent: number; volumesDone: number | null } {
  // For a set, pageCount is per volume, so the whole set is pageCount × volumes.
  const perVolume = book.pageCount && book.pageCount > 0 ? book.pageCount : null;
  const total = perVolume ? perVolume * Math.max(1, book.totalVolumes) : null;
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
  if (input.volumesDone != null && book.totalVolumes > 1) {
    const v = clamp(Math.round(input.volumesDone), book.totalVolumes);
    return { volumesDone: v, percent: (v / book.totalVolumes) * 100, page: perVolume ? v * perVolume : null };
  }
  if (input.page != null && total) {
    const page = clamp(Math.round(input.page), total);
    return { page, percent: (page / total) * 100, volumesDone: null };
  }
  const percent = clamp(input.percent ?? 0, 100);
  return { percent, page: total ? Math.round((percent / 100) * total) : null, volumesDone: null };
}

/** Starts reading a title, or returns the read already in progress. */
export function startReading(bookId: string, userId: string): string {
  const now = Date.now();
  return db.transaction((tx) => {
    const open = tx
      .select({ id: readings.id })
      .from(readings)
      .where(and(eq(readings.bookId, bookId), eq(readings.userId, userId), eq(readings.status, 'reading'), isNull(readings.deletedAt)))
      .get();
    if (open) return open.id;
    const row = { ...created(userId, now, ['status', 'startedAt', 'percent']), userId, bookId, status: 'reading' as const, startedAt: now, percent: 0 };
    tx.insert(readings).values(row).run();
    return row.id;
  });
}

/** Saves progress; logs the pages read since the last update. */
export function updateProgress(readingId: string, input: { page?: number | null; percent?: number | null; volumesDone?: number | null }, userId: string) {
  const now = Date.now();
  db.transaction((tx) => {
    const r = tx.select().from(readings).where(eq(readings.id, readingId)).get();
    if (!r || r.userId !== userId) return;
    const b = tx.select({ pageCount: books.pageCount, totalVolumes: books.totalVolumes }).from(books).where(eq(books.id, r.bookId)).get();
    if (!b) return;
    const next = syncProgress(input, b);
    // Progress kept by percent before the page count was known still counts as pages already read.
    const before = r.page ?? syncProgress({ percent: r.percent }, b).page ?? 0;
    const pagesRead = next.page != null ? Math.max(0, next.page - before) : 0;
    tx.update(readings)
      .set({ ...next, updatedAt: now, updatedBy: userId, fieldClock: clock(['page', 'percent', 'volumesDone'], now) })
      .where(eq(readings.id, readingId))
      .run();
    tx.insert(readingLogs).values({ id: randomUUID(), userId, readingId, bookId: r.bookId, at: now, day: localDay(now), pages: pagesRead, percent: next.percent }).run();
  });
}

/** Ends a read: finished (100%), partly read, or stopped; with an optional 1–5 rating and note. */
export function finishReading(
  readingId: string,
  status: Exclude<ReadingStatus, 'reading'>,
  review: { rating: number | null; note: string | null },
  userId: string,
) {
  const now = Date.now();
  db.transaction((tx) => {
    const r = tx.select().from(readings).where(eq(readings.id, readingId)).get();
    if (!r || r.userId !== userId) return;
    const b = tx.select({ pageCount: books.pageCount, totalVolumes: books.totalVolumes }).from(books).where(eq(books.id, r.bookId)).get();
    const done = status === 'finished' && b ? syncProgress(b.totalVolumes > 1 ? { volumesDone: b.totalVolumes } : { percent: 100 }, b) : null;
    const before = r.page ?? (b ? (syncProgress({ percent: r.percent }, b).page ?? 0) : 0);
    const pagesRead = done?.page != null ? Math.max(0, done.page - before) : 0;
    tx.update(readings)
      .set({
        ...(done ?? {}),
        status,
        finishedAt: now,
        rating: review.rating,
        note: review.note?.trim() || null,
        updatedAt: now,
        updatedBy: userId,
        fieldClock: clock(['status', 'finishedAt', 'rating', 'note', 'page', 'percent', 'volumesDone'], now),
      })
      .where(eq(readings.id, readingId))
      .run();
    if (done)
      tx.insert(readingLogs).values({ id: randomUUID(), userId, readingId, bookId: r.bookId, at: now, day: localDay(now), pages: pagesRead, percent: 100 }).run();
  });
}

/** Changes the rating/note of a finished read. */
export function reviewReading(readingId: string, review: { rating: number | null; note: string | null }, userId: string) {
  const now = Date.now();
  db.update(readings)
    .set({ rating: review.rating, note: review.note?.trim() || null, updatedAt: now, updatedBy: userId, fieldClock: clock(['rating', 'note'], now) })
    .where(and(eq(readings.id, readingId), eq(readings.userId, userId)))
    .run();
}

/** Removes a read started by mistake. */
export function deleteReading(readingId: string, userId: string) {
  const now = Date.now();
  db.update(readings)
    .set({ deletedAt: now, updatedAt: now, updatedBy: userId, fieldClock: clock(['deletedAt'], now) })
    .where(and(eq(readings.id, readingId), eq(readings.userId, userId)))
    .run();
}

/** Sets a title's page count (from the reading sheet); progress pages follow. */
export function setPageCount(bookId: string, pageCount: number | null, userId: string) {
  const now = Date.now();
  db.update(books)
    .set({ pageCount: pageCount && pageCount > 0 ? Math.round(pageCount) : null, updatedAt: now, updatedBy: userId, fieldClock: clock(['pageCount'], now) })
    .where(eq(books.id, bookId))
    .run();
}

export type SettingsPatch = Partial<{ readingPublic: boolean; dailyPagesGoal: number | null; monthlyBooksGoal: number | null; reminderTime: string | null }>;

/** Saves this person's reading preferences (one row per user, id = user id). */
export function saveSettings(userId: string, patch: SettingsPatch) {
  const now = Date.now();
  const fields = Object.keys(patch);
  db.transaction((tx) => {
    const has = tx.select({ id: userSettings.id }).from(userSettings).where(eq(userSettings.id, userId)).get();
    if (has) tx.update(userSettings).set({ ...patch, updatedAt: now, updatedBy: userId, fieldClock: clock(fields, now) }).where(eq(userSettings.id, userId)).run();
    else tx.insert(userSettings).values({ ...created(userId, now, fields), id: userId, ...patch }).run();
  });
}

export type ChallengeInput = {
  title: string;
  description: string | null;
  kind: 'books' | 'pages' | 'category';
  target: number;
  categoryId: string | null;
  startsAt: number;
  endsAt: number;
  reward: string | null;
};

/** Parents only (the server refuses others). */
export function saveChallenge(id: string | null, input: ChallengeInput, userId: string) {
  const now = Date.now();
  const clean = { ...input, title: input.title.trim(), description: input.description?.trim() || null, reward: input.reward?.trim() || null };
  if (id) db.update(challenges).set({ ...clean, updatedAt: now, updatedBy: userId, fieldClock: clock(Object.keys(clean), now) }).where(eq(challenges.id, id)).run();
  else db.insert(challenges).values({ ...created(userId, now, Object.keys(clean)), ...clean }).run();
}

export function deleteChallenge(id: string, userId: string) {
  const now = Date.now();
  db.update(challenges).set({ deletedAt: now, updatedAt: now, updatedBy: userId, fieldClock: clock(['deletedAt'], now) }).where(eq(challenges.id, id)).run();
}

/** Parents only: points per page / per finished title, and the reward for each badge. */
export function saveMotivation(patch: Partial<{ pointsPerPage: number; pointsPerBook: number; badgeRewards: Record<string, string> }>, userId: string) {
  const now = Date.now();
  const { badgeRewards, ...rest } = patch;
  const set = { ...rest, ...(badgeRewards ? { badgeRewards: JSON.stringify(badgeRewards) } : {}) };
  db.update(motivation)
    .set({ ...set, updatedAt: now, updatedBy: userId, fieldClock: clock(Object.keys(set), now) })
    .where(eq(motivation.id, MOTIVATION_ID))
    .run();
}

/** Latest read of a title by this person (any status). */
export function myReadingOfQuery(bookId: string, userId: string) {
  return db
    .select()
    .from(readings)
    .where(and(eq(readings.bookId, bookId), eq(readings.userId, userId), isNull(readings.deletedAt)))
    .orderBy(desc(readings.startedAt))
    .limit(1);
}
