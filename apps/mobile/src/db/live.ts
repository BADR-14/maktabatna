/**
 * Live queries that stay correct. drizzle's own useLiveQuery only re-runs when the table in the
 * query's FROM changes, so counts and joins (a book's shelves, a room's totals…) went stale after
 * moving volumes or adding copies. Here every query re-runs after any write, batched: one refresh
 * per burst of changes, and none while a sync is applying thousands of rows (see pauseLive).
 */
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState, useSyncExternalStore } from 'react';

let version = 0;
let paused = 0;
let pending = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function bump() {
  if (paused) {
    pending = true;
    return;
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    version++;
    listeners.forEach((l) => l());
  }, 40);
}

addDatabaseChangeListener(bump);

/** Holds refreshes while a large batch of writes runs; one refresh follows at the end. */
export function pauseLive() {
  paused++;
}
export function resumeLive() {
  paused = Math.max(0, paused - 1);
  if (!paused && pending) {
    pending = false;
    bump();
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getVersion = () => version;

export function useLiveQuery<Q extends PromiseLike<unknown>>(query: Q, deps: unknown[] = []) {
  const v = useSyncExternalStore(subscribe, getVersion);
  const [state, setState] = useState<{ data: Awaited<Q>; error?: Error; updatedAt?: Date }>({ data: [] as Awaited<Q> });

  useEffect(() => {
    let live = true;
    // Runs the query of the render where the deps (or the database) last changed.
    query.then(
      (data) => live && setState({ data: data as Awaited<Q>, updatedAt: new Date() }),
      (error: Error) => live && setState((s) => ({ ...s, error })),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ...deps]);

  return state;
}
