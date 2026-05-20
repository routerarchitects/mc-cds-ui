import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createDpopProof } from '../crypto/dpop';
import { getConfig } from '../utils/config';
import { beginLogin, clearAuthTransaction, clearRedirectDpopKey, getUserFromTokens, handleCallback, keycloakLogout, refreshTokens } from './oidc';
import type { AuthContextValue, RuntimeSession } from './types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createMockAuth(): AuthContextValue {
  const now = Date.now();
  return {
    isAuthenticated: true,
    isLoading: false,
    isDpopReady: false,
    authMode: 'mock',
    user: { preferredUsername: 'mock-admin', name: 'Mock Admin' },
    login: async () => undefined,
    logout: async () => {
      window.location.reload();
    },
    getAccessToken: async () => `mock-token-${now}`,
    getDpopProof: async () => 'mock-dpop-proof'
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => getConfig(), []);
  const [session, setSession] = useState<RuntimeSession | null>(null);
  const [isLoading, setIsLoading] = useState(config.authMode !== 'mock');
  const [error, setError] = useState<string | undefined>();
  const sessionRef = useRef<RuntimeSession | null>(null);

  const setRuntimeSession = useCallback((next: RuntimeSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  useEffect(() => {
    if (config.authMode === 'mock') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const init = async () => {
      try {
        const isCallback = window.location.pathname === config.redirectPath && window.location.search.includes('code=');
        if (isCallback) {
          const { tokens, dpop, discovery } = await handleCallback();
          if (!cancelled) {
            setRuntimeSession({ tokens, dpop, discovery, user: getUserFromTokens(tokens) });
          }
        }
      } catch (err) {
        clearAuthTransaction();
        clearRedirectDpopKey();
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Authentication failed.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [config.authMode, config.redirectPath, setRuntimeSession]);

  const login = useCallback(async () => {
    setError(undefined);
    await beginLogin();
  }, []);

  const logout = useCallback(async () => {
    const current = sessionRef.current;
    try {
      if (current) {
        await keycloakLogout(current.discovery, current.dpop, current.tokens);
      }
    } catch {
      // Local cleanup is still required even if Keycloak logout fails.
    } finally {
      clearAuthTransaction();
      clearRedirectDpopKey();
      setRuntimeSession(null);
      window.location.assign(config.postLogoutPath);
    }
  }, [config.postLogoutPath, setRuntimeSession]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const current = sessionRef.current;
    if (!current) throw new Error('Not authenticated.');
    const refreshWindowMs = 60_000;
    if (current.tokens.expiresAt - Date.now() > refreshWindowMs) {
      return current.tokens.accessToken;
    }
    if (!current.tokens.refreshToken) {
      clearAuthTransaction();
      clearRedirectDpopKey();
      setRuntimeSession(null);
      throw new Error('Session expired. Please log in again.');
    }
    try {
      const refreshed = await refreshTokens(current.discovery, current.dpop, current.tokens.refreshToken);
      const next = { ...current, tokens: refreshed, user: getUserFromTokens(refreshed) };
      setRuntimeSession(next);
      return refreshed.accessToken;
    } catch {
      clearAuthTransaction();
      clearRedirectDpopKey();
      setRuntimeSession(null);
      throw new Error('Session refresh failed. Please log in again.');
    }
  }, [setRuntimeSession]);

  const getDpopProof = useCallback(async (method: string, url: string, accessToken: string): Promise<string> => {
    const current = sessionRef.current;
    if (!current) throw new Error('Not authenticated.');
    return createDpopProof(current.dpop, { method, url, accessToken });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    if (config.authMode === 'mock') return createMockAuth();
    return {
      isAuthenticated: !!session,
      isLoading,
      isDpopReady: !!session?.dpop,
      authMode: config.authMode,
      user: session?.user,
      error,
      login,
      logout,
      getAccessToken,
      getDpopProof
    };
  }, [config.authMode, error, getAccessToken, getDpopProof, isLoading, login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
