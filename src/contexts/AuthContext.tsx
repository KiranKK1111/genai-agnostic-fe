import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { loginUser, refreshAuthToken, TokenResponse } from '../api';
import { store } from '../store';
import { clearChats } from '../features/chatSlice';

interface AuthContextType {
  /** Whether the user is currently authenticated. */
  isAuthenticated: boolean;
  /** The JWT access token returned by the backend. */
  token: string | null;
  /** Login a user using their credentials. Returns true on success. */
  login: (username: string, password: string) => Promise<boolean>;
  /** Register a new user. Returns true on success. */
  register: (
    username: string,
    password: string,
    name?: string,
    email?: string
  ) => Promise<boolean>;
  /** Force a token refresh now (e.g. from the idle dialog's Continue button).
   *  Returns true if the refresh succeeded. */
  refreshSession: () => Promise<boolean>;
  /** Log the user out and clear all cached state. */
  logout: () => void;
  /** The username (login id) of the logged in user. */
  username: string;
  /** The display name of the logged in user — falls back to username. */
  name: string;
  /** Any error message from auth operations. */
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mint the refresh a little *before* the access token actually expires so
// the user never makes a request with a dead token. 60 seconds of slack is
// plenty for clock skew + network latency.
const REFRESH_SAFETY_WINDOW_MS = 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timer that fires a proactive refresh shortly before the current access
  // token expires. Kept in a ref so we can cancel/re-arm it without causing
  // effect re-runs.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // ── Logout (declared first so other callbacks can close over it) ─────
  const logout = useCallback(() => {
    clearRefreshTimer();

    // React state
    setIsAuthenticated(false);
    setUsername('');
    setName('');
    setToken(null);
    setError(null);

    // Redux store — drop every chat/session so the next login starts clean
    try {
      store.dispatch(clearChats());
    } catch {
      // store may not be ready in some edge cases (tests etc.) — ignore
    }

    // Browser storage — nuke everything, not just our known keys, so no
    // stale cache survives the sign-out.
    try {
      localStorage.clear();
    } catch {
      /* ignore quota / privacy errors */
    }
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }

    // Best-effort: drop any Cache Storage entries (service workers, fetch
    // cache). Safe no-op if unsupported.
    if (typeof caches !== 'undefined' && caches?.keys) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, [clearRefreshTimer]);

  // ── Refresh scheduling ───────────────────────────────────────────────
  /**
   * Arm (or re-arm) the proactive refresh timer so it fires
   * REFRESH_SAFETY_WINDOW_MS before the stored access token expires.
   * Safe to call multiple times — it always cancels any previous timer.
   */
  const scheduleProactiveRefresh = useCallback(() => {
    clearRefreshTimer();
    const expiresAtStr = sessionStorage.getItem('sdm_token_expires_at');
    if (!expiresAtStr) return;
    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt)) return;

    const msUntilRefresh = expiresAt - Date.now() - REFRESH_SAFETY_WINDOW_MS;
    // Never schedule in the past — if we're already inside the window,
    // fire on the next tick so we catch up.
    const delay = Math.max(msUntilRefresh, 0);

