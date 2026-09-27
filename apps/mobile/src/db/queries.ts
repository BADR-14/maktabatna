import { and, asc, count, desc, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';

import { db } from './client';
import { bookPersons, bookcases, books, categories, copies, persons, rooms, sections, shelves, users, volumes } from './schema';

// Correlated subqueries name the outer table literally ("bookcases"."id"): in a single-table select
// drizzle prints bare column names, which would be ambiguous inside the subquery.
const bookcaseVolumes = sql<number>`(
  select count(*) from ${volumes} v join ${shelves} sh on sh.id = v.shelf_id join ${sections} se on se.id = sh.section_id
  where se.bookcase_id = "bookcases"."id" and v.deleted_at is null
)`;

const bookcaseShelves = sql<number>`(
  select count(*) from ${shelves} sh join ${sections} se on se.id = sh.section_id
  where se.bookcase_id = "bookcases"."id" and sh.kind = 'shelf' and sh.deleted_at is null and se.deleted_at is null
)`;

/** Home screen: each room with its bookcase and book counts. */
export const roomsSummaryQuery = db
  .select({
    id: rooms.id,
    name: rooms.name,
    bookcaseCount: sql<number>`(select count(*) from ${bookcases} b where b.room_id = "rooms"."id" and b.deleted_at is null)`,
    volumeCount: sql<number>`(
      select count(*) from ${volumes} v join ${shelves} sh on sh.id = v.shelf_id join ${sections} se on se.id = sh.section_id
      join ${bookcases} b on b.id = se.bookcase_id where b.room_id = "rooms"."id" and v.deleted_at is null
    )`,
  })
  .from(rooms)
  .where(isNull(rooms.deletedAt))
  .orderBy(asc(rooms.sortOrder));

export function roomQuery(id: string) {
  return db.select().from(rooms).where(eq(rooms.id, id));
}

/** Everything the 3D view needs about the bookcases of one room. */
export function roomBookcasesQuery(roomId: string) {
  return db
    .select({
      id: bookcases.id,
      number: bookcases.number,
      name: bookcases.name,
      kind: bookcases.kind,
      finish: bookcases.finish,
      wall: bookcases.wall,
      wallSide: bookcases.wallSide,
      offsetCm: bookcases.offsetCm,
      elevationCm: bookcases.elevationCm,
      widthCm: bookcases.widthCm,
      heightCm: bookcases.heightCm,
      depthCm: bookcases.depthCm,
      shelfCount: bookcaseShelves,
      volumeCount: bookcaseVolumes,
    })
    .from(bookcases)
    .where(and(eq(bookcases.roomId, roomId), isNull(bookcases.deletedAt)))
    .orderBy(asc(bookcases.number));
}

/** Shelves of one bookcase: the top surface first, then shelf 1 (top) downwards. */
export function shelvesQuery(bookcaseId: string) {
  return db
    .select({
      id: shelves.id,
      number: shelves.number,
      kind: shelves.kind,
      sectionNumber: sections.number,
      volumeCount: count(volumes.id),
    })
    .from(shelves)
    .innerJoin(sections, eq(sections.id, shelves.sectionId))
    .leftJoin(volumes, and(eq(volumes.shelfId, shelves.id), isNull(volumes.deletedAt)))
    .where(and(eq(sections.bookcaseId, bookcaseId), isNull(shelves.deletedAt), isNull(sections.deletedAt)))
    .groupBy(shelves.id)
    .orderBy(asc(sections.number), asc(shelves.number));
}

/** One shelf with where it is: room, bookcase number and name. */
export function shelfQuery(shelfId: string) {
  return db
    .select({
      id: shelves.id,
      number: shelves.number,
      kind: shelves.kind,
      bookcaseNumber: bookcases.number,
      bookcaseName: bookcases.name,
      roomName: rooms.name,
    })
    .from(shelves)
    .innerJoin(sections, eq(sections.id, shelves.sectionId))
    .innerJoin(bookcases, eq(bookcases.id, sections.bookcaseId))
    .innerJoin(rooms, eq(rooms.id, bookcases.roomId))
    .where(eq(shelves.id, shelfId));
}

/** Every volume in a room, for drawing the books in 3D: per bookcase, per shelf, from the right. */
export function roomVolumesQuery(roomId: string) {
  return db
    .select({ bookcaseId: bookcases.id, shelfNumber: shelves.number, bookId: copies.bookId, placement: volumes.placement })
    .from(volumes)
    .innerJoin(copies, eq(copies.id, volumes.copyId))
    .innerJoin(shelves, eq(shelves.id, volumes.shelfId))
    .innerJoin(sections, eq(sections.id, shelves.sectionId))
    .innerJoin(bookcases, eq(bookcases.id, sections.bookcaseId))
    .where(and(eq(bookcases.roomId, roomId), isNull(volumes.deletedAt)))
    .orderBy(asc(bookcases.number), asc(shelves.number), asc(volumes.row), asc(volumes.position));
}

/**
 * Home numbers: titles, physical volumes, authors, and titles owned more than once. An aggregate
 * over a real table always yields exactly one row (even when empty), and gives the live query a
 * table to watch.
 */
export const statsQuery = db
  .select({
    books: count(),
    volumes: sql<number>`(select count(*) from ${volumes} where deleted_at is null)`,
    authors: sql<number>`(select count(distinct person_id) from ${bookPersons} where role = 'author' and deleted_at is null)`,
    duplicates: sql<number>`(select count(*) from (select book_id from ${copies} where deleted_at is null group by book_id having count(*) > 1))`,
  })
  .from(books)
  .where(isNull(books.deletedAt));

export const categoriesWithCountsQuery = db
  .select({
    id: categories.id,
    name: categories.name,
    count: sql<number>`(select count(*) from ${books} b where b.category_id = "categories"."id" and b.deleted_at is null)`,
  })
  .from(categories)
  .where(isNull(categories.deletedAt))
  .orderBy(asc(categories.sortOrder));

const authorName = sql<string | null>`(
  select p.name from ${bookPersons} bp join ${persons} p on p.id = bp.person_id
  where bp.book_id = "books"."id" and bp.role = 'author' and bp.deleted_at is null order by bp.sort_order limit 1
)`;

export const recentBooksQuery = db
  .select({
    id: books.id,
    title: books.title,
    author: authorName,
    totalVolumes: books.totalVolumes,
    addedBy: users.displayName,
    createdAt: books.createdAt,
  })
  .from(books)
  .leftJoin(users, eq(users.id, books.createdBy))
  .where(isNull(books.deletedAt))
  .orderBy(desc(books.createdAt))
  .limit(12);

/** Full-text search; `match` is an FTS5 query built with toFtsQuery(). */
export function searchBooksQuery(match: string) {
  return db
    .select({ id: books.id, title: books.title, author: authorName, category: categories.name })
    .from(sql`books_fts`)
    .innerJoin(books, sql`${books.id} = books_fts.book_id`)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(sql`books_fts match ${match}`, isNull(books.deletedAt)))
    .orderBy(sql`rank`)
    .limit(30);
}

