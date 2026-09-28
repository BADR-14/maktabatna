/**
 * The reading part of a book page: start reading, update progress (page ↔ percent kept in step;
 * volumes for sets), finish with a rating and a note, and who else in the family read it.
 */
import { Ionicons } from '@expo/vector-icons';
import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Chip } from '@/components/book-browser';
import { PercentTrack, ProgressBar, Sheet, Stars } from '@/components/reading-ui';
import { AppText } from '@/components/text';
import { Button, Field } from '@/components/ui';
import { useLiveQuery } from '@/db/live';
import { deleteReading, finishReading, reviewReading, setPageCount, startReading, syncProgress, updateProgress, type ReadingStatus } from '@/db/reading';
import { bookReadersQuery } from '@/db/reading-queries';
import { count } from '@/lib/plural';
import { rescheduleReminders } from '@/lib/reminders';
import { timeAgo } from '@/lib/time';
import { fonts, radius, space, useColors } from '@/theme';

type Book = { id: string; pageCount: number | null; totalVolumes: number };

const digitsIn = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')) || 0;
const pct = (p: number) => `${toArabicDigits(Math.round(p))}٪`;
const days = (from: number, to: number) => Math.max(1, Math.round((to - from) / 86_400_000));

export function ReadingCard({ book }: { book: Book }) {
  const c = useColors();
  const { user } = useSession();
  const { data: rows } = useLiveQuery(bookReadersQuery(book.id), [book.id]);
  const [sheet, setSheet] = useState<'progress' | 'finish' | 'review' | null>(null);
  if (!user) return null;
  const mine = rows.find((r) => r.userId === user.id && r.status === 'reading');
  const myLast = rows.find((r) => r.userId === user.id);
  const others = rows.filter((r) => r !== mine && (r.userId === user.id || r.readingPublic));

  return (
    <View style={{ gap: space.md }}>
      <AppText style={styles.section}>القراءة</AppText>

      {mine ? (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={styles.row}>
            <Ionicons name="book-outline" size={22} color={c.accentText} />
            <AppText variant="label" style={{ flex: 1 }}>
              تقرأ هذا الكتاب منذ {timeAgo(mine.startedAt).replace('منذ ', '')}
            </AppText>
            <AppText style={{ color: c.primary, fontFamily: fonts.semibold }}>{pct(mine.percent)}</AppText>
          </View>
          <ProgressBar percent={mine.percent} />
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button title="تحديث التقدّم" onPress={() => setSheet('progress')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="إنهاء" variant="ghost" onPress={() => setSheet('finish')} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            startReading(book.id, user.id);
            setSheet('progress');
          }}
          style={({ pressed }) => [styles.start, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="book-outline" size={20} color={c.onPrimary} />
          <AppText variant="label" style={{ color: c.onPrimary }}>
            {myLast?.status === 'finished' ? 'أقرؤه مرة أخرى' : 'بدأت أقرأ هذا الكتاب'}
          </AppText>
        </Pressable>
      )}

      {others.map((r) => {
        const me = r.userId === user.id;
        const who = me ? 'أنت' : (r.name ?? 'أحد أفراد العائلة');
        const text =
          r.status === 'reading'
            ? `${who}: قيد القراءة (${pct(r.percent)})`
            : r.status === 'finished'
              ? `${who}: قراءة مكتملة${r.finishedAt ? ` خلال ${days(r.startedAt, r.finishedAt) === 2 ? 'يومين' : count(days(r.startedAt, r.finishedAt), 'day')}` : ''}`
              : r.status === 'partial'
                ? `${who}: قراءة جزئية (${pct(r.percent)})`
                : `${who}: قراءة متوقفة عند ${pct(r.percent)}`;
        return (
          <Pressable
            key={r.id}
            disabled={!me || r.status === 'reading'}
            onPress={() => setSheet('review')}
            style={[styles.reader, { backgroundColor: c.surface, borderColor: c.line }]}>
            <AppText>{text}</AppText>
            {r.rating ? <Stars value={r.rating} size={16} /> : null}
            {r.note ? <AppText variant="muted">«{r.note}»</AppText> : null}
            {me && r.status !== 'reading' && !r.rating ? <AppText style={{ color: c.accentText, fontSize: 13 }}>أضف تقييمك</AppText> : null}
          </Pressable>
        );
      })}

      {mine ? <ProgressSheet visible={sheet === 'progress'} onClose={() => setSheet(null)} reading={mine} book={book} userId={user.id} /> : null}
      {mine ? (
        <FinishSheet
          visible={sheet === 'finish'}
          onClose={() => setSheet(null)}
          onDelete={() => {
            deleteReading(mine.id, user.id);
            setSheet(null);
          }}
          onDone={(status, rating, note) => {
            finishReading(mine.id, status, { rating, note }, user.id);
            setSheet(null);
            void rescheduleReminders(user.id);
          }}
        />
      ) : null}
      {myLast && myLast.status !== 'reading' ? (
        <ReviewSheet
          visible={sheet === 'review'}
          onClose={() => setSheet(null)}
          initial={{ rating: myLast.rating, note: myLast.note }}
          onSave={(rating, note) => {
            reviewReading(myLast.id, { rating, note }, user.id);
            setSheet(null);
          }}
        />
      ) : null}
    </View>
  );
}

function ProgressSheet({
  visible,
  onClose,
  reading,
  book,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  reading: { id: string; percent: number };
  book: Book;
  userId: string;
}) {
  const c = useColors();
  const set = book.totalVolumes > 1;
  const [pages, setPages] = useState(book.pageCount ? String(book.pageCount) : '');
  const pageCount = digitsIn(pages) || null;
  const initial = syncProgress({ percent: reading.percent }, { pageCount, totalVolumes: book.totalVolumes });
  const [state, setState] = useState({ percent: reading.percent, page: initial.page, volumes: Math.round((reading.percent / 100) * book.totalVolumes) });
  const onShow = () => {
    const p = syncProgress({ percent: reading.percent }, { pageCount: book.pageCount, totalVolumes: book.totalVolumes });
    setPages(book.pageCount ? String(book.pageCount) : '');
    setState({ percent: reading.percent, page: p.page, volumes: Math.round((reading.percent / 100) * book.totalVolumes) });
  };

  // Every input goes through syncProgress, so page and percent always agree.
  const byPercent = (percent: number) => setState((s) => ({ ...s, ...syncProgress({ percent }, { pageCount, totalVolumes: book.totalVolumes }) }));
  const byPage = (text: string) => setState((s) => ({ ...s, ...syncProgress({ page: digitsIn(text) }, { pageCount, totalVolumes: book.totalVolumes }) }));
  const byVolumes = (v: number) => {
    const p = syncProgress({ volumesDone: v }, { pageCount, totalVolumes: book.totalVolumes });
    setState({ percent: p.percent, page: p.page, volumes: p.volumesDone ?? v });
  };

  const save = () => {
    if (pageCount !== book.pageCount) setPageCount(book.id, pageCount, userId);
    updateProgress(reading.id, set ? { volumesDone: state.volumes } : pageCount ? { page: state.page } : { percent: state.percent }, userId);
    void rescheduleReminders(userId);
    onClose();
  };

  return (
    <Modalish visible={visible} onClose={onClose} onShow={onShow} title="تحديث التقدّم">
      {set ? (
        <View style={{ gap: 6 }}>
          <AppText variant="muted">المجلدات المقروءة (من {toArabicDigits(book.totalVolumes)})</AppText>
          <View style={styles.stepper}>
            <Chip label="−" on={false} onPress={() => byVolumes(Math.max(0, state.volumes - 1))} />
            <AppText style={styles.big}>{toArabicDigits(state.volumes)}</AppText>
            <Chip label="+" on={false} onPress={() => byVolumes(Math.min(book.totalVolumes, state.volumes + 1))} />
          </View>
        </View>
      ) : (
        <>
          <Field
            label="عدد صفحات الكتاب (اختياري)"
            value={pages}
            onChangeText={(t) => {
              setPages(t);
              const pc = digitsIn(t) || null;
              setState((s) => ({ ...s, ...syncProgress({ percent: s.percent }, { pageCount: pc, totalVolumes: book.totalVolumes }) }));
            }}
            keyboardType="number-pad"
            hint="إذا كتبته، تُحسب النسبة من رقم الصفحة تلقائياً."
          />
          {pageCount ? (
            <Field
              label={`وصلت إلى الصفحة (من ${formatArabicNumber(pageCount)})`}
              value={state.page != null ? String(state.page) : ''}
              onChangeText={byPage}
              keyboardType="number-pad"
            />
          ) : null}
        </>
      )}
      <View style={{ gap: 6 }}>
        <View style={styles.row}>
          <AppText variant="muted" style={{ flex: 1 }}>
            النسبة المقروءة
          </AppText>
          <AppText style={[styles.big, { color: c.primary }]}>{pct(state.percent)}</AppText>
        </View>
        <PercentTrack value={state.percent} onChange={byPercent} />
      </View>
      <Button title="حفظ" onPress={save} />
    </Modalish>
  );
}

function FinishSheet({
  visible,
  onClose,
  onDone,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (status: Exclude<ReadingStatus, 'reading'>, rating: number | null, note: string | null) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState<Exclude<ReadingStatus, 'reading'>>('finished');
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  return (
    <Modalish
      visible={visible}
      onClose={onClose}
      title="إنهاء القراءة"
      onShow={() => {
        setStatus('finished');
        setRating(null);
        setNote('');
      }}>
      <View style={styles.wrap}>
        <Chip label="أنهيته كاملاً" on={status === 'finished'} onPress={() => setStatus('finished')} />
        <Chip label="قرأت جزءاً منه" on={status === 'partial'} onPress={() => setStatus('partial')} />
        <Chip label="توقّفت عن قراءته" on={status === 'abandoned'} onPress={() => setStatus('abandoned')} />
      </View>
      <ReviewFields rating={rating} setRating={setRating} note={note} setNote={setNote} />
      <Button title="حفظ" onPress={() => onDone(status, rating, note)} />
      <Pressable
        onPress={() =>
          Alert.alert('حذف القراءة', 'هل بدأت هذه القراءة بالخطأ؟ ستُحذف من سجلّك.', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'حذف', style: 'destructive', onPress: onDelete },
          ])
        }
        style={{ alignSelf: 'center', padding: space.sm }}>
        <AppText variant="muted">بدأتها بالخطأ؟ احذفها</AppText>
      </Pressable>
    </Modalish>
  );
}

