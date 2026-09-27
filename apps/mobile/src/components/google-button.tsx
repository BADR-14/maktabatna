import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { BookLoader } from '@/components/book-loader';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { googleAvailable, pickGoogleAccount } from '@/lib/google';
import { fonts, radius, space, useColors } from '@/theme';

/**
 * "Continue with Google" for the login screen. The first time, a Google account has no user yet,
 * so it asks for the family invite code (and a name) and creates the account.
 */
export function GoogleSignIn({ beforeSignIn }: { beforeSignIn?: () => Promise<void> }) {
  const c = useColors();
  const { signInWithGoogle } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [invite, setInvite] = useState('');
  const [name, setName] = useState('');
  if (!googleAvailable) return null;

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await beforeSignIn?.();
      const idToken = await pickGoogleAccount();
      if (!idToken) return;
      try {
        await signInWithGoogle({ idToken });
      } catch (e) {
        if (e instanceof ApiError && e.code === 'INVITE_REQUIRED') setPending(idToken);
        else throw e;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!pending) return;
    if (!invite.trim()) return setError('أدخل رمز الدعوة.');
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle({ idToken: pending, inviteCode: invite.trim(), displayName: name.trim() || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.or}>
        <View style={[styles.line, { backgroundColor: c.line }]} />
        <AppText variant="muted">أو</AppText>
        <View style={[styles.line, { backgroundColor: c.line }]} />
      </View>
      {pending ? (
        <View style={{ gap: space.md }}>
          <AppText>أول دخول بحساب Google: أدخل رمز الدعوة لإنشاء حسابك.</AppText>
          <Field label="رمز الدعوة" value={invite} onChangeText={setInvite} autoCapitalize="none" autoCorrect={false} />
          <Field label="الاسم (اختياري)" value={name} onChangeText={setName} hint="يظهر لأفراد العائلة. يُؤخذ من حساب Google إن تركته فارغاً." />
          <Button title="إنشاء الحساب" onPress={create} loading={busy} />
        </View>
      ) : (
        <Pressable
          onPress={start}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.google, { borderColor: c.line, backgroundColor: pressed ? c.tint : c.surface }]}>
          {busy ? (
            <BookLoader size={30} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <AppText style={{ fontFamily: fonts.semibold, fontSize: 15 }}>الدخول بحساب Google</AppText>
            </>
          )}
        </Pressable>
      )}
      <ErrorBox message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  or: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  google: { minHeight: 50, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
