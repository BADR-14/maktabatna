/**
 * Listens while the person speaks and shows the words live. «تم» hands the whole sentence back.
 * Import this file only when speechAvailable (it loads the native module).
 */
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/text';
import { Button } from '@/components/ui';
import { fonts, radius, space, useColors } from '@/theme';

const ERRORS: Record<string, string> = {
  'not-allowed': 'اسمح للتطبيق باستخدام المايكروفون من إعدادات الهاتف.',
  'no-speech': 'لم أسمع شيئاً. اضغط «إعادة» وتكلّم.',
  'speech-timeout': 'لم أسمع شيئاً. اضغط «إعادة» وتكلّم.',
  network: 'التعرّف على الكلام يحتاج الإنترنت، أو نزّل العربية للاستعمال دون اتصال من إعدادات Google.',
  'language-not-supported': 'العربية غير متاحة للتعرّف على الكلام على هذا الهاتف. نزّلها من إعدادات Google ← الصوت.',
  'service-not-allowed': 'خدمة التعرّف على الكلام غير متاحة. تأكد من وجود تطبيق Google على الهاتف.',
};

export function VoiceSheet({ visible, onClose, onDone, hint }: { visible: boolean; onClose: () => void; onDone: (text: string) => void; hint?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [finals, setFinals] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishing = useRef(false);
  const text = `${finals} ${interim}`.trim();
  const textRef = useRef('');
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const pulse = useSharedValue(0);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.25 }], opacity: 0.35 - pulse.value * 0.3 }));

  async function start() {
    setError(null);
    setFinals('');
    setInterim('');
    finishing.current = false;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError(ERRORS['not-allowed']);
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: 'ar-SA', interimResults: true, continuous: true, addsPunctuation: false });
  }

  // Listening starts when the sheet appears (onShow) and stops when it goes away.
  useEffect(() => {
    if (!visible) ExpoSpeechRecognitionModule.abort();
  }, [visible]);

  useEffect(() => {
    pulse.value = listening ? withRepeat(withTiming(1, { duration: 900 }), -1, false) : withTiming(0);
  }, [listening, pulse]);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    if (finishing.current) {
      finishing.current = false;
      onDone(textRef.current);
    }
  });
  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      setFinals((f) => `${f} ${t}`.trim());
      setInterim('');
    } else setInterim(t);
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'aborted') return;
    setError(ERRORS[e.error] ?? `تعذّر التعرّف على الكلام (${e.error}).`);
  });

  const done = () => {
    if (listening) {
      finishing.current = true;
      ExpoSpeechRecognitionModule.stop();
    } else onDone(text);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => void start()} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.micWrap}>
          <Animated.View style={[styles.ring, { backgroundColor: c.primary }, ring]} />
          <View style={[styles.mic, { backgroundColor: listening ? c.primary : c.textMuted }]}>
            <Ionicons name="mic" size={34} color="#fff" />
          </View>
        </View>
        <AppText variant="label" style={{ textAlign: 'center' }}>
          {listening ? 'أستمع… تكلّم الآن' : error ? 'توقّف الاستماع' : 'جارٍ التجهيز…'}
        </AppText>
        {hint ? (
          <AppText variant="muted" style={{ textAlign: 'center' }}>
            {hint}
          </AppText>
        ) : null}
        <View style={[styles.textBox, { borderColor: c.line, backgroundColor: c.background }]}>
          <AppText style={{ fontSize: 17, lineHeight: 28, color: text ? c.text : c.textMuted }}>{text || '…'}</AppText>
        </View>
        {error ? <AppText style={{ color: '#B3261E', textAlign: 'center' }}>{error}</AppText> : null}
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button title="تم" onPress={done} disabled={!text} />
          </View>
          <Pressable onPress={() => void start()} style={[styles.small, { borderColor: c.line }]}>
            <AppText style={{ fontFamily: fonts.semibold }}>إعادة</AppText>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.small, { borderColor: c.line }]}>
            <AppText style={{ fontFamily: fonts.semibold }}>إلغاء</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.lg, gap: space.md },
  micWrap: { alignSelf: 'center', width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
  mic: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  textBox: { minHeight: 90, borderWidth: 1, borderRadius: radius.md, padding: space.md },
  actions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  small: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 50, justifyContent: 'center' },
});
