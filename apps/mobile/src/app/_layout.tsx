import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { DevSettings, I18nManager, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import migrations from '../../drizzle/migrations';
import { SessionProvider, useSession } from '@/auth/session';
import { HeaderSearch } from '@/components/header-search';
import { Intro } from '@/components/intro';
import { db } from '@/db/client';
import { startAutoSync } from '@/sync';
import { applyStoredTheme, fonts, useColors } from '@/theme';

applyStoredTheme();

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

/** Instead of the app closing, a screen error shows this, with the details and a retry. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background, gap: 16 }]}>
      <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center' }}>حدث خطأ غير متوقع</Text>
      <Text selectable style={{ color: colors.textMuted, textAlign: 'center' }}>
        {error.message}
      </Text>
      <Text onPress={retry} style={{ color: colors.accentText, fontSize: 16, padding: 12 }}>
        إعادة المحاولة
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const colors = useColors();
  // Font files live in the repo (assets/fonts, OFL licensed); keys match `fonts` in src/theme.
  const [fontsLoaded] = useFonts({
    [fonts.display]: require('../../assets/fonts/Amiri-Bold.ttf'),
    [fonts.regular]: require('../../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
    [fonts.medium]: require('../../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
    [fonts.semibold]: require('../../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const ready = (fontsLoaded && migrated) || !!migrationError;
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);

  useEffect(() => {
    if (migrationError) SplashScreen.hideAsync();
  }, [migrationError]);


  if (migrationError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>
          تعذّر تجهيز قاعدة البيانات: {migrationError.message}
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
        {intro ? <Intro onDone={endIntro} /> : null}
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

  // Keep this phone and the server in step while someone is signed in.
  useEffect(() => {
    if (status === 'signedIn') return startAutoSync();
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
        headerRight: () => <HeaderSearch />,
      }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: 'مكتبتنا' }} />
        <Stack.Screen name="room/[id]" options={{ title: '' }} />
        <Stack.Screen name="shelf/[id]" options={{ title: '' }} />
        <Stack.Screen name="book/[id]" options={{ title: '' }} />
        <Stack.Screen name="category/[id]" options={{ title: '' }} />
        <Stack.Screen name="book/edit" options={{ title: '' }} />
        <Stack.Screen name="search" options={{ title: 'البحث', headerRight: () => null }} />
        <Stack.Screen name="profile" options={{ title: 'الملف الشخصي' }} />
        <Stack.Screen name="trash" options={{ title: 'سلة المحذوفات' }} />
        <Stack.Screen name="stats" options={{ title: 'الإحصائيات' }} />
        <Stack.Screen name="loans" options={{ title: 'الإعارات' }} />
        <Stack.Screen name="data" options={{ title: 'الاستيراد والتصدير' }} />
        <Stack.Screen name="book/history" options={{ title: 'سجل التعديلات' }} />
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
