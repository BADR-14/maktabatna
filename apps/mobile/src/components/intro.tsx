/**
 * Opening animation shown once per launch, right after the native splash (same burgundy and
 * the same emblem, so the hand-over is seamless): the emblem settles in with a little bounce,
 * the name rises up under it, then everything fades into the app.
 */
import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { fonts } from '@/theme';

const emblem = require('../../assets/images/splash-icon.png');

export function Intro({ onDone }: { onDone: () => void }) {
  const logo = useSharedValue(0);
  const glow = useSharedValue(0);
  const word = useSharedValue(0);
  const out = useSharedValue(1);

  useEffect(() => {
    logo.value = withSpring(1, { damping: 11, stiffness: 120 });
    glow.value = withDelay(250, withSequence(withTiming(1, { duration: 500 }), withTiming(0.35, { duration: 600 })));
    word.value = withDelay(450, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    out.value = withDelay(1700, withTiming(0, { duration: 380 }, (finished) => {
      if (finished) runOnJS(onDone)();
    }));
  }, [logo, glow, word, out, onDone]);

  const container = useAnimatedStyle(() => ({ opacity: out.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, logo.value * 1.4),
    transform: [{ scale: 0.72 + 0.28 * logo.value }, { rotate: `${(1 - logo.value) * -8}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.5, transform: [{ scale: 0.8 + glow.value * 0.4 }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 18 }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.bg, container]} pointerEvents="none">
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={logoStyle}>
        <Image source={emblem} style={styles.emblem} />
      </Animated.View>
      <Animated.Text style={[styles.word, wordStyle]}>مكتبتنا</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: '#7A2230', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#D6AE63' },
  emblem: { width: 220, height: 220 },
  word: { fontFamily: fonts.display, fontSize: 52, lineHeight: 80, color: '#E7C98C', marginTop: -24 },
});
