/**
 * The sync engine, free of React and Expo so it can be tested against plain SQLite:
 * push everything in the outbox, then pull everyone else's changes after our cursor and merge
 * them field by field (see mergeRows in the shared package).
 */
import { mergeRows, searchIndexText, SYNC_TABLES, type WireRow } from '@maktabatna/shared';

/** The subset of expo-sqlite's SQLiteDatabase the engine needs. */
export type SqlDb = {
  runSync(sql: string, params?: (string | number | null)[]): unknown;
  getAllSync<T>(sql: string, params?: (string | number | null)[]): T[];
  getFirstSync<T>(sql: string, params?: (string | number | null)[]): T | null;
  execSync(sql: string): void;
  withTransactionSync(fn: () => void): void;
};
export type Transport = <T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) => Promise<T>;

const PUSH_BATCH = 400;
const CURSOR = 'sync_cursor';

const quoted = (cols: string[]) => cols.map((c) => `"${c}"`).join(', ');
const marks = (n: number) => Array.from({ length: n }, () => '?').join(', ');

export function pendingCount(db: SqlDb): number {
  return db.getFirstSync<{ n: number }>('SELECT count(DISTINCT table_name || row_id) AS n FROM sync_outbox')?.n ?? 0;
}

/** Sends local changes in batches; each batch leaves the outbox only once the server has it. */
export async function push(db: SqlDb, send: Transport): Promise<number> {
  let sent = 0;
  for (;;) {
    const batch = db.getAllSync<{ id: number; table_name: string; row_id: string }>(
      'SELECT id, table_name, row_id FROM sync_outbox ORDER BY id LIMIT ?',
      [PUSH_BATCH],
    );
    if (!batch.length) return sent;
    const maxId = batch[batch.length - 1].id;
    const tables: Record<string, WireRow[]> = {};
    for (const spec of SYNC_TABLES) {
      const ids = [...new Set(batch.filter((b) => b.table_name === spec.name).map((b) => b.row_id))];
      if (!ids.length) continue;
      const rows = db.getAllSync<WireRow>(`SELECT ${quoted(Object.keys(spec.cols))} FROM "${spec.name}" WHERE id IN (${marks(ids.length)})`, ids);
      if (rows.length) tables[spec.name] = rows;
    }
    if (Object.keys(tables).length) {
      const res = await send<{ rejected?: { table: string; id: string; known: boolean }[] }>('/sync/push', { method: 'POST', body: { tables } });
      // Rows the server refused (not ours to change): take the server's copy on the next pull,
      // or drop the row if the server never had it.
      for (const r of res?.rejected ?? []) {
        if (!SYNC_TABLES.some((t) => t.name === r.table)) continue;
        if (r.known) db.runSync("INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, '1')", [`sync_force:${r.table}:${r.id}`]);
        else db.runSync(`DELETE FROM "${r.table}" WHERE id = ?`, [r.id]);
      }
    }
    db.runSync('DELETE FROM sync_outbox WHERE id <= ?', [maxId]);
    sent += batch.length;
  }
}

/** Applies one page of rows from the server. Returns the book ids whose search text may have changed. */
export function applyPulled(db: SqlDb, tables: Record<string, WireRow[]>): Set<string> {
  const touched = new Set<string>();
  // Rows can arrive before their parents (a parent edited later has a later sequence number),
  // so foreign keys are checked by the server, not here. The pragma only works outside a transaction.
  db.execSync('PRAGMA foreign_keys = OFF');
  try {
    db.withTransactionSync(() => {
      db.runSync("INSERT OR REPLACE INTO local_meta (key, value) VALUES ('sync_applying', '1')");
      for (const spec of SYNC_TABLES) {
        const rows = tables[spec.name];
        if (!rows?.length) continue;
        const cols = Object.keys(spec.cols);
        const upsert = `INSERT INTO "${spec.name}" (${quoted(cols)}) VALUES (${marks(cols.length)}) ON CONFLICT(id) DO UPDATE SET ${cols
          .filter((c) => c !== 'id')
          .map((c) => `"${c}" = excluded."${c}"`)
          .join(', ')}`;
        for (const row of rows) {
          const forceKey = `sync_force:${spec.name}:${row.id}`;
          const forced = !!db.getFirstSync('SELECT 1 FROM local_meta WHERE key = ?', [forceKey]);
          const local = forced ? null : db.getFirstSync<WireRow>(`SELECT ${quoted(cols)} FROM "${spec.name}" WHERE id = ?`, [String(row.id)]);
          const merged = mergeRows(spec, local, row);
          if (forced) db.runSync('DELETE FROM local_meta WHERE key = ?', [forceKey]);
          if (!merged) continue;
          db.runSync(upsert, cols.map((c) => merged[c] ?? null));
          if (spec.name === 'books') touched.add(String(row.id));
          if (spec.name === 'book_persons') touched.add(String(merged.book_id));
          if (spec.name === 'persons') {
            for (const r of db.getAllSync<{ book_id: string }>('SELECT book_id FROM book_persons WHERE person_id = ?', [String(row.id)])) touched.add(r.book_id);
          }
        }
      }
      db.runSync("DELETE FROM local_meta WHERE key = 'sync_applying'");
    });
  } finally {
    db.execSync('PRAGMA foreign_keys = ON');
  }
  return touched;
}

/** Rebuilds the search entries of the given books (deleted books drop out of search). */
export function reindexBooks(db: SqlDb, ids: Iterable<string>) {
  db.withTransactionSync(() => {
    for (const id of ids) {
      db.runSync('DELETE FROM books_fts WHERE book_id = ?', [id]);
      const book = db.getFirstSync<{ title: string; publisher: string | null; deleted_at: number | null }>(
        'SELECT title, publisher, deleted_at FROM books WHERE id = ?',
        [id],
      );
      if (!book || book.deleted_at) continue;
      const names = db
        .getAllSync<{ name: string }>(
          'SELECT p.name FROM book_persons bp JOIN persons p ON p.id = bp.person_id WHERE bp.book_id = ? AND bp.deleted_at IS NULL ORDER BY bp.sort_order',
          [id],
        )
        .map((r) => r.name);
      db.runSync('INSERT INTO books_fts (book_id, content) VALUES (?, ?)', [id, searchIndexText(book.title, ...names, book.publisher)]);
    }
  });
}

/** Pulls every page after our cursor. Returns how many rows arrived. */
export async function pull(db: SqlDb, send: Transport, hooks: { before?: () => void; after?: () => void } = {}): Promise<number> {
  let received = 0;
  for (;;) {
    const cursor = Number(db.getFirstSync<{ value: string }>('SELECT value FROM local_meta WHERE key = ?', [CURSOR])?.value ?? 0);
    const page = await send<{ tables: Record<string, WireRow[]>; cursor: number; more: boolean }>(`/sync/pull?since=${cursor}`);
    const count = Object.values(page.tables).reduce((n, rows) => n + rows.length, 0);
    if (count) {
      hooks.before?.();
      try {
        reindexBooks(db, applyPulled(db, page.tables));
      } finally {
        hooks.after?.();
      }
    }
    db.runSync('INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, ?)', [CURSOR, String(page.cursor)]);
    received += count;
    if (!page.more) return received;
  }
}
