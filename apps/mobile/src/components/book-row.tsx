import { Ionicons } from '@expo/vector-icons';
import { type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/book-cover';
import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { radius, space, useColors } from '@/theme';

/** One book in a list: a small cover, the title, and a muted second line. */
export function BookRow({ bookId, title, subtitle, href }: { bookId: string; title: string; subtitle?: string | null; href: Href }) {
  const c = useColors();
  return (
    <PressLink href={href} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.tint : c.surface, borderColor: c.line }]}>
      <BookCover bookId={bookId} title={title} width={40} />
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
      <Ionicons name="chevron-back" size={18} color={c.textMuted} />
    </PressLink>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
