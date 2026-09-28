import assert from 'node:assert/strict';
import { test } from 'node:test';

import { matchCategory, parseSpokenBook } from './voice.ts';

const CATS = ['تفسير وعلوم قرآن', 'حديث وعلومه', 'فقه وأصوله', 'عقيدة', 'سيرة وتراجم', 'تاريخ', 'لغة ونحو ومعاجم', 'أدب', 'رقائق وتزكية', 'موسوعات', 'عام'];

test('the example sentence', () => {
  const b = parseSpokenBook('رياض الصالحين المؤلف النووي دار ابن كثير مجلد واحد والتصنيف رقاق', CATS);
  assert.equal(b.title, 'رياض الصالحين');
  assert.equal(b.author, 'النووي');
  assert.equal(b.publisher, 'دار ابن كثير');
  assert.equal(b.totalVolumes, 1);
  assert.equal(b.category, 'رقائق وتزكية');
  assert.equal(b.categoryMatched, true);
});

test('numbers, death year, editor, edition, pages', () => {
  const b = parseSpokenBook(
    'كتاب سير أعلام النبلاء المؤلف الذهبي المتوفى سنة 748 المحقق شعيب الأرناؤوط مؤسسة الرسالة الطبعة الثالثة 25 مجلد التصنيف سيرة',
    CATS,
  );
  assert.equal(b.title, 'سير أعلام النبلاء');
  assert.equal(b.author, 'الذهبي');
  assert.equal(b.authorDeath, 748);
  assert.equal(b.editor, 'شعيب الأرناؤوط');
  assert.equal(b.publisher, 'مؤسسة الرسالة');
  assert.equal(b.edition, 'الثالثة');
  assert.equal(b.totalVolumes, 25);
  assert.equal(b.category, 'سيرة وتراجم');
});

test('volume words and Arabic-Indic digits', () => {
  assert.equal(parseSpokenBook('فتح الباري شرح صحيح البخاري ١٥ مجلدات').totalVolumes, 15);
  assert.equal(parseSpokenBook('فتح الباري شرح صحيح البخاري ١٥ مجلدات').title, 'فتح الباري شرح صحيح البخاري');
  assert.equal(parseSpokenBook('المغني مجلدين').totalVolumes, 2);
  assert.equal(parseSpokenBook('تاريخ الطبري عدد الأجزاء خمسة وعشرين').totalVolumes, 25);
  assert.equal(parseSpokenBook('الأذكار عدد الصفحات 400').pageCount, 400);
});

test('unknown category keeps the words', () => {
  const b = parseSpokenBook('كتاب ما التصنيف فلك', CATS);
  assert.equal(b.categoryMatched, false);
  assert.equal(b.category, 'فلك');
  assert.equal(matchCategory('الفقه', CATS), 'فقه وأصوله');
  assert.equal(matchCategory('تفسير', CATS), 'تفسير وعلوم قرآن');
});
