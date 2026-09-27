import { Ionicons } from '@expo/vector-icons';
import { formatArabicNumber } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Stack, type Href } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar } from '@/components/avatar';
import { PressLink } from '@/components/press-link';
import { AppText } from '@/components/text';
import { setAvatar } from '@/db/mutations';
import { loansQuery, trashQuery, userQuery } from '@/db/queries';
import { authedApi } from '@/lib/api';
import { googleAvailable, pickGoogleAccount } from '@/lib/google';
import { timeAgo } from '@/lib/time';
import { syncNow, useSyncState } from '@/sync';
import { getThemePref, radius, setThemePref, space, useColors, type ThemePref } from '@/theme';

/** The signed-in person: photo, name, the trash, and signing out. */
export default function Profile() {
  const c = useColors();
  const { user, signOut } = useSession();
  const { data: row } = useLiveQuery(userQuery(user?.id ?? ''), [user?.id]);
  const { data: trash } = useLiveQuery(trashQuery);
  const { data: loans } = useLiveQuery(loansQuery);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
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
  const onLoan = loans.filter((l) => !l.returnedAt).length;

  async function linkGoogle() {
    try {
      const idToken = await pickGoogleAccount();
      if (!idToken) return;
      const res = await authedApi<{ email: string | null }>('/auth/google/link', { body: { idToken } });
      Alert.alert('تم الربط', `يمكنك الآن الدخول بحساب Google${res.email ? ` (${res.email})` : ''}.`);
    } catch (e) {
      Alert.alert('تعذّر الربط', e instanceof Error ? e.message : String(e));
    }
  }
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

      <SyncCard onSignInAgain={signOut} />

      <Section title="المكتبة">
        <LinkRow icon="stats-chart-outline" label="الإحصائيات والنواقص" href="/stats" />
        <LinkRow icon="people-outline" label="الإعارات" href="/loans" badge={onLoan} />
        <LinkRow icon="swap-vertical-outline" label="الاستيراد والتصدير" href="/data" />
        <LinkRow icon="trash-outline" label="سلة المحذوفات" href="/trash" badge={trashCount} />
      </Section>

      <Section title="الحساب">
        <Row icon="image-outline" label={hasPhoto ? 'تغيير الصورة' : 'إضافة صورة'} onPress={choosePhoto} />
        {googleAvailable ? <Row icon="logo-google" label="ربط حساب Google" onPress={linkGoogle} /> : null}
      </Section>

      <Section title="المظهر">
        <View style={[styles.segment, { borderColor: c.line }]}>
          {(
            [
              ['auto', 'مثل الهاتف'],
              ['light', 'فاتح'],
              ['dark', 'داكن'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => {
                setThemePref(k);
                setTheme(k);
              }}
              style={[styles.segmentItem, theme === k && { backgroundColor: c.primary }]}>
              <AppText style={{ color: theme === k ? c.onPrimary : c.text, fontSize: 14 }}>{label}</AppText>
            </Pressable>
          ))}
        </View>
      </Section>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Row icon="log-out-outline" label="تسجيل الخروج" onPress={confirmSignOut} danger />
      </View>
      <AppText variant="muted" style={{ textAlign: 'center' }}>
        مكتبتنا، الإصدار {Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="muted" style={{ paddingHorizontal: space.xs }}>
        {title}
      </AppText>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>
    </View>
  );
}

function LinkRow({ icon, label, href, badge }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; href: Href; badge?: number }) {
  const c = useColors();
  return (
    <PressLink href={href} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={22} color={c.accentText} />
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {badge ? <AppText variant="muted">{formatArabicNumber(badge)}</AppText> : null}
      <Ionicons name="chevron-back" size={18} color={c.textMuted} />
    </PressLink>
  );
}

/** Sync status, with a button to sync now; after a long time offline, a way to sign in again. */
function SyncCard({ onSignInAgain }: { onSignInAgain: () => void }) {
  const c = useColors();
  const s = useSyncState();
  const [, tick] = useState(0);
  const text =
    s.status === 'syncing'
      ? 'جارٍ المزامنة…'
      : s.status === 'offline'
        ? 'الخادم غير متاح الآن. التعديلات محفوظة على الهاتف وستُرسل عند الاتصال.'
        : s.status === 'auth'
          ? (s.message ?? 'انتهت الجلسة.')
          : s.status === 'error'
            ? `تعذّرت المزامنة: ${s.message ?? ''}`
            : s.lastSyncedAt
              ? `آخر مزامنة ${timeAgo(s.lastSyncedAt)}`
              : 'لم تتم أي مزامنة بعد.';
  const ok = s.status === 'idle' && s.lastSyncedAt;
  return (
    <View style={[styles.card, styles.sync, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Ionicons
        name={s.status === 'syncing' ? 'sync' : ok ? 'cloud-done-outline' : 'cloud-offline-outline'}
        size={26}
        color={ok ? '#3B6B2A' : s.status === 'syncing' ? c.accentText : '#B3261E'}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">المزامنة مع الخادم</AppText>
        <AppText variant="muted">{text}</AppText>
        {s.pending ? <AppText variant="muted">{`بانتظار الإرسال: ${formatArabicNumber(s.pending)}`}</AppText> : null}
      </View>
      {s.status === 'auth' ? (
        <Pressable onPress={onSignInAgain} style={[styles.syncBtn, { borderColor: c.accent }]}>
          <AppText style={{ color: c.accentText, fontSize: 13 }}>دخول</AppText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => syncNow().then(() => tick((n) => n + 1))}
          disabled={s.status === 'syncing'}
          style={[styles.syncBtn, { borderColor: c.accent, opacity: s.status === 'syncing' ? 0.5 : 1 }]}>
          <AppText style={{ color: c.accentText, fontSize: 13 }}>مزامنة الآن</AppText>
        </Pressable>
      )}
    </View>
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
  sync: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  syncBtn: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
  segment: { flexDirection: 'row', margin: space.sm, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 56 },
});
