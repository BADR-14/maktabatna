import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';

import { db } from './client';
import { bookcases, rooms, sections, shelves, volumes } from './schema';

const bookcaseVolumes = sql<number>`(
  select count(*) from ${volumes} v join ${shelves} sh on sh.id = v.shelf_id join ${sections} se on se.id = sh.section_id
  where se.bookcase_id = ${bookcases.id} and v.deleted_at is null
)`;

const bookcaseShelves = sql<number>`(
  select count(*) from ${shelves} sh join ${sections} se on se.id = sh.section_id
  where se.bookcase_id = ${bookcases.id} and sh.kind = 'shelf' and sh.deleted_at is null and se.deleted_at is null
)`;

/** Home screen: each room with its bookcase and book counts. */
export const roomsSummaryQuery = db
  .select({
    id: rooms.id,
    name: rooms.name,
    bookcaseCount: sql<number>`(select count(*) from ${bookcases} b where b.room_id = ${rooms.id} and b.deleted_at is null)`,
    volumeCount: sql<number>`(
      select count(*) from ${volumes} v join ${shelves} sh on sh.id = v.shelf_id join ${sections} se on se.id = sh.section_id
      join ${bookcases} b on b.id = se.bookcase_id where b.room_id = ${rooms.id} and v.deleted_at is null
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
