"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSeedDB } from "./seed";
import { api, getToken, setToken } from "./api";
import type { DB, User } from "./types";

const SESSION_KEY = "malwa.admin.session.v6";

/** Collections that live in MongoDB and get pushed back on every change.
 *  `users` is deliberately excluded — staff accounts aren't editable here. */
const SYNCABLE_KEYS = [
  "customers",
  "projects",
  "milestones",
  "payments",
  "materials",
  "vendors",
  "commitments",
  "vendorPayments",
  "reminders",
  "media",
] as const;

/** Every array collection in the DB, mapped to the type of one item. */
type Collections = {
  [K in keyof DB]: DB[K] extends Array<infer T> ? T : never;
};
type ListKey = {
  [K in keyof DB]: DB[K] extends Array<unknown> ? K : never;
}[keyof DB];

interface Ctx {
  db: DB;
  ready: boolean;
  /** mutate a deep copy of the db — the simplest possible reducer */
  update: (fn: (draft: DB) => void) => void;
  /** insert when the id is new, replace when it already exists */
  save: <K extends ListKey>(key: K, item: Collections[K]) => void;
  remove: (key: ListKey, id: string) => void;
  resetDemo: () => void;
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => buildSeedDB());
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Last-synced JSON per collection, so we only PUT what actually changed
  // (a media upload's base64 data URL is too big to resend on every
  // unrelated edit elsewhere in the app).
  const lastSynced = useRef<Partial<Record<string, string>>>({});

  const applyFreshDb = useCallback((fresh: DB) => {
    setDb(fresh);
    for (const key of SYNCABLE_KEYS) lastSynced.current[key] = JSON.stringify(fresh[key]);
    lastSynced.current.settings = JSON.stringify(fresh.settings);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // /api/db requires auth — nothing to fetch until a previous session
      // left a token behind. A fresh visitor just sees the sample data
      // until they sign in (see login(), below).
      const session = localStorage.getItem(SESSION_KEY);
      if (session && getToken()) {
        try {
          const fresh = await api.getDb<DB>();
          if (cancelled) return;
          applyFreshDb(fresh);
          setUserId(session);
        } catch (err) {
          // Expired/invalid token, or backend unreachable — drop the stale
          // session and keep working on the sample data.
          console.error("Could not restore the previous session:", err);
          setToken(null);
          localStorage.removeItem(SESSION_KEY);
        }
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyFreshDb]);

  // Push only the collections that changed since the last sync. Only once
  // signed in — logged out, `db` still holds the local sample data, and
  // `/api/db` would just reject it as unauthenticated.
  useEffect(() => {
    if (!ready || !userId) return;
    const patch: Record<string, unknown> = {};
    for (const key of SYNCABLE_KEYS) {
      const json = JSON.stringify(db[key]);
      if (json !== lastSynced.current[key]) {
        patch[key] = db[key];
        lastSynced.current[key] = json;
      }
    }
    const settingsJson = JSON.stringify(db.settings);
    if (settingsJson !== lastSynced.current.settings) {
      patch.settings = db.settings;
      lastSynced.current.settings = settingsJson;
    }
    if (Object.keys(patch).length === 0) return;

    api.syncDb(patch).catch((err) => console.error("Failed to save changes to the backend:", err));
  }, [db, ready, userId]);

  const user = useMemo(() => db.users.find((u) => u.id === userId) ?? null, [db.users, userId]);

  const update = useCallback<Ctx["update"]>((fn) => {
    setDb((prev) => {
      const draft: DB = JSON.parse(JSON.stringify(prev));
      fn(draft);
      return draft;
    });
  }, []);

  const save = useCallback<Ctx["save"]>(
    (key, item) => {
      update((draft) => {
        const list = draft[key] as { id: string }[];
        const idx = list.findIndex((x) => x.id === (item as { id: string }).id);
        if (idx >= 0) list[idx] = item as { id: string };
        else list.unshift(item as { id: string });
      });
    },
    [update],
  );

  const remove = useCallback<Ctx["remove"]>(
    (key, id) => {
      update((draft) => {
        const list = draft[key] as { id: string }[];
        const idx = list.findIndex((x) => x.id === id);
        if (idx >= 0) list.splice(idx, 1);
      });
    },
    [update],
  );

  const resetDemo = useCallback(() => {
    const fresh = buildSeedDB();
    setDb((prev) => ({ ...fresh, users: prev.users })); // never overwrite real staff accounts
    // Force a full push of every syncable collection, bypassing the diff.
    for (const key of SYNCABLE_KEYS) lastSynced.current[key] = "";
    lastSynced.current.settings = "";
  }, []);

  const login = useCallback<Ctx["login"]>(
    async (email, password) => {
      try {
        const { user: loggedIn, token } = await api.login(email, password);
        setToken(token);
        const u = loggedIn as User;

        // Now that we have a token, load the real data from the backend
        // (replacing whatever sample/placeholder data was showing).
        const fresh = await api.getDb<DB>();
        applyFreshDb(fresh);

        setUserId(u.id);
        try {
          localStorage.setItem(SESSION_KEY, u.id);
        } catch {
          /* ignore */
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Login failed" };
      }
    },
    [applyFreshDb],
  );

  const logout = useCallback(() => {
    setUserId(null);
    setToken(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value: Ctx = { db, ready, update, save, remove, resetDemo, user, login, logout };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