export function categoryBooksQuery(categoryId: string) {
  return db
    .select({ id: books.id, title: books.title, author: authorName, totalVolumes: books.totalVolumes })
    .from(books)
    .where(and(eq(books.categoryId, categoryId), isNull(books.deletedAt)))
    .orderBy(asc(books.titleNorm));
}

export function categoryQuery(id: string) {
  return db.select().from(categories).where(eq(categories.id, id));
}

/** Books on one shelf in order from the right, grouped later into runs of the same copy. */
export function shelfVolumesQuery(shelfId: string) {
  return db
    .select({
      volumeId: volumes.id,
      copyId: volumes.copyId,
      volumeNumber: volumes.volumeNumber,
      placement: volumes.placement,
      bookId: books.id,
      title: books.title,
      author: authorName,
      totalVolumes: books.totalVolumes,
    })
    .from(volumes)
    .innerJoin(copies, eq(copies.id, volumes.copyId))
    .innerJoin(books, eq(books.id, copies.bookId))
    .where(and(eq(volumes.shelfId, shelfId), isNull(volumes.deletedAt)))
    .orderBy(asc(volumes.row), asc(volumes.position));
}

export function bookQuery(id: string) {
  return db
    .select({ book: books, category: categories.name, addedBy: users.displayName })
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .leftJoin(users, eq(users.id, books.createdBy))
    .where(eq(books.id, id));
}

export function bookPeopleQuery(bookId: string) {
  return db
    .select({ name: persons.name, role: bookPersons.role, deathYearHijri: persons.deathYearHijri })
    .from(bookPersons)
    .innerJoin(persons, eq(persons.id, bookPersons.personId))
    .where(and(eq(bookPersons.bookId, bookId), isNull(bookPersons.deletedAt)))
    .orderBy(asc(bookPersons.sortOrder));
}

