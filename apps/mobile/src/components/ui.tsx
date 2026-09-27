import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/text';
import { fonts, radius, space, useColors } from '@/theme';

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const c = useColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: c.primary } : { backgroundColor: 'transparent' },
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? c.onPrimary : c.primary} />
      ) : (
        <AppText variant="label" style={{ color: primary ? c.onPrimary : c.accentText, fontSize: 16 }}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

export const Field = forwardRef<TextInput, TextInputProps & { label: string; hint?: string }>(function Field(
  { label, hint, style, ...props },
  ref,
) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <AppText variant="label" style={{ fontSize: 14 }}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={c.textMuted}
        {...props}
        style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.line }, style]}
      />
      {hint ? <AppText variant="muted">{hint}</AppText> : null}
    </View>
  );
});

export function ErrorBox({ message }: { message: string | null }) {
  const c = useColors();
  if (!message) return null;
  return (
    <View style={[styles.error, { backgroundColor: c.tint }]}>
      <AppText style={{ color: c.tintText }}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  field: { gap: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    textAlign: 'right',
  },
  error: { borderRadius: radius.sm, padding: space.md },
});
