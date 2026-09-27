import { toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { shelfQuery } from '@/db/queries';
import { radius, space, useColors } from '@/theme';

/** One shelf: its books from right to left. Book entry arrives in the next phase. */
export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { data } = useLiveQuery(shelfQuery(id), [id]);
  const s = data?.[0];
  const title = s ? (s.kind === 'top' ? 'فوق المكتبة' : `الرف ${toArabicDigits(s.number)}`) : '';

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title }} />
      {s ? (
        <AppText variant="muted">
          {s.roomName} · مكتبة {toArabicDigits(s.bookcaseNumber)} · {s.bookcaseName}
        </AppText>
      ) : null}
      <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.line }]}>
        <AppText variant="label">لسا ما في كتب على هالرف</AppText>
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          إضافة الكتب رف رف جاية بالخطوة الجاية.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.lg, gap: space.md },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: space.xl, alignItems: 'center', gap: space.xs },
});
