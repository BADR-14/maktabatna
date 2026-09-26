import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { bookcaseQuery, shelvesQuery } from '@/db/queries';
import { radius, space, useColors } from '@/theme';

export default function BookcaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { data: bookcase } = useLiveQuery(bookcaseQuery(id), [id]);
  const { data: shelves } = useLiveQuery(shelvesQuery(id), [id]);
  const bc = bookcase?.[0];

  return (
    <>
      <Stack.Screen options={{ title: bc ? `مكتبة ${toArabicDigits(bc.number)}` : '' }} />
      <FlatList
        data={shelves}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          bc ? (
            <View style={styles.header}>
              <AppText variant="title">{bc.name}</AppText>
              <AppText variant="muted">
                {bc.roomName}
                {bc.wall ? ` · ${bc.wall}` : ''}
              </AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.shelf, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <AppText variant="label">{item.kind === 'top' ? 'فوق المكتبة' : `الرف ${toArabicDigits(item.number)}`}</AppText>
            <AppText variant="muted">
              {item.volumeCount === 0 ? 'لسا ما في كتب' : `${formatArabicNumber(item.volumeCount)} كتاب`}
            </AppText>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  header: { marginBottom: space.sm },
  shelf: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
