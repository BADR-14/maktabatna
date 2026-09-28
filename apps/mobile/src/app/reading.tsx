/**
 * The reading hub: my progress, points, streak and badges; the family board and challenges;
 * and, for the parents, managing challenges, points and badge rewards.
 */
import { Ionicons } from '@expo/vector-icons';
import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { Stack } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/book-browser';
import { BookCover } from '@/components/book-cover';
import { PressLink } from '@/components/press-link';
import { ProgressBar, Sheet } from '@/components/reading-ui';
import { AppText } from '@/components/text';
import { Button, Field } from '@/components/ui';
import { useLiveQuery } from '@/db/live';
import { categoriesWithCountsQuery } from '@/db/queries';
import { deleteChallenge, localDay, saveChallenge, saveMotivation, type ChallengeInput } from '@/db/reading';
import { allLogsQuery, allReadingsQuery, challengesQuery, motivationQuery, readersQuery } from '@/db/reading-queries';
import { count } from '@/lib/plural';
import { BADGES, challengeProgress, userStats, type Motivation } from '@/lib/reading-stats';
import { formatDate } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

type Tab = 'mine' | 'family' | 'admin';

export default function ReadingScreen() {
  const c = useColors();
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>('mine');
  const { data: readings } = useLiveQuery(allReadingsQuery);
  const { data: logs } = useLiveQuery(allLogsQuery);
  const { data: readers } = useLiveQuery(readersQuery);
  const { data: challenges } = useLiveQuery(challengesQuery);
  const { data: mot } = useLiveQuery(motivationQuery);
  if (!user) return null;
  const m: Motivation = {
    pointsPerPage: mot[0]?.pointsPerPage ?? 1,
    pointsPerBook: mot[0]?.pointsPerBook ?? 50,
    badgeRewards: safeJson(mot[0]?.badgeRewards),
  };
  const today = localDay();
  const rows = readings.map((r) => ({ ...r, status: r.status as 'reading' | 'finished' | 'partial' | 'abandoned' }));
  const tabs: [Tab, string][] = [
    ['mine', 'قراءتي'],
    ['family', 'العائلة'],
    ...(user.isAdmin ? ([['admin', 'الإدارة']] as [Tab, string][]) : []),
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'القراءة' }} />
      <View style={[styles.tabs, { borderColor: c.line, backgroundColor: c.surface }]}>
        {tabs.map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { borderBottomColor: c.primary }]}>
            <AppText style={{ fontFamily: fonts.semibold, color: tab === k ? c.primary : c.textMuted }}>{label}</AppText>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        {tab === 'mine' ? (
          <Mine userId={user.id} rows={rows} logs={logs} m={m} today={today} goals={readers.find((r) => r.id === user.id)} />
        ) : tab === 'family' ? (
          <Family userId={user.id} rows={rows} logs={logs} m={m} today={today} readers={readers} challenges={challenges} />
        ) : (
          <Admin userId={user.id} challenges={challenges} m={m} />
        )}
      </ScrollView>
    </>
  );
}

type Rows = Awaited<typeof allReadingsQuery>[number] & { status: 'reading' | 'finished' | 'partial' | 'abandoned' };
type Logs = Awaited<typeof allLogsQuery>;

