import { toArabicDigits } from '@maktabatna/shared';

/** "الآن"، "منذ ٥ دقائق"، "منذ ساعتين"، "منذ ٣ أيام"… */
export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  const m = Math.round(s / 60);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  if (s < 60) return 'الآن';
  if (m < 60) return m === 1 ? 'منذ دقيقة' : m === 2 ? 'منذ دقيقتين' : `منذ ${toArabicDigits(m)} ${m <= 10 ? 'دقائق' : 'دقيقة'}`;
  if (h < 24) return h === 1 ? 'منذ ساعة' : h === 2 ? 'منذ ساعتين' : `منذ ${toArabicDigits(h)} ${h <= 10 ? 'ساعات' : 'ساعة'}`;
  if (d < 30) return d === 1 ? 'أمس' : d === 2 ? 'منذ يومين' : `منذ ${toArabicDigits(d)} ${d <= 10 ? 'أيام' : 'يوماً'}`;
  const mo = Math.round(d / 30);
  return mo === 1 ? 'منذ شهر' : mo === 2 ? 'منذ شهرين' : `منذ ${toArabicDigits(mo)} ${mo <= 10 ? 'أشهر' : 'شهراً'}`;
}
