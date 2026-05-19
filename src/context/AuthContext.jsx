import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginApi, register as registerApi } from '../api/auth.js';

const TOKEN_KEY = 'stagelabo_token';

const AuthContext = createContext(null);

function decodeUsername(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    return data.sub ?? data.username ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const username = useMemo(() => (token ? decodeUsername(token) : null), [token]);

  const persistToken = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const login = useCallback(async (user, password) => {
    const { token: jwt } = await loginApi(user, password);
    persistToken(jwt);
    return jwt;
  }, [persistToken]);

  const register = useCallback(async (user, password) => {
    const { token: jwt } = await registerApi(user, password);
    persistToken(jwt);
    return jwt;
  }, [persistToken]);

  const logout = useCallback(() => {
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
