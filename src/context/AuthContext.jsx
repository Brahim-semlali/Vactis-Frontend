import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginApi, register as registerApi } from '../api/auth.js';
import { logger } from '../utils/logger.js';

const TOKEN_KEY = 'stagelabo_token';

const AuthContext = createContext(null);

function decodeTokenPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const data = decodeTokenPayload(token);
  if (!data?.exp) return false;
  return data.exp * 1000 > Date.now();
}

function getStoredToken() {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  if (!isTokenValid(stored)) {
    localStorage.removeItem(TOKEN_KEY);
    logger.info('Token expiré supprimé du stockage local');
    return null;
  }
  return stored;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);

  const username = useMemo(() => {
    if (!token) return null;
    const data = decodeTokenPayload(token);
    return data?.sub ?? data?.username ?? null;
  }, [token]);

  const persistToken = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const login = useCallback(async (user, password) => {
    const { token: jwt } = await loginApi(user, password);
    persistToken(jwt);
    return jwt;
  }, [persistToken]);

  const register = useCallback(async (userData) => {
    const { token: jwt } = await registerApi(userData);
    persistToken(jwt);
    return jwt;
  }, [persistToken]);

  const logout = useCallback(() => {
    logger.info('Déconnexion');
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      username,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, username, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
