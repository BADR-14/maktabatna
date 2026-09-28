/**
 * Turns one spoken sentence about a book into form fields, e.g.
 *   «رياض الصالحين المؤلف النووي دار ابن كثير مجلد واحد التصنيف رقائق»
 * Words before the first keyword are the title; each keyword starts a field that runs until the
 * next keyword. Counts ("٣ مجلدات", "مجلدين", "عدد الصفحات ٤٠٠") and the death year
 * ("المتوفى سنة ٦٧٦") are picked out wherever they are said. Speech-to-text rarely adds
 * punctuation, so none is required. «شرح» and «تحقيق» alone aren't keywords: many titles contain them
 * («فتح الباري شرح صحيح البخاري»); say «الشارح» / «المحقق» instead.
 */
import { normalizeArabic } from './arabic.ts';

export type SpokenBook = {
  title: string;
  author: string;
  authorDeath: number | null;
  editor: string;
  publisher: string;
  edition: string;
  totalVolumes: number | null;
  pageCount: number | null;
  /** The matched category name from the list given, or the words as said when nothing matched. */
  category: string;
  categoryMatched: boolean;
  notes: string;
};

type Field = 'title' | 'author' | 'editor' | 'publisher' | 'edition' | 'category' | 'notes';

/** Spoken keywords (normalized) → field. `keep` puts the keyword itself into the value ("دار ابن كثير"). */
const MARKERS: { words: string[]; field: Field; keep?: boolean }[] = [
  { words: ['اسم', 'الكتاب'], field: 'title' },
  { words: ['العنوان'], field: 'title' },
  { words: ['عنوانه'], field: 'title' },
  { words: ['المولف'], field: 'author' },
  { words: ['مولفه'], field: 'author' },
  { words: ['مولف'], field: 'author' },
  { words: ['تاليف'], field: 'author' },
  { words: ['الكاتب'], field: 'author' },
  { words: ['المحقق'], field: 'editor' },
  { words: ['محققه'], field: 'editor' },
  { words: ['بتحقيق'], field: 'editor' },
  { words: ['الشارح'], field: 'editor' },
  { words: ['الناشر'], field: 'publisher' },
  { words: ['دار', 'النشر'], field: 'publisher' },
  { words: ['دار'], field: 'publisher', keep: true },
  { words: ['مكتبه'], field: 'publisher', keep: true },
  { words: ['موسسه'], field: 'publisher', keep: true },
  { words: ['الطبعه'], field: 'edition' },
  { words: ['طبعه'], field: 'edition' },
  { words: ['التصنيف'], field: 'category' },
  { words: ['تصنيف'], field: 'category' },
  { words: ['تصنيفه'], field: 'category' },
  { words: ['ملاحظه'], field: 'notes' },
  { words: ['ملاحظات'], field: 'notes' },
];

