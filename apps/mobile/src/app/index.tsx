import { formatArabicNumber, toFtsQuery } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Spines } from '@/components/auth-shell';
import { BookRow } from '@/components/book-row';
import { AppText } from '@/components/text';
import { deleteDemoData, demoCountQuery } from '@/db/demo';
import { categoriesWithCountsQuery, recentBooksQuery, roomsSummaryQuery, searchBooksQuery, statsQuery } from '@/db/queries';
import { timeAgo } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

type Hit = Awaited<ReturnType<typeof searchBooksQuery>>[number];

export default function Home() {
  const c = useColors();
  const { user, signOut } = useSession();
  const { data: rooms } = useLiveQuery(roomsSummaryQuery);
  const { data: stats } = useLiveQuery(statsQuery);
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const { data: recent } = useLiveQuery(recentBooksQuery);
  const { data: demo } = useLiveQuery(demoCountQuery);
  const [term, setTerm] = useState('');
  const [found, setFound] = useState<{ fts: string; rows: Hit[] }>({ fts: '', rows: [] });
  const fts = toFtsQuery(term);

  // Search as you type (FTS5 on the phone: instant, works offline).
  useEffect(() => {
    if (!fts) return;
    let live = true;
    const t = setTimeout(() => {
      searchBooksQuery(fts)
        .then((rows) => live && setFound({ fts, rows }))
        .catch(() => live && setFound({ fts, rows: [] }));
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [fts]);
  // null = not searching; while a new query runs, keep showing the previous results.
  const hits: Hit[] | null = fts ? found.rows : null;

  const s = stats?.[0];
  const demoCount = Number(demo?.[0]?.n ?? 0);

  const confirmSignOut = () =>
    Alert.alert('تسجيل الخروج', 'متأكد بدك تطلع من حسابك؟', [
      { text: 'لأ', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  const confirmDeleteDemo = () =>
    Alert.alert('مسح البيانات التجريبية', 'رح تنمسح كل الكتب التجريبية. كتبكم الحقيقية ما بتتأثر.', [
      { text: 'لأ', style: 'cancel' },
      { text: 'امسح', style: 'destructive', onPress: () => deleteDemoData() },
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
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* 1. Greeting */}
        <View>
          <AppText variant="title">أهلاً {user?.displayName}</AppText>
          <AppText variant="muted">شو بدك تلاقي اليوم؟</AppText>
        </View>

        {/* 2. Search */}
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: term ? c.accent : c.line }]}>
          <AppText style={{ color: c.textMuted, fontSize: 18 }}>⌕</AppText>
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="ابحث باسم الكتاب أو المؤلف أو المحقق"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
          />
          {term ? (
            <Pressable onPress={() => setTerm('')} hitSlop={10}>
              <AppText style={{ color: c.textMuted }}>✕</AppText>
            </Pressable>
          ) : null}
        </View>
        {hits ? (
          <View style={{ gap: space.sm }}>
            {hits.length === 0 ? (
              <AppText variant="muted">ما لقيت شي بهالاسم.</AppText>
            ) : (
              hits.map((h) => (
                <BookRow
                  key={h.id}
                  bookId={h.id}
                  title={h.title}
                  subtitle={[h.author, h.category].filter(Boolean).join(' · ')}
                  href={{ pathname: '/book/[id]', params: { id: h.id } }}
                />
              ))
            )}
          </View>
        ) : (
          <>
            {/* 3. Rooms */}
            <View style={styles.rooms}>
              {(rooms ?? []).map((room) => (
                <Link key={room.id} href={{ pathname: '/room/[id]', params: { id: room.id, name: room.name } }} asChild>
                  <Pressable style={({ pressed }) => [styles.roomCard, { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 }]}>
                    <Spines height={40} />
                    <AppText style={[styles.roomName, { color: c.onPrimary }]}>{room.name}</AppText>
                    <AppText style={{ color: c.onPrimary, opacity: 0.85, fontSize: 13 }}>
                      {formatArabicNumber(room.bookcaseCount)} مكتبات · {formatArabicNumber(room.volumeCount)} مجلد
                    </AppText>
                    <View style={[styles.enter, { backgroundColor: c.accent }]}>
                      <AppText variant="label" style={{ color: '#241708', fontSize: 13 }}>
                        ادخل ←
                      </AppText>
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>

            {/* 4. Numbers */}
            <View style={styles.stats}>
              {[
                ['كتاب', s?.books],
                ['مجلد', s?.volumes],
                ['مؤلف', s?.authors],
                ['مكرر', s?.duplicates],
              ].map(([label, n]) => (
                <View key={label as string} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <AppText style={[styles.statNum, { color: c.primary }]}>{formatArabicNumber(Number(n ?? 0))}</AppText>
                  <AppText variant="muted">{label as string}</AppText>
                </View>
              ))}
            </View>

            {/* 5. Categories */}
            <View style={{ gap: space.sm }}>
              <AppText variant="label" style={{ fontSize: 17 }}>
                التصنيفات
              </AppText>
              <View style={styles.cats}>
                {(cats ?? []).map((cat) => (
                  <Link key={cat.id} href={{ pathname: '/category/[id]', params: { id: cat.id } }} asChild>
                    <Pressable
                      style={({ pressed }) => [styles.cat, { backgroundColor: c.tint, opacity: pressed ? 0.7 : 1 }]}>
                      <AppText variant="label" style={{ color: c.tintText, fontSize: 14 }}>
                        {cat.name}
                      </AppText>
                      <AppText style={{ color: c.tintText, fontSize: 13, opacity: 0.8 }}>{formatArabicNumber(Number(cat.count))}</AppText>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>

            {/* 6. Recently added */}
            <View style={{ gap: space.sm }}>
              <AppText variant="label" style={{ fontSize: 17 }}>
                آخر الكتب يلي انضافت
              </AppText>
              {(recent ?? []).length === 0 ? (
                <AppText variant="muted">لسا ما انضاف ولا كتاب.</AppText>
              ) : (
                (recent ?? []).map((b) => (
                  <BookRow
                    key={b.id}
                    bookId={b.id}
                    title={b.title}
                    subtitle={`${b.author ?? ''}${b.author ? ' · ' : ''}أضافه ${b.addedBy ?? '—'} ${timeAgo(b.createdAt)}`}
                    href={{ pathname: '/book/[id]', params: { id: b.id } }}
                  />
                ))
              )}
            </View>

            {demoCount > 0 ? (
              <View style={[styles.demo, { borderColor: c.accent, backgroundColor: c.surface }]}>
                <AppText variant="label">هي بيانات تجريبية</AppText>
                <AppText variant="muted">
                  {formatArabicNumber(demoCount)} كتاب للعرض بس، مشان تشوف كيف بيشتغل التطبيق. امسحها لما تبلش تدخّل كتبكم.
                </AppText>
                <Pressable onPress={confirmDeleteDemo} hitSlop={6}>
                  <AppText variant="label" style={{ color: c.accentText }}>
                    امسح البيانات التجريبية
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.xl, paddingBottom: 48 },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, textAlign: 'right', paddingVertical: space.sm },
  rooms: { flexDirection: 'row', gap: space.md },
  roomCard: {
    flex: 1,
    borderRadius: radius.md + 6,
    padding: space.lg,
    gap: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  roomName: { fontFamily: fonts.display, fontSize: 26, lineHeight: 40, marginTop: space.sm },
  enter: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, marginTop: space.sm },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  statNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 36 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cat: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill },
  demo: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: space.lg, gap: space.xs },
});
