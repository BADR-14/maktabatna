import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/text';
import { fonts, radius, space, useColors } from '@/theme';

/** Fields call this when focused so the form scrolls them above the keyboard. */
const RevealContext = createContext<() => void>(() => {});
export const useRevealFocused = () => useContext(RevealContext);

/**
 * Burgundy header with the app name, and a card holding the form. Shared by login and register.
 * Keeps the field you're typing in visible above the keyboard (Android draws edge-to-edge, so
 * the window no longer shrinks for the keyboard on its own).
 */
export function AuthShell({ subtitle, art, children }: { subtitle: string; /** Shown above the title, e.g. the owl. */ art?: ReactNode; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const top = keyboardTop.current;
    if (!input || top == null) return;
    input.measure((_x, _y, _w, h, _px, pageY) => {
      // Leave room under the field for its hint line.
      const overlap = pageY + h + 44 - (top - 12);
      if (overlap > 0) scroll.current?.scrollTo({ y: offset.current + overlap, animated: true });
      else if (pageY < insets.top + 12) scroll.current?.scrollTo({ y: Math.max(0, offset.current + pageY - insets.top - 24), animated: true });
    });
  }, [insets.top]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      // Wait a frame for the extra bottom space to be laid out, then scroll.
      requestAnimationFrame(reveal);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  // Moving between fields while the keyboard is already open.
  const revealSoon = useCallback(() => setTimeout(reveal, 80), [reveal]);

  return (
    <RevealContext.Provider value={revealSoon}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1, backgroundColor: c.background }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardHeight }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
        }}>
        <View style={[styles.hero, { backgroundColor: c.primary, paddingTop: insets.top + (art ? 20 : 48) }]}>
          {art ?? <Spines />}
          <AppText style={[styles.title, { color: c.onPrimary }]}>مكتبتنا</AppText>
          <AppText style={{ color: c.onPrimary, opacity: 0.85 }}>{subtitle}</AppText>
        </View>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>
      </ScrollView>
    </RevealContext.Provider>
  );
}

/** A small row of book spines in the family library's colors. */
export function Spines({ height = 44 }: { height?: number }) {
  const colors = ['#B98D45', '#1F3B2C', '#E6DCC3', '#1D2742', '#8C2A24', '#D6AE63', '#3B2419', '#5B7F6A'];
  const heights = [1, 0.82, 0.94, 1, 0.76, 0.9, 1, 0.85];
  return (
    <View style={[styles.spines, { height }]}>
      {colors.map((col, i) => (
        <View key={col} style={{ width: 9, height: height * heights[i], backgroundColor: col, borderRadius: 2 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 72, paddingHorizontal: space.xl, gap: space.xs },
  title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 66, marginTop: space.sm },
  card: {
    marginHorizontal: space.lg,
    marginTop: -44,
    marginBottom: space.xl,
    padding: space.xl,
    gap: space.lg,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  spines: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
});
