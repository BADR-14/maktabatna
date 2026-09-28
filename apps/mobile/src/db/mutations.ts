/**
 * Every write the app makes to the catalogue. Each one runs in a single synchronous transaction
 * (expo-sqlite is synchronous underneath, so the whole change is atomic), stamps who/when, bumps
 * the per-field clocks that sync will merge on, records old values in change_log, and keeps the
 * search index (books_fts) in step. Deletes are soft: rows keep `deleted_at` so the trash can
 * restore them.
 */
import { normalizeArabic, searchIndexText, type PersonRole } from '@maktabatna/shared';
import { randomUUID } from 'expo-crypto';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from './client';
import { bookPersons, books, changeLog, copies, loans, persons, users, volumes } from './schema';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PersonInput = { name: string; role: PersonRole; deathYearHijri?: number | null };
export type BookInput = {
  title: string;
  categoryId: string | null;
  publisher: string | null;
  edition: string | null;
  totalVolumes: number;
  /** Optional; lets reading progress move between pages and percent. */
  pageCount?: number | null;
  notes: string | null;
  people: PersonInput[];
};
export type Placement = 'standing' | 'lying' | 'on_top';

const BOOK_FIELDS = ['title', 'categoryId', 'publisher', 'edition', 'totalVolumes', 'pageCount', 'notes'] as const;

/** Internal helpers, also used by catalog-io.ts. */
export function created(userId: string, now: number, fields: string[]) {
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    fieldClock: JSON.stringify(Object.fromEntries(fields.map((f) => [f, now]))),
  };
}

function bumpClock(json: string, fields: string[], now: number) {
  const clock = JSON.parse(json || '{}') as Record<string, number>;
  for (const f of fields) clock[f] = now;
  return JSON.stringify(clock);
}

export function log(tx: Tx, table: string, rowId: string, field: string, oldValue: unknown, newValue: unknown, userId: string, now: number) {
  const s = (v: unknown) => (v === null || v === undefined ? null : String(v));
  tx.insert(changeLog)
    .values({ id: randomUUID(), tableName: table, rowId, field, oldValue: s(oldValue), newValue: s(newValue), changedBy: userId, changedAt: now })
    .run();
}

/** Finds a person by normalized name, or adds them. */
export function personId(tx: Tx, p: PersonInput, userId: string, now: number): string {
  const nameNorm = normalizeArabic(p.name);
  const found = tx.select({ id: persons.id }).from(persons).where(and(eq(persons.nameNorm, nameNorm), isNull(persons.deletedAt))).get();
  if (found) return found.id;
  const row = { ...created(userId, now, ['name', 'deathYearHijri']), name: p.name.trim(), nameNorm, deathYearHijri: p.deathYearHijri ?? null };
  tx.insert(persons).values(row).run();
  return row.id;
}

export function reindex(tx: Tx, bookId: string) {
  const book = tx.select({ title: books.title, publisher: books.publisher }).from(books).where(eq(books.id, bookId)).get();
  const names = tx
    .select({ name: persons.name })
    .from(bookPersons)
    .innerJoin(persons, eq(persons.id, bookPersons.personId))
    .where(and(eq(bookPersons.bookId, bookId), isNull(bookPersons.deletedAt)))
    .all()
    .map((r) => r.name);
  tx.run(sql`delete from books_fts where book_id = ${bookId}`);
  if (book) tx.run(sql`insert into books_fts (book_id, content) values (${bookId}, ${searchIndexText(book.title, ...names, book.publisher)})`);
}

/** A position key that sorts after `last` (fractional index; see volumes.position). */
export function keyAfter(last: string | null | undefined): string {
  if (!last) return 'a0001';
  const m = /^a(\d{4})$/.exec(last);
  if (m && Number(m[1]) < 9999) return `a${String(Number(m[1]) + 1).padStart(4, '0')}`;
  return `${last}1`;
}

function lastPosition(tx: Tx, shelfId: string, row: 'front' | 'back' = 'front') {
  return tx
    .select({ p: volumes.position })
    .from(volumes)
    .where(and(eq(volumes.shelfId, shelfId), eq(volumes.row, row), isNull(volumes.deletedAt)))
    .orderBy(desc(volumes.position))
    .limit(1)
    .get()?.p;
}

