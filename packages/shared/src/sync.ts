/**
 * What syncs between the phones and the server, and how two versions of a row merge.
 * Rows travel in the phone's SQLite shape: snake_case columns, epoch-ms numbers, JSON as text,
 * booleans as 0/1. The server converts to Postgres types with the `cols` below.
 */
export type ColType = 'uuid' | 'text' | 'int' | 'bigint' | 'float' | 'bool' | 'json' | `enum:${string}`;

const COMMON = {
  id: 'uuid',
  created_at: 'bigint',
  updated_at: 'bigint',
  deleted_at: 'bigint',
  created_by: 'uuid',
  updated_by: 'uuid',
  field_clock: 'json',
} as const satisfies Record<string, ColType>;

export type SyncTable = {
  name: string;
  cols: Record<string, ColType>;
  /** 'merge': field-level merge; 'append': insert-only (history); 'pull': server-owned, phones only receive. */
  mode: 'merge' | 'append' | 'pull';
};

/** In foreign-key order, so parents arrive before children. */
export const SYNC_TABLES: SyncTable[] = [
  // Public columns only: the password hash never leaves the server.
  { name: 'users', mode: 'pull', cols: { ...COMMON, display_name: 'text', username: 'text' } },
  {
    name: 'rooms',
    mode: 'merge',
    cols: { ...COMMON, name: 'text', sort_order: 'int', width_cm: 'float', depth_cm: 'float', height_cm: 'float', openings: 'json', notes: 'text' },
  },
  {
    name: 'bookcases',
    mode: 'merge',
    cols: {
      ...COMMON,
      room_id: 'uuid',
      number: 'int',
      name: 'text',
      kind: 'enum:BookcaseKind',
      wall: 'text',
      wall_side: 'enum:WallSide',
      finish: 'enum:Finish',
      offset_cm: 'float',
      elevation_cm: 'float',
      width_cm: 'float',
      height_cm: 'float',
      depth_cm: 'float',
      notes: 'text',
    },
  },
  { name: 'sections', mode: 'merge', cols: { ...COMMON, bookcase_id: 'uuid', number: 'int', width_ratio: 'float' } },
  {
    name: 'shelves',
    mode: 'merge',
    cols: { ...COMMON, section_id: 'uuid', number: 'int', kind: 'enum:ShelfKind', has_back_row: 'bool', height_cm: 'float' },
  },
  { name: 'categories', mode: 'merge', cols: { ...COMMON, name: 'text', sort_order: 'int' } },
  { name: 'persons', mode: 'merge', cols: { ...COMMON, name: 'text', name_norm: 'text', death_year_hijri: 'int' } },
  {
    name: 'books',
    mode: 'merge',
    cols: {
      ...COMMON,
      title: 'text',
      title_norm: 'text',
      category_id: 'uuid',
      publisher: 'text',
      edition: 'text',
      total_volumes: 'int',
      notes: 'text',
    },
  },
  {
    name: 'book_persons',
    mode: 'merge',
    cols: { ...COMMON, book_id: 'uuid', person_id: 'uuid', role: 'enum:PersonRole', sort_order: 'int' },
  },
  { name: 'copies', mode: 'merge', cols: { ...COMMON, book_id: 'uuid', notes: 'text' } },
  {
    name: 'volumes',
    mode: 'merge',
    cols: {
      ...COMMON,
      copy_id: 'uuid',
      shelf_id: 'uuid',
      volume_number: 'int',
      row: 'enum:ShelfRow',
      placement: 'enum:Placement',
      position: 'text',
      notes: 'text',
    },
  },
  {
    name: 'loans',
    mode: 'merge',
    cols: { ...COMMON, copy_id: 'uuid', borrower: 'text', loaned_at: 'bigint', due_at: 'bigint', returned_at: 'bigint', notes: 'text' },
  },
  {
    name: 'change_log',
    mode: 'append',
    cols: {
      id: 'uuid',
      table_name: 'text',
      row_id: 'uuid',
      field: 'text',
      old_value: 'text',
      new_value: 'text',
      changed_by: 'uuid',
      changed_at: 'bigint',
    },
  },
];

export const SYNC_TABLE_BY_NAME: Record<string, SyncTable> = Object.fromEntries(SYNC_TABLES.map((t) => [t.name, t]));

export type WireRow = Record<string, string | number | null>;

/** Columns merged one by one: everything except the id and the bookkeeping columns. */
const META = new Set(['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'field_clock']);

function clockOf(row: WireRow): Record<string, number> {
  try {
    return JSON.parse(String(row.field_clock ?? '{}')) ?? {};
  } catch {
    return {};
  }
}

const key = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/**
 * Field-level merge. Each field keeps the value with the newer clock; when two edits carry the
 * same clock, the greater value wins, so every replica picks the same one and they converge.
 * Returns null when `incoming` adds nothing to `current`.
 */
export function mergeRows(table: SyncTable, current: WireRow | null, incoming: WireRow): WireRow | null {
  if (!current) return { ...incoming };
  if (table.mode === 'append') return null;
  const a = clockOf(current);
  const b = clockOf(incoming);
  const out: WireRow = { ...current };
  const clock: Record<string, number> = { ...a };
  let changed = false;
  for (const col of Object.keys(table.cols)) {
    if (META.has(col)) continue;
    const ca = a[col] ?? 0;
    const cb = b[col] ?? 0;
    const va = current[col] ?? null;
    const vb = incoming[col] ?? null;
    const takeIncoming = cb > ca || (cb === ca && key(vb) > key(va));
    if (takeIncoming && key(vb) !== key(va)) {
      out[col] = vb;
      changed = true;
    }
    if (cb > ca) {
      clock[col] = cb;
      changed = true;
    }
  }
  if (!changed) return null;
  out.field_clock = JSON.stringify(clock);
  out.updated_at = Math.max(Number(current.updated_at ?? 0), Number(incoming.updated_at ?? 0));
  out.updated_by = Number(incoming.updated_at ?? 0) >= Number(current.updated_at ?? 0) ? incoming.updated_by : current.updated_by;
  return out;
}
