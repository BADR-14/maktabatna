/**
 * Add a book (`/book/edit`, optionally `?shelfId=` to start on a shelf) or edit one (`?id=`).
 * New books get one copy with all their volumes on the chosen shelf; moving volumes later is
 * done from the book page.
 */
import { Ionicons } from '@expo/vector-icons';
import { parseSpokenBook, toArabicDigits, type PersonRole } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Chip } from '@/components/book-browser';
import { FormScroll } from '@/components/form-scroll';
import { ShelfPicker } from '@/components/shelf-picker';
import { VOICE_HINT, VoiceSheet } from '@/components/voice';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { createBook, updateBook, type PersonInput, type Placement } from '@/db/mutations';
import { bookPeopleQuery, bookQuery, categoriesWithCountsQuery } from '@/db/queries';
import { fonts, radius, space, useColors } from '@/theme';

type Form = {
  title: string;
  author: string;
  authorDeath: string;
  editor: string;
  commentator: string;
  translator: string;
  categoryId: string | null;
  publisher: string;
  edition: string;
  totalVolumes: number;
  pageCount: string;
  notes: string;
};
const EMPTY: Form = {
  title: '',
  author: '',
  authorDeath: '',
  editor: '',
  commentator: '',
  translator: '',
  categoryId: null,
  publisher: '',
  edition: '',
  totalVolumes: 1,
  pageCount: '',
  notes: '',
};
const ROLE_FIELD: Record<PersonRole, 'author' | 'editor' | 'commentator' | 'translator'> = {
  author: 'author',
  editor: 'editor',
  commentator: 'commentator',
  translator: 'translator',
};

/** Western or Arabic-Indic digits → number. */
const parseDigits = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')) || 0;

export default function BookEditScreen() {
  const { id, shelfId } = useLocalSearchParams<{ id?: string; shelfId?: string }>();
  const { data: bookRows } = useLiveQuery(bookQuery(id ?? ''), [id]);
  const { data: people, updatedAt } = useLiveQuery(bookPeopleQuery(id ?? ''), [id]);
  if (!id) return <BookForm initial={EMPTY} initialExtras={[]} startShelf={shelfId ?? null} />;

  const book = bookRows?.[0]?.book;
  if (!book || !updatedAt) return <Stack.Screen options={{ title: 'تعديل الكتاب' }} />;
  // Fill the form from the saved book: the first person of each role gets a field, any others are kept as they are.
  const first = (r: PersonRole) => people.find((p) => p.role === r);
  const seen = new Set<PersonRole>();
  const extras: PersonInput[] = [];
  for (const p of people) {
    if (seen.has(p.role)) extras.push({ name: p.name, role: p.role, deathYearHijri: p.deathYearHijri });
    seen.add(p.role);
  }
  const death = first('author')?.deathYearHijri;
  const initial: Form = {
    title: book.title,
    author: first('author')?.name ?? '',
    authorDeath: death ? toArabicDigits(death) : '',
    editor: first('editor')?.name ?? '',
    commentator: first('commentator')?.name ?? '',
    translator: first('translator')?.name ?? '',
    categoryId: book.categoryId,
    publisher: book.publisher ?? '',
    edition: book.edition ?? '',
    totalVolumes: book.totalVolumes,
    pageCount: book.pageCount ? toArabicDigits(book.pageCount) : '',
    notes: book.notes ?? '',
  };
  return <BookForm key={id} bookId={id} initial={initial} initialExtras={extras} startShelf={null} />;
}

