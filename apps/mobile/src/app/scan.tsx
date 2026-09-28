/**
 * Scan a shelf label. `?mode=pick` hands the shelf back to the screen that asked (voice entry,
 * the place picker); otherwise it opens the shelf page.
 */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { Button } from '@/components/ui';
import { useLiveQuery } from '@/db/live';
import { allShelvesQuery } from '@/db/queries';
import { deliverScan, parseShelfCode } from '@/lib/scan';
import { space, useColors } from '@/theme';

export default function ScanScreen() {
  const c = useColors();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const { data: shelves } = useLiveQuery(allShelvesQuery);
  const [message, setMessage] = useState<string | null>(null);
  const done = useRef(false);

  // Going back without a scan tells the waiting screen "nothing".
  useEffect(() => () => {
    if (mode === 'pick' && !done.current) deliverScan(null);
  }, [mode]);

  const onScan = (data: string) => {
    if (done.current) return;
    const id = parseShelfCode(data);
    if (!id || !shelves.some((s) => s.shelfId === id)) {
      setMessage('هذا ليس رمز رف من «مكتبتنا».');
      return;
    }
    done.current = true;
    if (mode === 'pick') {
      deliverScan(id);
      router.back();
    } else router.replace({ pathname: '/shelf/[id]', params: { id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ title: 'مسح رمز الرف' }} />
      {!permission ? null : !permission.granted ? (
        <View style={[styles.center, { backgroundColor: c.background }]}>
          <Ionicons name="camera-outline" size={48} color={c.textMuted} />
          <AppText style={{ textAlign: 'center' }}>نحتاج الكاميرا لقراءة رمز الرف.</AppText>
          <Button title="السماح بالكاميرا" onPress={requestPermission} />
        </View>
      ) : (
        <>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => onScan(r.data)} />
          <View style={styles.frame} pointerEvents="none" />
          <View style={styles.bottom}>
            <AppText style={{ color: '#fff', textAlign: 'center' }}>{message ?? 'وجّه الكاميرا إلى ملصق الرف'}</AppText>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  frame: { position: 'absolute', alignSelf: 'center', top: '28%', width: 240, height: 240, borderWidth: 3, borderColor: '#D6AE63', borderRadius: 20 },
  bottom: { position: 'absolute', bottom: 60, left: 0, right: 0, padding: space.lg },
});
