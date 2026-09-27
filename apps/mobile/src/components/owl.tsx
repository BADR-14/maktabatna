/**
 * The login owl, perched on a stack of books. It follows what you type with its eyes, covers
 * them with its wings while you type a password, and peeks with one eye when the password is
 * shown. Plain views animated on the UI thread (Reanimated): no images, no cost to the app.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type OwlMood = 'idle' | 'watch' | 'shy' | 'peek';

const BODY = '#8A5A3B';
const FACE = '#E9D6B4';
const BELLY = '#F3E6CC';
const WING = '#6E4429';
const BEAK = '#D6AE63';
const EYE = '#FFFDF7';
const PUPIL = '#2A1A1C';

export function Owl({ mood, look }: { mood: OwlMood; /** 0 = far left … 1 = far right */ look: number }) {
  const gaze = useSharedValue(0.5);
  const cover = useSharedValue(0); // 0 wings down, 1 over both eyes
  const peek = useSharedValue(0); // 1 = right wing lowered a little
  const blink = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    gaze.value = withSpring(mood === 'watch' ? look : 0.5, { damping: 14 });
    cover.value = withSpring(mood === 'shy' || mood === 'peek' ? 1 : 0, { damping: 13, stiffness: 140 });
    peek.value = withTiming(mood === 'peek' ? 1 : 0, { duration: 220 });
  }, [mood, look, gaze, cover, peek]);

  useEffect(() => {
    // Idle life: a slow breath and a blink every few seconds.
    bob.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    blink.value = withRepeat(withSequence(withDelay(3200, withTiming(1, { duration: 90 })), withTiming(0, { duration: 110 })), -1, false);
  }, [bob, blink]);

  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * bob.value }] }));
  const pupil = useAnimatedStyle(() => ({ transform: [{ translateX: (gaze.value - 0.5) * 12 }, { translateY: Math.abs(gaze.value - 0.5) * 6 }] }));
  const lid = useAnimatedStyle(() => ({ height: `${blink.value * 100}%` }));
  const leftWing = useAnimatedStyle(() => ({
    transform: [{ translateX: cover.value * 30 }, { translateY: -cover.value * 46 }, { rotate: `${-cover.value * 58}deg` }],
  }));
  const rightWing = useAnimatedStyle(() => ({
    transform: [
      { translateX: -cover.value * 30 },
      { translateY: -cover.value * 46 + peek.value * 16 },
      { rotate: `${cover.value * 58 - peek.value * 14}deg` },
    ],
  }));

  return (
    // The owl is a picture: always laid out left-to-right, whatever the app's direction.
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.owl, bodyStyle]}>
        <View style={[styles.tuft, styles.tuftL]} />
        <View style={[styles.tuft, styles.tuftR]} />
        <View style={styles.body}>
          <View style={styles.belly} />
          <View style={styles.face}>
            {[0, 1].map((i) => (
              <View key={i} style={styles.eye}>
                <Animated.View style={[styles.pupil, pupil]}>
                  <View style={styles.glint} />
                </Animated.View>
                <Animated.View style={[styles.lid, lid]} />
              </View>
            ))}
          </View>
          <View style={styles.beak} />
        </View>
        <Animated.View style={[styles.wing, styles.wingL, leftWing]} />
        <Animated.View style={[styles.wing, styles.wingR, rightWing]} />
        <View style={styles.feet}>
          <View style={styles.foot} />
          <View style={styles.foot} />
        </View>
      </Animated.View>
      <View style={styles.books}>
        <View style={[styles.book, { backgroundColor: '#1F3B2C', width: 150 }]} />
        <View style={[styles.book, { backgroundColor: '#B98D45', width: 136, marginLeft: 10 }]} />
        <View style={[styles.book, { backgroundColor: '#1D2742', width: 158, marginLeft: -6 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', direction: 'ltr' },
  owl: { width: 120, height: 128, alignItems: 'center', justifyContent: 'flex-end', zIndex: 2 },
  body: { width: 104, height: 112, borderRadius: 52, backgroundColor: BODY, alignItems: 'center', overflow: 'hidden' },
  belly: { position: 'absolute', bottom: -18, width: 70, height: 72, borderRadius: 36, backgroundColor: BELLY },
  face: { flexDirection: 'row', gap: 6, marginTop: 16, backgroundColor: FACE, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 30 },
  eye: { width: 34, height: 34, borderRadius: 17, backgroundColor: EYE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pupil: { width: 15, height: 15, borderRadius: 8, backgroundColor: PUPIL },
  glint: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', marginLeft: 8, marginTop: 2 },
  lid: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: BODY },
  beak: {
    marginTop: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BEAK,
  },
  tuft: { position: 'absolute', top: 10, width: 22, height: 22, backgroundColor: BODY, transform: [{ rotate: '45deg' }] },
  tuftL: { left: 16 },
  tuftR: { right: 16 },
  wing: { position: 'absolute', bottom: 12, width: 34, height: 64, borderRadius: 20, backgroundColor: WING },
  wingL: { left: 2, transformOrigin: 'bottom center' },
  wingR: { right: 2, transformOrigin: 'bottom center' },
  feet: { position: 'absolute', bottom: -4, flexDirection: 'row', gap: 22 },
  foot: { width: 16, height: 8, borderRadius: 4, backgroundColor: BEAK },
  books: { marginTop: -2, alignItems: 'flex-start' },
  book: { height: 14, borderRadius: 3, marginTop: 2 },
});

/** Wires text fields to the owl: which field has focus, and how far along the typing is. */
export function useOwl() {
  const [focus, setFocus] = useState<'text' | 'password' | null>(null);
  const [length, setLength] = useState(0);
  const [shown, setShown] = useState(false);
  const mood: OwlMood = focus === 'password' ? (shown ? 'peek' : 'shy') : focus === 'text' ? 'watch' : 'idle';
  // Text is right-aligned, so the caret moves left as you type: follow it.
  const look = 1 - Math.min(length, 22) / 22;
  const text = (value: string) => ({
    onFocus: () => {
      setFocus('text');
      setLength(value.length);
    },
    onBlur: () => setFocus(null),
    onTyped: (v: string) => setLength(v.length),
  });
  const password = {
    onFocus: () => setFocus('password'),
    onBlur: () => setFocus(null),
    reveal: { shown, onToggle: () => setShown((s) => !s) },
  };
  return { mood, look, text, password };
}
