/**
 * Opening animation, once per launch, right after the native splash (same burgundy): the owl
 * sits reading a book, following the lines right to left and turning a page, then the name rises
 * under it and everything fades into the app. A tap skips it.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { OwlReader } from '@/components/owl';
import { fonts } from '@/theme';

const DURATION = 3000;

export function Intro({ onDone }: { onDone: () => void }) {
  const owl = useSharedValue(0);
  const word = useSharedValue(0);
  const out = useSharedValue(1);

  const finish = (delay: number) => {
    out.value = withDelay(delay, withTiming(0, { duration: 360 }, (done) => {
      if (done) runOnJS(onDone)();
    }));
  };

  useEffect(() => {
    owl.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    word.value = withDelay(900, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    finish(DURATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const container = useAnimatedStyle(() => ({ opacity: out.value }));
  const owlStyle = useAnimatedStyle(() => ({ opacity: owl.value, transform: [{ translateY: (1 - owl.value) * 24 }, { scale: 1.35 }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 16 }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.bg, container]}>
      <Pressable style={styles.fill} onPress={() => finish(0)} accessibilityLabel="تخطّي">
        <Animated.View style={owlStyle}>
          <OwlReader />
        </Animated.View>
        <Animated.Text style={[styles.word, wordStyle]}>مكتبتنا</Animated.Text>
        <Animated.Text style={[styles.tag, wordStyle]}>أرشيف مكتبة البيت</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: '#7A2230', zIndex: 100 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.display, fontSize: 54, lineHeight: 84, color: '#E7C98C', marginTop: 40 },
  tag: { fontFamily: fonts.regular, fontSize: 15, color: '#F3E2D6', opacity: 0.85 },
});
