import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatArabicNumber } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { Avatar } from '@/components/avatar';
import { BookCover } from '@/components/book-cover';
import { AddBookFab } from '@/components/fab';
import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { deleteDemoData, demoCountQuery } from '@/db/demo';
import { categoriesWithCountsQuery, recentBooksQuery, roomsSummaryQuery, statsQuery } from '@/db/queries';
import { categoryLook } from '@/lib/category-look';
import { count } from '@/lib/plural';
import { hash01 } from '@/three/room-scene';
import { fonts, radius, space, useColors, type Palette } from '@/theme';

const COVER_W = 104;

export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useSession();
  const { data: rooms } = useLiveQuery(roomsSummaryQuery);
  const { data: stats } = useLiveQuery(statsQuery);
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const { data: recent } = useLiveQuery(recentBooksQuery);
  const { data: demo } = useLiveQuery(demoCountQuery);
  const s = stats?.[0];
  const demoCount = Number(demo?.[0]?.n ?? 0);

  const confirmSignOut = () =>
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  const confirmDeleteDemo = () =>
    Alert.alert('حذف البيانات التجريبية', 'ستُحذف جميع الكتب التجريبية، ولن تتأثر كتبكم الحقيقية.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => user && deleteDemoData(user.id) },
    ]);

  const greeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* 1. Greeting + 2. Search, on the burgundy header */}
        <LinearGradient colors={[c.primary, shade(c.primary)]} style={[styles.hero, { paddingTop: insets.top + space.md }]}>
          <View style={styles.heroTop}>
            <PressLink href="/profile" accessibilityLabel="الملف الشخصي" hitSlop={6}>
              {user ? <Avatar userId={user.id} name={user.displayName} size={48} ring={c.accent} /> : null}
            </PressLink>
            <View style={{ flex: 1 }}>
              <AppText style={{ color: c.onPrimary, opacity: 0.8, fontSize: 13 }}>{greeting}</AppText>
              <AppText style={[styles.hello, { color: c.onPrimary }]} numberOfLines={1}>
                {user?.displayName}
              </AppText>
            </View>
            <Pressable
              onPress={confirmSignOut}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="تسجيل الخروج"
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: pressed ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)',
                },
              ]}>
              <Ionicons name="log-out-outline" size={22} color={c.onPrimary} style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
          </View>

          <PressLink href="/search" accessibilityRole="search" style={({ pressed }) => [styles.search, { backgroundColor: c.surface, opacity: pressed ? 0.92 : 1 }]}>
            <Ionicons name="search" size={20} color={c.textMuted} />
            <AppText style={{ flex: 1, color: c.textMuted }} numberOfLines={1}>
              ابحث باسم الكتاب أو المؤلف أو المحقق
            </AppText>
            <Ionicons name="options-outline" size={20} color={c.accentText} />
          </PressLink>
        </LinearGradient>


          <>
            {/* 3. Numbers: one card overlapping the header */}
            <PressLink
              href="/stats"
              accessibilityLabel="الإحصائيات"
              style={({ pressed }) => [styles.stats, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 }]}>
              {(
                [
                  ['book-outline', s?.books, 'العناوين'],
                  ['layers-outline', s?.volumes, 'المجلدات'],
                  ['people-outline', s?.authors, 'المؤلفون'],
                  ['copy-outline', s?.duplicates, 'المكرّرة'],
                ] as const
              ).map(([icon, n, label], i) => (
                <View
                  key={label}
                  style={[
                    styles.stat,
                    i > 0 && {
                      borderStartWidth: StyleSheet.hairlineWidth,
                      borderColor: c.line,
                    },
                  ]}>
                  <Ionicons name={icon} size={18} color={c.accentText} />
                  <AppText style={[styles.statNum, { color: c.text }]}>{formatArabicNumber(Number(n ?? 0))}</AppText>
                  <AppText variant="muted" style={{ fontSize: 12 }}>
                    {label}
                  </AppText>
                </View>
              ))}
            </PressLink>

            <View style={styles.body}>
              {/* 4. Rooms */}
              <Section title="الغرف" />
              <View style={{ gap: space.md }}>
                {(rooms ?? []).map((room, i) => (
                  <RoomCard key={room.id} room={room} tone={i} c={c} />
                ))}
              </View>

              {/* 5. Categories */}
              <Section title="التصنيفات" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {(cats ?? []).map((cat, i) => {
                const look = categoryLook(cat.name, i);
                const n = Number(cat.count);
                return (
                  <PressLink
                    key={cat.id}
                    href={{
                      pathname: '/category/[id]',
                      params: { id: cat.id },
                    }}
                    style={({ pressed }) => [
                      styles.cat,
                      {
                        backgroundColor: c.surface,
                        borderColor: c.line,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}>
                    <View style={[styles.catIcon, { backgroundColor: look.color }]}>
                      <MaterialCommunityIcons name={look.icon} size={22} color="#FFF6EA" />
                    </View>
                    <AppText variant="label" numberOfLines={2} style={styles.catName}>
                      {cat.name}
                    </AppText>
                    <AppText variant="muted" style={{ fontSize: 12 }}>
                      {n === 0 ? 'لا توجد كتب' : count(n, 'book')}
                    </AppText>
                  </PressLink>
                );
              })}
            </ScrollView>

            {/* 6. Recently added, as covers */}
            <View style={styles.body}>
              <Section title="أُضيف مؤخراً" />
            </View>
            {(recent ?? []).length === 0 ? (
              <View style={styles.body}>
                <AppText variant="muted">لم يُضَف أي كتاب بعد.</AppText>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {(recent ?? []).map((b) => (
                  <PressLink
                    key={b.id}
                    href={{ pathname: '/book/[id]', params: { id: b.id } }}
                    style={({ pressed }) => [{ width: COVER_W, gap: 6, opacity: pressed ? 0.8 : 1 }]}>
                    <BookCover bookId={b.id} title={b.title} author={b.author} width={COVER_W} volumes={b.totalVolumes} />
                    <View>
                      <AppText variant="label" numberOfLines={2} style={{ fontSize: 13, lineHeight: 20 }}>
                        {b.title}
                      </AppText>
                      {b.author ? (
                        <AppText variant="muted" numberOfLines={1} style={{ fontSize: 11, lineHeight: 17 }}>
                          {b.author}
                        </AppText>
                      ) : null}
                    </View>
                  </PressLink>
                ))}
              </ScrollView>
            )}

            {demoCount > 0 ? (
              <View style={styles.body}>
                <View style={[styles.demo, { backgroundColor: c.tint }]}>
                  <Ionicons name="flask-outline" size={22} color={c.tintText} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="label" style={{ color: c.tintText }}>
                      هذه بيانات تجريبية
                    </AppText>
                    <AppText variant="muted">
                      {count(demoCount, 'book')} للعرض فقط. احذفها عندما تبدأ بإدخال كتبكم، ولن تتأثر كتبكم الحقيقية.
                    </AppText>
                    <Pressable onPress={confirmDeleteDemo} hitSlop={8} style={styles.demoBtn}>
                      <Ionicons name="trash-outline" size={16} color={c.tintText} />
                      <AppText variant="label" style={{ color: c.tintText, fontSize: 14 }}>
                        حذف البيانات التجريبية
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </>

      </ScrollView>
      <AddBookFab href="/book/edit" />
    </>
  );
}

function Section({ title }: { title: string }) {
  return <AppText style={styles.section}>{title}</AppText>;
}

type Room = {
  id: string;
  name: string;
  bookcaseCount: number;
  volumeCount: number;
};

/** A whole-card button per room: name and numbers, with a drawn wall of bookcases. */
function RoomCard({ room, tone, c }: { room: Room; tone: number; c: Palette }) {
  const router = useRouter();
  const colors: [string, string] = tone % 2 ? ['#2B3A34', '#17221E'] : [c.primary, shade(c.primary)];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${room.name}، ${count(Number(room.bookcaseCount), 'bookcase')}`}
      onPress={() =>
        router.push({
          pathname: '/room/[id]',
          params: { id: room.id, name: room.name },
        })
      }
      style={({ pressed }) => [styles.roomWrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.room}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText style={[styles.roomName, { color: '#FBEEE6' }]}>{room.name}</AppText>
          <AppText style={{ color: '#FBEEE6', opacity: 0.8, fontSize: 13 }}>
            {count(Number(room.bookcaseCount), 'bookcase')}، {count(Number(room.volumeCount), 'volume')}
          </AppText>
          <View style={styles.room3d}>
            <MaterialCommunityIcons name="cube-outline" size={14} color="#E7C98C" />
            <AppText
              style={{
                color: '#E7C98C',
                fontSize: 12,
                fontFamily: fonts.semibold,
              }}>
              تصفّح بالمجسّم
            </AppText>
          </View>
        </View>
        <ShelfArt units={Number(room.bookcaseCount)} seed={room.id} />
        <View style={styles.roomGo}>
          <Ionicons name="chevron-back" size={18} color="#FBEEE6" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const ART_SPINES = ['#D6AE63', '#E6DCC3', '#8C2A24', '#1D2742', '#5B7F6A', '#B98D45', '#F3E6CC', '#3B2419'];

/** A small wall of bookcases, three shelves each, filled with spines. Plain Views, drawn once. */
function ShelfArt({ units, seed }: { units: number; seed: string }) {
  const shown = Math.min(units, 4);
  return (
    <View style={[styles.art, { direction: 'ltr' }]}>
      {Array.from({ length: shown }, (_, u) => (
        <View key={u} style={styles.artUnit}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.artShelf}>
              {Array.from({ length: 5 }, (_, k) => {
                const h = hash01(seed, u * 31 + row * 7 + k);
                return (
                  <View
                    key={k}
                    style={{
                      width: 3,
                      height: 9 + h * 5,
                      backgroundColor: ART_SPINES[Math.floor(h * 97) % ART_SPINES.length],
                      borderRadius: 1,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** A deeper tone of a #RRGGBB colour, for gradients. */
function shade(hex: string, k = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.round(v * k)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: space.lg,
    paddingBottom: 56,
    gap: space.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 34 },
  hello: { fontFamily: fonts.display, fontSize: 24, lineHeight: 36 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md + 2,
    paddingHorizontal: space.lg,
    minHeight: 50,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'right',
    paddingVertical: space.sm,
  },
  stats: {
    flexDirection: 'row',
    marginHorizontal: space.lg,
    marginTop: -36,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34 },
  body: { paddingHorizontal: space.lg, gap: space.md },
  section: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 32,
    marginTop: space.xl,
  },
  roomWrap: {
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: 20,
    minHeight: 124,
    overflow: 'hidden',
  },
  roomName: { fontFamily: fonts.display, fontSize: 28, lineHeight: 42 },
  room3d: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  roomGo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  art: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  artUnit: {
    padding: 3,
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(214,174,99,0.45)',
  },
  artShelf: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(214,174,99,0.6)',
    paddingHorizontal: 1,
  },
  rail: { paddingHorizontal: space.lg, gap: space.md, paddingVertical: 4 },
  cat: {
    width: 118,
    padding: space.md,
    gap: 6,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 1,
  },
  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 14, lineHeight: 21, minHeight: 42 },
  demo: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md + 4,
    marginTop: space.xl,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.sm,
    alignSelf: 'flex-start',
  },
});
