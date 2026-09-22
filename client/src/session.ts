import type { SessionCredentials } from "@mystery/shared";

const KEY = "mystery-manor-session";
export const loadSession = (): SessionCredentials | null => {
  try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as SessionCredentials : null; }
  catch { return null; }
};
export const saveSession = (session: SessionCredentials): void => localStorage.setItem(KEY, JSON.stringify(session));
export const clearSession = (): void => localStorage.removeItem(KEY);
