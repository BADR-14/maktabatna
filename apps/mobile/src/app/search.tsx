import { Stack } from 'expo-router';

import { BookBrowser } from '@/components/book-browser';

/** Search the whole library, from any screen (the magnifier in the header). */
export default function SearchScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'البحث' }} />
      <BookBrowser autoFocus />
    </>
  );
}
