import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/book-row';
import { AppText } from '@/components/text';
import { shelfQuery, shelfVolumesQuery } from '@/db/queries';
import { radius, space, useColors } from '@/theme';

type Run = { key: string; bookId: string; title: string; author: string | null; from: number | null; to: number | null; count: number; total: number; lying: boolean };

/** One shelf: its books from right to left, with consecutive volumes of a set shown as one row. */
export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { data } = useLiveQuery(shelfQuery(id), [id]);
  const { data: vols } = useLiveQuery(shelfVolumesQuery(id), [id]);
  const s = data?.[0];
  const title = s ? (s.kind === 'top' ? 'فوق المكتبة' : `الرف ${toArabicDigits(s.number)}`) : '';

  const runs = useMemo(() => {
    const out: Run[] = [];
    for (const v of vols ?? []) {
      const last = out[out.length - 1];
      if (last && last.key.startsWith(v.copyId)) {
        last.count++;
        if (v.volumeNumber != null) {
          last.from = Math.min(last.from ?? v.volumeNumber, v.volumeNumber);
          last.to = Math.max(last.to ?? v.volumeNumber, v.volumeNumber);
        }
      } else {
        out.push({
          key: `${v.copyId}:${out.length}`,
          bookId: v.bookId,
          title: v.title,
          author: v.author,
          from: v.volumeNumber,
          to: v.volumeNumber,
          count: 1,
          total: v.totalVolumes,
          lying: v.placement === 'lying',
        });
      }
    }
    return out;
  }, [vols]);

  const describe = (r: Run) => {
    const parts = [r.author];
    if (r.total > 1) parts.push(r.from === r.to ? `المجلد ${toArabicDigits(r.from ?? 0)}` : `المجلدات ${toArabicDigits(r.from ?? 0)}–${toArabicDigits(r.to ?? 0)} من ${toArabicDigits(r.total)}`);
    if (r.lying) parts.push('ممدود');
    return parts.filter(Boolean).join(' · ');
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FlatList
        data={runs}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          s ? (
            <View style={{ gap: 2, marginBottom: space.sm }}>
              <AppText variant="label">
                {s.roomName} · مكتبة {toArabicDigits(s.bookcaseNumber)} · {s.bookcaseName}
              </AppText>
              <AppText variant="muted">{formatArabicNumber(vols?.length ?? 0)} مجلد · مرتبين من اليمين</AppText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.line }]}>
            <AppText variant="label">لسا ما في كتب على هالرف</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <BookRow bookId={item.bookId} title={item.title} subtitle={describe(item)} href={{ pathname: '/book/[id]', params: { id: item.bookId } }} />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: space.xl, alignItems: 'center' },
});
