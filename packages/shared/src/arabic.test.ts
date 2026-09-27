import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatArabicNumber, normalizeArabic, searchIndexText, toArabicDigits, toFtsQuery } from './arabic.ts';

test('unifies alef variants', () => {
  assert.equal(normalizeArabic('أحمد إبراهيم آدم ٱلله'), 'احمد ابراهيم ادم الله');
});

test('taa marbuta and alef maqsura', () => {
  assert.equal(normalizeArabic('مكتبة'), normalizeArabic('مكتبه'));
  assert.equal(normalizeArabic('مصطفى'), 'مصطفي');
});

test('strips diacritics and tatweel', () => {
  assert.equal(normalizeArabic('تَهْذِيبُ اللُّغَةِ'), 'تهذيب اللغه');
  assert.equal(normalizeArabic('الكـــتاب'), 'الكتاب');
});

test('hamza on waw/yaa', () => {
  assert.equal(normalizeArabic('مسؤول'), 'مسوول');
  assert.equal(normalizeArabic('رئيس'), 'رييس');
});

test('digits and punctuation', () => {
  assert.equal(normalizeArabic('الجزء ١٥، (ط٢)'), 'الجزء 15 ط2');
});

test('fts query uses prefixes of every word', () => {
  assert.equal(toFtsQuery('  فقه  الإسلامي '), '"فقه"* "اسلامي"*');
  assert.equal(toFtsQuery('بالفقه'), '"فقه"*');
  assert.equal(toFtsQuery('!!'), '');
});

test('arabic digits', () => {
  assert.equal(toArabicDigits(2026), '٢٠٢٦');
  assert.equal(toArabicDigits('مكتبة 3'), 'مكتبة ٣');
  assert.equal(formatArabicNumber(6000), '٦٬٠٠٠');
  assert.equal(formatArabicNumber(15), '١٥');
  assert.equal(formatArabicNumber(1234567), '١٬٢٣٤٬٥٦٧');
});

test('index text keeps words and adds them without the article', () => {
  assert.equal(searchIndexText('الفقه الإسلامي وأدلته', null, 'دار الفكر'), 'الفقه الاسلامي وادلته دار الفكر فقه اسلامي فكر');
  assert.equal(searchIndexText('ال'), 'ال');
});
