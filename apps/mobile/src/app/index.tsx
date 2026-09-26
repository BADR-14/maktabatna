import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { roomsOverviewQuery } from '@/db/queries';
import { radius, space, useColors } from '@/theme';

type Row = (typeof roomsOverviewQuery._.result)[number];

export default function Home() {
  const colors = useColors();
  const { data } = useLiveQuery(roomsOverviewQuery);

  const sections = useMemo(() => {
    const byRoom = new Map<string, { title: string; data: Row[] }>();
    for (const row of data ?? []) {
      if (!byRoom.has(row.roomId)) byRoom.set(row.roomId, { title: row.roomName, data: [] });
      byRoom.get(row.roomId)!.data.push(row);
    }
    return [...byRoom.values()];
  }, [data]);

  const totalVolumes = (data ?? []).reduce((n, r) => n + r.volumeCount, 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(r) => r.bookcaseId}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={[styles.summary, { backgroundColor: colors.tint }]}>
          <AppText variant="label" style={{ color: colors.tintText }}>
            {formatArabicNumber(data?.length ?? 0)} مكتبات · {formatArabicNumber(sections.length)} غرف ·{' '}
            {formatArabicNumber(totalVolumes)} كتاب
          </AppText>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <AppText variant="title" style={styles.roomTitle}>
          {section.title}
        </AppText>
      )}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/bookcase/[id]', params: { id: item.bookcaseId } }} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <AppText variant="label" style={{ color: colors.onPrimary }}>
                {toArabicDigits(item.number)}
              </AppText>
            </View>
            <View style={styles.cardBody}>
              <AppText variant="label">{item.name}</AppText>
              <AppText variant="muted">
                {item.kind === 'glass' ? 'زجاج' : 'مفتوحة'} · {formatArabicNumber(item.shelfCount)}{' '}
                {item.shelfCount === 1 ? 'رف' : 'رفوف'} · {formatArabicNumber(item.volumeCount)} كتاب
              </AppText>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  summary: { borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  roomTitle: { marginTop: space.lg, marginBottom: space.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
});
