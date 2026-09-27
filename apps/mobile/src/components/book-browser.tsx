/**
 * Search box + filters + results, shared by the search screen and each category screen.
 * Filters combine (e.g. فقه + غرفة الجلوس + متعدد المجلدات); active ones show as removable chips.
 */
import { Ionicons } from '@expo/vector-icons';
import { toArabicDigits, toFtsQuery } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import { useEffect, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookRow } from '@/components/book-row';
import { AppText } from '@/components/text';
import { count } from '@/lib/plural';
import { browseBooksQuery, categoriesWithCountsQuery, roomsQuery, type BrowseSort } from '@/db/queries';
import { fonts, radius, space, useColors } from '@/theme';

type Filters = { categoryId: string | null; roomId: string | null; volumes: 'single' | 'multi' | null; sort: BrowseSort };
const NO_FILTERS: Filters = { categoryId: null, roomId: null, volumes: null, sort: 'title' };

const SORTS: [BrowseSort, string][] = [
  ['title', 'أبجدياً'],
  ['recent', 'الأحدث إضافة'],
  ['volumes', 'الأكثر مجلدات'],
];
const VOLUMES: ['single' | 'multi', string][] = [
  ['single', 'مجلد واحد'],
  ['multi', 'متعدد المجلدات'],
];