export function placeVolumes(
  tx: Tx,
  copyId: string,
  shelfId: string,
  numbers: (number | null)[],
  placement: Placement,
  userId: string,
  now: number,
  row: 'front' | 'back' = 'front',
) {
  let pos = lastPosition(tx, shelfId, row);
  for (const n of numbers) {
    pos = keyAfter(pos);
    tx.insert(volumes)
      .values({ ...created(userId, now, ['shelfId', 'volumeNumber', 'placement', 'position', 'row']), copyId, shelfId, volumeNumber: n, placement, row, position: pos })
      .run();
  }
}

function setPeople(tx: Tx, bookId: string, people: PersonInput[], userId: string, now: number) {
  const wanted = people.filter((p) => p.name.trim()).map((p, i) => ({ personId: personId(tx, p, userId, now), role: p.role, sortOrder: i }));
  const current = tx.select().from(bookPersons).where(and(eq(bookPersons.bookId, bookId), isNull(bookPersons.deletedAt))).all();
  const key = (x: { personId: string; role: string }) => `${x.personId}|${x.role}`;
  const keep = new Set(wanted.map(key));
  for (const row of current) {
    if (!keep.has(key(row))) {
      tx.update(bookPersons)
        .set({ deletedAt: now, updatedAt: now, updatedBy: userId, fieldClock: bumpClock(row.fieldClock, ['deletedAt'], now) })
        .where(eq(bookPersons.id, row.id))
        .run();
      log(tx, 'book_persons', row.id, 'deletedAt', null, now, userId, now);
    }
  }
  const have = new Map(current.map((r) => [key(r), r]));
  for (const w of wanted) {
    const row = have.get(key(w));
    if (!row) {
      tx.insert(bookPersons)
        .values({ ...created(userId, now, ['personId', 'role', 'sortOrder']), bookId, ...w })
        .run();
    } else if (row.sortOrder !== w.sortOrder) {
      tx.update(bookPersons)
        .set({ sortOrder: w.sortOrder, updatedAt: now, updatedBy: userId, fieldClock: bumpClock(row.fieldClock, ['sortOrder'], now) })
        .where(eq(bookPersons.id, row.id))
        .run();
    }
  }
}

function clean(input: BookInput) {
  const t = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    title: input.title.trim(),
    categoryId: input.categoryId,
    publisher: t(input.publisher),
    edition: t(input.edition),
    totalVolumes: Math.max(1, Math.floor(input.totalVolumes || 1)),
    pageCount: input.pageCount && input.pageCount > 0 ? Math.floor(input.pageCount) : null,
    notes: t(input.notes),
  };
}

/** A new title with one copy, all its volumes placed on one shelf from the right. */
export function createBook(input: BookInput, where: { shelfId: string; placement: Placement }, userId: string): string {
  const now = Date.now();
  const fields = clean(input);
  return db.transaction((tx) => {
    const book = { ...created(userId, now, [...BOOK_FIELDS]), ...fields, titleNorm: normalizeArabic(fields.title) };
    tx.insert(books).values(book).run();
    log(tx, 'books', book.id, '*', null, 'created', userId, now);
    setPeople(tx, book.id, input.people, userId, now);
    const copy = { ...created(userId, now, ['bookId']), bookId: book.id };
    tx.insert(copies).values(copy).run();
    const n = fields.totalVolumes;
    placeVolumes(tx, copy.id, where.shelfId, n === 1 ? [null] : Array.from({ length: n }, (_, i) => i + 1), where.placement, userId, now);
    reindex(tx, book.id);
    return book.id;
  });
}

/** Saves edited details. A changed volume count adds or trashes volumes on every copy. */
export function updateBook(bookId: string, input: BookInput, userId: string) {
  const now = Date.now();
  const next = clean(input);
  db.transaction((tx) => {
    const old = tx.select().from(books).where(eq(books.id, bookId)).get();
    if (!old) throw new Error('الكتاب غير موجود');
    const changed = BOOK_FIELDS.filter((f) => old[f] !== next[f]);
    if (changed.length) {
      tx.update(books)
        .set({ ...next, titleNorm: normalizeArabic(next.title), updatedAt: now, updatedBy: userId, fieldClock: bumpClock(old.fieldClock, changed, now) })
        .where(eq(books.id, bookId))
        .run();
      for (const f of changed) log(tx, 'books', bookId, f, old[f], next[f], userId, now);
    }
    setPeople(tx, bookId, input.people, userId, now);
    if (next.totalVolumes !== old.totalVolumes) resizeSets(tx, bookId, next.totalVolumes, userId, now);
    reindex(tx, bookId);
  });
}

