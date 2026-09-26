/**
 * «خمري ودهبي» palette (option 3), from docs/PROJECT_BRIEF.md §10.
 * Plain StyleSheet + tokens: zero runtime styling cost, which matters on the Redmi 13C.
 */
import { useColorScheme } from 'react-native';

export const palettes = {
  light: {
    background: '#F6F1EF',
    surface: '#FFFCFB',
    text: '#2A1A1C',
    textMuted: '#7A6365',
    line: '#E6D8D6',
    primary: '#7A2230',
    onPrimary: '#FBEEE6',
    accent: '#B98D45',
    accentText: '#8E6627',
    tint: '#F3E2E1',
    tintText: '#7A2230',
  },
  dark: {
    background: '#170F10',
    surface: '#221718',
    text: '#F2E6E4',
    textMuted: '#B29C9D',
    line: '#3B2A2C',
    primary: '#4A1820',
    onPrimary: '#EBCB8F',
    accent: '#D6AE63',
    accentText: '#E2BD78',
    tint: '#3D2226',
    tintText: '#F0B7BD',
  },
} as const;

export type Palette = { [K in keyof typeof palettes.light]: string };

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? palettes.dark : palettes.light;
}

export const fonts = {
  display: 'Amiri_700Bold',
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, pill: 999 } as const;
