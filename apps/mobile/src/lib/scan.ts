/**
 * Shelf QR codes carry maktabatna://shelf/<shelf id> (the printed labels). Opening that link
 * from any camera app lands on the shelf page; inside the app, a screen can also ask for a scan
 * and get the shelf id back.
 */
import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

let waiting: ((shelfId: string | null) => void) | null = null;

export function parseShelfCode(data: string): string | null {
  const m = /shelf\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(data);
  return m ? m[1].toLowerCase() : null;
}

/** Opens the scanner and resolves with the scanned shelf, or null if the person went back. */
export function scanForShelf(router: Router): Promise<string | null> {
  return new Promise((resolve) => {
    waiting?.(null);
    waiting = resolve;
    router.push({ pathname: '/scan', params: { mode: 'pick' } });
  });
}

export function deliverScan(shelfId: string | null) {
  waiting?.(shelfId);
  waiting = null;
}
