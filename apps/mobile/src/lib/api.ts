import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const SERVER_URL_KEY = 'server.url';

/**
 * During development the phone reaches the API on the same laptop that serves the app
 * (Expo's host, port 3000). In real builds it's the server laptop on Tailscale.
 */
export function defaultServerUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://library-server:3000';
}

export async function getServerUrl(): Promise<string> {
  return (await SecureStore.getItemAsync(SERVER_URL_KEY)) ?? defaultServerUrl();
}

export async function setServerUrl(url: string | null): Promise<void> {
  const clean = url?.trim().replace(/\/+$/, '');
  if (clean) await SecureStore.setItemAsync(SERVER_URL_KEY, clean);
  else await SecureStore.deleteItemAsync(SERVER_URL_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** POST/GET JSON with a timeout and Arabic error messages. */
export async function api<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; token?: string } = {}): Promise<T> {
  const base = await getServerUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`ما قدرت وصل للسيرفر (${base}). تأكد إنو شغّال وإنك على نفس الشبكة.`, 0);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join('\n') : data?.message;
    throw new ApiError(typeof msg === 'string' && msg ? msg : 'صار خطأ بالسيرفر، جرّب كمان مرة.', res.status);
  }
  return data as T;
}
