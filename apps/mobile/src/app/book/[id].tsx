import { Ionicons } from '@expo/vector-icons';
import { PERSON_ROLES, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { BookCover } from '@/components/book-cover';
import { HeaderSearch } from '@/components/header-search';
import { PressLink } from '@/components/press-link';
import { ShelfPicker, shelfLabel } from '@/components/shelf-picker';
import { AppText } from '@/components/text';
import { Button } from '@/components/ui';
import { DEMO_USER_ID } from '@/db/demo';
import { addCopy, moveVolumes, trashBook } from '@/db/mutations';
import { bookLocationsQuery, bookPeopleQuery, bookQuery } from '@/db/queries';
import { count } from '@/lib/plural';
import { timeAgo } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

/** What the shelf picker sheet is for: moving one group of volumes, or placing a new copy. */
type Sheet = { kind: 'move'; copyId: string; fromShelfId: string } | { kind: 'copy' } | null;

/** Everything about one title, exactly where each of its volumes sits, and edit/delete. */
export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const { user } = useSession();
  const { data } = useLiveQuery(bookQuery(id), [id]);
  const { data: people } = useLiveQuery(bookPeopleQuery(id), [id]);
  const { data: places } = useLiveQuery(bookLocationsQuery(id), [id]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const row = data?.[0];
  if (!row) return <Stack.Screen options={{ title: '' }} />;
  const { book } = row;
  const copies = new Set((places ?? []).map((p) => p.copyId)).size;
  const trashed = book.deletedAt != null;

  const facts: [string, string | null][] = [
    ...(people ?? []).map((p): [string, string] => [
      PERSON_ROLES[p.role],
      p.deathYearHijri ? `${p.name} (ت ${toArabicDigits(p.deathYearHijri)}هـ)` : p.name,
    ]),
    ['التصنيف', row.category],
    ['دار النشر', book.publisher],
    ['الطبعة', book.edition],
    ['عدد المجلدات', toArabicDigits(book.totalVolumes)],
    ['النسخ في البيت', copies > 1 ? `${count(copies, 'copy')} (مكرر)` : toArabicDigits(copies)],
    ['ملاحظات', book.notes],
  ];

  const confirmDelete = () =>
    Alert.alert('حذف الكتاب', `سينتقل «${book.title}» بكل نسخه ومجلداته إلى سلة المحذوفات، ويمكنك استعادته لاحقاً.`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          if (!user) return;
          trashBook(book.id, user.id);
          router.back();
        },
      },
    ]);

  const pickShelf = (shelfId: string) => {
    if (!user || !sheet) return;
    if (sheet.kind === 'move') moveVolumes(sheet.copyId, sheet.fromShelfId, shelfId, user.id);
    else addCopy(book.id, { shelfId, placement: 'standing' }, user.id);
    setSheet(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: trashed
            ? undefined
            : () => (
                <View style={styles.actions}>
                  <HeaderSearch />
                  <HeaderIcon icon="create-outline" label="تعديل" onPress={() => router.push({ pathname: '/book/edit', params: { id: book.id } })} />
                  <HeaderIcon icon="trash-outline" label="حذف" onPress={confirmDelete} />
                </View>
              ),
        }}
      />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.head}>
          <BookCover
            bookId={book.id}
            title={book.title}
            author={people?.find((p) => p.role === 'author')?.name}
            width={118}
            volumes={book.totalVolumes}
          />
          <View style={{ flex: 1 }}>
            <AppText style={[styles.title, { color: c.text }]}>{book.title}</AppText>
            {trashed ? (
              <View style={[styles.pill, { backgroundColor: c.tint }]}>
                <AppText style={{ color: c.tintText, fontSize: 12 }}>في سلة المحذوفات</AppText>
              </View>
            ) : book.createdBy === DEMO_USER_ID ? (
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

        {trashed ? null : (
          <>
            <AppText style={styles.section}>أين يوجد؟</AppText>
            {(places ?? []).map((p) => {
              const vols =
                book.totalVolumes > 1 && p.fromVolume != null
                  ? p.fromVolume === p.toVolume
                    ? `المجلد ${toArabicDigits(p.fromVolume)}`
                    : `المجلدات ${toArabicDigits(p.fromVolume)}–${toArabicDigits(p.toVolume ?? 0)}`
                  : null;
              const href = { pathname: '/room/[id]' as const, params: { id: p.roomId, name: p.roomName, bookcase: p.bookcaseId, shelf: p.shelfId } };
              return (
                <View key={`${p.copyId}${p.shelfId}`} style={[styles.place, { backgroundColor: c.primary }]}>
                  <View style={styles.placeMain}>
                    <Ionicons name="location-outline" size={22} color={c.accent} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" style={{ color: c.onPrimary }}>
                        {p.roomName}، مكتبة {toArabicDigits(p.bookcaseNumber)}، {shelfLabel(p.shelfNumber === 0 ? 'top' : 'shelf', p.shelfNumber)}
                      </AppText>
                      <AppText style={{ color: c.onPrimary, opacity: 0.85, fontSize: 13 }}>
                        {[vols, p.placement === 'lying' ? 'موضوع أفقياً' : null, p.bookcaseName].filter(Boolean).join('، ')}
                      </AppText>
                    </View>
                  </View>
                  <View style={[styles.placeActions, { borderColor: 'rgba(255,255,255,0.18)' }]}>
                    <PressLink href={href} style={({ pressed }) => [styles.placeBtn, { opacity: pressed ? 0.7 : 1 }]}>
                      <Ionicons name="cube-outline" size={16} color={c.accent} />
                      <AppText style={[styles.placeBtnText, { color: c.accent }]}>أرني في الغرفة</AppText>
                    </PressLink>
                    <Pressable
                      onPress={() => setSheet({ kind: 'move', copyId: p.copyId, fromShelfId: p.shelfId })}
                      style={({ pressed }) => [styles.placeBtn, { opacity: pressed ? 0.7 : 1 }]}>
                      <Ionicons name="swap-horizontal" size={16} color={c.accent} />
                      <AppText style={[styles.placeBtnText, { color: c.accent }]}>نقل إلى رف آخر</AppText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            <Pressable
              onPress={() => setSheet({ kind: 'copy' })}
              style={({ pressed }) => [styles.addCopy, { borderColor: c.accent, opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="add" size={18} color={c.accentText} />
              <AppText style={{ color: c.accentText, fontFamily: fonts.semibold }}>لدينا نسخة أخرى من هذا الكتاب</AppText>
            </Pressable>
          </>
        )}
      </ScrollView>

      <ShelfSheet
        title={sheet?.kind === 'copy' ? 'مكان النسخة الجديدة' : 'نقل إلى رف آخر'}
        visible={!!sheet}
        onClose={() => setSheet(null)}
        onPick={pickShelf}
        initial={sheet?.kind === 'move' ? sheet.fromShelfId : null}
      />
    </>
  );
}

function ShelfSheet({
  title,
  visible,
  onClose,
  onPick,
  initial,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  onPick: (shelfId: string) => void;
  initial: string | null;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [shelf, setShelf] = useState<string | null>(null);
  const value = shelf ?? initial;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent onShow={() => setShelf(null)}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="إغلاق" />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
        <AppText variant="title">{title}</AppText>
        <ScrollView style={{ maxHeight: 420 }}>
          <ShelfPicker value={value} onChange={setShelf} />
        </ScrollView>
        <Button title="تأكيد" disabled={!value || value === initial} onPress={() => value && onPick(value)} />
      </View>
    </Modal>
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: 'create-outline' | 'trash-outline'; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.headerIcon}>
      <Ionicons name={icon} size={22} color={c.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 4 },
  headerIcon: { padding: 6 },
  head: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-end' },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 40 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space.lg },
  fact: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  section: { fontFamily: fonts.display, fontSize: 20, lineHeight: 30 },
  place: { borderRadius: radius.md + 2, overflow: 'hidden' },
  placeMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  placeActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  placeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.md },
  placeBtnText: { fontSize: 13, fontFamily: fonts.semibold },
  addCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.lg, gap: space.lg },
});
