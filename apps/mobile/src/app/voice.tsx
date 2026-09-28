/**
 * Shelf mode (`/voice?shelfId=`): pick the shelf once (or scan its label), then say one book
 * after another. Each sentence becomes a draft card to check, and one tap saves it on that shelf.
 */
import { Ionicons } from '@expo/vector-icons';
import { parseSpokenBook, toArabicDigits, type SpokenBook } from '@maktabatna/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Chip } from '@/components/book-browser';
import { BookRow } from '@/components/book-row';
import { FormScroll } from '@/components/form-scroll';
import { Sheet } from '@/components/reading-ui';
import { ShelfPicker, shelfLabel } from '@/components/shelf-picker';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { VOICE_HINT, VoiceSheet } from '@/components/voice';
import { useLiveQuery } from '@/db/live';
import { createBook, type Placement } from '@/db/mutations';
import { allShelvesQuery, categoriesWithCountsQuery } from '@/db/queries';
import { count } from '@/lib/plural';
import { scanForShelf } from '@/lib/scan';
import { fonts, radius, space, useColors } from '@/theme';

type Draft = SpokenBook & { categoryId: string | null };

export default function VoiceEntryScreen() {
  const c = useColors();
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ shelfId?: string }>();
  const { data: shelves } = useLiveQuery(allShelvesQuery);
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const [shelfId, setShelfId] = useState<string | null>(params.shelfId ?? null);
  const [picking, setPicking] = useState(false);
  const [placement, setPlacement] = useState<Placement>('standing');
  const [listening, setListening] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [added, setAdded] = useState<{ id: string; title: string; subtitle: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const shelf = shelves.find((s) => s.shelfId === shelfId);

  if (!VoiceSheet) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'الإدخال الصوتي' }} />
        <AppText style={{ textAlign: 'center' }}>الإدخال الصوتي يعمل في التطبيق المثبّت فقط، وليس في Expo Go.</AppText>
      </View>
    );
  }

  const onSpoken = (text: string) => {
    setListening(false);
    const b = parseSpokenBook(
      text,
      cats.map((x) => x.name),
    );
    setError(null);
    setDraft({ ...b, categoryId: b.categoryMatched ? (cats.find((x) => x.name === b.category)?.id ?? null) : null });
  };

  const save = () => {
    if (!draft || !user || !shelfId) return;
    if (!draft.title.trim()) return setError('لم أسمع عنوان الكتاب. عدّله أو أعد التسجيل.');
    const people = [
      draft.author ? { name: draft.author, role: 'author' as const, deathYearHijri: draft.authorDeath } : null,
      draft.editor ? { name: draft.editor, role: 'editor' as const } : null,
    ].filter((p) => p !== null);
    const id = createBook(
      {
        title: draft.title,
        categoryId: draft.categoryId,
        publisher: draft.publisher || null,
        edition: draft.edition || null,
        totalVolumes: draft.totalVolumes ?? 1,
        pageCount: draft.pageCount,
        notes: draft.notes || null,
        people,
      },
      { shelfId, placement },
      user.id,
    );
    setAdded((a) => [{ id, title: draft.title, subtitle: [draft.author, draft.totalVolumes && draft.totalVolumes > 1 ? count(draft.totalVolumes, 'volume') : null].filter(Boolean).join('، ') }, ...a]);
    setDraft(null);
    if (autoNext) setListening(true);
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <>
      <Stack.Screen options={{ title: 'الإدخال الصوتي' }} />
      <FormScroll style={{ backgroundColor: c.background }} contentStyle={styles.page}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <AppText variant="muted">المكان</AppText>
          <AppText variant="label" style={{ fontSize: 17 }}>
            {shelf ? `${shelf.roomName}، مكتبة ${toArabicDigits(shelf.bookcaseNumber)}، ${shelfLabel(shelf.kind, shelf.shelfNumber)}` : 'لم يُحدَّد الرف بعد'}
          </AppText>
          <View style={styles.row}>
            <Pressable
              onPress={async () => {
                const id = await scanForShelf(router);
                if (id) setShelfId(id);
              }}
              style={[styles.pill, { borderColor: c.accent }]}>
              <Ionicons name="qr-code-outline" size={18} color={c.accentText} />
              <AppText style={{ color: c.accentText, fontFamily: fonts.semibold }}>مسح رمز الرف</AppText>
            </Pressable>
            <Pressable onPress={() => setPicking(true)} style={[styles.pill, { borderColor: c.line }]}>
              <Ionicons name="list-outline" size={18} color={c.text} />
              <AppText style={{ fontFamily: fonts.semibold }}>اختيار من القائمة</AppText>
            </Pressable>
          </View>
          <View style={styles.row}>
            <Chip label="قائم" on={placement === 'standing'} onPress={() => setPlacement('standing')} />
            <Chip label="موضوع أفقياً" on={placement === 'lying'} onPress={() => setPlacement('lying')} />
          </View>
        </View>

        {draft ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.accent }]}>
            <AppText variant="label">راجع ثم احفظ</AppText>
            <Field label="العنوان" value={draft.title} onChangeText={(t) => set('title', t)} />
            <Field label="المؤلف" value={draft.author} onChangeText={(t) => set('author', t)} />
            {draft.editor ? <Field label="المحقق" value={draft.editor} onChangeText={(t) => set('editor', t)} /> : null}
            <Field label="دار النشر" value={draft.publisher} onChangeText={(t) => set('publisher', t)} />
            <View style={{ gap: 6 }}>
              <AppText variant="muted">عدد المجلدات</AppText>
              <View style={styles.row}>
                <Chip label="−" on={false} onPress={() => set('totalVolumes', Math.max(1, (draft.totalVolumes ?? 1) - 1))} />
                <AppText style={{ fontFamily: fonts.semibold, fontSize: 18, minWidth: 30, textAlign: 'center' }}>{toArabicDigits(draft.totalVolumes ?? 1)}</AppText>
                <Chip label="+" on={false} onPress={() => set('totalVolumes', (draft.totalVolumes ?? 1) + 1)} />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <AppText variant="muted">
                التصنيف{draft.category && !draft.categoryMatched ? ` (سمعت «${draft.category}»)` : ''}
              </AppText>
              <View style={styles.wrap}>
                {cats.map((x) => (
                  <Chip key={x.id} label={x.name} on={draft.categoryId === x.id} onPress={() => set('categoryId', draft.categoryId === x.id ? null : x.id)} />
                ))}
              </View>
            </View>
            <ErrorBox message={error} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="حفظ الكتاب" onPress={save} disabled={!shelfId} />
              </View>
              <Pressable onPress={() => setListening(true)} style={[styles.pill, { borderColor: c.line, minHeight: 50 }]}>
                <AppText style={{ fontFamily: fonts.semibold }}>إعادة</AppText>
              </Pressable>
              <Pressable onPress={() => setDraft(null)} style={[styles.pill, { borderColor: c.line, minHeight: 50 }]}>
                <AppText style={{ fontFamily: fonts.semibold }}>إلغاء</AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            disabled={!shelfId}
            onPress={() => setListening(true)}
            style={({ pressed }) => [styles.mic, { backgroundColor: shelfId ? c.primary : c.line, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="mic" size={40} color={c.onPrimary} />
            <AppText variant="label" style={{ color: c.onPrimary, fontSize: 17 }}>
              {shelfId ? 'اضغط وتكلّم' : 'حدّد الرف أولاً'}
            </AppText>
            <AppText style={{ color: c.onPrimary, opacity: 0.85, fontSize: 12, textAlign: 'center' }}>{VOICE_HINT}</AppText>
          </Pressable>
        )}

        <View style={styles.switchRow}>
          <AppText style={{ flex: 1 }}>بعد الحفظ ابدأ الاستماع للكتاب التالي</AppText>
          <Switch value={autoNext} onValueChange={setAutoNext} trackColor={{ true: c.primary }} />
        </View>

        {added.length ? (
          <View style={{ gap: space.sm }}>
            <AppText variant="label">أُضيف في هذه الجلسة ({count(added.length, 'book')})</AppText>
            {added.map((a) => (
              <BookRow key={a.id} bookId={a.id} title={a.title} subtitle={a.subtitle} href={{ pathname: '/book/[id]', params: { id: a.id } }} />
            ))}
          </View>
        ) : null}
      </FormScroll>

      <VoiceSheet visible={listening} onClose={() => setListening(false)} onDone={onSpoken} hint={VOICE_HINT} />
      <Sheet visible={picking} onClose={() => setPicking(false)} title="اختيار الرف">
        <ShelfPicker
          value={shelfId}
          onChange={(id) => {
            setShelfId(id);
            setPicking(false);
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { borderRadius: radius.md + 4, borderWidth: 1, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8, justifyContent: 'center' },
  mic: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: 24 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