function ReviewSheet({
  visible,
  onClose,
  initial,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initial: { rating: number | null; note: string | null };
  onSave: (rating: number | null, note: string | null) => void;
}) {
  const [rating, setRating] = useState<number | null>(initial.rating);
  const [note, setNote] = useState(initial.note ?? '');
  return (
    <Modalish
      visible={visible}
      onClose={onClose}
      title="تقييمك للكتاب"
      onShow={() => {
        setRating(initial.rating);
        setNote(initial.note ?? '');
      }}>
      <ReviewFields rating={rating} setRating={setRating} note={note} setNote={setNote} />
      <Button title="حفظ" onPress={() => onSave(rating, note)} />
    </Modalish>
  );
}

function ReviewFields({ rating, setRating, note, setNote }: { rating: number | null; setRating: (v: number | null) => void; note: string; setNote: (v: string) => void }) {
  const c = useColors();
  return (
    <>
      <View style={{ gap: 6 }}>
        <AppText variant="muted">التقييم (اختياري)</AppText>
        <Stars value={rating} onChange={setRating} />
      </View>
      <View style={{ gap: 6 }}>
        <AppText variant="muted">ملاحظة للعائلة (اختيارية)</AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="مثال: مفيد جداً في باب الأخلاق، أنصح به."
          placeholderTextColor={c.textMuted}
          style={[styles.note, { color: c.text, borderColor: c.line, backgroundColor: c.background }]}
        />
      </View>
    </>
  );
}

/** Sheet with a hook for resetting state each time it opens. */
function Modalish({ visible, onShow, ...rest }: { visible: boolean; onShow?: () => void; onClose: () => void; title: string; children: React.ReactNode }) {
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) onShow?.();
  }
  return <Sheet visible={visible} {...rest} />;
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.display, fontSize: 20, lineHeight: 30 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md + 2, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  start: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 50, borderRadius: radius.md },
  reader: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: space.md, gap: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  big: { fontFamily: fonts.semibold, fontSize: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { minHeight: 80, borderWidth: 1, borderRadius: radius.md, padding: space.md, textAlignVertical: 'top', fontFamily: fonts.regular, fontSize: 15, textAlign: 'right' },
});
