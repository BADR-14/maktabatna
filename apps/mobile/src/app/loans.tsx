/** Who has which book: open loans first, with the ones past their return date marked. */
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { BookCover } from '@/components/book-cover';
import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { useLiveQuery } from '@/db/live';
import { returnLoan } from '@/db/mutations';
import { loansQuery } from '@/db/queries';
import { formatDate } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

export default function LoansScreen() {
  const c = useColors();
  const { user } = useSession();
  const { data } = useLiveQuery(loansQuery);
  const [now] = useState(() => Date.now());

  const markReturned = (id: string, title: string, borrower: string) =>
    Alert.alert('إعادة الكتاب', `هل أعاد ${borrower} «${title}»؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم، أُعيد', onPress: () => user && returnLoan(id, user.id) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'الإعارات' }} />
      <FlatList
        data={data}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={44} color={c.textMuted} />
            <AppText variant="label">لا توجد إعارات</AppText>
            <AppText variant="muted" style={{ textAlign: 'center' }}>
              لإعارة كتاب افتح صفحته واضغط «إعارة هذا الكتاب».
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          const open = !item.returnedAt;
          const late = open && item.dueAt != null && item.dueAt < now;
          return (
            <PressLink
              href={{ pathname: '/book/[id]', params: { id: item.bookId } }}
              style={({ pressed }) => [styles.row, { backgroundColor: c.surface, borderColor: late ? '#B3261E' : c.line, opacity: pressed ? 0.8 : open ? 1 : 0.6 }]}>
              <BookCover bookId={item.bookId} title={item.title} width={40} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="muted" numberOfLines={2}>
                  {open
                    ? `عند ${item.borrower} منذ ${formatDate(item.loanedAt)}${item.dueAt ? `، يُعاد في ${formatDate(item.dueAt)}` : ''}`
                    : `أعاده ${item.borrower} في ${formatDate(item.returnedAt!)}`}
                </AppText>
                {late ? <AppText style={{ color: '#B3261E', fontSize: 12, fontFamily: fonts.semibold }}>تأخّر عن موعد الإعادة</AppText> : null}
              </View>
              {open ? (
                <Pressable onPress={() => markReturned(item.id, item.title, item.borrower)} hitSlop={8} style={[styles.back, { borderColor: c.accent }]}>
                  <AppText style={{ color: c.accentText, fontSize: 12, fontFamily: fonts.semibold }}>أُعيد</AppText>
                </Pressable>
              ) : null}
            </PressLink>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 48 },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: 64, paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1 },
  back: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
});
