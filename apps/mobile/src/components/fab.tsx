import { Ionicons } from '@expo/vector-icons';
import { type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { fonts, useColors } from '@/theme';

/** The floating "add a book" button, bottom corner (start side, so it sits under the right thumb in RTL). */
export function AddBookFab({ href, label = 'إضافة كتاب' }: { href: Href; label?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <PressLink
      href={href}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { backgroundColor: c.accent, bottom: insets.bottom + 20, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <Ionicons name="add" size={24} color="#241708" />
      <AppText style={styles.text}>{label}</AppText>
    </PressLink>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    start: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 27,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { fontFamily: fonts.semibold, fontSize: 15, color: '#241708' },
});
