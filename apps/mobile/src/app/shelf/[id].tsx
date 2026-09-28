import { toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/book-row';
import { Ionicons } from '@expo/vector-icons';
import { AddBookFab } from '@/components/fab';
import { HeaderSearch } from '@/components/header-search';
import { VoiceSheet } from '@/components/voice';
import { AppText } from '@/components/text';
import { count } from '@/lib/plural';
import { shelfQuery, shelfVolumesQuery } from '@/db/queries';
import { radius, space, useColors } from '@/theme';

type Run = { key: string; bookId: string; title: string; author: string | null; from: number | null; to: number | null; count: number; total: number; lying: boolean };

/** One shelf: its books from right to left, with consecutive volumes of a set shown as one row. */
export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const { data } = useLiveQuery(shelfQuery(id), [id]);
  const { data: vols } = useLiveQuery(shelfVolumesQuery(id), [id]);
  const s = data?.[0];
  const title = s ? (s.kind === 'top' ? 'أعلى المكتبة' : `الرف ${toArabicDigits(s.number)}`) : '';

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
    if (r.lying) parts.push('موضوع أفقياً');
    return parts.filter(Boolean).join('، ');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <HeaderSearch />
              {VoiceSheet ? (
                <Pressable onPress={() => router.push({ pathname: '/voice', params: { shelfId: id } })} hitSlop={8} accessibilityLabel="إدخال صوتي لهذا الرف" style={{ padding: 6 }}>
                  <Ionicons name="mic-outline" size={22} color={c.onPrimary} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />
      <FlatList
        data={runs}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          s ? (
            <View style={{ gap: 2, marginBottom: space.sm }}>
              <AppText variant="label">
                {s.roomName}، مكتبة {toArabicDigits(s.bookcaseNumber)}، {s.bookcaseName}
              </AppText>
              <AppText variant="muted">{vols?.length ? `${count(vols.length, 'volume')}، مرتبة من اليمين` : 'الرف فارغ'}</AppText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.line }]}>
            <AppText variant="label">لا توجد كتب على هذا الرف بعد</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <BookRow bookId={item.bookId} title={item.title} subtitle={describe(item)} href={{ pathname: '/book/[id]', params: { id: item.bookId } }} />
        )}
      />
      <AddBookFab href={{ pathname: '/book/edit', params: { shelfId: id } }} label="إضافة إلى هذا الرف" />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, paddingBottom: 100 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: space.xl, alignItems: 'center' },
});
