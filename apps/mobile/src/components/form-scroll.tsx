import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, ScrollView, TextInput, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Fields call this when focused so the form scrolls them above the keyboard. */
const RevealContext = createContext<() => void>(() => {});
export const useRevealFocused = () => useContext(RevealContext);

/**
 * A ScrollView for forms that keeps the field being typed in visible above the keyboard.
 * Android draws edge-to-edge, so the window no longer shrinks for the keyboard on its own.
 */
export function FormScroll({ children, style, contentStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
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
        style={style}
        contentContainerStyle={[{ flexGrow: 1 }, contentStyle, { paddingBottom: keyboardHeight + 32 }]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
        }}>
        {children}
      </ScrollView>
    </RevealContext.Provider>
  );
}
