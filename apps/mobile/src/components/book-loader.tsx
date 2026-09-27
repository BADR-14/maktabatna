/**
 * Loading indicator: an open book whose left-hand page keeps turning over to the right, the way
 * an Arabic book turns. Runs on the UI thread (Reanimated), so it stays smooth while JS is busy.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/text';
import { useColors } from '@/theme';

export function BookLoader({ size = 72, label, cover }: { size?: number; label?: string; /** Cover colour; defaults to the brand burgundy. */ cover?: string }) {
  const c = useColors();
  const turn = useSharedValue(0);
  const w = size / 2;
  const h = size * 0.66;

  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }), -1, false);
  }, [turn]);

  // The page pivots on the spine (its right edge) from flat-left to flat-right.
  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${180 * turn.value}deg` }],
    opacity: turn.value > 0.97 ? 0 : 1,
  }));

  const page = { width: w, height: h, backgroundColor: '#F3E6CC', borderColor: c.accent };
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label ?? 'جارٍ التحميل'}>
      {/* Book is drawn left-to-right regardless of RTL: its spine is always in the middle. */}
      <View style={[styles.book, { direction: 'ltr' }]}>
        <View style={[styles.cover, { width: size + 8, height: h + 8, backgroundColor: cover ?? c.primary }]} />
        <View style={[styles.page, page, styles.left]}>
          <Lines />
        </View>
        <View style={[styles.page, page, styles.right]}>
          <Lines />
        </View>
        <Animated.View style={[styles.page, page, styles.left, styles.turning, { transformOrigin: 'right center' }, pageStyle]}>
          <Lines />
        </Animated.View>
      </View>
      {label ? <AppText variant="muted">{label}</AppText> : null}
    </View>
  );
}

function Lines() {
  return (
    <View style={styles.lines}>
      {[0.8, 0.6, 0.75, 0.5].map((f, i) => (
        <View key={i} style={{ height: 2, width: `${f * 100}%`, backgroundColor: '#C9B48E', borderRadius: 1 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  book: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cover: { position: 'absolute', borderRadius: 6 },
  page: { borderWidth: 1 },
  left: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  right: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  turning: { position: 'absolute', left: 0 },
  lines: { flex: 1, justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
});
