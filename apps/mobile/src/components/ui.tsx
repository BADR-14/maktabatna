import { forwardRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useRevealFocused } from '@/components/auth-shell';
import { BookLoader } from '@/components/book-loader';

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
        <BookLoader size={30} cover={primary ? c.accent : c.primary} />
      ) : (
        <AppText variant="label" style={{ color: primary ? c.onPrimary : c.accentText, fontSize: 16 }}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

export const Field = forwardRef<
  TextInput,
  TextInputProps & { label: string; hint?: string; /** Password field with a show/hide button. */ reveal?: { shown: boolean; onToggle: () => void } }
>(function Field({ label, hint, reveal, style, onFocus, ...props }, ref) {
  const c = useColors();
  const revealFocused = useRevealFocused();
  return (
    <View style={styles.field}>
      <AppText variant="label" style={{ fontSize: 14 }}>
        {label}
      </AppText>
      <View style={[styles.inputRow, { backgroundColor: c.background, borderColor: c.line }]}>
        <TextInput
          ref={ref}
          placeholderTextColor={c.textMuted}
          {...props}
          onFocus={(e) => {
            onFocus?.(e);
            revealFocused();
          }}
          secureTextEntry={reveal ? !reveal.shown : props.secureTextEntry}
          style={[styles.input, { color: c.text }, style]}
        />
        {reveal ? (
          <Pressable onPress={reveal.onToggle} hitSlop={10} accessibilityRole="button" style={styles.reveal}>
            <AppText variant="label" style={{ color: c.accentText, fontSize: 13 }}>
              {reveal.shown ? 'إخفاء' : 'إظهار'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
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
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, minHeight: 48 },
  input: { flex: 1, minHeight: 46, paddingHorizontal: space.md, fontFamily: fonts.regular, fontSize: 16, textAlign: 'right' },
  reveal: { paddingHorizontal: space.md, alignSelf: 'stretch', justifyContent: 'center' },
  error: { borderRadius: radius.sm, padding: space.md },
});
