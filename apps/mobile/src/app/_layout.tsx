import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { DevSettings, I18nManager, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import migrations from '../../drizzle/migrations';
import { SessionProvider, useSession } from '@/auth/session';
import { db } from '@/db/client';
import { fonts, useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

// The whole app is Arabic. Real builds get RTL from the expo-localization plugin (app.json);
// in Expo Go we switch it on here, and it takes effect after one reload.
// The flag makes sure we reload at most once, so a device that ignores RTL can't loop.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  if (__DEV__ && Storage.getItemSync('rtl-reloaded') !== '1') {
    Storage.setItemSync('rtl-reloaded', '1');
    DevSettings.reload();
  }
}

export default function RootLayout() {
  const colors = useColors();
  // Font files live in the repo (assets/fonts, OFL licensed); keys match `fonts` in src/theme.
  const [fontsLoaded] = useFonts({
    [fonts.display]: require('../../assets/fonts/Amiri-Bold.ttf'),
    [fonts.regular]: require('../../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
    [fonts.medium]: require('../../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
    [fonts.semibold]: require('../../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
  });
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const ready = (fontsLoaded && migrated) || !!migrationError;

  useEffect(() => {
    if (migrationError) SplashScreen.hideAsync();
  }, [migrationError]);


  if (migrationError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>
          ما قدرت جهّز قاعدة البيانات: {migrationError.message}
        </Text>
      </View>
    );
  }
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style="light" />
        <RootStack />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

/** Signed-out people only see login/register; everything else needs an account. */
function RootStack() {
  const colors = useColors();
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: 'مكتبتنا' }} />
        <Stack.Screen name="room/[id]" options={{ title: '' }} />
        <Stack.Screen name="shelf/[id]" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
