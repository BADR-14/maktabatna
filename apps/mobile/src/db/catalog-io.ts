/** Importing books from the CSV table, and exporting the whole catalogue back to it. */
import { normalizeArabic, PLACEMENTS, ROWS } from '@maktabatna/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { toCsv, volumeListText, type ImportLine } from '@/lib/catalog-csv';
import { db } from './client';
import { created, log, personId, placeVolumes, reindex } from './mutations';
import { bookPersons, bookcases, books, categories, copies, rooms, sections, shelves } from './schema';

/** Old room names still accepted in files made before the rename. */
const ROOM_ALIASES: Record<string, string> = {
  [normalizeArabic('الصالون')]: normalizeArabic('غرفة الضيوف'),
  [normalizeArabic('الضيوف')]: normalizeArabic('غرفة الضيوف'),
  [normalizeArabic('غرفة القعدة')]: normalizeArabic('غرفة الجلوس'),
  [normalizeArabic('القعدة')]: normalizeArabic('غرفة الجلوس'),
  [normalizeArabic('الجلوس')]: normalizeArabic('غرفة الجلوس'),
};

export type ImportResult = { books: number; copies: number; volumes: number; skipped: string[]; warnings: string[] };

/**
 * Adds the lines to the catalogue in one transaction. A title already in the library (same title
 * and author) gets another copy, except when this line carries the rest of a set that another
 * line of the same file started on a different shelf: then the volumes join that copy.
 */
export function importBooks(lines: ImportLine[], userId: string): ImportResult {
  const now = Date.now();
  const result: ImportResult = { books: 0, copies: 0, volumes: 0, skipped: [], warnings: [] };

  const roomRows = db.select({ id: rooms.id, name: rooms.name }).from(rooms).where(isNull(rooms.deletedAt)).all();
  const roomByName = new Map(roomRows.map((r) => [normalizeArabic(r.name), r.id]));
  const shelfRows = db
    .select({ id: shelves.id, number: shelves.number, kind: shelves.kind, section: sections.number, bookcase: bookcases.number, roomId: bookcases.roomId })
    .from(shelves)
    .innerJoin(sections, eq(sections.id, shelves.sectionId))
    .innerJoin(bookcases, eq(bookcases.id, sections.bookcaseId))
    .where(and(isNull(shelves.deletedAt), isNull(bookcases.deletedAt)))
    .all();
  const catRows = db.select({ id: categories.id, name: categories.name }).from(categories).where(isNull(categories.deletedAt)).all();
  const catByName = new Map(catRows.map((c) => [normalizeArabic(c.name), c.id]));
  const general = catByName.get(normalizeArabic('عام')) ?? null;

  db.transaction((tx) => {
    // Copies started in this file: title key → copies with the volume numbers placed so far.
    const session = new Map<string, { bookId: string; copies: { id: string; vols: Set<number> }[] }>();

    for (const l of lines) {
      const roomKey = normalizeArabic(l.room);
      const roomId = roomByName.get(roomKey) ?? roomByName.get(ROOM_ALIASES[roomKey] ?? '');
      if (!roomId) {
        result.skipped.push(`السطر ${l.line}: الغرفة «${l.room || 'فارغة'}» غير معروفة.`);
        continue;
      }
      const inCase = shelfRows.filter((s) => s.roomId === roomId && s.bookcase === l.bookcase);
      if (!inCase.length) {
        result.skipped.push(`السطر ${l.line}: لا توجد مكتبة رقم ${l.bookcase ?? '؟'} في ${l.room}.`);
        continue;
      }
      const onTop = l.placement === 'on_top' || l.shelf === null || l.shelf === 0;
      const shelf = onTop
        ? inCase.find((s) => s.kind === 'top')
        : inCase.find((s) => s.kind === 'shelf' && s.section === l.section && s.number === l.shelf);
      if (!shelf) {
        result.skipped.push(`السطر ${l.line}: لا يوجد رف رقم ${l.shelf} في المكتبة ${l.bookcase} (القسم ${l.section}).`);
        continue;
      }

      let categoryId = l.category ? (catByName.get(normalizeArabic(l.category)) ?? null) : null;
      if (l.category && !categoryId) {
        categoryId = general;
        result.warnings.push(`السطر ${l.line}: التصنيف «${l.category}» غير معروف، فوُضع في «عام».`);
      }

      const titleNorm = normalizeArabic(l.title);
      const key = `${titleNorm}|${normalizeArabic(l.author)}`;
      const numbers = l.total === 1 ? [null] : (l.volumesHere ?? Array.from({ length: l.total }, (_, i) => i + 1));

      let entry = session.get(key);
      if (!entry) {
        const existing = tx
          .select({ id: books.id })
          .from(books)
          .where(
            and(
              eq(books.titleNorm, titleNorm),
              isNull(books.deletedAt),
              l.author
                ? sql`exists (select 1 from ${bookPersons} bp join persons p on p.id = bp.person_id where bp.book_id = ${books.id} and bp.role = 'author' and bp.deleted_at is null and p.name_norm = ${normalizeArabic(l.author)})`
                : sql`1 = 1`,
            ),
          )
          .get();
        let bookId = existing?.id;
        if (!bookId) {
          const book = {
            ...created(userId, now, ['title', 'categoryId', 'publisher', 'edition', 'totalVolumes', 'notes']),
            title: l.title,
            titleNorm,
            categoryId,
            publisher: l.publisher || null,
            edition: l.edition || null,
            totalVolumes: l.total,
            notes: l.notes || null,
          };
          tx.insert(books).values(book).run();
          log(tx, 'books', book.id, '*', null, 'imported', userId, now);
          const people = [
            l.author ? { name: l.author, role: 'author' as const, deathYearHijri: l.authorDeath } : null,
            l.editor ? { name: l.editor, role: 'editor' as const } : null,
          ].filter((p) => p !== null);
          people.forEach((p, i) =>
            tx
              .insert(bookPersons)
              .values({ ...created(userId, now, ['personId', 'role', 'sortOrder']), bookId: book.id, personId: personId(tx, p, userId, now), role: p.role, sortOrder: i })
              .run(),
          );
          bookId = book.id;
          result.books++;
        }
        entry = { bookId, copies: [] };
        session.set(key, entry);
      }

      // The rest of a set this file already started → same copy; otherwise a new copy.
      const nums = numbers.filter((n): n is number => n !== null);
      let copy = nums.length ? entry.copies.find((c) => nums.every((n) => !c.vols.has(n))) : undefined;
      if (!copy) {
        const row = { ...created(userId, now, ['bookId']), bookId: entry.bookId };
        tx.insert(copies).values(row).run();
        copy = { id: row.id, vols: new Set() };
        entry.copies.push(copy);
        result.copies++;
      }
      nums.forEach((n) => copy.vols.add(n));
      placeVolumes(tx, copy.id, shelf.id, numbers, onTop ? 'on_top' : l.placement, userId, now, l.row);
      result.volumes += numbers.length;
      reindex(tx, entry.bookId);
    }
  });
  return result;
}

