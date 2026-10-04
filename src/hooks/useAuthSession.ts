import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import * as auth from '../api/auth';
import type { AuthContextValue, LoginResponse } from '../types/auth';
import { bindAuthSession } from '../api/authSessionBridge';

export default function useAuthSession(): AuthContextValue {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const sessionRef = useRef<LoginResponse | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const updateSession = useCallback((value: LoginResponse | null) => {
    // The ref points to the same session object as React state; no separate token store.
    sessionRef.current = value;
    setSession(value);
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const restore = useRef<Promise<LoginResponse> | null>(null);

  useLayoutEffect(() => bindAuthSession({
    getAccessToken: () => sessionRef.current?.accessToken ?? null,
    replaceAccessToken: (token, expectedToken) => {
      const current = sessionRef.current;
      if (!current || current.accessToken !== expectedToken) return false;
      updateSession({ ...current, accessToken: token });
      return true;
    },
    invalidate: expectedToken => {
      if (sessionRef.current?.accessToken !== expectedToken) return;
      updateSession(null);
      navigate('/login', { replace: true, state: {
        from: location.pathname + location.search + location.hash,
      } });
    },
  }), [navigate, updateSession, location.pathname, location.search, location.hash]);

  useEffect(() => {
    let active = true;
    // Keep this promise across StrictMode's effect setup/cleanup/setup cycle.
    restore.current ??= auth.refresh().then(async ({ accessToken }) => ({
      accessToken, user: await auth.getMe(accessToken),
    }));
    restore.current.then(result => {
      if (active) { updateSession(result); setRestoreError(null); }
    }).catch((error: unknown) => {
      if (!active) return;
      updateSession(null);
      // No cookie on first visit, or an expired session, is an ordinary signed-out state.
      setRestoreError(isAxiosError(error) && error.response?.status === 401
        ? null : "Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.");
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [attempt, updateSession]);

  const retryRestore = useCallback(() => {
    restore.current = null;
    setRestoreError(null);
    setIsLoading(true);
    setAttempt(value => value + 1);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await auth.login(email, password);
    updateSession(result);
  }, [updateSession]);

  const logout = useCallback(async () => {
    // If revocation fails, retain the session so the caller can retry server-side logout.
    const current = sessionRef.current;
    if (current) await auth.logout(current.accessToken);
    updateSession(null);
    navigate('/login', { replace: true, state: null });
  }, [navigate, updateSession]);

  return {
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    isAuthenticated: session?.user != null,
    isLoading, restoreError, retryRestore, login, logout,
  };
}
