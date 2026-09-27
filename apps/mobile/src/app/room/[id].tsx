import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/text';
import { roomBookcasesQuery, roomQuery, shelvesQuery } from '@/db/queries';
import type { Opening, RoomLayout } from '@/three/room-scene';
import { RoomView } from '@/three/room-view';
import { radius, space, useColors } from '@/theme';

export default function RoomScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const c = useColors();
  const { data: room } = useLiveQuery(roomQuery(id), [id]);
  const { data: bookcases } = useLiveQuery(roomBookcasesQuery(id), [id]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const r = room?.[0];
  // Built once when the data first arrives; the 3D scene doesn't need to rebuild on every book added.
  const layout = useMemo<RoomLayout | null>(() => {
    if (!r || !bookcases?.length) return null;
    return {
      widthCm: r.widthCm,
      depthCm: r.depthCm,
      heightCm: r.heightCm,
      openings: JSON.parse(r.openings) as Opening[],
      bookcases: bookcases.map((b) => ({ ...b, shelfCount: Number(b.shelfCount) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id, bookcases?.length]);

  const selected = bookcases?.find((b) => b.id === selectedId) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: '#1b1314' }}>
      <Stack.Screen options={{ title: r?.name ?? name ?? '' }} />
      {layout ? (
        <RoomView layout={layout} selectedId={selectedId} onSelect={setSelectedId} />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
      {!selected ? (
        <View style={[styles.hint, { backgroundColor: 'rgba(23,15,16,0.72)' }]} pointerEvents="none">
          <AppText style={{ color: '#F2E6E4', fontSize: 13 }}>اكبس على أي مكتبة · اسحب لتلف · قرّب بإصبعين</AppText>
        </View>
      ) : (
        <BookcaseSheet bookcase={selected} onClose={() => setSelectedId(null)} />
      )}
    </View>
  );
}

type BookcaseRow = { id: string; number: number; name: string; kind: 'open' | 'glass'; wall: string | null; volumeCount: number };

function BookcaseSheet({ bookcase, onClose }: { bookcase: BookcaseRow; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data: shelves } = useLiveQuery(shelvesQuery(bookcase.id), [bookcase.id]);
  const shelfCount = (shelves ?? []).filter((s) => s.kind === 'shelf').length;

  return (
    <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.sheetHead}>
        <View style={[styles.number, { backgroundColor: c.primary }]}>
          <AppText variant="title" style={{ color: c.onPrimary, fontSize: 20, lineHeight: 30 }}>
            {toArabicDigits(bookcase.number)}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" style={{ fontSize: 17 }}>
            مكتبة {toArabicDigits(bookcase.number)} · {bookcase.name}
          </AppText>
          <AppText variant="muted">
            {bookcase.kind === 'glass' ? 'زجاج' : 'مفتوحة'} · {formatArabicNumber(shelfCount)} {shelfCount === 1 ? 'رف' : 'رفوف'} ·{' '}
            {formatArabicNumber(Number(bookcase.volumeCount))} كتاب
          </AppText>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="رجوع للغرفة" style={[styles.close, { borderColor: c.line }]}>
          <AppText style={{ fontSize: 16, lineHeight: 20 }}>✕</AppText>
        </Pressable>
      </View>

      <AppText variant="muted" style={{ marginTop: space.md, marginBottom: space.sm }}>
        الرفوف (من فوق لتحت)
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {(shelves ?? []).map((s) => (
          <Link key={s.id} href={{ pathname: '/shelf/[id]', params: { id: s.id } }} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.shelfChip,
                { backgroundColor: s.kind === 'top' ? c.tint : c.background, borderColor: c.line, opacity: pressed ? 0.7 : 1 },
              ]}>
              <AppText variant="label" style={{ fontSize: 14 }}>
                {s.kind === 'top' ? 'فوق المكتبة' : `الرف ${toArabicDigits(s.number)}`}
              </AppText>
              <AppText variant="muted">{formatArabicNumber(s.volumeCount)} كتاب</AppText>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', bottom: 28, alignSelf: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.lg,
    paddingHorizontal: space.lg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  number: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  close: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shelfChip: { borderWidth: 1, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.lg, minWidth: 96, alignItems: 'center' },
});
