import { toArabicDigits } from '@maktabatna/shared';

/** "هلأ", "من ٥ دقايق", "من ساعتين", "من ٣ أيام"… in the family's dialect. */
export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  const m = Math.round(s / 60);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  if (s < 60) return 'هلأ';
  if (m < 60) return m === 1 ? 'من دقيقة' : m === 2 ? 'من دقيقتين' : `من ${toArabicDigits(m)} دقايق`;
  if (h < 24) return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${toArabicDigits(h)} ساعات`;
  if (d < 30) return d === 1 ? 'مبارح' : d === 2 ? 'من يومين' : `من ${toArabicDigits(d)} أيام`;
  const mo = Math.round(d / 30);
  return mo === 1 ? 'من شهر' : mo === 2 ? 'من شهرين' : `من ${toArabicDigits(mo)} أشهر`;
}
