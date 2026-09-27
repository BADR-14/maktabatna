/** Numbers about the library, plus the two checks the family asked for: duplicates and missing volumes. */
import { Ionicons } from '@expo/vector-icons';
import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View, type DimensionValue } from 'react-native';

import { BookRow } from '@/components/book-row';
import { AppText } from '@/components/text';
import { useLiveQuery } from '@/db/live';
import { categoriesWithCountsQuery, duplicatesQuery, loansQuery, roomsSummaryQuery, setCopiesQuery, statsQuery } from '@/db/queries';
import { categoryLook } from '@/lib/category-look';
import { volumeListText } from '@/lib/catalog-csv';
import { count } from '@/lib/plural';
import { fonts, radius, space, useColors } from '@/theme';

export default function StatsScreen() {
  const c = useColors();
  const { data: stats } = useLiveQuery(statsQuery);
  const { data: rooms } = useLiveQuery(roomsSummaryQuery);
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const { data: dups } = useLiveQuery(duplicatesQuery);
  const { data: sets } = useLiveQuery(setCopiesQuery);
  const { data: loans } = useLiveQuery(loansQuery);
  const s = stats[0];

  // A copy of a set is missing volumes when some numbers from 1..total aren't on any shelf.
  const missing = sets
    .map((x) => {
      const have = new Set((x.have ?? '').split(',').filter(Boolean).map(Number));
      const gaps = Array.from({ length: x.total }, (_, i) => i + 1).filter((n) => !have.has(n));
      return { ...x, gaps };
    })
    .filter((x) => x.gaps.length);
  const onLoan = loans.filter((l) => !l.returnedAt).length;
  const maxRoom = Math.max(1, ...rooms.map((r) => Number(r.volumeCount)));
  const maxCat = Math.max(1, ...cats.map((x) => Number(x.count)));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'الإحصائيات' }} />
      <View style={styles.tiles}>
        {(
          [
            ['book-outline', s?.books, 'العناوين'],
            ['layers-outline', s?.volumes, 'المجلدات'],
            ['people-outline', s?.authors, 'المؤلفون'],
            ['copy-outline', s?.duplicates, 'عناوين مكرّرة'],
            ['alert-circle-outline', missing.length, 'مجموعات ناقصة'],
            ['swap-horizontal', onLoan, 'كتب معارة'],
          ] as const
        ).map(([icon, n, label]) => (
          <View key={label} style={[styles.tile, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Ionicons name={icon} size={20} color={c.accentText} />
            <AppText style={[styles.tileNum, { color: c.text }]}>{formatArabicNumber(Number(n ?? 0))}</AppText>
            <AppText variant="muted" style={{ fontSize: 12 }}>
              {label}
            </AppText>
          </View>
        ))}
      </View>

      <Card title="المجلدات في كل غرفة">
        {rooms.map((r) => (
          <Bar key={r.id} label={r.name} value={Number(r.volumeCount)} width={`${(Number(r.volumeCount) / maxRoom) * 100}%`} color={c.primary} />
        ))}
      </Card>

      <Card title="العناوين في كل تصنيف">
        {cats.map((x, i) => (
          <Bar key={x.id} label={x.name} value={Number(x.count)} width={`${(Number(x.count) / maxCat) * 100}%`} color={categoryLook(x.name, i).color} />
        ))}
      </Card>

      <Card title="المجلدات الناقصة" hint="مجموعات متعددة المجلدات ليست كل أجزائها على الرفوف.">
        {missing.length === 0 ? (
          <Empty text="لا توجد مجموعات ناقصة." />
        ) : (
          missing.map((m) => (
            <BookRow
              key={m.copyId}
              bookId={m.bookId}
              title={m.title}
              subtitle={`ينقص ${count(m.gaps.length, 'volume')} من ${toArabicDigits(m.total)}: ${toArabicDigits(volumeListText(m.gaps))}`}
              href={{ pathname: '/book/[id]', params: { id: m.bookId } }}
            />
          ))
        )}
      </Card>

      <Card title="العناوين المكرّرة" hint="عناوين في البيت منها أكثر من نسخة.">
        {dups.length === 0 ? (
          <Empty text="لا توجد عناوين مكرّرة." />
        ) : (
          dups.map((d) => (
            <BookRow
              key={d.id}
              bookId={d.id}
              title={d.title}
              subtitle={[d.author, count(Number(d.copies), 'copy')].filter(Boolean).join('، ')}
              href={{ pathname: '/book/[id]', params: { id: d.id } }}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View>
        <AppText style={styles.cardTitle}>{title}</AppText>
        {hint ? <AppText variant="muted">{hint}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function Bar({ label, value, width, color }: { label: string; value: number; width: DimensionValue; color: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.barHead}>
        <AppText style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="muted">{formatArabicNumber(value)}</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: c.tint }]}>
        <View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Ionicons name="checkmark-circle-outline" size={20} color="#3B6B2A" />
      <AppText style={{ color: c.textMuted }}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '31.5%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  tileNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34 },
  card: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 30 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
