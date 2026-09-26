/** Fixed vocabularies agreed in docs/PROJECT_BRIEF.md. Stored values are English keys; labels are Arabic. */

export const PLACEMENTS = {
  standing: 'واقف',
  lying: 'ممدود بين الكتب',
  on_top: 'فوق المكتبة',
} as const;
export type Placement = keyof typeof PLACEMENTS;

export const ROWS = {
  front: 'قدام',
  back: 'ورا',
} as const;
export type Row = keyof typeof ROWS;

export const PERSON_ROLES = {
  author: 'المؤلف',
  editor: 'المحقق',
  commentator: 'الشارح',
  translator: 'المترجم',
} as const;
export type PersonRole = keyof typeof PERSON_ROLES;

export const BOOKCASE_KINDS = {
  open: 'مفتوحة',
  glass: 'زجاج',
} as const;
export type BookcaseKind = keyof typeof BOOKCASE_KINDS;

export const SHELF_KINDS = {
  shelf: 'رف',
  top: 'فوق المكتبة',
} as const;
export type ShelfKind = keyof typeof SHELF_KINDS;

/** Default categories, in display order. Users can add more from the app. */
export const DEFAULT_CATEGORIES = [
  'تفسير وعلوم قرآن',
  'حديث وعلومه',
  'فقه وأصوله',
  'عقيدة',
  'سيرة وتراجم',
  'تاريخ',
  'لغة ونحو ومعاجم',
  'أدب',
  'رقائق وتزكية',
  'موسوعات',
  'عام',
] as const;
