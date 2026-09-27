/**
 * Local SQLite schema (Drizzle). Mirrors the server schema in apps/server/prisma/schema.prisma.
 *
 * Every synced table has the same bookkeeping columns (see `common`):
 * - `id` is a UUID generated on the device, so rows can be created offline.
 * - `updatedAt` / `deletedAt` drive incremental sync; deletes are soft (the trash bin).
 * - `fieldClock` is a JSON map { column: epochMs } used for field-level merge:
 *   when two people edit different fields of the same row, both edits survive.
 * Timestamps are epoch milliseconds.
 */
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const common = {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  fieldClock: text('field_clock').notNull().default('{}'),
};

export const users = sqliteTable('users', {
  ...common,
  displayName: text('display_name').notNull(),
  username: text('username').notNull(),
  /** Profile photo, a file in the app's document directory (local for now; synced with photos later). */
  avatarUri: text('avatar_uri'),
});

export const rooms = sqliteTable('rooms', {
  ...common,
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  // Rough room size for the 3D shell, in centimetres.
  widthCm: real('width_cm'),
  depthCm: real('depth_cm'),
  heightCm: real('height_cm'),
  /** Doors and windows for the 3D shell: JSON array of { kind, wall, offsetCm, widthCm, heightCm, elevationCm }. */
  openings: text('openings').notNull().default('[]'),
  notes: text('notes'),
});

export const bookcases = sqliteTable(
  'bookcases',
  {
    ...common,
    roomId: text('room_id').notNull().references(() => rooms.id),
    /** Number inside the room, counted right to left when facing the wall. */
    number: integer('number').notNull(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['open', 'glass'] }).notNull(),
    /** Free label for the wall it hangs on, e.g. "الحيط الطويل". */
    wall: text('wall'),
    /**
     * Placement for the 3D view. Room origin is the back-left corner seen from inside:
     * 'back' runs left→right, 'left' and 'right' run from the back wall towards the viewer.
     * offsetCm is the distance from that wall's start to the bookcase's nearest edge.
     */
    wallSide: text('wall_side', { enum: ['back', 'left', 'right'] }),
    finish: text('finish', { enum: ['wood', 'aluminum'] }).notNull().default('wood'),
    offsetCm: real('offset_cm'),
    elevationCm: real('elevation_cm'),
    widthCm: real('width_cm'),
    heightCm: real('height_cm'),
    depthCm: real('depth_cm'),
    notes: text('notes'),
  },
  (t) => [index('bookcases_room_idx').on(t.roomId)],
);

export const sections = sqliteTable(
  'sections',
  {
    ...common,
    bookcaseId: text('bookcase_id').notNull().references(() => bookcases.id),
    /** Column number, right to left. */
    number: integer('number').notNull(),
    widthRatio: real('width_ratio').notNull().default(1),
  },
  (t) => [index('sections_bookcase_idx').on(t.bookcaseId)],
);

export const shelves = sqliteTable(
  'shelves',
  {
    ...common,
    sectionId: text('section_id').notNull().references(() => sections.id),
    /** 1 = top shelf. The surface on top of the bookcase is kind 'top' with number 0. */
    number: integer('number').notNull(),
    kind: text('kind', { enum: ['shelf', 'top'] }).notNull().default('shelf'),
    hasBackRow: integer('has_back_row', { mode: 'boolean' }).notNull().default(false),
    heightCm: real('height_cm'),
  },
  (t) => [index('shelves_section_idx').on(t.sectionId)],
);

export const categories = sqliteTable('categories', {
  ...common,
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/** Authors, editors (محقق), commentators (شارح) and translators share one table. */
export const persons = sqliteTable(
  'persons',
  {
    ...common,
    name: text('name').notNull(),
    nameNorm: text('name_norm').notNull(),
    deathYearHijri: integer('death_year_hijri'),
  },
  (t) => [index('persons_name_norm_idx').on(t.nameNorm)],
);

/** A title (العنوان). Physical items live in copies → volumes. */
export const books = sqliteTable(
  'books',
  {
    ...common,
    title: text('title').notNull(),
    titleNorm: text('title_norm').notNull(),
    categoryId: text('category_id').references(() => categories.id),
    publisher: text('publisher'),
    /** Free text as printed, e.g. "الأولى 1421هـ". */
    edition: text('edition'),
    totalVolumes: integer('total_volumes').notNull().default(1),
    notes: text('notes'),
  },
  (t) => [index('books_title_norm_idx').on(t.titleNorm), index('books_category_idx').on(t.categoryId)],
);

export const bookPersons = sqliteTable(
  'book_persons',
  {
    ...common,
    bookId: text('book_id').notNull().references(() => books.id),
    personId: text('person_id').notNull().references(() => persons.id),
    role: text('role', { enum: ['author', 'editor', 'commentator', 'translator'] }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('book_persons_book_idx').on(t.bookId), index('book_persons_person_idx').on(t.personId)],
);

/** One physical copy of a book in the house. Two copies of the same title = a duplicate. */
export const copies = sqliteTable(
  'copies',
  {
    ...common,
    bookId: text('book_id').notNull().references(() => books.id),
    notes: text('notes'),
  },
  (t) => [index('copies_book_idx').on(t.bookId)],
);

/** One physical volume on a shelf. A single-volume book has one row with volumeNumber null. */
export const volumes = sqliteTable(
  'volumes',
  {
    ...common,
    copyId: text('copy_id').notNull().references(() => copies.id),
    shelfId: text('shelf_id').notNull().references(() => shelves.id),
    volumeNumber: integer('volume_number'),
    row: text('row', { enum: ['front', 'back'] }).notNull().default('front'),
    placement: text('placement', { enum: ['standing', 'lying', 'on_top'] }).notNull().default('standing'),
    /** Fractional-index key: order on the shelf from the right. Lets us insert between two books without renumbering. */
    position: text('position').notNull(),
    notes: text('notes'),
  },
  (t) => [index('volumes_shelf_idx').on(t.shelfId, t.row, t.position), index('volumes_copy_idx').on(t.copyId)],
);

/** Lending (UI comes in the last phase; the table is ready from day one). */
export const loans = sqliteTable(
  'loans',
  {
    ...common,
    copyId: text('copy_id').notNull().references(() => copies.id),
    borrower: text('borrower').notNull(),
    loanedAt: integer('loaned_at').notNull(),
    dueAt: integer('due_at'),
    returnedAt: integer('returned_at'),
    notes: text('notes'),
  },
  (t) => [index('loans_copy_idx').on(t.copyId)],
);

/** Edit history: who changed what, and the old value, so any overwritten edit can be restored. */
export const changeLog = sqliteTable(
  'change_log',
  {
    id: text('id').primaryKey(),
    tableName: text('table_name').notNull(),
    rowId: text('row_id').notNull(),
    field: text('field').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    changedBy: text('changed_by'),
    changedAt: integer('changed_at').notNull(),
  },
  (t) => [index('change_log_row_idx').on(t.tableName, t.rowId)],
);

/** Local-only key/value state (sync cursors, signed-in user id, ...). Never synced. */
export const localMeta = sqliteTable('local_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
});
