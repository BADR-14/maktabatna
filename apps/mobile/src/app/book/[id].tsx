import { PERSON_ROLES, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { DEMO_USER_ID } from '@/db/demo';
import { bookLocationsQuery, bookPeopleQuery, bookQuery } from '@/db/queries';
import { spineHex } from '@/lib/spine';
import { timeAgo } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

/** Everything about one title, and exactly where each of its volumes sits. */
export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { data } = useLiveQuery(bookQuery(id), [id]);
  const { data: people } = useLiveQuery(bookPeopleQuery(id), [id]);
  const { data: places } = useLiveQuery(bookLocationsQuery(id), [id]);
  const row = data?.[0];
  if (!row) return <Stack.Screen options={{ title: '' }} />;
  const { book } = row;
  const copies = new Set((places ?? []).map((p) => p.copyId)).size;

  const facts: [string, string | null][] = [
    ...(people ?? []).map((p): [string, string] => [
      PERSON_ROLES[p.role],
      p.deathYearHijri ? `${p.name} (ت ${toArabicDigits(p.deathYearHijri)}هـ)` : p.name,
    ]),
    ['التصنيف', row.category],
    ['دار النشر', book.publisher],
    ['الطبعة', book.edition],
    ['عدد المجلدات', toArabicDigits(book.totalVolumes)],
    ['النسخ بالبيت', copies > 1 ? `${toArabicDigits(copies)} نسخ (مكرر)` : toArabicDigits(copies || 0)],
    ['ملاحظات', book.notes],
  ];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.head}>
        <View style={[styles.spine, { backgroundColor: spineHex(book.id) }]}>
          <View style={[styles.band, { backgroundColor: c.accent }]} />
          <View style={[styles.band, { backgroundColor: c.accent, marginTop: 'auto' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={[styles.title, { color: c.text }]}>{book.title}</AppText>
          {book.createdBy === DEMO_USER_ID ? (
            <View style={[styles.pill, { backgroundColor: c.tint }]}>
              <AppText style={{ color: c.tintText, fontSize: 12 }}>كتاب تجريبي</AppText>
            </View>
          ) : (
            <AppText variant="muted">
              أضافه {row.addedBy ?? '—'} {timeAgo(book.createdAt)}
            </AppText>
          )}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        {facts
          .filter(([, v]) => v)
          .map(([k, v], i) => (
            <View key={`${k}${i}`} style={[styles.fact, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line }]}>
              <AppText variant="muted" style={{ width: 110 }}>
                {k}
              </AppText>
              <AppText style={{ flex: 1 }}>{v}</AppText>
            </View>
          ))}
      </View>

      <AppText variant="label" style={{ fontSize: 17 }}>
        وين موجود؟
      </AppText>
      {(places ?? []).map((p) => {
        const where = p.shelfNumber === 0 ? 'فوق المكتبة' : `الرف ${toArabicDigits(p.shelfNumber)}`;
        const vols =
          book.totalVolumes > 1 && p.fromVolume != null
            ? p.fromVolume === p.toVolume
              ? `المجلد ${toArabicDigits(p.fromVolume)}`
              : `المجلدات ${toArabicDigits(p.fromVolume)}–${toArabicDigits(p.toVolume ?? 0)}`
            : null;
        return (
          <Link
            key={`${p.copyId}${p.shelfId}`}
            href={{ pathname: '/room/[id]', params: { id: p.roomId, name: p.roomName, bookcase: p.bookcaseId, shelf: p.shelfId } }}
            asChild>
            <Pressable style={({ pressed }) => [styles.place, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ color: c.onPrimary }}>
                  {p.roomName} · مكتبة {toArabicDigits(p.bookcaseNumber)} · {where}
                </AppText>
                <AppText style={{ color: c.onPrimary, opacity: 0.85, fontSize: 13 }}>
                  {[vols, p.placement === 'lying' ? 'ممدود بين الكتب' : null, p.bookcaseName].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <AppText variant="label" style={{ color: c.accent }}>
                ورجيني ←
              </AppText>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, paddingBottom: 40 },
  head: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  spine: { width: 26, height: 96, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 4 },
  band: { height: 3, borderRadius: 2 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 40 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space.lg },
  fact: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  place: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md },
});