function resizeSets(tx: Tx, bookId: string, total: number, userId: string, now: number) {
  const live = tx.select().from(copies).where(and(eq(copies.bookId, bookId), isNull(copies.deletedAt))).all();
  for (const copy of live) {
    const vols = tx
      .select()
      .from(volumes)
      .where(and(eq(volumes.copyId, copy.id), isNull(volumes.deletedAt)))
      .orderBy(asc(volumes.volumeNumber), asc(volumes.position))
      .all();
    const renumber = (id: string, n: number | null, clock: string) =>
      tx.update(volumes)
        .set({ volumeNumber: n, updatedAt: now, updatedBy: userId, fieldClock: bumpClock(clock, ['volumeNumber'], now) })
        .where(eq(volumes.id, id))
        .run();
    const trash = (v: (typeof vols)[number]) =>
      tx.update(volumes)
        .set({ deletedAt: now, updatedAt: now, updatedBy: userId, fieldClock: bumpClock(v.fieldClock, ['deletedAt'], now) })
        .where(eq(volumes.id, v.id))
        .run();
    if (total === 1) {
      // Back to a single volume: keep the first, trash the rest.
      vols.forEach((v, i) => (i === 0 ? v.volumeNumber !== null && renumber(v.id, null, v.fieldClock) : trash(v)));
      continue;
    }
    // A single volume (number null) becomes volume 1 of the set.
    vols.forEach((v) => v.volumeNumber === null && renumber(v.id, 1, v.fieldClock));
    const numbers = new Set(vols.map((v) => v.volumeNumber ?? 1));
    vols.filter((v) => (v.volumeNumber ?? 1) > total).forEach(trash);
    const missing = Array.from({ length: total }, (_, i) => i + 1).filter((n) => !numbers.has(n));
    const lastVol = vols.at(-1);
    if (missing.length && lastVol) placeVolumes(tx, copy.id, lastVol.shelfId, missing, lastVol.placement, userId, now);
  }
}

/** Moves one copy's volumes that sit on `fromShelfId` to the end of another shelf. */
export function moveVolumes(copyId: string, fromShelfId: string, toShelfId: string, userId: string) {
  if (fromShelfId === toShelfId) return;
  const now = Date.now();
  db.transaction((tx) => {
    const vols = tx
      .select()
      .from(volumes)
      .where(and(eq(volumes.copyId, copyId), eq(volumes.shelfId, fromShelfId), isNull(volumes.deletedAt)))
      .orderBy(asc(volumes.position))
      .all();
    let pos = lastPosition(tx, toShelfId);
    for (const v of vols) {
      pos = keyAfter(pos);
      tx.update(volumes)
        .set({ shelfId: toShelfId, position: pos, row: 'front', updatedAt: now, updatedBy: userId, fieldClock: bumpClock(v.fieldClock, ['shelfId', 'position', 'row'], now) })
        .where(eq(volumes.id, v.id))
        .run();
      log(tx, 'volumes', v.id, 'shelfId', fromShelfId, toShelfId, userId, now);
    }
  });
}

/** Another physical copy of a title (a duplicate), placed on a shelf. */
export function addCopy(bookId: string, where: { shelfId: string; placement: Placement }, userId: string) {
  const now = Date.now();
  db.transaction((tx) => {
    const book = tx.select({ totalVolumes: books.totalVolumes }).from(books).where(eq(books.id, bookId)).get();
    if (!book) return;
    const copy = { ...created(userId, now, ['bookId']), bookId };
    tx.insert(copies).values(copy).run();
    const n = book.totalVolumes;
    placeVolumes(tx, copy.id, where.shelfId, n === 1 ? [null] : Array.from({ length: n }, (_, i) => i + 1), where.placement, userId, now);
  });
}

/** Moves a title, with all its copies and volumes, to the trash. Stamped with one time so restore brings back exactly these rows. */
export function trashBook(bookId: string, userId: string) {
  const now = Date.now();
  db.transaction((tx) => {
    const copyIds = tx.select({ id: copies.id }).from(copies).where(and(eq(copies.bookId, bookId), isNull(copies.deletedAt))).all().map((c) => c.id);
    const del = { deletedAt: now, updatedAt: now, updatedBy: userId, fieldClock: sql`json_set(field_clock, '$.deletedAt', cast(${now} as integer))` };
    if (copyIds.length) tx.update(volumes).set(del).where(and(inArray(volumes.copyId, copyIds), isNull(volumes.deletedAt))).run();
    tx.update(copies).set(del).where(and(eq(copies.bookId, bookId), isNull(copies.deletedAt))).run();
    tx.update(bookPersons).set(del).where(and(eq(bookPersons.bookId, bookId), isNull(bookPersons.deletedAt))).run();
    tx.update(books).set(del).where(eq(books.id, bookId)).run();
    log(tx, 'books', bookId, 'deletedAt', null, now, userId, now);
    tx.run(sql`delete from books_fts where book_id = ${bookId}`);
  });
}

