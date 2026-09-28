/** Small building blocks for the reading screens: bottom sheet, progress bar, stars, percent track. */
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/text';
import { space, useColors } from '@/theme';

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="إغلاق" />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grabber, { backgroundColor: c.line }]} />
        <AppText variant="title">{title}</AppText>
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** A thin bar filled from the right (Arabic reading direction). */
export function ProgressBar({ percent, color, height = 8 }: { percent: number; color?: string; height?: number }) {
  const c = useColors();
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: c.tint }]}>
      <View style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height, borderRadius: height / 2, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

/** 1–5 stars; tap the same star again to clear. */
export function Stars({ value, onChange, size = 30 }: { value: number | null; onChange?: (v: number | null) => void; size?: number }) {
  const c = useColors();
  return (
    <View style={[styles.stars, { direction: 'rtl' }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(value === n ? null : n)}
          hitSlop={4}
          accessibilityLabel={`${n} من ٥`}>
          <Ionicons name={value && n <= value ? 'star' : 'star-outline'} size={size} color={c.accent} />
        </Pressable>
      ))}
    </View>
  );
}

/** Drag or tap to set a percent. Fills from the right, like the progress bar. */
export function PercentTrack({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = useColors();
  const width = useRef(1);
  const set = (x: number) => onChange(Math.round(Math.min(100, Math.max(0, ((width.current - x) / width.current) * 100))));
  return (
    <View
      style={[styles.dragArea, { direction: 'ltr' }]}
      onLayout={(e: LayoutChangeEvent) => (width.current = e.nativeEvent.layout.width || 1)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => set(e.nativeEvent.locationX)}
      onResponderMove={(e) => set(e.nativeEvent.locationX)}>
      <View style={[styles.dragTrack, { backgroundColor: c.tint }]}>
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${value}%`, backgroundColor: c.primary, borderRadius: 6 }} />
      </View>
      <View style={[styles.knob, { right: `${value}%`, backgroundColor: c.surface, borderColor: c.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  track: { overflow: 'hidden', flexDirection: 'row' },
  stars: { flexDirection: 'row', gap: 6 },
  dragArea: { height: 36, justifyContent: 'center' },
  dragTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  knob: { position: 'absolute', width: 26, height: 26, borderRadius: 13, borderWidth: 3, marginRight: -13, top: 5 },
});