function Mine({
  userId,
  rows,
  logs,
  m,
  today,
  goals,
}: {
  userId: string;
  rows: Rows[];
  logs: Logs;
  m: Motivation;
  today: string;
  goals?: { dailyPagesGoal: number | null; monthlyBooksGoal: number | null };
}) {
  const c = useColors();
  const s = userStats(userId, rows, logs, m, today);
  const current = rows.filter((r) => r.userId === userId && r.status === 'reading');
  const done = rows.filter((r) => r.userId === userId && r.status !== 'reading');
  return (
    <>
      <View style={styles.tiles}>
        <Tile icon="star-outline" value={s.points} label="نقاطي" />
        <Tile icon="flame-outline" value={s.streak} label="أيام متتالية" />
        <Tile icon="document-text-outline" value={s.pagesMonth} label="صفحات الشهر" />
        <Tile icon="checkmark-done-outline" value={s.books} label="كتب أنهيتها" />
      </View>

      {goals?.dailyPagesGoal || goals?.monthlyBooksGoal ? (
        <Card title="أهدافي">
          {goals.dailyPagesGoal ? (
            <Goal label={`صفحات اليوم: ${formatArabicNumber(s.pagesToday)} / ${formatArabicNumber(goals.dailyPagesGoal)}`} percent={(s.pagesToday / goals.dailyPagesGoal) * 100} />
          ) : null}
          {goals.monthlyBooksGoal ? (
            <Goal label={`كتب هذا الشهر: ${formatArabicNumber(s.booksMonth)} / ${formatArabicNumber(goals.monthlyBooksGoal)}`} percent={(s.booksMonth / goals.monthlyBooksGoal) * 100} />
          ) : null}
        </Card>
      ) : (
        <PressLink href="/profile" style={[styles.hint, { backgroundColor: c.tint }]}>
          <Ionicons name="flag-outline" size={18} color={c.tintText} />
          <AppText style={{ color: c.tintText, flex: 1 }}>حدّد هدفاً يومياً أو شهرياً وتذكيراً من الملف الشخصي.</AppText>
        </PressLink>
      )}

      <Card title="أقرأ الآن">
        {current.length === 0 ? (
          <AppText variant="muted">لا تقرأ كتاباً الآن. افتح أي كتاب واضغط «بدأت أقرأ هذا الكتاب».</AppText>
        ) : (
          current.map((r) => <BookProgress key={r.id} r={r} />)
        )}
      </Card>

      <Card title="أوسمتي">
        <View style={styles.badges}>
          {BADGES.map((b) => {
            const got = s.badges.includes(b.key);
            const reward = m.badgeRewards[b.key];
            return (
              <View key={b.key} style={[styles.badge, { borderColor: got ? c.accent : c.line, backgroundColor: got ? c.tint : c.background, opacity: got ? 1 : 0.55 }]}>
                <Ionicons name={(got ? b.icon : `${b.icon}-outline`) as ComponentProps<typeof Ionicons>['name']} size={26} color={got ? c.accentText : c.textMuted} />
                <AppText style={{ fontFamily: fonts.semibold, fontSize: 13, textAlign: 'center' }}>{b.title}</AppText>
                <AppText variant="muted" style={{ fontSize: 11, textAlign: 'center' }}>
                  {got ? 'حصلت عليه' : b.hint}
                </AppText>
                {reward ? <AppText style={{ fontSize: 11, color: c.accentText, textAlign: 'center' }}>🎁 {reward}</AppText> : null}
              </View>
            );
          })}
        </View>
      </Card>

      {done.length ? (
        <Card title="قرأتُ سابقاً">
          {done.slice(0, 30).map((r) => (
            <BookProgress key={r.id} r={r} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function Family({
  userId,
  rows,
  logs,
  m,
  today,
  readers,
  challenges,
}: {
  userId: string;
  rows: Rows[];
  logs: Logs;
  m: Motivation;
  today: string;
  readers: Awaited<typeof readersQuery>;
  challenges: Awaited<typeof challengesQuery>;
}) {
  const c = useColors();
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  // People who keep their reading private are left out (except for themselves).
  const visible = readers.filter((r) => r.readingPublic || r.id === userId);
  const board = visible
    .map((r) => ({ ...r, s: userStats(r.id, rows, logs, m, today) }))
    .filter((r) => r.s.points > 0 || r.id === userId)
    .sort((a, b) => (period === 'month' ? b.s.pointsMonth - a.s.pointsMonth : b.s.points - a.s.points));
  const [now] = useState(() => Date.now());
  const active = challenges.filter((ch) => ch.endsAt >= now - 7 * 86_400_000);
  const visibleIds = new Set(visible.map((r) => r.id));
  const recent = rows.filter((r) => r.status === 'finished' && visibleIds.has(r.userId)).slice(0, 10);

  return (
    <>
      <Card title="لوحة الشرف">
        <View style={styles.wrap}>
          <Chip label="هذا الشهر" on={period === 'month'} onPress={() => setPeriod('month')} />
          <Chip label="كل الوقت" on={period === 'all'} onPress={() => setPeriod('all')} />
        </View>
        {board.map((r, i) => (
          <View key={r.id} style={[styles.rank, { borderColor: c.line, backgroundColor: r.id === userId ? c.tint : 'transparent' }]}>
            <AppText style={[styles.rankNo, { color: i < 3 ? c.accentText : c.textMuted }]}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : toArabicDigits(i + 1)}</AppText>
            <Avatar userId={r.id} name={r.name} size={38} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{r.name}</AppText>
              <AppText variant="muted" style={{ fontSize: 12 }}>
                {period === 'month'
                  ? `${count(r.s.booksMonth, 'book')}، ${count(r.s.pagesMonth, 'page')}`
                  : `${count(r.s.books, 'book')}، ${count(r.s.pages, 'page')}`}
                {r.s.streak > 1 ? `، 🔥 ${toArabicDigits(r.s.streak)}` : ''}
              </AppText>
            </View>
            <AppText style={{ fontFamily: fonts.display, fontSize: 20, color: c.primary }}>{formatArabicNumber(period === 'month' ? r.s.pointsMonth : r.s.points)}</AppText>
          </View>
        ))}
        {board.length === 0 ? <AppText variant="muted">لم يبدأ أحد القراءة بعد.</AppText> : null}
      </Card>

      <Card title="التحديات">
        {active.length === 0 ? (
          <AppText variant="muted">لا توجد تحديات الآن. يضيفها الوالدان من قسم «الإدارة».</AppText>
        ) : (
          active.map((ch) => (
            <View key={ch.id} style={[styles.challenge, { borderColor: c.line }]}>
              <AppText variant="label">{ch.title}</AppText>
              <AppText variant="muted" style={{ fontSize: 12 }}>
                {challengeText(ch)}، حتى {formatDate(ch.endsAt)}
                {ch.endsAt < now ? ' (انتهى)' : ''}
              </AppText>
              {ch.reward ? <AppText style={{ color: c.accentText, fontSize: 13 }}>🎁 المكافأة: {ch.reward}</AppText> : null}
              {visible.map((r) => {
                const p = challengeProgress(ch, r.id, rows, logs);
                return (
                  <View key={r.id} style={{ gap: 3 }}>
                    <View style={styles.row}>
                      <AppText style={{ flex: 1, fontSize: 13 }}>{r.name}</AppText>
                      <AppText style={{ fontSize: 13 }}>
                        {p >= ch.target ? '✓ ' : ''}
                        {formatArabicNumber(Math.min(p, ch.target))} / {formatArabicNumber(ch.target)}
                      </AppText>
                    </View>
                    <ProgressBar percent={(p / ch.target) * 100} height={6} color={p >= ch.target ? '#3B6B2A' : undefined} />
                  </View>
                );
              })}
            </View>
          ))
        )}
      </Card>

      {recent.length ? (
        <Card title="أُنهيت مؤخراً">
          {recent.map((r) => (
            <PressLink key={r.id} href={{ pathname: '/book/[id]', params: { id: r.bookId } }} style={styles.row}>
              <BookCover bookId={r.bookId} title={r.title} width={34} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" numberOfLines={1}>
                  {r.title}
                </AppText>
                <AppText variant="muted" style={{ fontSize: 12 }}>
                  {readers.find((x) => x.id === r.userId)?.name}
                  {r.finishedAt ? `، ${formatDate(r.finishedAt)}` : ''}
                  {r.rating ? `، ${'★'.repeat(r.rating)}` : ''}
                </AppText>
              </View>
            </PressLink>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function Admin({ userId, challenges, m }: { userId: string; challenges: Awaited<typeof challengesQuery>; m: Motivation }) {
  const c = useColors();
  const [editing, setEditing] = useState<(typeof challenges)[number] | 'new' | null>(null);
  const [perPage, setPerPage] = useState(String(m.pointsPerPage));
  const [perBook, setPerBook] = useState(String(m.pointsPerBook));
  const [rewards, setRewards] = useState<Record<string, string>>(m.badgeRewards);
  const num = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')) || 0;
  return (
    <>
      <Card title="التحديات">
        {challenges.map((ch) => (
          <Pressable key={ch.id} onPress={() => setEditing(ch)} style={[styles.challenge, { borderColor: c.line }]}>
            <AppText variant="label">{ch.title}</AppText>
            <AppText variant="muted" style={{ fontSize: 12 }}>
              {challengeText(ch)}، {formatDate(ch.startsAt)} – {formatDate(ch.endsAt)}
            </AppText>
          </Pressable>
        ))}
        <Button title="تحدٍّ جديد" onPress={() => setEditing('new')} />
      </Card>

      <Card title="النقاط">
        <Field label="نقاط كل صفحة" value={perPage} onChangeText={setPerPage} keyboardType="number-pad" />
        <Field label="نقاط كل كتاب يُنهى" value={perBook} onChangeText={setPerBook} keyboardType="number-pad" />
      </Card>

      <Card title="مكافآت الأوسمة">
        <AppText variant="muted">اكتب مكافأة لأي وسام (اختياري)، تظهر للجميع مع الوسام.</AppText>
        {BADGES.map((b) => (
          <Field
            key={b.key}
            label={`${b.title} (${b.hint})`}
            value={rewards[b.key] ?? ''}
            onChangeText={(t) => setRewards((r) => ({ ...r, [b.key]: t }))}
            placeholder="مثال: هدية من اختيارك"
          />
        ))}
      </Card>
      <Button
        title="حفظ النقاط والمكافآت"
        onPress={() => {
          const clean = Object.fromEntries(Object.entries(rewards).filter(([, v]) => v.trim()));
          saveMotivation({ pointsPerPage: num(perPage), pointsPerBook: num(perBook), badgeRewards: clean }, userId);
          Alert.alert('تم الحفظ', 'ستظهر القيم الجديدة لكل العائلة بعد المزامنة.');
        }}
      />

      <ChallengeSheet
        key={editing === 'new' ? 'new' : (editing?.id ?? 'none')}
        visible={!!editing}
        initial={editing && editing !== 'new' ? editing : null}
        onClose={() => setEditing(null)}
        userId={userId}
      />
    </>
  );
}

const DURATIONS: [string, number][] = [
  ['أسبوع', 7],
  ['أسبوعان', 14],
  ['شهر', 30],
  ['ثلاثة أشهر', 90],
];

function ChallengeSheet({
  visible,
  initial,
  onClose,
  userId,
}: {
  visible: boolean;
  initial: (Awaited<typeof challengesQuery>[number]) | null;
  onClose: () => void;
  userId: string;
}) {
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<ChallengeInput['kind']>((initial?.kind as ChallengeInput['kind']) ?? 'books');
  const [target, setTarget] = useState(initial ? String(initial.target) : '3');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [days, setDays] = useState(initial ? Math.round((initial.endsAt - initial.startsAt) / 86_400_000) : 30);
  const [reward, setReward] = useState(initial?.reward ?? '');
  const n = Number(target.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')) || 0;
  const save = () => {
    if (!title.trim() || !n || (kind === 'category' && !categoryId)) return Alert.alert('أكمل البيانات', 'اكتب اسم التحدي والهدف، واختر التصنيف إن لزم.');
    const startsAt = initial?.startsAt ?? new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    saveChallenge(initial?.id ?? null, { title, description: null, kind, target: n, categoryId: kind === 'category' ? categoryId : null, startsAt, endsAt: startsAt + days * 86_400_000 - 1, reward }, userId);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? 'تعديل التحدي' : 'تحدٍّ جديد'}>
      <Field label="اسم التحدي" value={title} onChangeText={setTitle} placeholder="مثال: تحدي رمضان" />
      <View style={{ gap: 6 }}>
        <AppText variant="muted">نوع الهدف</AppText>
        <View style={styles.wrap}>
          <Chip label="عدد كتب" on={kind === 'books'} onPress={() => setKind('books')} />
          <Chip label="عدد صفحات" on={kind === 'pages'} onPress={() => setKind('pages')} />
          <Chip label="كتب من تصنيف" on={kind === 'category'} onPress={() => setKind('category')} />
        </View>
      </View>
      {kind === 'category' ? (
        <View style={styles.wrap}>
          {cats.map((x) => (
            <Chip key={x.id} label={x.name} on={categoryId === x.id} onPress={() => setCategoryId(x.id)} />
          ))}
        </View>
      ) : null}
      <Field label={kind === 'pages' ? 'عدد الصفحات المطلوب' : 'عدد الكتب المطلوب'} value={target} onChangeText={setTarget} keyboardType="number-pad" />
      <View style={{ gap: 6 }}>
        <AppText variant="muted">المدة (تبدأ من اليوم)</AppText>
        <View style={styles.wrap}>
          {DURATIONS.map(([label, d]) => (
            <Chip key={d} label={label} on={days === d} onPress={() => setDays(d)} />
          ))}
        </View>
      </View>
      <Field label="المكافأة (اختيارية)" value={reward} onChangeText={setReward} placeholder="مثال: رحلة للعائلة" />
      <Button title="حفظ" onPress={save} />
      {initial ? (
        <Pressable
          onPress={() => {
            deleteChallenge(initial.id, userId);
            onClose();
          }}
          style={{ alignSelf: 'center', padding: space.sm }}>
          <AppText style={{ color: '#B3261E' }}>حذف التحدي</AppText>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

function challengeText(ch: { kind: string; target: number }) {
  const n = formatArabicNumber(ch.target);
  return ch.kind === 'pages' ? `الهدف: قراءة ${n} من الصفحات` : ch.kind === 'category' ? `الهدف: إنهاء ${n} من كتب تصنيف محدد` : `الهدف: إنهاء ${n} من الكتب`;
}

function BookProgress({ r }: { r: Rows }) {
  const c = useColors();
  const label =
    r.status === 'reading'
      ? `${toArabicDigits(Math.round(r.percent))}٪${r.page && r.pageCount ? `، الصفحة ${toArabicDigits(r.page)}` : ''}`
      : r.status === 'finished'
        ? 'قراءة مكتملة'
        : r.status === 'partial'
          ? `قراءة جزئية (${toArabicDigits(Math.round(r.percent))}٪)`
          : 'متوقفة';
  return (
    <PressLink href={{ pathname: '/book/[id]', params: { id: r.bookId } }} style={styles.row}>
      <BookCover bookId={r.bookId} title={r.title} width={34} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" numberOfLines={1}>
          {r.title}
        </AppText>
        {r.status === 'reading' ? <ProgressBar percent={r.percent} height={6} /> : null}
        <AppText variant="muted" style={{ fontSize: 12 }}>
          {label}
          {r.rating ? `، ${'★'.repeat(r.rating)}` : ''}
        </AppText>
      </View>
      <Ionicons name="chevron-back" size={16} color={c.textMuted} />
    </PressLink>
  );
}

function Tile({ icon, value, label }: { icon: ComponentProps<typeof Ionicons>['name']; value: number; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Ionicons name={icon} size={20} color={c.accentText} />
      <AppText style={[styles.tileNum, { color: c.text }]}>{formatArabicNumber(value)}</AppText>
      <AppText variant="muted" style={{ fontSize: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

function Goal({ label, percent }: { label: string; percent: number }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontSize: 14 }}>
        {percent >= 100 ? '✓ ' : ''}
        {label}
      </AppText>
      <ProgressBar percent={percent} color={percent >= 100 ? '#3B6B2A' : undefined} />
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <AppText style={styles.cardTitle}>{title}</AppText>
      {children}
    </View>
  );
}

function safeJson(s: string | null | undefined): Record<string, string> {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  page: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  tileNum: { fontFamily: fonts.display, fontSize: 26, lineHeight: 38 },
  card: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 30 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  badge: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 3, padding: space.sm, borderRadius: radius.md, borderWidth: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  rank: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  rankNo: { width: 30, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 18 },
  challenge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: space.md, gap: 6 },
});
