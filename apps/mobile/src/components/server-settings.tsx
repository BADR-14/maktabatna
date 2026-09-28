/** "Server address" with a connection test; shown on the login and register screens. */
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { AppText } from '@/components/text';
import { Field } from '@/components/ui';
import { api, getServerUrl, setServerUrl } from '@/lib/api';
import { useColors } from '@/theme';

export function useServerAddress() {
  const [server, setServer] = useState('');
  useEffect(() => {
    getServerUrl().then(setServer);
  }, []);
  return { server, setServer, save: () => setServerUrl(server) };
}

export function ServerSettings({ server, setServer }: { server: string; setServer: (s: string) => void }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<string | null>(null);
  return (
    <>
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {open ? 'إخفاء عنوان الخادم' : 'عنوان الخادم'}
        </AppText>
      </Pressable>
      {open ? (
        <>
          <Field
            label="عنوان الخادم"
            value={server}
            onChangeText={setServer}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="مثال: http://192.168.1.5:3000 (عنوان حاسوب الخادم على الشبكة)، أو http://library-server:3000 مع Tailscale."
          />
          <Pressable
            hitSlop={8}
            onPress={async () => {
              setCheck('جارٍ الاختبار…');
              await setServerUrl(server);
              try {
                await api('/health');
                setCheck('✓ الخادم متصل ويعمل');
              } catch (e) {
                setCheck(e instanceof Error ? e.message : String(e));
              }
            }}>
            <AppText variant="label" style={{ color: c.accentText, textAlign: 'center' }}>
              اختبر الاتصال
            </AppText>
          </Pressable>
          {check ? (
            <AppText variant="muted" style={{ textAlign: 'center' }}>
              {check}
            </AppText>
          ) : null}
        </>
      ) : null}
    </>
  );
}
