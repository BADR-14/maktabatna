import { spineColor } from '@/three/room-scene';

/** The same spine colour a book has in the 3D view, as a CSS hex string for lists. */
export function spineHex(bookId: string): string {
  return `#${spineColor(bookId).getHexString()}`;
}
