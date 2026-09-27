import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from './client';
import { bookPersons, books, copies, persons, volumes } from './schema';

/** The sample catalogue (drizzle/0004_demo_data.sql) is created by this user. */
export const DEMO_USER_ID = '75abd6bf-dc41-560b-9b88-e4a380b6dc2d'; // uuid('user:demo') in scripts/build-demo-sql.mjs

export const demoCountQuery = db
  .select({ n: sql<number>`count(*)` })
  .from(books)
  .where(and(eq(books.createdBy, DEMO_USER_ID), isNull(books.deletedAt)));

/**
 * Removes the sample books. A soft delete, like any other, so it syncs: deleting the samples on
 * one phone removes them on every phone. Real books entered by the family are never touched.
 */
export function deleteDemoData(userId: string) {
  const now = Date.now();
  const del = { deletedAt: now, updatedAt: now, updatedBy: userId, fieldClock: sql`json_set(field_clock, '$.deletedAt', cast(${now} as integer))` };
  db.transaction((tx) => {
    const demoBooks = tx
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.createdBy, DEMO_USER_ID), isNull(books.deletedAt)))
      .all()
      .map((b) => b.id);
    if (!demoBooks.length) return;
    const demoCopies = tx.select({ id: copies.id }).from(copies).where(inArray(copies.bookId, demoBooks)).all().map((c) => c.id);
    if (demoCopies.length) tx.update(volumes).set(del).where(and(inArray(volumes.copyId, demoCopies), isNull(volumes.deletedAt))).run();
    tx.update(copies).set(del).where(and(inArray(copies.bookId, demoBooks), isNull(copies.deletedAt))).run();
    tx.update(bookPersons).set(del).where(and(inArray(bookPersons.bookId, demoBooks), isNull(bookPersons.deletedAt))).run();
    tx.update(books).set(del).where(inArray(books.id, demoBooks)).run();
    // Sample people only if no remaining book uses them.
    tx.update(persons)
      .set(del)
      .where(
        and(
          eq(persons.createdBy, DEMO_USER_ID),
          isNull(persons.deletedAt),
          sql`not exists (select 1 from ${bookPersons} bp where bp.person_id = ${persons.id} and bp.deleted_at is null)`,
        ),
      )
      .run();
    tx.run(sql`delete from books_fts where book_id in (${sql.join(demoBooks.map((id) => sql`${id}`), sql`, `)})`);
  });
}
