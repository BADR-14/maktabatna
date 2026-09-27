import { hash01, spineColor } from '@/three/room-scene';

/** The same spine colour a book has in the 3D view, as a CSS hex string for lists. */
export function spineHex(bookId: string): string {
  return `#${spineColor(bookId).getHexString()}`;
}

/** How a book's cover is drawn: its cloth colour (same as the 3D spine), ink, and layout. */
export function coverLook(bookId: string) {
  const c = spineColor(bookId);
  const light = c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.55;
  return {
    cloth: `#${c.getHexString()}`,
    spine: `#${c.clone().offsetHSL(0, 0, -0.06).getHexString()}`,
    ink: light ? '#3B2419' : '#DDB86C',
    /** 0 framed, 1 central cartouche, 2 bands top and bottom. */
    layout: Math.floor(hash01(bookId, 7) * 3) as 0 | 1 | 2,
  };
}
