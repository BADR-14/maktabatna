import { Ionicons } from '@expo/vector-icons';
import { formatArabicNumber } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar } from '@/components/avatar';
import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { setAvatar } from '@/db/mutations';
import { trashQuery, userQuery } from '@/db/queries';
import { radius, space, useColors } from '@/theme';

/** The signed-in person: photo, name, the trash, and signing out. */
export default function Profile() {
  const c = useColors();
  const { user, signOut } = useSession();
  const { data: row } = useLiveQuery(userQuery(user?.id ?? ''), [user?.id]);
  const { data: trash } = useLiveQuery(trashQuery);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const hasPhoto = !!row?.[0]?.avatarUri;

  async function pick(source: 'camera' | 'library') {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الإذن مطلوب', source === 'camera' ? 'اسمح للتطبيق باستخدام الكاميرا من إعدادات الهاتف.' : 'اسمح للتطبيق بالوصول إلى الصور من إعدادات الهاتف.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets[0]) return;
    setBusy(true);
    try {
      const name = `avatar-${user!.id}-${Date.now()}.jpg`;
      await new File(res.assets[0].uri).copy(new File(Paths.document, name));
      removeFile(row?.[0]?.avatarUri);
      setAvatar(user!.id, name);
    } catch (e) {
      Alert.alert('تعذّر حفظ الصورة', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const choosePhoto = () =>
    Alert.alert('صورة الملف الشخصي', undefined, [
      { text: 'التقاط صورة', onPress: () => pick('camera') },
      { text: 'اختيار من المعرض', onPress: () => pick('library') },
      ...(hasPhoto
        ? [
            {
              text: 'إزالة الصورة',
              style: 'destructive' as const,
              onPress: () => {
                removeFile(row?.[0]?.avatarUri);
                setAvatar(user.id, null);
              },
            },
          ]
        : []),
      { text: 'إلغاء', style: 'cancel' },
    ]);

  const confirmSignOut = () =>
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);

  const trashCount = trash?.length ?? 0;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'الملف الشخصي' }} />
      <View style={styles.head}>
        <Pressable onPress={choosePhoto} disabled={busy} accessibilityRole="button" accessibilityLabel="تغيير الصورة">
          <Avatar userId={user.id} name={user.displayName} size={112} ring={c.accent} />
          <View style={[styles.camera, { backgroundColor: c.primary, borderColor: c.background }]}>
            <Ionicons name="camera" size={18} color={c.onPrimary} />
          </View>
        </Pressable>
        <AppText variant="title" style={{ fontSize: 26, lineHeight: 40 }}>
          {user.displayName}
        </AppText>
        <AppText variant="muted">@{user.username}</AppText>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Row icon="image-outline" label={hasPhoto ? 'تغيير الصورة' : 'إضافة صورة'} onPress={choosePhoto} />
        <PressLink href="/trash" style={({ pressed }) => [styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line, opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="trash-outline" size={22} color={c.accentText} />
          <AppText style={{ flex: 1 }}>سلة المحذوفات</AppText>
          {trashCount ? <AppText variant="muted">{formatArabicNumber(trashCount)}</AppText> : null}
          <Ionicons name="chevron-back" size={18} color={c.textMuted} />
        </PressLink>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Row icon="log-out-outline" label="تسجيل الخروج" onPress={confirmSignOut} danger />
      </View>
      <AppText variant="muted" style={{ textAlign: 'center' }}>
        مكتبتنا، الإصدار {Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>
    </ScrollView>
  );
}

function Row({ icon, label, onPress, danger }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean }) {
  const c = useColors();
  const color = danger ? '#B3261E' : c.accentText;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={22} color={color} />
      <AppText style={{ flex: 1, color: danger ? color : c.text }}>{label}</AppText>
      {danger ? null : <Ionicons name="chevron-back" size={18} color={c.textMuted} />}
    </Pressable>
  );
}

function removeFile(name: string | null | undefined) {
  if (!name) return;
  try {
    const f = new File(Paths.document, name);
    if (f.exists) f.delete();
  } catch {
    // An orphaned photo file is harmless.
  }
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  head: { alignItems: 'center', gap: 2, paddingVertical: space.lg },
  camera: { position: 'absolute', bottom: 2, left: 2, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  card: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 56 },
});