    refreshTimerRef.current = setTimeout(() => {
      // Fire and forget: if the refresh fails, the next API call (or the
      // 401 interceptor) will surface `sdm:auth-expired` and log the
      // user out.
      void refreshSessionRef.current?.();
    }, delay);
  }, [clearRefreshTimer]);

  // Kept in a ref so scheduleProactiveRefresh can call the latest version
  // of refreshSession without forming a dependency cycle.
  const refreshSessionRef = useRef<(() => Promise<boolean>) | null>(null);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const storedRefresh = sessionStorage.getItem('sdm_refresh_token');
    if (!storedRefresh) return false;
    try {
      const res: TokenResponse = await refreshAuthToken(storedRefresh);
      const newAccess = res.access_token;
      if (!newAccess) return false;

      sessionStorage.setItem('sdm_token', newAccess);
      if (res.refresh_token) {
        sessionStorage.setItem('sdm_refresh_token', res.refresh_token);
      }
      if (res.expires_in) {
        const expiresAt = Date.now() + res.expires_in * 1000;
        sessionStorage.setItem('sdm_token_expires_at', String(expiresAt));
      }
      if (res.user?.username) {
        sessionStorage.setItem('sdm_username', res.user.username);
      }
      if (res.user?.name) {
        sessionStorage.setItem('sdm_name', res.user.name);
      }

      setToken(newAccess);
      if (res.user?.username) setUsername(res.user.username);
      if (res.user?.name) setName(res.user.name);

      scheduleProactiveRefresh();
      return true;
    } catch {
      return false;
    }
  }, [scheduleProactiveRefresh]);

  // Keep the ref pointing to the latest refreshSession implementation.
  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  // ── Bootstrap on mount: restore cached credentials ───────────────────
  useEffect(() => {
    const savedToken = sessionStorage.getItem('sdm_token');
    const savedUser = sessionStorage.getItem('sdm_username');
    const savedName = sessionStorage.getItem('sdm_name');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
      setName(savedName || savedUser);
      setIsAuthenticated(true);
      // Arm the proactive refresh against whatever expiry was last seen.
      scheduleProactiveRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 401 interceptor → logout ─────────────────────────────────────────
  // api.ts will first try to refresh; only when refresh itself fails does
  // it dispatch `sdm:auth-expired`. That's our cue to fully sign out.
  useEffect(() => {
    const onAuthExpired = () => logout();
    window.addEventListener('sdm:auth-expired', onAuthExpired);
    return () => window.removeEventListener('sdm:auth-expired', onAuthExpired);
  }, [logout]);

  // ── Background token rotation from interceptor ───────────────────────
  // When api.ts silently refreshes a token (because a request 401'd and
  // then succeeded on retry), the in-memory token needs to track the
  // new one and the refresh timer needs to re-arm against the new expiry.
  useEffect(() => {
    const onTokenRefreshed = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.token) setToken(detail.token);
      if (detail.user?.username) setUsername(detail.user.username);
      if (detail.user?.name) setName(detail.user.name);
      scheduleProactiveRefresh();
    };
    window.addEventListener('sdm:token-refreshed', onTokenRefreshed as EventListener);
    return () => window.removeEventListener('sdm:token-refreshed', onTokenRefreshed as EventListener);
  }, [scheduleProactiveRefresh]);

  // ── Login ────────────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    try {
      setError(null);
      const res: TokenResponse = await loginUser(username, password);
      const displayName = res.user?.name || res.user?.username || username;

      setIsAuthenticated(true);
      setUsername(username);
      setName(displayName);
      setToken(res.access_token);

      // Persist everything so the user stays logged in across refreshes
      // and the refresh scheduler has an expiry to aim at.
      sessionStorage.setItem('sdm_token', res.access_token);
      sessionStorage.setItem('sdm_username', username);
      sessionStorage.setItem('sdm_name', displayName);
      if (res.refresh_token) {
        sessionStorage.setItem('sdm_refresh_token', res.refresh_token);
      }
      if (res.expires_in) {
        const expiresAt = Date.now() + res.expires_in * 1000;
        sessionStorage.setItem('sdm_token_expires_at', String(expiresAt));
      }

      scheduleProactiveRefresh();
      return true;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed';
      setError(errorMsg);
      return false;
    }
  };

  const register = async (
    username: string,
    password: string,
    name?: string,
    email?: string
  ) => {
    try {
      setError(null);
      const { registerUser } = await import('../api');
      await registerUser(username, password, name, email);
      // Auto-login after successful registration
      return login(username, password);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Registration failed';
      setError(errorMsg);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        login,
        register,
        refreshSession,
        logout,
        username,
        name,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
