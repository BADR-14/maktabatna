/**
 * Sign-in state. Tokens live in the device's secure storage; once signed in, the app opens
 * straight to the home screen even with no connection to the server.
 */
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { api, TOKEN_KEYS as KEYS } from '@/lib/api';

export type SessionUser = { id: string; displayName: string; username: string };
type AuthResponse = { accessToken: string; refreshToken: string; user: SessionUser };

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: SessionUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  register: (input: { displayName: string; username: string; password: string; inviteCode: string }) => Promise<void>;
  /** Throws ApiError with code 'INVITE_REQUIRED' the first time, until an invite code is given. */
  signInWithGoogle: (input: { idToken: string; inviteCode?: string; displayName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

async function rememberUser(user: SessionUser) {
  const now = Date.now();
  await db
    .insert(users)
    .values({ id: user.id, displayName: user.displayName, username: user.username, createdAt: now, updatedAt: now, createdBy: user.id, updatedBy: user.id })
    .onConflictDoUpdate({ target: users.id, set: { displayName: user.displayName, username: user.username, updatedAt: now } });
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState['status']>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    (async () => {
      const [refresh, stored] = await Promise.all([SecureStore.getItemAsync(KEYS.refresh), SecureStore.getItemAsync(KEYS.user)]);
      if (refresh && stored) {
        setUser(JSON.parse(stored));
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
  }, []);

  const accept = useCallback(async (res: AuthResponse) => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.access, res.accessToken),
      SecureStore.setItemAsync(KEYS.refresh, res.refreshToken),
      SecureStore.setItemAsync(KEYS.user, JSON.stringify(res.user)),
    ]);
    await rememberUser(res.user);
    setUser(res.user);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => accept(await api<AuthResponse>('/auth/login', { body: { username, password } })),
    [accept],
  );

  const register = useCallback<SessionState['register']>(
    async (input) => accept(await api<AuthResponse>('/auth/register', { body: input })),
    [accept],
  );

  const signInWithGoogle = useCallback<SessionState['signInWithGoogle']>(
    async (input) => accept(await api<AuthResponse>('/auth/google', { body: input })),
    [accept],
  );

  const signOut = useCallback(async () => {
    const refresh = await SecureStore.getItemAsync(KEYS.refresh);
    // Revoke on the server if we can reach it; sign out locally either way.
    if (refresh) api('/auth/logout', { body: { refreshToken: refresh } }).catch(() => {});
    await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, register, signInWithGoogle, signOut }),
    [status, user, signIn, register, signInWithGoogle, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
