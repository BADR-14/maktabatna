import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeRows, SYNC_TABLE_BY_NAME } from './sync.ts';

const books = SYNC_TABLE_BY_NAME.books;
const base = { id: 'b', created_at: 1, updated_at: 10, updated_by: 'u1', title: 'أ', notes: null, field_clock: '{"title":10,"notes":10}' };

test('edits to different fields both survive', () => {
  const phoneA = { ...base, title: 'عنوان جديد', updated_at: 20, field_clock: '{"title":20,"notes":10}' };
  const phoneB = { ...base, notes: 'ملاحظة', updated_at: 30, updated_by: 'u2', field_clock: '{"title":10,"notes":30}' };
  const merged = mergeRows(books, phoneA, phoneB)!;
  assert.equal(merged.title, 'عنوان جديد');
  assert.equal(merged.notes, 'ملاحظة');
  assert.deepEqual(JSON.parse(String(merged.field_clock)), { title: 20, notes: 30 });
  // The other order converges to the same result.
  const other = mergeRows(books, phoneB, phoneA)!;
  assert.equal(other.title, merged.title);
  assert.equal(other.notes, merged.notes);
});

test('same field: the newer edit wins; ties pick the same value everywhere', () => {
  const older = { ...base, title: 'قديم', field_clock: '{"title":20}' };
  const newer = { ...base, title: 'أحدث', field_clock: '{"title":25}' };
  assert.equal(mergeRows(books, older, newer)!.title, 'أحدث');
  assert.equal(mergeRows(books, newer, older), null);
  const x = { ...base, title: 'س', field_clock: '{"title":20}' };
  const y = { ...base, title: 'ص', field_clock: '{"title":20}' };
  assert.equal(mergeRows(books, x, y)?.title ?? x.title, mergeRows(books, y, x)?.title ?? y.title);
});

test('a delete is a field too', () => {
  const deleted = { ...base, deleted_at: 50, field_clock: '{"title":10,"notes":10,"deleted_at":50}' };
  assert.equal(mergeRows(books, base, deleted)!.deleted_at, 50);
  assert.equal(mergeRows(books, deleted, base), null);
});
