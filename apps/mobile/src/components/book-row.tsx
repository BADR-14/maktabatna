import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { radius, space, useColors } from '@/theme';
import { spineHex } from '@/lib/spine';

/** One book in a list: a coloured spine, the title, and a muted second line. */
export function BookRow({ bookId, title, subtitle, href }: { bookId: string; title: string; subtitle?: string | null; href: Href }) {
  const c = useColors();
  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) => [styles.row, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.75 : 1 }]}>
        <View style={[styles.spine, { backgroundColor: spineHex(bookId) }]}>
          <View style={[styles.band, { backgroundColor: c.accent }]} />
          <View style={[styles.band, { backgroundColor: c.accent, marginTop: 'auto' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="muted" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  spine: { width: 12, height: 40, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 2 },
  band: { height: 2, borderRadius: 1 },
});
