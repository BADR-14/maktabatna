import { useLiveQuery } from '@/db/live';
import { Stack, useLocalSearchParams } from 'expo-router';

import { BookBrowser } from '@/components/book-browser';
import { categoryQuery } from '@/db/queries';

/** One category's books, with its own search box and filters. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cat } = useLiveQuery(categoryQuery(id), [id]);
  return (
    <>
      <Stack.Screen options={{ title: cat?.[0]?.name ?? '' }} />
      <BookBrowser key={id} categoryId={id} />
    </>
  );
}
