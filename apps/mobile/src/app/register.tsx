import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthShell } from '@/components/auth-shell';
import { Owl, useOwl } from '@/components/owl';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { space, useColors } from '@/theme';

export default function Register() {
  const c = useColors();
  const { register } = useSession();
  const [form, setForm] = useState({ displayName: '', username: '', password: '', inviteCode: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const owl = useOwl();
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k !== 'password') owl.text(v).onTyped(v);
  };
  // Every text field makes the owl watch; the password field makes it hide its eyes.
  const watch = (k: 'displayName' | 'username' | 'inviteCode') => {
    const o = owl.text(form[k]);
    return { onFocus: o.onFocus, onBlur: o.onBlur };
  };

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
    <AuthShell subtitle="حساب جديد لأهل البيت" art={<Owl mood={owl.mood} look={owl.look} />}>
      <AppText variant="title">حساب جديد</AppText>
      <Field label="الاسم" value={form.displayName} onChangeText={set('displayName')} {...watch('displayName')} hint="بيبيّن لأهل البيت مين أضاف أو عدّل." />
      <Field
        label="اسم المستخدم"
        value={form.username}
        onChangeText={set('username')}
        {...watch('username')}
        autoCapitalize="none"
        autoCorrect={false}
        hint="أحرف إنجليزية أو أرقام، ومسموح - و_ و. (متل badr-14)"
      />
      <Field
        label="كلمة السر"
        value={form.password}
        onChangeText={set('password')}
        onFocus={owl.password.onFocus}
        onBlur={owl.password.onBlur}
        reveal={owl.password.reveal}
        hint="٦ أحرف أو أكتر"
      />
      <Field label="رمز الدعوة" value={form.inviteCode} onChangeText={set('inviteCode')} {...watch('inviteCode')} autoCapitalize="none" autoCorrect={false} />
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