export function BookBrowser({ categoryId, autoFocus, header }: { categoryId?: string; autoFocus?: boolean; header?: ReactNode }) {
  const c = useColors();
  const [term, setTerm] = useState('');
  const [fts, setFts] = useState('');
  const [filters, setFilters] = useState<Filters>({ ...NO_FILTERS, categoryId: categoryId ?? null });
  const [sheet, setSheet] = useState(false);
  const { data: rooms } = useLiveQuery(roomsQuery);
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);

  // Debounce typing so the query runs once the person pauses.
  useEffect(() => {
    const t = setTimeout(() => setFts(toFtsQuery(term)), 150);
    return () => clearTimeout(t);
  }, [term]);

  const q = { match: fts, ...filters };
  const { data: rows } = useLiveQuery(browseBooksQuery(q), [JSON.stringify(q)]);

  const active: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.categoryId && !categoryId)
    active.push({ label: cats?.find((x) => x.id === filters.categoryId)?.name ?? '', clear: { categoryId: null } });
  if (filters.roomId) active.push({ label: rooms?.find((x) => x.id === filters.roomId)?.name ?? '', clear: { roomId: null } });
  if (filters.volumes) active.push({ label: VOLUMES.find(([k]) => k === filters.volumes)![1], clear: { volumes: null } });
  const activeCount = active.length + (filters.sort !== 'title' ? 1 : 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.top}>
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: term ? c.accent : c.line }]}>
          <Ionicons name="search" size={20} color={term ? c.primary : c.textMuted} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            autoFocus={autoFocus}
            placeholder={categoryId ? 'ابحث في هذا التصنيف' : 'ابحث باسم الكتاب أو المؤلف أو المحقق'}
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text }]}
            returnKeyType="search"
          />
          {term ? (
            <Pressable onPress={() => setTerm('')} hitSlop={10} accessibilityLabel="مسح البحث">
              <Ionicons name="close-circle" size={20} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setSheet(true)}
          accessibilityRole="button"
          accessibilityLabel="تصفية وترتيب"
          style={({ pressed }) => [styles.filterBtn, { backgroundColor: activeCount ? c.primary : c.surface, borderColor: activeCount ? c.primary : c.line, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="options-outline" size={22} color={activeCount ? c.onPrimary : c.text} />
          {activeCount ? (
            <View style={[styles.badge, { backgroundColor: c.accent }]}>
              <AppText style={styles.badgeText}>{toArabicDigits(activeCount)}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {active.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
          {active.map((a) => (
            <Pressable key={a.label} onPress={() => setFilters((f) => ({ ...f, ...a.clear }))} style={[styles.activeChip, { backgroundColor: c.tint }]}>
              <AppText style={{ color: c.tintText, fontSize: 13 }}>{a.label}</AppText>
              <Ionicons name="close" size={14} color={c.tintText} />
            </Pressable>
          ))}
          <Pressable onPress={() => setFilters({ ...NO_FILTERS, categoryId: categoryId ?? null })} style={styles.clearAll}>
            <AppText style={{ color: c.accentText, fontSize: 13, fontFamily: fonts.semibold }}>مسح الكل</AppText>
          </Pressable>
        </ScrollView>
      ) : null}

      <FlatList
        data={rows ?? []}
        keyExtractor={(b) => b.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {header}
            <AppText variant="muted">
              {rows?.length ? count(rows.length, 'result') : 'لا توجد نتائج'}، الترتيب: {SORTS.find(([k]) => k === filters.sort)![1]}
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={c.textMuted} />
            <AppText variant="label">لا توجد نتائج</AppText>
            <AppText variant="muted" style={{ textAlign: 'center' }}>
              جرّب كلمة أخرى أو خفّف التصفية.
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <BookRow
            bookId={item.id}
            title={item.title}
            subtitle={[item.author, categoryId ? null : item.category, item.totalVolumes > 1 ? count(item.totalVolumes, 'volume') : null]
              .filter(Boolean)
              .join('، ')}
            href={{ pathname: '/book/[id]', params: { id: item.id } }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      />

      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        value={filters}
        onChange={setFilters}
        rooms={rooms ?? []}
        categories={categoryId ? null : (cats ?? [])}
        resetTo={{ ...NO_FILTERS, categoryId: categoryId ?? null }}
      />
    </View>
  );
}

function FilterSheet({
  visible,
  onClose,
  value,
  onChange,
  rooms,
  categories,
  resetTo,
}: {
  visible: boolean;
  onClose: () => void;
  value: Filters;
  onChange: (f: Filters) => void;
  rooms: { id: string; name: string }[];
  categories: { id: string; name: string }[] | null;
  resetTo: Filters;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="إغلاق" />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grabber, { backgroundColor: c.line }]} />
        <View style={styles.sheetHead}>
          <AppText variant="title">تصفية وترتيب</AppText>
          <Pressable onPress={() => onChange(resetTo)} hitSlop={8}>
            <AppText style={{ color: c.accentText, fontFamily: fonts.semibold }}>إعادة ضبط</AppText>
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: space.lg }}>
          <Group title="الترتيب">
            {SORTS.map(([k, label]) => (
              <Chip key={k} label={label} on={value.sort === k} onPress={() => set({ sort: k })} />
            ))}
          </Group>
          <Group title="الغرفة">
            <Chip label="الكل" on={!value.roomId} onPress={() => set({ roomId: null })} />
            {rooms.map((r) => (
              <Chip key={r.id} label={r.name} on={value.roomId === r.id} onPress={() => set({ roomId: r.id })} />
            ))}
          </Group>
          {categories ? (
            <Group title="التصنيف">
              <Chip label="الكل" on={!value.categoryId} onPress={() => set({ categoryId: null })} />
              {categories.map((x) => (
                <Chip key={x.id} label={x.name} on={value.categoryId === x.id} onPress={() => set({ categoryId: x.id })} />
              ))}
            </Group>
          ) : null}
          <Group title="عدد المجلدات">
            <Chip label="الكل" on={!value.volumes} onPress={() => set({ volumes: null })} />
            {VOLUMES.map(([k, label]) => (
              <Chip key={k} label={label} on={value.volumes === k} onPress={() => set({ volumes: k })} />
            ))}
          </Group>
        </ScrollView>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.apply, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
          <AppText variant="label" style={{ color: c.onPrimary, fontSize: 16 }}>
            عرض النتائج
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="label">{title}</AppText>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: on ? c.primary : c.background, borderColor: on ? c.primary : c.line, opacity: pressed ? 0.8 : 1 },
      ]}>
      {on ? <Ionicons name="checkmark" size={15} color={c.onPrimary} /> : null}
      <AppText style={{ color: on ? c.onPrimary : c.text, fontSize: 14 }}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 48 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, textAlign: 'right', paddingVertical: space.sm },
  filterBtn: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, left: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#241708', fontSize: 11, lineHeight: 16, fontFamily: fonts.semibold },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.pill },
  clearAll: { paddingHorizontal: space.sm, paddingVertical: 5 },
  list: { padding: space.lg, paddingBottom: 48 },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: 48 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1 },
  apply: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
