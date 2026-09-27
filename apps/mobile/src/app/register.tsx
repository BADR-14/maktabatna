import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthShell } from '@/components/auth-shell';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { space, useColors } from '@/theme';

export default function Register() {
  const c = useColors();
  const { register } = useSession();
  const [form, setForm] = useState({ displayName: '', username: '', password: '', inviteCode: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (Object.values(form).some((v) => !v.trim())) {
      setError('عبّي كل الخانات');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell subtitle="حساب جديد لأهل البيت">
      <AppText variant="title">حساب جديد</AppText>
      <Field label="الاسم" value={form.displayName} onChangeText={set('displayName')} hint="بيبيّن لأهل البيت مين أضاف أو عدّل." />
      <Field
        label="اسم المستخدم"
        value={form.username}
        onChangeText={set('username')}
        autoCapitalize="none"
        autoCorrect={false}
        hint="أحرف إنجليزية أو أرقام، متل badr"
      />
      <Field label="كلمة السر" value={form.password} onChangeText={set('password')} secureTextEntry hint="٦ أحرف أو أكتر" />
      <Field label="رمز الدعوة" value={form.inviteCode} onChangeText={set('inviteCode')} autoCapitalize="none" autoCorrect={false} />
      <ErrorBox message={error} />
      <Button title="إنشاء الحساب" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs }}>
        <AppText variant="muted">عندك حساب؟</AppText>
        <Link href="/login" replace>
          <AppText variant="label" style={{ color: c.accentText, fontSize: 13 }}>
            سجّل دخول
          </AppText>
        </Link>
      </View>
    </AuthShell>
  );
}
