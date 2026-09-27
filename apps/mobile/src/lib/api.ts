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
    /** A machine-readable reason the server may add, e.g. 'INVITE_REQUIRED'. */
    readonly code?: string,
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
    throw new ApiError(
      `تعذّر الاتصال بالخادم (${base}).\nتأكد من أن الخادم يعمل على الحاسوب، وجرّب فتح ${base}/health من متصفح الهاتف.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join('\n') : data?.message;
    throw new ApiError(typeof msg === 'string' && msg ? msg : 'حدث خطأ في الخادم، حاول مرة أخرى.', res.status, data?.code);
  }
  return data as T;
}

/** Where the session tokens live (expo-secure-store). */
export const TOKEN_KEYS = { access: 'auth.access', refresh: 'auth.refresh', user: 'auth.user' } as const;

/** The session expired or was revoked: the person must sign in again to sync. */
export class AuthExpiredError extends ApiError {
  constructor() {
    super('انتهت الجلسة، سجّل الدخول من جديد للمزامنة.', 401);
  }
}

let refreshing: Promise<string> | null = null;

/** Trades the refresh token for new tokens (the server rotates it). One refresh at a time. */
function refreshAccess(): Promise<string> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
      if (!refreshToken) throw new AuthExpiredError();
      let res: { accessToken: string; refreshToken: string };
      try {
        res = await api('/auth/refresh', { body: { refreshToken } });
      } catch (e) {
        throw e instanceof ApiError && e.status === 401 ? new AuthExpiredError() : e;
      }
      await SecureStore.setItemAsync(TOKEN_KEYS.access, res.accessToken);
      await SecureStore.setItemAsync(TOKEN_KEYS.refresh, res.refreshToken);
      return res.accessToken;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Like api(), signed in as the current user; renews the short-lived access token when needed. */
export async function authedApi<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const token = (await SecureStore.getItemAsync(TOKEN_KEYS.access)) ?? (await refreshAccess());
  try {
    return await api<T>(path, { ...init, token });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    return api<T>(path, { ...init, token: await refreshAccess() });
  }
}
