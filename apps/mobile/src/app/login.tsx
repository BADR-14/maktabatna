import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthShell } from '@/components/auth-shell';
import { GoogleSignIn } from '@/components/google-button';
import { Owl, useOwl } from '@/components/owl';
import { ServerSettings, useServerAddress } from '@/components/server-settings';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { space, useColors } from '@/theme';

export default function Login() {
  const c = useColors();
  const { signIn } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { server, setServer, save: saveServer } = useServerAddress();
  const passwordRef = useRef<TextInput>(null);
  const owl = useOwl();
  const userOwl = owl.text(username);

  async function submit() {
    if (!username.trim() || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveServer();
      await signIn(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell subtitle="أرشيف مكتبة البيت" art={<Owl mood={owl.mood} look={owl.look} />}>
      <AppText variant="title">تسجيل الدخول</AppText>
      <Field
        label="اسم المستخدم"
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          userOwl.onTyped(v);
        }}
        onFocus={userOwl.onFocus}
        onBlur={userOwl.onBlur}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        ref={passwordRef}
        label="كلمة المرور"
        value={password}
        onChangeText={setPassword}
        onFocus={owl.password.onFocus}
        onBlur={owl.password.onBlur}
        reveal={owl.password.reveal}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <ErrorBox message={error} />
      <Button title="دخول" onPress={submit} loading={busy} />
      <GoogleSignIn beforeSignIn={saveServer} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs }}>
        <AppText variant="muted">ليس لديك حساب؟</AppText>
        <Link href="/register" replace>
          <AppText variant="label" style={{ color: c.accentText, fontSize: 13 }}>
            أنشئ حساباً جديداً
          </AppText>
        </Link>
      </View>
      <ServerSettings server={server} setServer={setServer} />
    </AuthShell>
  );
}
