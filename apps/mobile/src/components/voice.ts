/**
 * The dictation sheet, or null in Expo Go (no native speech module there): the mic buttons hide.
 */
import type { VoiceSheet as VoiceSheetType } from '@/components/voice-sheet';
import { speechAvailable } from '@/lib/speech';

export const VoiceSheet: typeof VoiceSheetType | null = speechAvailable
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('@/components/voice-sheet') as typeof import('@/components/voice-sheet')).VoiceSheet
  : null;

export const VOICE_HINT = 'مثال: «رياض الصالحين، المؤلف النووي، دار ابن كثير، مجلد واحد، التصنيف رقائق»';
