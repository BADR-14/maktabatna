/**
 * The books table as CSV, the same 16 columns as data/books-template.xlsx and the voice-entry
 * chat (docs/VOICE_ENTRY_PROMPT.md). One line = one book in one place; a set split over two
 * shelves is two lines, and a second copy is another line.
 */
import { normalizeArabic } from '@maktabatna/shared';

export const CSV_COLUMNS = [
  'الغرفة',
  'المكتبة',
  'القسم',
  'الرف',
  'الصف',
  'الوضعية',
  'اسم الكتاب',
  'اسم المؤلف',
  'وفاة المؤلف (هـ)',
  'المحقق أو الشارح',
  'دار النشر',
  'الطبعة وتاريخها',
  'تصنيف الكتاب',
  'عدد الأجزاء',
  'الأجزاء الموجودة هون',
  'ملاحظات',
] as const;

/** Parses CSV (or tab/semicolon separated) text: quotes, doubled quotes, CRLF, and a UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.indexOf('\n') === -1 ? undefined : src.indexOf('\n'));
  const sep = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const esc = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** CSV text with a BOM, so Excel opens the Arabic correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return '﻿' + [CSV_COLUMNS as readonly string[], ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

/** Western or Arabic-Indic digits. */
const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const num = (s: string) => {
  const n = parseInt(digits(s).trim(), 10);
  return Number.isFinite(n) ? n : null;
};

/** "1-30", "1،3،5", "7" → [1..30], [1,3,5], [7]. Empty → null (all volumes). */
export function parseVolumeList(s: string): number[] | null {
  const t = digits(s)
    .trim()
    .replace(/\s*(?:إلى|الى|حتى|لـ|[–—])\s*/g, '-')
    .replace(/\s*-\s*/g, '-');
  if (!t) return null;
  const out = new Set<number>();
  for (const part of t.split(/[,،;\s]+/)) {
    const m = /^(\d+)-(\d+)$/.exec(part);
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y);
      for (let i = a; i <= b && i - a < 500; i++) out.add(i);
    } else if (/^\d+$/.test(part)) out.add(Number(part));
  }
  return out.size ? [...out].sort((a, b) => a - b) : null;
}

/** Compresses [1,2,3,5,7,8] to "1-3,5,7-8" (for export). */
export function volumeListText(nums: number[]): string {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`);
    i = j + 1;
  }
  return parts.join(',');
}

export type ImportLine = {
  line: number;
  room: string;
  bookcase: number | null;
  section: number;
  shelf: number | null;
  row: 'front' | 'back';
  placement: 'standing' | 'lying' | 'on_top';
  title: string;
  author: string;
  authorDeath: number | null;
  editor: string;
  publisher: string;
  edition: string;
  category: string;
  total: number;
  volumesHere: number[] | null;
  notes: string;
};

const PLACEMENT: Record<string, ImportLine['placement']> = {
  [normalizeArabic('واقف')]: 'standing',
  [normalizeArabic('قائم')]: 'standing',
  [normalizeArabic('ممدود')]: 'lying',
  [normalizeArabic('ممدود بين الكتب')]: 'lying',
  [normalizeArabic('موضوع أفقيا')]: 'lying',
  [normalizeArabic('موضوع أفقيا بين الكتب')]: 'lying',
  [normalizeArabic('فوق المكتبة')]: 'on_top',
  [normalizeArabic('أعلى المكتبة')]: 'on_top',
};
const BACK = new Set(['ورا', 'خلف', 'الصف الخلفي', 'back'].map(normalizeArabic));

/** Turns CSV rows into import lines, with an Arabic message for each line that can't be read. */
export function readImport(rows: string[][]): { lines: ImportLine[]; errors: string[] } {
  const errors: string[] = [];
  if (!rows.length) return { lines: [], errors: ['الملف فارغ.'] };
  const header = rows[0].map((h) => normalizeArabic(h));
  const col = (name: string) => header.indexOf(normalizeArabic(name));
  const idx = Object.fromEntries(CSV_COLUMNS.map((c) => [c, col(c)])) as Record<(typeof CSV_COLUMNS)[number], number>;
  if (idx['اسم الكتاب'] === -1) return { lines: [], errors: ['لم أجد عمود «اسم الكتاب». يجب أن يكون السطر الأول أسماء الأعمدة كما في القالب.'] };
  const lines: ImportLine[] = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (c: (typeof CSV_COLUMNS)[number]) => (idx[c] >= 0 ? (r[idx[c]] ?? '').trim() : '');
    const title = get('اسم الكتاب');
    if (!title) return;
    const placement = PLACEMENT[normalizeArabic(get('الوضعية'))] ?? 'standing';
    const total = Math.max(1, num(get('عدد الأجزاء')) ?? 1);
    const volumesHere = parseVolumeList(get('الأجزاء الموجودة هون'));
    if (volumesHere?.some((v) => v > total)) errors.push(`السطر ${line}: «الأجزاء الموجودة» أكبر من عدد الأجزاء (${total}).`);
    lines.push({
      line,
      room: get('الغرفة'),
      bookcase: num(get('المكتبة')),
      section: num(get('القسم')) ?? 1,
      shelf: num(get('الرف')),
      row: BACK.has(normalizeArabic(get('الصف'))) ? 'back' : 'front',
      placement,
      title,
      author: get('اسم المؤلف'),
      authorDeath: num(get('وفاة المؤلف (هـ)')),
      editor: get('المحقق أو الشارح'),
      publisher: get('دار النشر'),
      edition: get('الطبعة وتاريخها'),
      category: get('تصنيف الكتاب'),
      total,
      volumesHere: volumesHere?.filter((v) => v <= total) ?? null,
      notes: get('ملاحظات'),
    });
  });
  return { lines, errors };
}
