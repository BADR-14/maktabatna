import { Amiri_700Bold } from '@expo-google-fonts/amiri/700Bold';
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { DevSettings, I18nManager, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
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
  const [fontsLoaded] = useFonts({
    Amiri_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
  });
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const ready = (fontsLoaded && migrated) || !!migrationError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

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
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.onPrimary,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'مكتبتنا' }} />
        <Stack.Screen name="bookcase/[id]" options={{ title: '' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