function BookForm({
  bookId,
  initial,
  initialExtras,
  startShelf,
}: {
  bookId?: string;
  initial: Form;
  initialExtras: PersonInput[];
  startShelf: string | null;
}) {
  const c = useColors();
  const router = useRouter();
  const { user } = useSession();
  const editing = !!bookId;
  const { data: cats } = useLiveQuery(categoriesWithCountsQuery);
  const [form, setForm] = useState<Form>(initial);
  const [extras] = useState<PersonInput[]>(initialExtras);
  const [more, setMore] = useState(!!(initial.commentator || initial.translator));
  const [shelfId, setShelfId] = useState<string | null>(startShelf);
  const [placement, setPlacement] = useState<Placement>('standing');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  // Fill only what was said; everything else stays as it was.
  function applySpoken(text: string) {
    setListening(false);
    const b = parseSpokenBook(text, cats.map((x) => x.name));
    const cat = b.categoryMatched ? cats.find((x) => x.name === b.category)?.id : undefined;
    setForm((f) => ({
      ...f,
      title: b.title || f.title,
      author: b.author || f.author,
      authorDeath: b.authorDeath ? toArabicDigits(b.authorDeath) : f.authorDeath,
      editor: b.editor || f.editor,
      publisher: b.publisher || f.publisher,
      edition: b.edition || f.edition,
      totalVolumes: b.totalVolumes ?? f.totalVolumes,
      pageCount: b.pageCount ? toArabicDigits(b.pageCount) : f.pageCount,
      notes: b.notes || f.notes,
      categoryId: cat ?? f.categoryId,
    }));
    setVoiceNote(
      b.category && !b.categoryMatched
        ? `عُبّئت الخانات من كلامك. لم أتعرّف على التصنيف «${b.category}»، فاختره يدوياً.`
        : 'عُبّئت الخانات من كلامك. راجعها قبل الحفظ.',
    );
  }

  function save() {
    if (!user) return;
    if (!form.title.trim()) return setError('اكتب عنوان الكتاب.');
    if (!editing && !shelfId) return setError('اختر مكان الكتاب: الغرفة ثم المكتبة ثم الرف.');
    setError(null);
    setBusy(true);
    const death = parseDigits(form.authorDeath);
    const main: PersonInput[] = (Object.keys(ROLE_FIELD) as PersonRole[])
      .map((role) => ({ role, name: form[ROLE_FIELD[role]].trim(), deathYearHijri: role === 'author' && death ? death : null }))
      .filter((p) => p.name);
    const input = {
      title: form.title,
      categoryId: form.categoryId,
      publisher: form.publisher,
      edition: form.edition,
      totalVolumes: form.totalVolumes,
      pageCount: parseDigits(form.pageCount) || null,
      notes: form.notes,
      people: [...main, ...extras],
    };
    try {
      if (editing) {
        updateBook(bookId!, input, user.id);
        router.back();
      } else {
        const newId = createBook(input, { shelfId: shelfId!, placement }, user.id);
        router.replace({ pathname: '/book/[id]', params: { id: newId } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: editing ? 'تعديل الكتاب' : 'إضافة كتاب' }} />
      <FormScroll style={{ backgroundColor: c.background }} contentStyle={styles.page}>
        {VoiceSheet ? (
          <Pressable
            onPress={() => setListening(true)}
            style={({ pressed }) => [styles.voice, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="mic" size={22} color={c.onPrimary} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" style={{ color: c.onPrimary }}>
                أدخل الكتاب بالصوت
              </AppText>
              <AppText style={{ color: c.onPrimary, opacity: 0.85, fontSize: 12 }}>{VOICE_HINT}</AppText>
            </View>
          </Pressable>
        ) : null}
        {voiceNote ? (
          <View style={[styles.voiceNote, { backgroundColor: c.tint }]}>
            <AppText style={{ color: c.tintText, fontSize: 13 }}>{voiceNote}</AppText>
          </View>
        ) : null}
        {VoiceSheet ? <VoiceSheet visible={listening} onClose={() => setListening(false)} onDone={applySpoken} hint={VOICE_HINT} /> : null}
        <Card title="بيانات الكتاب">
          <Field label="العنوان *" value={form.title} onChangeText={set('title')} placeholder="مثال: رياض الصالحين" />
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <Field label="المؤلف" value={form.author} onChangeText={set('author')} />
            </View>
            <View style={{ width: 104 }}>
              <Field label="الوفاة (هـ)" value={form.authorDeath} onChangeText={set('authorDeath')} keyboardType="number-pad" placeholder="٦٧٦" />
            </View>
          </View>
          <Field label="المحقق" value={form.editor} onChangeText={set('editor')} />
          {more ? (
            <>
              <Field label="الشارح" value={form.commentator} onChangeText={set('commentator')} />
              <Field label="المترجم" value={form.translator} onChangeText={set('translator')} />
            </>
          ) : (
            <Pressable onPress={() => setMore(true)} hitSlop={6} style={styles.link}>
              <Ionicons name="add-circle-outline" size={18} color={c.accentText} />
              <AppText style={{ color: c.accentText, fontFamily: fonts.semibold }}>إضافة شارح أو مترجم</AppText>
            </Pressable>
          )}
        </Card>

        <Card title="التصنيف">
          <View style={styles.wrap}>
            {(cats ?? []).map((x) => (
              <Chip key={x.id} label={x.name} on={form.categoryId === x.id} onPress={() => set('categoryId')(form.categoryId === x.id ? null : x.id)} />
            ))}
          </View>
        </Card>

        <Card title="النشر والمجلدات">
          <Field label="دار النشر" value={form.publisher} onChangeText={set('publisher')} />
          <Field label="الطبعة" value={form.edition} onChangeText={set('edition')} placeholder="مثال: الأولى ١٤٢١هـ" />
          <View style={{ gap: 6 }}>
            <AppText variant="label" style={{ fontSize: 14 }}>
              عدد المجلدات
            </AppText>
            <View style={[styles.stepper, { borderColor: c.line, backgroundColor: c.background }]}>
              <StepBtn icon="add" onPress={() => set('totalVolumes')(Math.min(200, form.totalVolumes + 1))} />
              <TextInput
                value={toArabicDigits(form.totalVolumes)}
                onChangeText={(t) => set('totalVolumes')(Math.min(200, Math.max(1, parseDigits(t))))}
                keyboardType="number-pad"
                style={[styles.stepValue, { color: c.text }]}
                selectTextOnFocus
              />
              <StepBtn icon="remove" onPress={() => set('totalVolumes')(Math.max(1, form.totalVolumes - 1))} />
            </View>
            {editing && form.totalVolumes < initial.totalVolumes ? (
              <AppText variant="muted">المجلدات الزائدة ستنتقل إلى سلة المحذوفات.</AppText>
            ) : null}
          </View>
          <Field
            label="عدد الصفحات (اختياري)"
            value={form.pageCount}
            onChangeText={set('pageCount')}
            keyboardType="number-pad"
            hint={form.totalVolumes > 1 ? 'لمجلد واحد تقريباً؛ يفيد في حساب تقدّم القراءة.' : 'يفيد في حساب تقدّم القراءة.'}
          />
          <Field label="ملاحظات" value={form.notes} onChangeText={set('notes')} multiline style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }} />
        </Card>

        {editing ? null : (
          <Card title="المكان">
            <ShelfPicker value={shelfId} onChange={setShelfId} allowScan />
            <View style={{ gap: 6 }}>
              <AppText variant="muted">الوضعية</AppText>
              <View style={styles.wrap}>
                <Chip label="قائم" on={placement === 'standing'} onPress={() => setPlacement('standing')} />
                <Chip label="موضوع أفقياً" on={placement === 'lying'} onPress={() => setPlacement('lying')} />
              </View>
            </View>
          </Card>
        )}

        <ErrorBox message={error} />
        <Button title={editing ? 'حفظ التعديلات' : 'إضافة الكتاب'} onPress={save} loading={busy} />
      </FormScroll>
    </>
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

function StepBtn({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={icon === 'add' ? 'زيادة' : 'إنقاص'}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: pressed ? c.tint : 'transparent' }]}>
      <Ionicons name={icon} size={22} color={c.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg },
  voice: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md + 4 },
  voiceNote: { padding: space.md, borderRadius: radius.md },
  card: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 30 },
  pair: { flexDirection: 'row', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  stepBtn: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center' },
  stepValue: { width: 64, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 18 },
});