/** The whole catalogue as CSV: one line per copy per shelf, in the import format. */
export function exportCatalogCsv(): string {
  const groups = db.all<{
    room: string;
    bookcase: number;
    section: number;
    shelf: number;
    kind: string;
    row: 'front' | 'back';
    placement: 'standing' | 'lying' | 'on_top';
    title: string;
    author: string | null;
    death: number | null;
    editor: string | null;
    publisher: string | null;
    edition: string | null;
    category: string | null;
    total: number;
    vols: string | null;
    copyVols: number;
    notes: string | null;
  }>(sql`
    select r.name room, b.number bookcase, se.number section, sh.number shelf, sh.kind kind, min(v.row) row, min(v.placement) placement,
      bk.title title,
      (select p.name from book_persons bp join persons p on p.id = bp.person_id where bp.book_id = bk.id and bp.role = 'author' and bp.deleted_at is null order by bp.sort_order limit 1) author,
      (select p.death_year_hijri from book_persons bp join persons p on p.id = bp.person_id where bp.book_id = bk.id and bp.role = 'author' and bp.deleted_at is null order by bp.sort_order limit 1) death,
      (select p.name from book_persons bp join persons p on p.id = bp.person_id where bp.book_id = bk.id and bp.role in ('editor', 'commentator') and bp.deleted_at is null order by bp.sort_order limit 1) editor,
      bk.publisher publisher, bk.edition edition, cat.name category, bk.total_volumes total,
      group_concat(v.volume_number) vols,
      (select count(*) from volumes v2 where v2.copy_id = c.id and v2.deleted_at is null) copyVols,
      bk.notes notes
    from volumes v
    join copies c on c.id = v.copy_id and c.deleted_at is null
    join books bk on bk.id = c.book_id and bk.deleted_at is null
    left join categories cat on cat.id = bk.category_id
    join shelves sh on sh.id = v.shelf_id join sections se on se.id = sh.section_id
    join bookcases b on b.id = se.bookcase_id join rooms r on r.id = b.room_id
    where v.deleted_at is null
    group by c.id, sh.id
    order by r.sort_order, b.number, se.number, sh.kind = 'top', sh.number, min(v.position)`);
  return toCsv(
    groups.map((g) => {
      const nums = (g.vols ?? '').split(',').filter(Boolean).map(Number);
      // Blank "volumes here" means the whole set is on this shelf.
      const here = g.total > 1 && (nums.length !== g.total || g.copyVols !== g.total) ? volumeListText(nums) : '';
      const top = g.kind === 'top';
      return [
        g.room,
        g.bookcase,
        top ? '' : g.section,
        top ? '' : g.shelf,
        g.row === 'back' ? ROWS.back : '',
        PLACEMENTS[top ? 'on_top' : g.placement],
        g.title,
        g.author,
        g.death,
        g.editor,
        g.publisher,
        g.edition,
        g.category,
        g.total,
        here,
        g.notes,
      ];
    }),
  );
}
