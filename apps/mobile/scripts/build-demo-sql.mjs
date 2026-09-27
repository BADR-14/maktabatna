/**
 * Generates drizzle/0004_demo_data.sql: sample books so the app can be tried before the real
 * catalogue is entered. Every row is created by the DEMO user, and the home screen offers a
 * one-tap "delete sample data" (see deleteDemoData in src/db/demo.ts).
 *   node scripts/build-demo-sql.mjs
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { normalizeArabic, searchIndexText } from '../../../packages/shared/src/arabic.ts';

const NAMESPACE = 'maktabatna-seed-v1'; // same as build-seed-sql.mjs
function uuid(key) {
  const h = createHash('sha1').update(`${NAMESPACE}:${key}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`);

export const DEMO_USER_ID = uuid('user:demo');
const T0 = 1790467200000; // 2026-09-27; each book gets a slightly later time so "recently added" has an order

// [key, title, author, deathHijri, editor, publisher, edition, category, totalVolumes]
const BOOKS = [
  ['tahdhib', 'تهذيب اللغة', 'أبو منصور الأزهري', 370, 'محمد عوض مرعب', 'دار إحياء التراث العربي', 'الأولى 2001م', 'لغة ونحو ومعاجم', 15],
  ['fiqh-adilla', 'الفقه الإسلامي وأدلته', 'وهبة الزحيلي', 1436, null, 'دار الفكر', 'الرابعة', 'فقه وأصوله', 10],
  ['qurtubi', 'الجامع لأحكام القرآن', 'القرطبي', 671, 'عبد الله بن عبد المحسن التركي', 'مؤسسة الرسالة', 'الأولى 1427هـ', 'تفسير وعلوم قرآن', 24],
  ['munir', 'التفسير المنير', 'وهبة الزحيلي', 1436, null, 'دار الفكر', 'الثانية', 'تفسير وعلوم قرآن', 16],
  ['musannaf', 'المصنّف', 'ابن أبي شيبة', 235, 'محمد عوامة', 'دار القبلة', 'الأولى 1427هـ', 'حديث وعلومه', 26],
  ['fath', 'فتح الباري شرح صحيح البخاري', 'ابن حجر العسقلاني', 852, null, 'دار المعرفة', null, 'حديث وعلومه', 13],
  ['muslim', 'صحيح مسلم', 'مسلم بن الحجاج', 261, 'محمد فؤاد عبد الباقي', 'دار إحياء التراث العربي', null, 'حديث وعلومه', 5],
  ['siyar', 'سير أعلام النبلاء', 'شمس الدين الذهبي', 748, 'شعيب الأرناؤوط', 'مؤسسة الرسالة', 'الثالثة 1405هـ', 'سيرة وتراجم', 25],
  ['bidaya', 'البداية والنهاية', 'ابن كثير', 774, 'عبد الله بن عبد المحسن التركي', 'دار هجر', 'الأولى 1418هـ', 'تاريخ', 21],
  ['lisan', 'لسان العرب', 'ابن منظور', 711, null, 'دار صادر', 'الثالثة 1414هـ', 'لغة ونحو ومعاجم', 15],
  ['ibnkathir', 'تفسير القرآن العظيم', 'ابن كثير', 774, 'سامي بن محمد السلامة', 'دار طيبة', 'الثانية 1420هـ', 'تفسير وعلوم قرآن', 8],
  ['mughni', 'المغني', 'ابن قدامة المقدسي', 620, 'عبد الله بن عبد المحسن التركي', 'دار عالم الكتب', 'الثالثة 1417هـ', 'فقه وأصوله', 15],
  ['riyad', 'رياض الصالحين', 'يحيى بن شرف النووي', 676, 'شعيب الأرناؤوط', 'مؤسسة الرسالة', null, 'رقائق وتزكية', 1],
  ['ihya', 'إحياء علوم الدين', 'أبو حامد الغزالي', 505, null, 'دار المعرفة', null, 'رقائق وتزكية', 4],
  ['rahiq', 'الرحيق المختوم', 'صفي الرحمن المباركفوري', 1427, null, 'دار الوفاء', null, 'سيرة وتراجم', 1],
  ['tahawiyya', 'شرح العقيدة الطحاوية', 'ابن أبي العز الحنفي', 792, 'شعيب الأرناؤوط', 'مؤسسة الرسالة', 'العاشرة 1417هـ', 'عقيدة', 2],
  ['mughni-labib', 'مغني اللبيب عن كتب الأعاريب', 'ابن هشام الأنصاري', 761, 'مازن المبارك', 'دار الفكر', 'السادسة', 'لغة ونحو ومعاجم', 1],
  ['mawsua', 'الموسوعة الفقهية الكويتية', 'وزارة الأوقاف الكويتية', null, null, 'وزارة الأوقاف والشؤون الإسلامية', null, 'موسوعات', 45],
  ['zad', 'زاد المعاد في هدي خير العباد', 'ابن قيم الجوزية', 751, 'شعيب الأرناؤوط', 'مؤسسة الرسالة', 'السابعة والعشرون', 'سيرة وتراجم', 5],
  ['madarij', 'مدارج السالكين', 'ابن قيم الجوزية', 751, null, 'دار الكتاب العربي', null, 'رقائق وتزكية', 3],
  ['umm', 'الأم', 'محمد بن إدريس الشافعي', 204, null, 'دار المعرفة', null, 'فقه وأصوله', 8],
  ['abudawud', 'سنن أبي داود', 'أبو داود السجستاني', 275, 'شعيب الأرناؤوط', 'دار الرسالة العالمية', 'الأولى 1430هـ', 'حديث وعلومه', 7],
  ['tabari', 'تاريخ الرسل والملوك', 'ابن جرير الطبري', 310, 'محمد أبو الفضل إبراهيم', 'دار المعارف', 'الثانية', 'تاريخ', 11],
  ['kamil', 'الكامل في التاريخ', 'ابن الأثير', 630, null, 'دار الكتاب العربي', null, 'تاريخ', 10],
  ['adwa', 'أضواء البيان', 'محمد الأمين الشنقيطي', 1393, null, 'دار عالم الفوائد', null, 'تفسير وعلوم قرآن', 9],
  ['itqan', 'الإتقان في علوم القرآن', 'جلال الدين السيوطي', 911, null, 'مجمع الملك فهد', null, 'تفسير وعلوم قرآن', 7],
  ['jami-saghir', 'الجامع الصغير', 'جلال الدين السيوطي', 911, null, 'دار الكتب العلمية', null, 'حديث وعلومه', 2],
  ['fatawa', 'مجموع الفتاوى', 'ابن تيمية', 728, 'عبد الرحمن بن قاسم', 'مجمع الملك فهد', '1416هـ', 'عقيدة', 37],
  ['mutanabbi', 'ديوان المتنبي', 'أبو الطيب المتنبي', 354, null, 'دار بيروت', null, 'أدب', 1],
  ['aghani', 'الأغاني', 'أبو الفرج الأصفهاني', 356, null, 'دار صادر', null, 'أدب', 10],
  ['wasit', 'المعجم الوسيط', 'مجمع اللغة العربية', null, null, 'مكتبة الشروق الدولية', 'الرابعة', 'لغة ونحو ومعاجم', 1],
  ['taj', 'تاج العروس', 'مرتضى الزبيدي', 1205, null, 'وزارة الإرشاد والأنباء الكويتية', null, 'لغة ونحو ومعاجم', 40],
  ['nayl', 'نيل الأوطار', 'محمد بن علي الشوكاني', 1250, null, 'دار الحديث', null, 'فقه وأصوله', 8],
  ['fiqh-sunna', 'فقه السنة', 'سيد سابق', 1420, null, 'دار الفتح', null, 'فقه وأصوله', 3],
  ['shifa', 'الشفا بتعريف حقوق المصطفى', 'القاضي عياض', 544, null, 'دار الفيحاء', null, 'سيرة وتراجم', 2],
  ['hilya', 'حلية الأولياء', 'أبو نعيم الأصبهاني', 430, null, 'دار الكتاب العربي', null, 'سيرة وتراجم', 10],
];

// Where each copy sits: [room, bookcase, shelf (0 = on top), bookKey, fromVolume, toVolume, placement?, copy#]
// Listed right to left on each shelf.
const PLACES = [
  ['salon', 1, 1, 'siyar', 1, 25],
  ['salon', 1, 2, 'bidaya', 1, 21],
  ['salon', 1, 3, 'muslim', 1, 5], ['salon', 1, 3, 'fath', 1, 13], ['salon', 1, 3, 'abudawud', 1, 7],
  ['salon', 2, 1, 'ibnkathir', 1, 8], ['salon', 2, 1, 'munir', 1, 16],
  ['salon', 2, 2, 'qurtubi', 1, 24],
  ['salon', 2, 3, 'adwa', 1, 9], ['salon', 2, 3, 'itqan', 1, 7], ['salon', 2, 3, 'riyad', 1, 1], ['salon', 2, 3, 'tahawiyya', 1, 2], ['salon', 2, 3, 'rahiq', 1, 1, 'lying'],
  ['salon', 3, 1, 'mughni', 1, 15],
  ['salon', 3, 2, 'umm', 1, 8], ['salon', 3, 2, 'nayl', 1, 8],
  ['salon', 3, 3, 'fiqh-sunna', 1, 3], ['salon', 3, 3, 'shifa', 1, 2], ['salon', 3, 3, 'zad', 1, 5], ['salon', 3, 3, 'madarij', 1, 3],
  ['salon', 4, 1, 'jami-saghir', 1, 2], ['salon', 4, 1, 'aghani', 1, 10],
  ['salon', 5, 1, 'tabari', 1, 11],
  ['salon', 5, 0, 'wasit', 1, 1, 'on_top'], ['salon', 5, 0, 'mutanabbi', 1, 1, 'on_top'],
  ['salon', 6, 1, 'ihya', 1, 4], ['salon', 6, 1, 'riyad', 1, 1, 'standing', 2], // a second copy: shows up as a duplicate
  ['qaada', 1, 1, 'hilya', 1, 10],
  ['qaada', 1, 2, 'kamil', 1, 10],
  ['qaada', 1, 3, 'mughni-labib', 1, 1],
  ['qaada', 2, 1, 'mawsua', 1, 23],
  ['qaada', 2, 2, 'mawsua', 24, 45],
  ['qaada', 2, 3, 'fiqh-adilla', 1, 10],
  ['qaada', 3, 1, 'fatawa', 1, 19],
  ['qaada', 3, 2, 'fatawa', 20, 37],
  ['qaada', 3, 3, 'musannaf', 1, 26],
  ['qaada', 4, 1, 'tahdhib', 1, 15],
  ['qaada', 4, 2, 'lisan', 1, 15],
  ['qaada', 4, 3, 'taj', 1, 20],
  ['qaada', 4, 4, 'taj', 21, 40],
];

const common = (id, t) => ({ id, created_at: t, updated_at: t, created_by: DEMO_USER_ID, updated_by: DEMO_USER_ID });
const insert = (table, row) =>
  `INSERT INTO \`${table}\` (${Object.keys(row).map((k) => `\`${k}\``).join(', ')}) VALUES (${Object.values(row).map(q).join(', ')});`;

const out = [];
out.push(insert('users', { ...common(DEMO_USER_ID, T0), display_name: 'بيانات تجريبية', username: 'demo' }));

const persons = new Map();
const person = (name, death) => {
  if (!persons.has(name)) {
    const id = uuid(`demo:person:${name}`);
    persons.set(name, id);
    out.push(insert('persons', { ...common(id, T0), name, name_norm: normalizeArabic(name), death_year_hijri: death ?? null }));
  }
  return persons.get(name);
};

const bookIds = new Map();
BOOKS.forEach(([key, title, author, death, editor, publisher, edition, category, total], i) => {
  const id = uuid(`demo:book:${key}`);
  const t = T0 + i * 60_000;
  bookIds.set(key, { id, t });
  out.push(
    insert('books', {
      ...common(id, t),
      title,
      title_norm: normalizeArabic(title),
      category_id: uuid(`category:${category}`),
      publisher,
      edition,
      total_volumes: total,
      notes: null,
    }),
  );
  const authorId = person(author, death);
  out.push(insert('book_persons', { ...common(uuid(`demo:bp:${key}:author`), t), book_id: id, person_id: authorId, role: 'author', sort_order: 0 }));
  if (editor) {
    const edId = person(editor, null);
    out.push(insert('book_persons', { ...common(uuid(`demo:bp:${key}:editor`), t), book_id: id, person_id: edId, role: 'editor', sort_order: 1 }));
  }
  const content = searchIndexText(title, author, editor, publisher);
  out.push(`INSERT INTO \`books_fts\` (\`book_id\`, \`content\`) VALUES (${q(id)}, ${q(content)});`);
});

const copies = new Set();
const shelfCursor = new Map();
for (const [room, bc, shelf, key, from, to, placement = 'standing', copyNo = 1] of PLACES) {
  const { id: bookId, t } = bookIds.get(key);
  const copyId = uuid(`demo:copy:${key}:${copyNo}`);
  if (!copies.has(copyId)) {
    copies.add(copyId);
    out.push(insert('copies', { ...common(copyId, t), book_id: bookId, notes: null }));
  }
  const shelfId = uuid(`shelf:${room}:${bc}:1:${shelf === 0 ? 'top' : shelf}`);
  const total = BOOKS.find((b) => b[0] === key)[8];
  for (let v = from; v <= to; v++) {
    const n = (shelfCursor.get(shelfId) ?? 0) + 1;
    shelfCursor.set(shelfId, n);
    out.push(
      insert('volumes', {
        ...common(uuid(`demo:vol:${key}:${copyNo}:${v}`), t),
        copy_id: copyId,
        shelf_id: shelfId,
        volume_number: total > 1 ? v : null,
        row: 'front',
        placement,
        position: `a${String(n).padStart(4, '0')}`,
        notes: null,
      }),
    );
  }
}

const target = fileURLToPath(new URL('../drizzle/0004_demo_data.sql', import.meta.url));
writeFileSync(target, out.join('\n--> statement-breakpoint\n') + '\n');
console.log(`wrote ${out.length} statements (${BOOKS.length} books) to ${target}`);