/** Brings a title back from the trash with the rows that were trashed together with it. */
export function restoreBook(bookId: string, userId: string) {
  const now = Date.now();
  db.transaction((tx) => {
    const book = tx.select({ deletedAt: books.deletedAt }).from(books).where(eq(books.id, bookId)).get();
    const at = book?.deletedAt;
    if (!at) return;
    const back = { deletedAt: null, updatedAt: now, updatedBy: userId, fieldClock: sql`json_set(field_clock, '$.deletedAt', cast(${now} as integer))` };
    const copyIds = tx.select({ id: copies.id }).from(copies).where(and(eq(copies.bookId, bookId), eq(copies.deletedAt, at))).all().map((c) => c.id);
    if (copyIds.length) tx.update(volumes).set(back).where(and(inArray(volumes.copyId, copyIds), eq(volumes.deletedAt, at))).run();
    tx.update(copies).set(back).where(and(eq(copies.bookId, bookId), eq(copies.deletedAt, at))).run();
    tx.update(bookPersons).set(back).where(and(eq(bookPersons.bookId, bookId), eq(bookPersons.deletedAt, at))).run();
    tx.update(books).set(back).where(eq(books.id, bookId)).run();
    log(tx, 'books', bookId, 'deletedAt', at, null, userId, now);
    reindex(tx, bookId);
  });
}

/** Saves the file name of the user's profile photo (null removes it). */
export function setAvatar(userId: string, fileName: string | null) {
  const now = Date.now();
  db.update(users)
    .set({ avatarUri: fileName, updatedAt: now, updatedBy: userId, fieldClock: sql`json_set(field_clock, '$.avatarUri', cast(${now} as integer))` })
    .where(eq(users.id, userId))
    .run();
}

/** Lends one copy. `dueAt` is optional (epoch ms). */
export function lendCopy(copyId: string, borrower: string, dueAt: number | null, notes: string | null, userId: string) {
  const now = Date.now();
  db.transaction((tx) => {
    const row = {
      ...created(userId, now, ['copyId', 'borrower', 'loanedAt', 'dueAt', 'notes']),
      copyId,
      borrower: borrower.trim(),
      loanedAt: now,
      dueAt,
      notes: notes?.trim() || null,
    };
    tx.insert(loans).values(row).run();
    log(tx, 'loans', row.id, '*', null, row.borrower, userId, now);
  });
}

/** Marks a loan as returned. */
export function returnLoan(loanId: string, userId: string) {
  const now = Date.now();
  db.transaction((tx) => {
    tx.update(loans)
      .set({ returnedAt: now, updatedAt: now, updatedBy: userId, fieldClock: sql`json_set(field_clock, '$.returnedAt', cast(${now} as integer))` })
      .where(eq(loans.id, loanId))
      .run();
    log(tx, 'loans', loanId, 'returnedAt', null, now, userId, now);
  });
}

type BookField = (typeof BOOK_FIELDS)[number];

/** Puts back an old value of one field from the history (the change itself is logged too). */
export function restoreBookField(bookId: string, field: BookField, value: string | null, userId: string) {
  const book = db.select().from(books).where(eq(books.id, bookId)).get();
  if (!book) return;
  const people = db
    .select({ name: persons.name, role: bookPersons.role, deathYearHijri: persons.deathYearHijri })
    .from(bookPersons)
    .innerJoin(persons, eq(persons.id, bookPersons.personId))
    .where(and(eq(bookPersons.bookId, bookId), isNull(bookPersons.deletedAt)))
    .orderBy(asc(bookPersons.sortOrder))
    .all();
  const input: BookInput = {
    title: book.title,
    categoryId: book.categoryId,
    publisher: book.publisher,
    edition: book.edition,
    totalVolumes: book.totalVolumes,
    pageCount: book.pageCount,
    notes: book.notes,
    people,
  };
  if (field === 'totalVolumes') input.totalVolumes = Number(value) || 1;
  else if (field === 'pageCount') input.pageCount = value ? Number(value) : null;
  else if (field === 'title') input.title = value ?? book.title;
  else input[field] = value;
  updateBook(bookId, input, userId);
}

export const RESTORABLE_FIELDS: readonly string[] = BOOK_FIELDS;