/** Where a book's volumes are: one row per copy + shelf, with the volume range there. */
export function bookLocationsQuery(bookId: string) {
  return db
    .select({
      copyId: copies.id,
      shelfId: shelves.id,
      shelfNumber: shelves.number,
      bookcaseId: bookcases.id,
      bookcaseNumber: bookcases.number,
      bookcaseName: bookcases.name,
      roomId: rooms.id,
      roomName: rooms.name,
      placement: sql<string>`min(${volumes.placement})`,
      fromVolume: sql<number | null>`min(${volumes.volumeNumber})`,
      toVolume: sql<number | null>`max(${volumes.volumeNumber})`,
      count: count(volumes.id),
    })
    .from(copies)
    .innerJoin(volumes, and(eq(volumes.copyId, copies.id), isNull(volumes.deletedAt)))
    .innerJoin(shelves, eq(shelves.id, volumes.shelfId))
    .innerJoin(sections, eq(sections.id, shelves.sectionId))
    .innerJoin(bookcases, eq(bookcases.id, sections.bookcaseId))
    .innerJoin(rooms, eq(rooms.id, bookcases.roomId))
    .where(and(eq(copies.bookId, bookId), isNull(copies.deletedAt)))
    .groupBy(copies.id, shelves.id)
    .orderBy(asc(copies.createdAt), sql`min(${volumes.volumeNumber})`);
}

export type BrowseSort = 'title' | 'recent' | 'volumes';
export type BrowseFilters = {
  /** FTS5 query from toFtsQuery(); empty = no text filter. */
  match?: string;
  categoryId?: string | null;
  roomId?: string | null;
  volumes?: 'single' | 'multi' | null;
  sort?: BrowseSort;
};

/** Search + filters, shared by the search screen and the category screen. All filters combine. */
export function browseBooksQuery(f: BrowseFilters) {
  const where: SQL[] = [isNull(books.deletedAt)];
  if (f.match) where.push(sql`${books.id} in (select book_id from books_fts where books_fts match ${f.match})`);
  if (f.categoryId) where.push(eq(books.categoryId, f.categoryId));
  if (f.volumes === 'single') where.push(eq(books.totalVolumes, 1));
  if (f.volumes === 'multi') where.push(sql`${books.totalVolumes} > 1`);
  if (f.roomId)
    where.push(sql`exists (
      select 1 from ${copies} c join ${volumes} v on v.copy_id = c.id join ${shelves} sh on sh.id = v.shelf_id
      join ${sections} se on se.id = sh.section_id join ${bookcases} b on b.id = se.bookcase_id
      where c.book_id = ${books.id} and c.deleted_at is null and v.deleted_at is null and b.room_id = ${f.roomId}
    )`);
  const order =
    f.sort === 'recent' ? [desc(books.createdAt)] : f.sort === 'volumes' ? [desc(books.totalVolumes), asc(books.titleNorm)] : [asc(books.titleNorm)];
  return db
    .select({ id: books.id, title: books.title, author: authorName, totalVolumes: books.totalVolumes, category: categories.name })
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(...where))
    .orderBy(...order)
    .limit(300);
}

export const roomsQuery = db.select({ id: rooms.id, name: rooms.name }).from(rooms).where(isNull(rooms.deletedAt)).orderBy(asc(rooms.sortOrder));

/** Every shelf in the house, for the "where is it?" picker: room → bookcase → shelf. */
export const allShelvesQuery = db
  .select({
    shelfId: shelves.id,
    shelfNumber: shelves.number,
    kind: shelves.kind,
    bookcaseId: bookcases.id,
    bookcaseNumber: bookcases.number,
    bookcaseName: bookcases.name,
    roomId: rooms.id,
    roomName: rooms.name,
  })
  .from(shelves)
  .innerJoin(sections, eq(sections.id, shelves.sectionId))
  .innerJoin(bookcases, eq(bookcases.id, sections.bookcaseId))
  .innerJoin(rooms, eq(rooms.id, bookcases.roomId))
  .where(and(isNull(shelves.deletedAt), isNull(bookcases.deletedAt)))
  .orderBy(asc(rooms.sortOrder), asc(bookcases.number), asc(shelves.number));

/** Titles in the trash, newest first. */
export const trashQuery = db
  .select({ id: books.id, title: books.title, author: authorName, deletedAt: books.deletedAt, totalVolumes: books.totalVolumes })
  .from(books)
  .where(isNotNull(books.deletedAt))
  .orderBy(desc(books.deletedAt));

export function userQuery(id: string) {
  return db.select().from(users).where(eq(users.id, id));
}
