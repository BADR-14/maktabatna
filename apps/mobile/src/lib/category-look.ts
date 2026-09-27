import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type Icon = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Icon and colour for each seeded category (docs/PROJECT_BRIEF.md); new ones cycle the palette. */
const LOOKS: Record<string, { icon: Icon; color: string }> = {
  'تفسير وعلوم قرآن': { icon: 'book-open-page-variant', color: '#1F5C4A' },
  'حديث وعلومه': { icon: 'format-quote-open', color: '#7A2230' },
  'فقه وأصوله': { icon: 'scale-balance', color: '#2A4F8A' },
  عقيدة: { icon: 'star-crescent', color: '#8E6627' },
  'سيرة وتراجم': { icon: 'account-group', color: '#5B3A7A' },
  تاريخ: { icon: 'history', color: '#8C4A24' },
  'لغة ونحو ومعاجم': { icon: 'fountain-pen-tip', color: '#2F6A6A' },
  أدب: { icon: 'feather', color: '#9A3B52' },
  'رقائق وتزكية': { icon: 'heart-outline', color: '#3B6B2A' },
  موسوعات: { icon: 'bookshelf', color: '#1D2742' },
};
const CYCLE = ['#1F5C4A', '#7A2230', '#2A4F8A', '#8E6627', '#5B3A7A', '#8C4A24'];

export function categoryLook(name: string, index: number): { icon: Icon; color: string } {
  return LOOKS[name] ?? { icon: 'shape-outline', color: CYCLE[index % CYCLE.length] };
}
