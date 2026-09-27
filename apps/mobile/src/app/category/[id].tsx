import { formatArabicNumber, toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { BookRow } from '@/components/book-row';
import { AppText } from '@/components/text';
import { categoryBooksQuery, categoryQuery } from '@/db/queries';
import { space } from '@/theme';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cat } = useLiveQuery(categoryQuery(id), [id]);
  const { data: list } = useLiveQuery(categoryBooksQuery(id), [id]);

  return (
    <>
      <Stack.Screen options={{ title: cat?.[0]?.name ?? '' }} />
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<AppText variant="muted">{formatArabicNumber(list?.length ?? 0)} كتاب</AppText>}
        ListEmptyComponent={<AppText variant="muted">لسا ما في كتب بهالتصنيف.</AppText>}
        renderItem={({ item }) => (
          <BookRow
            bookId={item.id}
            title={item.title}
            subtitle={[item.author, item.totalVolumes > 1 ? `${toArabicDigits(item.totalVolumes)} مجلد` : null].filter(Boolean).join(' · ')}
            href={{ pathname: '/book/[id]', params: { id: item.id } }}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({ list: { padding: space.lg, gap: space.sm } });
