/**
 * Arabic text helpers shared by the mobile app and the server.
 *
 * `normalizeArabic` is what search indexes and queries go through, so that
 * "احمد" finds "أحمد", "مكتبه" finds "مكتبة", and diacritics never matter.
 */

// Harakat, tanween, shadda, sukun, superscript alef, and Quranic annotation marks.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const TATWEEL = /ـ/g;
const ALEF_VARIANTS = /[آأإٱ]/g; // آ أ إ ٱ
const ARABIC_INDIC_DIGITS = /[٠-٩]/g; // ٠-٩
const PERSIAN_DIGITS = /[۰-۹]/g; // ۰-۹
const NON_WORD = /[^\p{L}\p{N}]+/gu;

export function normalizeArabic(input: string): string {
  return input
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(ALEF_VARIANTS, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ی/g, 'ي') // Persian yeh
    .replace(/ک/g, 'ك') // Persian kaf
    .replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .trim();
}

/** Drops the definite article so "فقه" finds "الفقه" (and "بالفقه", "والفقه"). */
function stripArticle(word: string): string {
  const m = /^(?:و|ف|ب|ك)?(?:ال|لل)(.{2,})$/.exec(word);
  return m ? m[1] : word;
}

/**
 * Text to store in the FTS index for a book: normalized words, plus each word without its
 * article, so prefix search works whether or not the user types "ال".
 */
export function searchIndexText(...parts: (string | null | undefined)[]): string {
  const words = normalizeArabic(parts.filter(Boolean).join(' ')).split(' ').filter(Boolean);
  const extra = words.map(stripArticle).filter((w, i) => w !== words[i]);
  return [...words, ...extra].join(' ');
}

/** Builds an FTS5 prefix query from what the user typed: every word must match as a prefix. */
export function toFtsQuery(input: string): string {
  const words = normalizeArabic(input).split(' ').filter(Boolean);
  return words.map((w) => `"${stripArticle(w)}"*`).join(' ');
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** 1234 → "١٢٣٤". Works on any string, converting only the Western digits in it. */
export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

/** 6000 → "٦٬٠٠٠" (Arabic thousands separator). */
export function formatArabicNumber(value: number): string {
  const grouped = Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toArabicDigits(grouped);
}
