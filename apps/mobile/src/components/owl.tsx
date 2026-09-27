/**
 * The login owl, perched on a stack of books.
 * - idle:  breathes slowly and blinks now and then
 * - watch: eyes (and a slight head tilt) follow the caret while you type
 * - shy:   both wings rise from the shoulders and cover its eyes while you type a password
 * - peek:  one wing lowers a little so it can peek when the password is shown
 * Plain views animated on the UI thread with eased timings (no springs, so nothing wobbles).
 * The same geometry is mirrored in docs/owl-preview.html for checking the poses on a computer.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export type OwlMood = 'idle' | 'watch' | 'shy' | 'peek';

const C = {
  body: '#7B5236',
  wing: '#5E3B25',
  wingEdge: '#4A2D1C',
  disc: '#E6D2AC',
  discEdge: '#C9A878',
  belly: '#DCC59C',
  chevron: '#A9855C',
  iris: '#E8A33A',
  irisEdge: '#3B2418',
  pupil: '#141010',
  beak: '#C9A15A',
  talon: '#C9A15A',
};

// Wing angles (degrees) around the shoulder: folded, over the eyes, and peeking.
const FOLDED = 8;
const COVER = 118;
const PEEK = 80;
const ease = Easing.out(Easing.cubic);

export function Owl({ mood, look }: { mood: OwlMood; /** 0 = far left … 1 = far right */ look: number }) {
  const gaze = useSharedValue(0.5);
  const left = useSharedValue(FOLDED);
  const right = useSharedValue(FOLDED);
  const blink = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    const covering = mood === 'shy' || mood === 'peek';
    gaze.value = withTiming(mood === 'watch' ? look : 0.5, { duration: 260, easing: ease });
    left.value = withTiming(covering ? COVER : FOLDED, { duration: 420, easing: ease });
    right.value = withTiming(mood === 'peek' ? PEEK : covering ? COVER : FOLDED, { duration: mood === 'peek' ? 260 : 420, easing: ease });
  }, [mood, look, gaze, left, right]);

  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    blink.value = withRepeat(
      withSequence(withDelay(3800, withTiming(1, { duration: 80 })), withTiming(0, { duration: 120 })),
      -1,
      false,
    );
  }, [breath, blink]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * breath.value }, { rotate: `${(gaze.value - 0.5) * 8}deg` }],
  }));
  const pupil = useAnimatedStyle(() => ({ transform: [{ translateX: (gaze.value - 0.5) * 10 }, { translateY: Math.abs(gaze.value - 0.5) * 4 }] }));
  const lid = useAnimatedStyle(() => ({ height: `${blink.value * 100}%` }));
  const leftWing = useAnimatedStyle(() => ({ transform: [{ rotate: `${-left.value}deg` }] }));
  const rightWing = useAnimatedStyle(() => ({ transform: [{ rotate: `${right.value}deg` }] }));

  return (
    // A picture: always laid out left-to-right, whatever the app's direction.
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.owl, bodyStyle]}>
        <OwlFigure pupilStyle={pupil} lidStyle={lid} />
        {/* Wings last so they pass over the face. Each hangs from its shoulder and swings up. */}
        <Animated.View style={[styles.wing, { left: 6 }, leftWing]} />
        <Animated.View style={[styles.wing, { right: 6 }, rightWing]} />
      </Animated.View>
      <View style={styles.books}>
        <View style={[styles.book, { backgroundColor: '#1F3B2C', width: 150 }]}>
          <View style={styles.bookBand} />
        </View>
        <View style={[styles.book, { backgroundColor: '#8C2A24', width: 138, marginLeft: 12 }]}>
          <View style={styles.bookBand} />
        </View>
        <View style={[styles.book, { backgroundColor: '#1D2742', width: 160, marginLeft: -6 }]}>
          <View style={styles.bookBand} />
        </View>
      </View>
    </View>
  );
}

type AnimStyle = ReturnType<typeof useAnimatedStyle>;

/** Body, face, eyes and feet: everything but the wings, shared by both owls. */
function OwlFigure({ pupilStyle, lidStyle }: { pupilStyle: AnimStyle; lidStyle: AnimStyle }) {
  return (
    <>
      <View style={[styles.tuft, { left: 20, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[styles.tuft, { right: 20, transform: [{ rotate: '20deg' }] }]} />
      <View style={styles.body} />
      <View style={styles.belly}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.chevronRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.chevron} />
            ))}
          </View>
        ))}
      </View>
      <View style={[styles.disc, { left: 14 }]} />
      <View style={[styles.disc, { left: 66 }]} />
      {[23, 75].map((x) => (
        <View key={x} style={[styles.eye, { left: x }]}>
          <Animated.View style={[styles.pupil, pupilStyle]}>
            <View style={styles.glint} />
          </Animated.View>
          <Animated.View style={[styles.lid, lidStyle]} />
        </View>
      ))}
      <View style={styles.beak} />
      <View style={[styles.feet, { left: 38 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.talon} />
        ))}
      </View>
      <View style={[styles.feet, { left: 74 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.talon} />
        ))}
      </View>
    </>
  );
}

/**
 * The opening animation's star: the owl holding an open book, reading right to left like an
 * Arabic reader, then turning the page from left to right (the way an Arabic book turns).
 */
