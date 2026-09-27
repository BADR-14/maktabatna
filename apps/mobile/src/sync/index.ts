/**
 * Background sync for the app: runs on sign-in, when the app comes to the foreground, every few
 * minutes while open, and a few seconds after any local change. Status is shown on the profile.
 */
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { sqlite } from '@/db/client';
import { pauseLive, resumeLive } from '@/db/live';
import { ApiError, AuthExpiredError, authedApi } from '@/lib/api';
import { pendingCount, pull, push, type SqlDb } from './engine';

export type SyncState = {
  status: 'idle' | 'syncing' | 'offline' | 'auth' | 'error';
  lastSyncedAt: number | null;
  pending: number;
  message?: string;
};

const db = sqlite as unknown as SqlDb;
const LAST = 'sync_last';

let state: SyncState = {
  status: 'idle',
  lastSyncedAt: Number(db.getFirstSync<{ value: string }>('SELECT value FROM local_meta WHERE key = ?', [LAST])?.value) || null,
  pending: 0,
};
const listeners = new Set<() => void>();
function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

let running: Promise<void> | null = null;

/** Push local changes, then pull everyone else's. Safe to call any time; runs one at a time. */
export function syncNow(): Promise<void> {
  running ??= (async () => {
    set({ status: 'syncing', message: undefined });
    try {
      await push(db, authedApi);
      await pull(db, authedApi, { before: pauseLive, after: resumeLive });
      const now = Date.now();
      db.runSync('INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, ?)', [LAST, String(now)]);
      set({ status: 'idle', lastSyncedAt: now, pending: pendingCount(db) });
    } catch (e) {
      const pending = pendingCount(db);
      if (e instanceof AuthExpiredError) set({ status: 'auth', pending, message: e.message });
      else if (e instanceof ApiError && e.status === 0) set({ status: 'offline', pending });
      else set({ status: 'error', pending, message: e instanceof Error ? e.message : String(e) });
    } finally {
      running = null;
    }
  })();
  return running;
}

const EVERY_MS = 3 * 60 * 1000;
const AFTER_EDIT_MS = 4000;

/** Starts automatic sync for a signed-in person; returns a function that stops it. */
export function startAutoSync(): () => void {
  let editTimer: ReturnType<typeof setTimeout> | null = null;
  set({ pending: pendingCount(db) });
  void syncNow();
  const interval = setInterval(() => AppState.currentState === 'active' && void syncNow(), EVERY_MS);
  const app = AppState.addEventListener('change', (s) => s === 'active' && void syncNow());
  // Any write may have queued changes; a few seconds later, sync if the outbox isn't empty.
  const edits = addDatabaseChangeListener(() => {
    if (editTimer) clearTimeout(editTimer);
    editTimer = setTimeout(() => {
      const pending = pendingCount(db);
      set({ pending });
      if (pending && !running) void syncNow();
    }, AFTER_EDIT_MS);
  });
  return () => {
    clearInterval(interval);
    app.remove();
    edits.remove();
    if (editTimer) clearTimeout(editTimer);
  };
}
