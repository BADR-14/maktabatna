import { StyleSheet, Text, type TextProps } from 'react-native';

import { fonts, useColors } from '@/theme';

type Variant = 'body' | 'title' | 'label' | 'muted';

/** Arabic text with the app fonts and theme colors. */
export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const colors = useColors();
  const color = variant === 'muted' ? colors.textMuted : colors.text;
  return <Text {...rest} style={[styles.base, styles[variant], { color }, style]} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24, textAlign: 'left' },
  body: {},
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 34 },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
  muted: { fontSize: 13, lineHeight: 20 },
});
