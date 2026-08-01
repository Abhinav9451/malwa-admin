"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildSeedDB } from "./seed";
import type { DB, User } from "./types";

const DB_KEY = "malwa.admin.db.v6";
const SESSION_KEY = "malwa.admin.session.v6";

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
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => buildSeedDB());
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DB;
        if (parsed?.projects?.length) setDb(parsed);
      }
      const session = localStorage.getItem(SESSION_KEY);
      if (session) setUserId(session);
    } catch {
      /* corrupted storage — fall back to the seed */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* over quota (usually a large upload) — keep working in memory */
    }
  }, [db, ready]);

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
    setDb(fresh);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback<Ctx["login"]>(
    (email, password) => {
      const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found) return { ok: false, error: "No account found with this email." };
      if (found.password !== password) return { ok: false, error: "Incorrect password. Try again." };
      setUserId(found.id);
      try {
        localStorage.setItem(SESSION_KEY, found.id);
      } catch {
        /* ignore */
      }
      return { ok: true };
    },
    [db.users],
  );

  const logout = useCallback(() => {
    setUserId(null);
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
