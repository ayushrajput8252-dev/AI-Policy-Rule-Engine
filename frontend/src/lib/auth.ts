export interface AuthUser {
  email: string;
  name: string | null;
  picture: string | null;
}

export interface StoredSession {
  user: AuthUser;
  uniqueUserCount: number;
}

const STORAGE_KEY = "agenticflow:auth-session";

export function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