export function OwlReader() {
  const read = useSharedValue(0.8);
  const flip = useSharedValue(0);
  const blink = useSharedValue(0);

  useEffect(() => {
    // Eyes: along a line from right to left, then a quick hop back to the next line.
    read.value = withRepeat(
      withSequence(withTiming(0.18, { duration: 760, easing: Easing.inOut(Easing.quad) }), withTiming(0.8, { duration: 140 })),
      -1,
      false,
    );
    // Page: rest, turn over to the right, rest…
    flip.value = withRepeat(withSequence(withDelay(900, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) })), withTiming(0, { duration: 0 })), -1, false);
    blink.value = withRepeat(withSequence(withDelay(2600, withTiming(1, { duration: 80 })), withTiming(0, { duration: 120 })), -1, false);
  }, [read, flip, blink]);

  const pupil = useAnimatedStyle(() => ({ transform: [{ translateX: (read.value - 0.5) * 10 }, { translateY: 4 }] }));
  const lid = useAnimatedStyle(() => ({ height: `${blink.value * 100}%` }));
  const page = useAnimatedStyle(() => ({
    transform: [{ perspective: 500 }, { rotateY: `${flip.value * 180}deg` }],
    opacity: flip.value > 0.98 ? 0 : 1,
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.owl}>
        <OwlFigure pupilStyle={pupil} lidStyle={lid} />
        {/* Wings behind the book, holding it by its sides. */}
        <View style={[styles.wing, { left: 4, transform: [{ rotate: '-4deg' }] }]} />
        <View style={[styles.wing, { right: 4, transform: [{ rotate: '4deg' }] }]} />
        <View style={styles.readCover} />
        <View style={[styles.readPage, { left: 23 }]}>
          <PageLines />
        </View>
        <View style={[styles.readPage, { left: 67 }]}>
          <PageLines />
        </View>
        <Animated.View style={[styles.readPage, { left: 23, transformOrigin: 'right center' }, page]}>
          <PageLines />
        </Animated.View>
        <View style={styles.readSpine} />
        {/* Wing tips over the cover's edges, gripping it. */}
        <View style={[styles.grip, { left: 13 }]} />
        <View style={[styles.grip, { right: 13 }]} />
      </View>
    </View>
  );
}

function PageLines() {
  return (
    <View style={styles.lines}>
      {[0.85, 0.7, 0.9, 0.6, 0.8].map((w, i) => (
        <View key={i} style={[styles.line, { width: `${w * 100}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', direction: 'ltr' },
  owl: { width: 134, height: 140 },
  body: {
    position: 'absolute',
    left: 13,
    top: 16,
    width: 108,
    height: 120,
    backgroundColor: C.body,
    borderTopLeftRadius: 54,
    borderTopRightRadius: 54,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tuft: {
    position: 'absolute',
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: C.body,
  },
  belly: {
    position: 'absolute',
    left: 34,
    top: 80,
    width: 66,
    height: 54,
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: C.belly,
    paddingTop: 10,
    gap: 6,
    alignItems: 'center',
  },
  chevronRow: { flexDirection: 'row', gap: 8 },
  chevron: { width: 9, height: 5, borderBottomWidth: 2, borderColor: C.chevron, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  disc: { position: 'absolute', top: 28, width: 54, height: 54, borderRadius: 27, backgroundColor: C.disc, borderWidth: 2, borderColor: C.discEdge },
  eye: {
    position: 'absolute',
    top: 37,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.iris,
    borderWidth: 2,
    borderColor: C.irisEdge,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pupil: { width: 17, height: 17, borderRadius: 9, backgroundColor: C.pupil },
  glint: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', marginLeft: 9, marginTop: 3 },
  lid: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.disc },
  beak: {
    position: 'absolute',
    left: 60,
    top: 70,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: C.beak,
  },
  feet: { position: 'absolute', top: 132, flexDirection: 'row', gap: 2 },
  talon: { width: 6, height: 9, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: C.talon },
  wing: {
    position: 'absolute',
    top: 64,
    width: 30,
    height: 64,
    backgroundColor: C.wing,
    borderColor: C.wingEdge,
    borderWidth: 1,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    transformOrigin: '50% 10%',
  },
  books: { marginTop: -8, alignItems: 'flex-start' },
  book: { height: 14, borderRadius: 3, marginTop: 2, justifyContent: 'center', paddingHorizontal: 10 },
  bookBand: { height: 2, width: 18, backgroundColor: '#D6AE63', borderRadius: 1, alignSelf: 'flex-end' },
  readCover: { position: 'absolute', left: 19, top: 84, width: 96, height: 54, borderRadius: 5, backgroundColor: '#1F3B2C', borderWidth: 2, borderColor: '#D6AE63' },
  readPage: {
    position: 'absolute',
    top: 86,
    width: 44,
    height: 48,
    backgroundColor: '#F6EBD3',
    borderWidth: 1,
    borderColor: '#D9C49C',
    borderRadius: 3,
  },
  grip: { position: 'absolute', top: 100, width: 14, height: 22, borderRadius: 7, backgroundColor: C.wing, borderWidth: 1, borderColor: C.wingEdge },
  readSpine: { position: 'absolute', left: 66, top: 86, width: 2, height: 48, backgroundColor: '#C9B48E' },
  lines: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', gap: 5, paddingHorizontal: 5 },
  line: { height: 2, borderRadius: 1, backgroundColor: '#B9A27A' },
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
