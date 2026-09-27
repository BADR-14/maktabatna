import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthShell } from '@/components/auth-shell';
import { AppText } from '@/components/text';
import { Button, ErrorBox, Field } from '@/components/ui';
import { getServerUrl, setServerUrl } from '@/lib/api';
import { space, useColors } from '@/theme';

export default function Login() {
  const c = useColors();
  const { signIn } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState('');
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    getServerUrl().then(setServer);
  }, []);

  async function submit() {
    if (!username.trim() || !password) {
      setError('اكتب اسم المستخدم وكلمة السر');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setServerUrl(server);
      await signIn(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell subtitle="أرشيف مكتبة البيت">
      <AppText variant="title">تسجيل الدخول</AppText>
      <Field
        label="اسم المستخدم"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        ref={passwordRef}
        label="كلمة السر"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <ErrorBox message={error} />
      <Button title="دخول" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs }}>
        <AppText variant="muted">ما عندك حساب؟</AppText>
        <Link href="/register" replace>
          <AppText variant="label" style={{ color: c.accentText, fontSize: 13 }}>
            افتح حساب جديد
          </AppText>
        </Link>
      </View>
      <Pressable onPress={() => setShowServer((v) => !v)} hitSlop={8}>
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {showServer ? 'إخفاء عنوان السيرفر' : 'عنوان السيرفر'}
        </AppText>
      </Pressable>
      {showServer ? (
        <Field
          label="عنوان السيرفر"
          value={server}
          onChangeText={setServer}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          hint="بيتعبّى لحاله. غيّره بس إذا ما قدر يوصل."
        />
      ) : null}
    </AuthShell>
  );
}
