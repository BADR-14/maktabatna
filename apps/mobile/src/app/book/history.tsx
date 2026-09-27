/**
 * A book's edit history (`/book/history?id=`): who changed what and when, with the old value.
 * Any overwritten value can be put back with one tap (docs/PROJECT_BRIEF.md §3).
 */
import { Ionicons } from '@expo/vector-icons';
import { toArabicDigits } from '@maktabatna/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { shelfLabel } from '@/components/shelf-picker';
import { AppText } from '@/components/text';
import { useLiveQuery } from '@/db/live';
import { restoreBookField, RESTORABLE_FIELDS } from '@/db/mutations';
import { allShelvesQuery, bookHistoryQuery, categoriesWithCountsQuery } from '@/db/queries';
import { timeAgo } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

const FIELD_LABELS: Record<string, string> = {
  title: 'العنوان',
  categoryId: 'التصنيف',
  publisher: 'دار النشر',
  edition: 'الطبعة',
  totalVolumes: 'عدد المجلدات',
  notes: 'الملاحظات',
};

export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { user } = useSession();
  const { data: rows } = useLiveQuery(bookHistoryQuery(id), [id]);
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const { data: shelves } = useLiveQuery(allShelvesQuery);

  const catName = (v: string | null) => cats.find((x) => x.id === v)?.name ?? v;
  const place = (shelfId: string | null) => {
    const s = shelves.find((x) => x.shelfId === shelfId);
    return s ? `${s.roomName}، مكتبة ${toArabicDigits(s.bookcaseNumber)}، ${shelfLabel(s.kind, s.shelfNumber)}` : '—';
  };
  const show = (field: string, v: string | null) => {
    if (v === null || v === '') return 'فارغ';
    if (field === 'categoryId') return catName(v) ?? '—';
    if (field === 'totalVolumes') return toArabicDigits(v);
    return v;
  };

  // Moving a set logs every volume; show one line per move.
  const seen = new Set<string>();
  const items = (Array.isArray(rows) ? rows : []).filter((r) => {
    if (r.tableName !== 'volumes') return true;
    const k = `${r.changedAt}|${r.newValue}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const describe = (r: (typeof items)[number]): { icon: 'add-circle-outline' | 'create-outline' | 'trash-outline' | 'arrow-undo-outline' | 'swap-horizontal' | 'person-outline'; text: string } => {
    if (r.tableName === 'volumes') return { icon: 'swap-horizontal', text: `نُقل من ${place(r.oldValue)} إلى ${place(r.newValue)}` };
    if (r.tableName === 'loans') return r.field === '*' ? { icon: 'person-outline', text: `أُعير إلى ${r.newValue}` } : { icon: 'arrow-undo-outline', text: 'أُعيد من الإعارة' };
    if (r.field === '*') return { icon: 'add-circle-outline', text: r.newValue === 'imported' ? 'أُضيف من ملف' : 'أُضيف إلى المكتبة' };
    if (r.field === 'deletedAt') return r.newValue ? { icon: 'trash-outline', text: 'نُقل إلى سلة المحذوفات' } : { icon: 'arrow-undo-outline', text: 'استُعيد من السلة' };
    const label = FIELD_LABELS[r.field] ?? r.field;
    return { icon: 'create-outline', text: `${label}: «${show(r.field, r.oldValue)}» ← «${show(r.field, r.newValue)}»` };
  };

  const restore = (r: (typeof items)[number]) =>
    Alert.alert('استعادة القيمة القديمة', `سيعود ${FIELD_LABELS[r.field]} إلى «${show(r.field, r.oldValue)}».`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'استعادة', onPress: () => user && restoreBookField(id, r.field as never, r.oldValue, user.id) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'سجل التعديلات' }} />
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={
          <AppText variant="muted" style={{ textAlign: 'center', paddingVertical: 48 }}>
            لا توجد تعديلات مسجّلة بعد.
          </AppText>
        }
        renderItem={({ item }) => {
          const d = describe(item);
          const canRestore = item.tableName === 'books' && RESTORABLE_FIELDS.includes(item.field);
          return (
            <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Ionicons name={d.icon} size={20} color={c.accentText} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText>{d.text}</AppText>
                <AppText variant="muted">
                  {item.who ?? 'مستخدم'}، {timeAgo(item.changedAt)}
                </AppText>
              </View>
              {canRestore ? (
                <Pressable onPress={() => restore(item)} hitSlop={8} style={[styles.restore, { borderColor: c.accent }]}>
                  <AppText style={{ color: c.accentText, fontSize: 12, fontFamily: fonts.semibold }}>استعادة</AppText>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  restore: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
});
