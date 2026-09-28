/** Reads for the reading screens. Stats are computed from these in lib/reading-stats. */
import { MOTIVATION_ID } from '@maktabatna/shared';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from './client';
import { books, challenges, motivation, readingLogs, readings, userSettings, users } from './schema';

/** Every read, with what the stats need from its book. */
export const allReadingsQuery = db
  .select({
    id: readings.id,
    userId: readings.userId,
    bookId: readings.bookId,
    status: readings.status,
    startedAt: readings.startedAt,
    finishedAt: readings.finishedAt,
    page: readings.page,
    percent: readings.percent,
    volumesDone: readings.volumesDone,
    rating: readings.rating,
    note: readings.note,
    title: books.title,
    totalVolumes: books.totalVolumes,
    pageCount: books.pageCount,
    categoryId: books.categoryId,
  })
  .from(readings)
  .innerJoin(books, eq(books.id, readings.bookId))
  .where(and(isNull(readings.deletedAt), isNull(books.deletedAt)))
  .orderBy(desc(readings.startedAt));

export const allLogsQuery = db
  .select({ userId: readingLogs.userId, day: readingLogs.day, pages: readingLogs.pages, at: readingLogs.at })
  .from(readingLogs);

/** The family, with each person's reading privacy and goals. */
export const readersQuery = db
  .select({
    id: users.id,
    name: users.displayName,
    readingPublic: sql<number>`coalesce(${userSettings.readingPublic}, 1)`,
    dailyPagesGoal: userSettings.dailyPagesGoal,
    monthlyBooksGoal: userSettings.monthlyBooksGoal,
    reminderTime: userSettings.reminderTime,
  })
  .from(users)
  .leftJoin(userSettings, eq(userSettings.id, users.id))
  .where(and(isNull(users.deletedAt), sql`${users.id} != '75abd6bf-dc41-560b-9b88-e4a380b6dc2d'`));

export const challengesQuery = db.select().from(challenges).where(isNull(challenges.deletedAt)).orderBy(desc(challenges.endsAt));

export const motivationQuery = db.select().from(motivation).where(eq(motivation.id, MOTIVATION_ID));

/** Who read a title (for its page), newest first. */
export function bookReadersQuery(bookId: string) {
  return db
    .select({
      id: readings.id,
      userId: readings.userId,
      name: users.displayName,
      readingPublic: sql<number>`coalesce(${userSettings.readingPublic}, 1)`,
      status: readings.status,
      startedAt: readings.startedAt,
      finishedAt: readings.finishedAt,
      percent: readings.percent,
      rating: readings.rating,
      note: readings.note,
    })
    .from(readings)
    .leftJoin(users, eq(users.id, readings.userId))
    .leftJoin(userSettings, eq(userSettings.id, readings.userId))
    .where(and(eq(readings.bookId, bookId), isNull(readings.deletedAt)))
    .orderBy(asc(sql`${readings.status} != 'reading'`), desc(readings.startedAt));
}
