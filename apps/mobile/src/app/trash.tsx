import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from '@/db/live';
import { Stack } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { BookCover } from '@/components/book-cover';
import { AppText } from '@/components/text';
import { restoreBook } from '@/db/mutations';
import { trashQuery } from '@/db/queries';
import { timeAgo } from '@/lib/time';
import { radius, space, useColors } from '@/theme';

/** Deleted titles, with their copies and volumes, until someone restores them. */
export default function TrashScreen() {
  const c = useColors();
  const { user } = useSession();
  const { data } = useLiveQuery(trashQuery);

  const restore = (id: string, title: string) =>
    Alert.alert('استعادة الكتاب', `ستعود «${title}» بكل نسخها ومجلداتها إلى أماكنها.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'استعادة', onPress: () => user && restoreBook(id, user.id) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'سلة المحذوفات' }} />
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trash-outline" size={44} color={c.textMuted} />
            <AppText variant="label">السلة فارغة</AppText>
            <AppText variant="muted" style={{ textAlign: 'center' }}>
              الكتب المحذوفة تظهر هنا، ويمكن استعادتها في أي وقت.
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.line }]}>
            <BookCover bookId={item.id} title={item.title} width={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="muted" numberOfLines={1}>
                {[item.author, `حُذف ${timeAgo(item.deletedAt ?? 0)}`].filter(Boolean).join('، ')}
              </AppText>
            </View>
            <Pressable
              onPress={() => restore(item.id, item.title)}
              style={({ pressed }) => [styles.restore, { borderColor: c.accent, opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="arrow-undo-outline" size={16} color={c.accentText} />
              <AppText style={{ color: c.accentText, fontSize: 13 }}>استعادة</AppText>
            </Pressable>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 48 },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: 64, paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  restore: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
});
