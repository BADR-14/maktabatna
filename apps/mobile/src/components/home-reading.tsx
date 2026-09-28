/** Home: my reading at a glance (points, streak, books in progress) → the reading hub. */
import { Ionicons } from '@expo/vector-icons';
import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/book-cover';
import { PressLink } from '@/components/press-link';
import { ProgressBar } from '@/components/reading-ui';
import { AppText } from '@/components/text';
import { useLiveQuery } from '@/db/live';
import { localDay } from '@/db/reading';
import { allLogsQuery, allReadingsQuery, motivationQuery } from '@/db/reading-queries';
import { userStats } from '@/lib/reading-stats';
import { fonts, radius, space, useColors } from '@/theme';

export function HomeReading({ userId }: { userId: string }) {
  const c = useColors();
  const { data: readings } = useLiveQuery(allReadingsQuery);
  const { data: logs } = useLiveQuery(allLogsQuery);
  const { data: mot } = useLiveQuery(motivationQuery);
  const m = { pointsPerPage: mot[0]?.pointsPerPage ?? 1, pointsPerBook: mot[0]?.pointsPerBook ?? 50, badgeRewards: {} };
  const rows = readings.map((r) => ({ ...r, status: r.status as 'reading' | 'finished' | 'partial' | 'abandoned' }));
  const s = userStats(userId, rows, logs, m, localDay());
  const current = rows.filter((r) => r.userId === userId && r.status === 'reading');
  return (
    <View style={{ gap: space.md }}>
      <PressLink href="/reading" style={({ pressed }) => [styles.card, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 }]}>
        <Item icon="star" value={s.points} label="نقطة" color={c.accentText} />
        <Item icon="flame" value={s.streak} label="أيام متتالية" color="#C0562B" />
        <Item icon="ribbon" value={s.badges.length} label="وسام" color={c.primary} />
        <View style={styles.go}>
          <AppText style={{ color: c.accentText, fontFamily: fonts.semibold, fontSize: 13 }}>لوحة القراءة</AppText>
          <Ionicons name="chevron-back" size={16} color={c.accentText} />
        </View>
      </PressLink>
      {current.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
          {current.map((r) => (
            <PressLink key={r.id} href={{ pathname: '/book/[id]', params: { id: r.bookId } }} style={[styles.book, { backgroundColor: c.surface, borderColor: c.line }]}>
              <BookCover bookId={r.bookId} title={r.title} width={44} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" numberOfLines={2} style={{ fontSize: 13, lineHeight: 19 }}>
                  {r.title}
                </AppText>
                <ProgressBar percent={r.percent} height={6} />
                <AppText variant="muted" style={{ fontSize: 11 }}>
                  {toArabicDigits(Math.round(r.percent))}٪
                </AppText>
              </View>
            </PressLink>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Item({ icon, value, label, color }: { icon: 'star' | 'flame' | 'ribbon'; value: number; label: string; color: string }) {
  return (
    <View style={styles.item}>
      <Ionicons name={icon} size={18} color={color} />
      <AppText style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 30 }}>{formatArabicNumber(value)}</AppText>
      <AppText variant="muted" style={{ fontSize: 11 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth },
  item: { alignItems: 'center', minWidth: 58 },
  go: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  book: { width: 220, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
});
