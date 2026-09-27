import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useColors } from '@/theme';

/** The magnifier at the top of every screen: opens the search with its filters. */
export function HeaderSearch() {
  const c = useColors();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/search')} hitSlop={8} accessibilityRole="button" accessibilityLabel="البحث" style={styles.btn}>
      <Ionicons name="search" size={22} color={c.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ btn: { padding: 6 } });
