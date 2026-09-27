import { eq, inArray, sql } from 'drizzle-orm';

import { db } from './client';
import { bookPersons, books, copies, persons, users, volumes } from './schema';

/** The sample catalogue (drizzle/0004_demo_data.sql) is created by this user. */
export const DEMO_USER_ID = '75abd6bf-dc41-560b-9b88-e4a380b6dc2d'; // uuid('user:demo') in scripts/build-demo-sql.mjs

export const demoCountQuery = db.select({ n: sql<number>`count(*)` }).from(books).where(eq(books.createdBy, DEMO_USER_ID));

/** Removes every sample row. Real books entered by the family are never touched. */
export async function deleteDemoData() {
  await db.transaction(async (tx) => {
    const demoBooks = (await tx.select({ id: books.id }).from(books).where(eq(books.createdBy, DEMO_USER_ID))).map((b) => b.id);
    if (demoBooks.length) {
      await tx.run(sql`delete from books_fts where book_id in (${sql.join(demoBooks.map((id) => sql`${id}`), sql`, `)})`);
    }
    await tx.delete(volumes).where(eq(volumes.createdBy, DEMO_USER_ID));
    await tx.delete(copies).where(eq(copies.createdBy, DEMO_USER_ID));
    await tx.delete(bookPersons).where(eq(bookPersons.createdBy, DEMO_USER_ID));
    if (demoBooks.length) await tx.delete(books).where(inArray(books.id, demoBooks));
    // Sample people only if no real book uses them.
    await tx.run(
      sql`delete from ${persons} where ${persons.createdBy} = ${DEMO_USER_ID}
          and not exists (select 1 from ${bookPersons} bp where bp.person_id = ${persons.id})`,
    );
    await tx.delete(users).where(eq(users.id, DEMO_USER_ID));
  });
}