const UNITS: Record<string, number> = {
  واحد: 1, واحده: 1, اثنين: 2, اثنان: 2, اتنين: 2, ثلاث: 3, ثلاثه: 3, تلات: 3, تلاته: 3, اربع: 4, اربعه: 4,
  خمس: 5, خمسه: 5, ست: 6, سته: 6, سبع: 7, سبعه: 7, ثمان: 8, ثماني: 8, ثمانيه: 8, تمان: 8, تسع: 9, تسعه: 9,
  عشر: 10, عشره: 10, احدعشر: 11, اثناعشر: 12,
  عشرين: 20, عشرون: 20, ثلاثين: 30, ثلاثون: 30, اربعين: 40, اربعون: 40, خمسين: 50, خمسون: 50,
  ستين: 60, ستون: 60, سبعين: 70, سبعون: 70, ثمانين: 80, ثمانون: 80, تسعين: 90, تسعون: 90,
  ميه: 100, مايه: 100, ميتين: 200, مئتين: 200, مائتين: 200,
};
const DUALS: Record<string, number> = { مجلدين: 2, مجلدان: 2, جزءين: 2, جزءان: 2, جزاين: 2 };
const VOLUME_WORDS = /^(مجلد|مجلدات|مجلدا|جز|جزء|اجزاء|جزا|اجزا|اجزاء|جزءا|مجلده)$/;

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** Reads a number said as digits or words ("خمسه وعشرين", "25") starting at `i`. Returns [value, words used]. */
function readNumber(words: string[], i: number): [number, number] | null {
  const w = words[i];
  if (w === undefined) return null;
  if (/^\d+$/.test(w)) return [Number(w), 1];
  let total = 0;
  let used = 0;
  for (let j = i; j < words.length; j++) {
    let t = words[j];
    // "خمسه وعشرين": later parts come with a joining و.
    if (!(t in UNITS) && j > i && t.startsWith('و') && t.slice(1) in UNITS) t = t.slice(1);
    const v = UNITS[t];
    if (v === undefined) break;
    total += v;
    used = j - i + 1;
  }
  return used ? [total, used] : null;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** The category whose words best match what was said ("رقاق" → «رقائق وتزكية»). */
export function matchCategory(said: string, categories: string[]): string | null {
  const s = normalizeArabic(said).replace(/^ال/, '').split(' ').filter(Boolean);
  if (!s.length) return null;
  let best: { name: string; score: number } | null = null;
  for (const name of categories) {
    const words = normalizeArabic(name)
      .split(' ')
      .filter((w) => w.length > 1 && w !== 'و')
      .map((w) => w.replace(/^و/, '').replace(/^ال/, ''));
    let score = 0;
    for (const a of s) {
      const b = words.reduce((m, w) => Math.min(m, levenshtein(a.replace(/^ال/, ''), w) / Math.max(a.length, w.length)), 1);
      score += 1 - b;
    }
    score /= s.length;
    if (!best || score > best.score) best = { name, score };
  }
  return best && best.score >= 0.6 ? best.name : null;
}

export function parseSpokenBook(text: string, categories: string[] = []): SpokenBook {
  // Keep the original words for values (they carry hamzas etc.); match on normalized copies.
  const raw = digits(text)
    .replace(/[،,.؛;:!؟?«»"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const norm = raw.map((w) => normalizeArabic(w));
  const used = new Array<boolean>(raw.length).fill(false);
  const out: SpokenBook = {
    title: '',
    author: '',
    authorDeath: null,
    editor: '',
    publisher: '',
    edition: '',
    totalVolumes: null,
    pageCount: null,
    category: '',
    categoryMatched: false,
    notes: '',
  };
  const bare = (w: string) => w.replace(/^و(?=..)/, '');

  // 1. Volume counts: "٣ مجلدات", "مجلد واحد", "مجلدين", "عدد المجلدات ٥", "عدد الأجزاء عشرين".
  for (let i = 0; i < norm.length; i++) {
    if (used[i]) continue;
    const w = bare(norm[i]);
    if (DUALS[w]) {
      out.totalVolumes = DUALS[w];
      used[i] = true;
      continue;
    }
    if (w === 'عدد' && /^(المجلدات|الاجزاء|الاجزا|المجلد)$/.test(norm[i + 1] ?? '')) {
      const n = readNumber(norm, i + 2);
      if (n) {
        out.totalVolumes = n[0];
        for (let k = i; k < i + 2 + n[1]; k++) used[k] = true;
        continue;
      }
    }
    if (w === 'عدد' && /^(الصفحات|صفحاته)$/.test(norm[i + 1] ?? '')) {
      const n = readNumber(norm, i + 2);
      if (n) {
        out.pageCount = n[0];
        for (let k = i; k < i + 2 + n[1]; k++) used[k] = true;
        continue;
      }
    }
    if (VOLUME_WORDS.test(w)) {
      const after = readNumber(norm, i + 1); // "مجلد واحد"
      const before = i > 0 && !used[i - 1] ? readNumberBackwards(norm, i) : null; // "٣ مجلدات"
      if (before) {
        out.totalVolumes = before[0];
        for (let k = i - before[1]; k <= i; k++) used[k] = true;
      } else if (after) {
        out.totalVolumes = after[0];
        for (let k = i; k <= i + after[1]; k++) used[k] = true;
      } else if (w === 'مجلد') {
        out.totalVolumes = 1;
        used[i] = true;
      }
      continue;
    }
    if (/^(صفحه|صفحات)$/.test(w)) {
      const before = i > 0 && !used[i - 1] ? readNumberBackwards(norm, i) : null;
      if (before) {
        out.pageCount = before[0];
        for (let k = i - before[1]; k <= i; k++) used[k] = true;
      }
    }
  }

  // 2. Death year: "المتوفى سنة ٦٧٦", "توفي ٦٧٦", "وفاته ٦٧٦ هجري".
  for (let i = 0; i < norm.length; i++) {
    if (used[i] || !/^(المتوفي|متوفي|توفي|وفاته|الوفاه|المتوفا)$/.test(bare(norm[i]))) continue;
    let j = i + 1;
    if (/^(سنه|عام)$/.test(norm[j] ?? '')) j++;
    const n = readNumber(norm, j);
    if (!n) continue;
    out.authorDeath = n[0];
    let end = j + n[1];
    if (/^(ه|هـ|هجري|هجريه|للهجره)$/.test(norm[end] ?? '')) end++;
    for (let k = i; k < end; k++) used[k] = true;
  }

  // 3. Split the rest at keywords.
  let field: Field = 'title';
  const buckets: Record<Field, string[]> = { title: [], author: [], editor: [], publisher: [], edition: [], category: [], notes: [] };
  for (let i = 0; i < norm.length; i++) {
    if (used[i]) continue;
    const marker = MARKERS.find((m) => m.words.every((mw, k) => (k === 0 ? bare(norm[i + k] ?? '') : norm[i + k]) === mw));
    if (marker && !(marker.keep && field === 'publisher')) {
      field = marker.field;
      if (marker.keep) buckets[field].push(raw[i].replace(/^و(?=..)/, ''));
      i += marker.words.length - 1;
      continue;
    }
    buckets[field].push(raw[i]);
  }
  const join = (f: Field) => buckets[f].join(' ').trim();
  out.title = join('title').replace(/^(كتاب)\s+/, '');
  out.author = join('author');
  out.editor = join('editor');
  out.publisher = join('publisher');
  out.edition = join('edition');
  out.notes = join('notes');
  const cat = join('category');
  const matched = cat ? matchCategory(cat, categories) : null;
  out.category = matched ?? cat;
  out.categoryMatched = !!matched;
  return out;
}

function readNumberBackwards(words: string[], i: number): [number, number] | null {
  // Try the longest number phrase that ends right before `i`.
  for (let start = Math.max(0, i - 3); start < i; start++) {
    const n = readNumber(words, start);
    if (n && start + n[1] === i) return n;
  }
  return null;
}
