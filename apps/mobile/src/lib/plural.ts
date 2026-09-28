import { formatArabicNumber } from '@maktabatna/shared';

/** Singular, dual, plural (3–10), and the accusative singular used for 11–99. */
type Forms = readonly [one: string, two: string, few: string, many: string];

export const NOUNS = {
  book: ['كتاب', 'كتابان', 'كتب', 'كتاباً'],
  volume: ['مجلد', 'مجلدان', 'مجلدات', 'مجلداً'],
  bookcase: ['مكتبة', 'مكتبتان', 'مكتبات', 'مكتبةً'],
  shelf: ['رف', 'رفّان', 'رفوف', 'رفّاً'],
  result: ['نتيجة', 'نتيجتان', 'نتائج', 'نتيجةً'],
  copy: ['نسخة', 'نسختان', 'نسخ', 'نسخةً'],
  day: ['يوم', 'يومان', 'أيام', 'يوماً'],
  page: ['صفحة', 'صفحتان', 'صفحات', 'صفحةً'],
  point: ['نقطة', 'نقطتان', 'نقاط', 'نقطةً'],
} as const satisfies Record<string, Forms>;

/**
 * A number with its noun, following Arabic counting rules:
 * ١ → «كتاب واحد»، ٢ → «كتابان»، ٣–١٠ → «٣ كتب»، ١١–٩٩ → «١١ كتاباً»، ١٠٠ → «١٠٠ كتاب».
 */
export function count(n: number, noun: keyof typeof NOUNS): string {
  const [one, two, few, many] = NOUNS[noun];
  if (n === 1) return `${one} ${['bookcase', 'result', 'copy', 'page', 'point'].includes(noun) ? 'واحدة' : 'واحد'}`;
  if (n === 2) return two;
  const r = n % 100;
  const word = r >= 3 && r <= 10 ? few : r >= 11 && r <= 99 ? many : one;
  return `${formatArabicNumber(n)} ${word}`;
}
