/* ------------------------------------------------------------------
   Thin fetch wrapper around the Malwa Builders backend
   (Test Folder 2/backend). Every call attaches the JWT saved at login
   and throws on a non-2xx response so callers can just `await`.
-------------------------------------------------------------------*/

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const TOKEN_KEY = "malwa.admin.token.v1";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: unknown; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  demoUsers: () =>
    request<{ users: { id: string; name: string; email: string; password: string; designation: string }[] }>(
      "/auth/demo-users",
    ),

  getDb: <T>() => request<T>("/db"),

  /** Pushes only the collections included in `patch`; anything left out is untouched. */
  syncDb: (patch: Record<string, unknown>) =>
    request<{ ok: true }>("/db", { method: "PUT", body: JSON.stringify(patch) }),
};
