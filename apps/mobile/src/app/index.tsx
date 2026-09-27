import { formatArabicNumber } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, Stack } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Spines } from '@/components/auth-shell';
import { AppText } from '@/components/text';
import { roomsSummaryQuery } from '@/db/queries';
import { fonts, radius, space, useColors } from '@/theme';

/** Home: pick a room to walk into. */
export default function Home() {
  const c = useColors();
  const { user, signOut } = useSession();
  const { data: rooms } = useLiveQuery(roomsSummaryQuery);
  const totalBooks = (rooms ?? []).reduce((n, r) => n + r.volumeCount, 0);

  const confirmSignOut = () =>
    Alert.alert('تسجيل الخروج', 'متأكد بدك تطلع من حسابك؟', [
      { text: 'لأ', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirmSignOut} hitSlop={10}>
              <AppText style={{ color: c.onPrimary, fontSize: 14 }}>خروج</AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.greeting}>
          <AppText variant="title">أهلاً {user?.displayName}</AppText>
          <AppText variant="muted">
            {formatArabicNumber(totalBooks)} كتاب بالمكتبة · اختار الغرفة
          </AppText>
        </View>

        {(rooms ?? []).map((room) => (
          <Link key={room.id} href={{ pathname: '/room/[id]', params: { id: room.id, name: room.name } }} asChild>
            <Pressable style={({ pressed }) => [styles.card, { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 }]}>
              <View style={styles.cardText}>
                <AppText style={[styles.roomName, { color: c.onPrimary }]}>{room.name}</AppText>
                <AppText style={{ color: c.onPrimary, opacity: 0.85 }}>
                  {formatArabicNumber(room.bookcaseCount)} مكتبات · {formatArabicNumber(room.volumeCount)} كتاب
                </AppText>
              </View>
              <View style={[styles.shelf, { borderColor: c.accent }]}>
                <Spines height={54} />
              </View>
              <View style={[styles.enter, { backgroundColor: c.accent }]}>
                <AppText variant="label" style={{ color: '#241708', fontSize: 14 }}>
                  ادخل الغرفة ←
                </AppText>
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg },
  greeting: { gap: 2, marginBottom: space.xs },
  card: {
    borderRadius: radius.md + 6,
    padding: space.xl,
    gap: space.lg,
    minHeight: 190,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardText: { gap: 2 },
  roomName: { fontFamily: fonts.display, fontSize: 34, lineHeight: 52 },
  shelf: { borderBottomWidth: 4, alignSelf: 'flex-start', paddingHorizontal: space.sm },
  enter: { alignSelf: 'flex-start', paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill },
});
