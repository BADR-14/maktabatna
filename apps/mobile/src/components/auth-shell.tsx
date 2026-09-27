import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/text';
import { fonts, radius, space, useColors } from '@/theme';

/** Burgundy header with the app name, and a card holding the form. Shared by login and register. */
export function AuthShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: c.primary, paddingTop: insets.top + 48 }]}>
          <Spines />
          <AppText style={[styles.title, { color: c.onPrimary }]}>مكتبتنا</AppText>
          <AppText style={{ color: c.onPrimary, opacity: 0.85 }}>{subtitle}</AppText>
        </View>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A small row of book spines in the family library's colors. */
export function Spines({ height = 44 }: { height?: number }) {
  const colors = ['#B98D45', '#1F3B2C', '#E6DCC3', '#1D2742', '#8C2A24', '#D6AE63', '#3B2419', '#5B7F6A'];
  const heights = [1, 0.82, 0.94, 1, 0.76, 0.9, 1, 0.85];
  return (
    <View style={[styles.spines, { height }]}>
      {colors.map((col, i) => (
        <View key={col} style={{ width: 9, height: height * heights[i], backgroundColor: col, borderRadius: 2 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 72, paddingHorizontal: space.xl, gap: space.xs },
  title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 66, marginTop: space.sm },
  card: {
    marginHorizontal: space.lg,
    marginTop: -44,
    marginBottom: space.xl,
    padding: space.xl,
    gap: space.lg,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  spines: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
});
