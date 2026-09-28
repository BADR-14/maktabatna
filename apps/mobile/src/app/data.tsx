/**
 * Import books from the CSV table (voice-entry output or the Excel template saved as CSV),
 * and export the whole catalogue to the same format, to keep or to edit in Excel.
 */
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Stack } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { VoiceSheet } from '@/components/voice';
import { Button, ErrorBox } from '@/components/ui';
import { exportCatalogCsv, importBooks, type ImportResult } from '@/db/catalog-io';
import { useLiveQuery } from '@/db/live';
import { allShelvesQuery } from '@/db/queries';
import { parseCsv, readImport, type ImportLine } from '@/lib/catalog-csv';
import { labelsHtml } from '@/lib/labels';
import { count } from '@/lib/plural';
import { fonts, radius, space, useColors } from '@/theme';

export default function DataScreen() {
  const c = useColors();
  const { user } = useSession();
  const [preview, setPreview] = useState<{ name: string; lines: ImportLine[]; errors: string[] } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'pick' | 'import' | 'export' | null>(null);
  const { data: shelves } = useLiveQuery(allShelvesQuery);

  async function pick() {
    setError(null);
    setResult(null);
    setBusy('pick');
    try {
      const res = await File.pickFileAsync({ mimeTypes: ['text/csv', 'text/comma-separated-values', 'text/plain', 'text/tab-separated-values', 'application/csv', '*/*'] });
      if (!res.result) return;
      const file = res.result;
      if (/\.xlsx?$/i.test(file.name)) {
        setError('هذا ملف Excel. احفظه أولاً بصيغة CSV: ملف ← حفظ باسم ← «CSV UTF-8»، ثم اختره هنا.');
        return;
      }
      const { lines, errors } = readImport(parseCsv(await file.text()));
      setPreview({ name: file.name, lines, errors });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function runImport() {
    if (!preview || !user) return;
    setBusy('import');
    // Let the loader paint before the (synchronous) import runs.
    setTimeout(() => {
      try {
        setResult(importBooks(preview.lines, user.id));
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    }, 50);
  }

  async function runExport() {
    setError(null);
    setBusy('export');
    try {
      const d = new Date();
      const file = new File(Paths.cache, `maktabatna-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.csv`);
      if (file.exists) file.delete();
      file.write(exportCatalogCsv());
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'حفظ نسخة من الكتب' });
      else Alert.alert('تعذّرت المشاركة', 'لا يدعم هذا الهاتف مشاركة الملفات.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'الاستيراد والتصدير' }} />

      <Card icon="cloud-upload-outline" title="استيراد كتب من ملف">
        <AppText variant="muted">
          ملف CSV بالأعمدة نفسها التي في قالب الإكسل وجدول محادثة الصوت. كل سطر كتاب في مكان واحد؛ المجموعة المقسومة على رفّين سطران، والنسخة
          الثانية سطر آخر.
        </AppText>
        {preview ? (
          <View style={[styles.preview, { backgroundColor: c.tint }]}>
            <AppText variant="label" style={{ color: c.tintText }}>
              {preview.name}
            </AppText>
            <AppText>
              {preview.lines.length === 1 ? 'كتاب واحد جاهز للاستيراد' : preview.lines.length ? `${count(preview.lines.length, 'book')} جاهزة للاستيراد` : 'لا توجد أسطر كتب في الملف.'}
            </AppText>
            {preview.errors.slice(0, 5).map((e) => (
              <AppText key={e} variant="muted">
                • {e}
              </AppText>
            ))}
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Button title="استيراد" onPress={runImport} loading={busy === 'import'} disabled={!preview.lines.length} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="إلغاء" variant="ghost" onPress={() => setPreview(null)} />
              </View>
            </View>
          </View>
        ) : (
          <Button title="اختيار ملف" onPress={pick} loading={busy === 'pick'} />
        )}
        {result ? (
          <View style={[styles.preview, { backgroundColor: c.background, borderColor: c.line, borderWidth: 1 }]}>
            <View style={styles.done}>
              <Ionicons name="checkmark-circle" size={22} color="#3B6B2A" />
              <AppText variant="label">تم الاستيراد</AppText>
            </View>
            <AppText>
              {[
                result.books === 1 ? 'كتاب واحد جديد' : result.books ? `${count(result.books, 'book')} جديدة` : null,
                `${count(result.copies, 'copy')}`,
                count(result.volumes, 'volume'),
              ]
                .filter(Boolean)
                .join('، ')}
            </AppText>
            {[...result.skipped, ...result.warnings].slice(0, 8).map((e) => (
              <AppText key={e} variant="muted">
                • {e}
              </AppText>
            ))}
          </View>
        ) : null}
      </Card>

      <Card icon="cloud-download-outline" title="تصدير الكتب">
        <AppText variant="muted">ملف CSV بكل الكتب وأماكنها، يُفتح في Excel، ويمكن استيراده مرة أخرى.</AppText>
        <Button title="تصدير ومشاركة" onPress={runExport} loading={busy === 'export'} />
      </Card>

      <Card icon="qr-code-outline" title="ملصقات رموز الرفوف">
        <AppText variant="muted">ملف للطباعة فيه رمز QR لكل رف ولأعلى كل مكتبة، مرتّب حسب الغرفة ثم المكتبة. امسح الرمز لفتح الرف أو لتحديد المكان عند الإدخال.</AppText>
        <Button
          title="طباعة الملصقات"
          onPress={async () => {
            try {
              await Print.printAsync({ html: labelsHtml(shelves) });
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Card>

      {VoiceSheet ? (
        <Card icon="mic-outline" title="الإدخال الصوتي السريع">
          <AppText variant="muted">اختر الرف مرة واحدة ثم قل الكتب واحداً تلو الآخر.</AppText>
          <PressLink href="/voice" style={({ pressed }) => [styles.link, { borderColor: c.accent, opacity: pressed ? 0.7 : 1 }]}>
            <AppText style={{ color: c.accentText, fontFamily: fonts.semibold }}>ابدأ الإدخال الصوتي</AppText>
          </PressLink>
        </Card>
      ) : null}

      <Card icon="server-outline" title="النسخة الاحتياطية الكاملة">
        <AppText variant="muted">
          كل الكتب محفوظة على الخادم بعد المزامنة. لنسخها على فلاشة، شغّل على حاسوب الخادم الأمر الموجود في README (قسم «النسخ الاحتياطي»).
        </AppText>
      </Card>

      <ErrorBox message={error} />
    </ScrollView>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: 'cloud-upload-outline' | 'cloud-download-outline' | 'server-outline' | 'qr-code-outline' | 'mic-outline';
  title: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={22} color={c.accentText} />
        <AppText style={styles.cardTitle}>{title}</AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  card: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 30 },
  preview: { borderRadius: radius.md, padding: space.md, gap: space.xs },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  link: { borderWidth: 1, borderRadius: radius.md, alignItems: 'center', paddingVertical: space.md },
});
