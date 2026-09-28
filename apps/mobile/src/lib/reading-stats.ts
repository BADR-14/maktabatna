/**
 * Points, badges, streaks and challenge progress, worked out from the readings and the progress
 * log. Pure functions: nothing is stored, so changing a rule (or the parents' point values)
 * recalculates everyone at once, and phones can never disagree.
 */

export type ReadingRow = {
  userId: string;
  bookId: string;
  status: 'reading' | 'finished' | 'partial' | 'abandoned';
  startedAt: number;
  finishedAt: number | null;
  rating: number | null;
  totalVolumes: number;
  categoryId: string | null;
};
export type LogRow = { userId: string; day: string; pages: number; at: number };
export type Motivation = { pointsPerPage: number; pointsPerBook: number; badgeRewards: Record<string, string> };

export type UserStats = {
  points: number;
  pointsMonth: number;
  pages: number;
  pagesMonth: number;
  pagesToday: number;
  books: number;
  booksMonth: number;
  streak: number;
  bestStreak: number;
  badges: string[];
};

type Ctx = { finished: ReadingRow[]; pages: number; bestStreak: number; categories: number; ratings: number };

/** The badges, in display order. `test` decides from the person's whole history. */
export const BADGES: { key: string; title: string; hint: string; icon: string; test: (c: Ctx) => boolean }[] = [
  { key: 'first_book', title: 'أول كتاب', hint: 'أنهِ قراءة كتابك الأول', icon: 'book', test: (c) => c.finished.length >= 1 },
  { key: 'books_5', title: 'خمسة كتب', hint: 'أنهِ ٥ كتب', icon: 'library', test: (c) => c.finished.length >= 5 },
  { key: 'books_10', title: 'عشرة كتب', hint: 'أنهِ ١٠ كتب', icon: 'library', test: (c) => c.finished.length >= 10 },
  { key: 'books_25', title: 'خمسة وعشرون', hint: 'أنهِ ٢٥ كتاباً', icon: 'trophy', test: (c) => c.finished.length >= 25 },
  { key: 'books_50', title: 'خمسون كتاباً', hint: 'أنهِ ٥٠ كتاباً', icon: 'trophy', test: (c) => c.finished.length >= 50 },
  { key: 'books_100', title: 'مئة كتاب', hint: 'أنهِ ١٠٠ كتاب', icon: 'ribbon', test: (c) => c.finished.length >= 100 },
  { key: 'set', title: 'صاحب الموسوعة', hint: 'أنهِ مجموعة من ٥ مجلدات أو أكثر', icon: 'albums', test: (c) => c.finished.some((r) => r.totalVolumes >= 5) },
  { key: 'streak_7', title: 'أسبوع متواصل', hint: 'اقرأ ٧ أيام متتالية', icon: 'flame', test: (c) => c.bestStreak >= 7 },
  { key: 'streak_30', title: 'شهر متواصل', hint: 'اقرأ ٣٠ يوماً متتالياً', icon: 'flame', test: (c) => c.bestStreak >= 30 },
  { key: 'pages_1000', title: 'ألف صفحة', hint: 'اقرأ ١٠٠٠ صفحة', icon: 'document-text', test: (c) => c.pages >= 1000 },
  { key: 'pages_5000', title: 'خمسة آلاف صفحة', hint: 'اقرأ ٥٠٠٠ صفحة', icon: 'documents', test: (c) => c.pages >= 5000 },
  { key: 'pages_10000', title: 'عشرة آلاف صفحة', hint: 'اقرأ ١٠٠٠٠ صفحة', icon: 'documents', test: (c) => c.pages >= 10000 },
  { key: 'diverse', title: 'قارئ متنوّع', hint: 'أنهِ كتباً من ٥ تصنيفات مختلفة', icon: 'color-palette', test: (c) => c.categories >= 5 },
  { key: 'critic', title: 'المراجِع', hint: 'قيّم ١٠ كتب', icon: 'star', test: (c) => c.ratings >= 10 },
];

/** Day string → a day number, so consecutive days differ by 1. */
const dayNumber = (day: string) => Math.round(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 86_400_000);

/** Current streak (ending today, or yesterday if today has nothing yet) and the best ever. */
export function streaks(days: Iterable<string>, today: string): { current: number; best: number } {
  const set = [...new Set(days)].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < set.length; i++) {
    run = i > 0 && set[i] === set[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const t = dayNumber(today);
  const has = new Set(set);
  let start = has.has(t) ? t : has.has(t - 1) ? t - 1 : null;
  let current = 0;
  while (start !== null && has.has(start)) {
    current++;
    start--;
  }
  return { current, best };
}

export function userStats(userId: string, readings: ReadingRow[], logs: LogRow[], m: Motivation, today: string): UserStats {
  const mine = readings.filter((r) => r.userId === userId);
  const myLogs = logs.filter((l) => l.userId === userId);
  const month = today.slice(0, 7);
  const finished = mine.filter((r) => r.status === 'finished');
  const finishedMonth = finished.filter((r) => r.finishedAt && monthOf(r.finishedAt) === month);
  const pages = myLogs.reduce((n, l) => n + l.pages, 0);
  const pagesMonth = myLogs.filter((l) => l.day.startsWith(month)).reduce((n, l) => n + l.pages, 0);
  const pagesToday = myLogs.filter((l) => l.day === today).reduce((n, l) => n + l.pages, 0);
  const { current, best } = streaks(
    myLogs.map((l) => l.day),
    today,
  );
  const ctx: Ctx = {
    finished,
    pages,
    bestStreak: best,
    categories: new Set(finished.map((r) => r.categoryId).filter(Boolean)).size,
    ratings: mine.filter((r) => r.rating).length,
  };
  return {
    points: pages * m.pointsPerPage + finished.length * m.pointsPerBook,
    pointsMonth: pagesMonth * m.pointsPerPage + finishedMonth.length * m.pointsPerBook,
    pages,
    pagesMonth,
    pagesToday,
    books: finished.length,
    booksMonth: finishedMonth.length,
    streak: current,
    bestStreak: best,
    badges: BADGES.filter((b) => b.test(ctx)).map((b) => b.key),
  };
}

function monthOf(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type ChallengeRow = { kind: 'books' | 'pages' | 'category'; target: number; categoryId: string | null; startsAt: number; endsAt: number };

/** How far one person is in a challenge (0..target). */
export function challengeProgress(c: ChallengeRow, userId: string, readings: ReadingRow[], logs: LogRow[]): number {
  if (c.kind === 'pages') return logs.filter((l) => l.userId === userId && l.at >= c.startsAt && l.at <= c.endsAt).reduce((n, l) => n + l.pages, 0);
  return readings.filter(
    (r) =>
      r.userId === userId &&
      r.status === 'finished' &&
      r.finishedAt != null &&
      r.finishedAt >= c.startsAt &&
      r.finishedAt <= c.endsAt &&
      (c.kind !== 'category' || r.categoryId === c.categoryId),
  ).length;
}
