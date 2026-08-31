import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile as getProfileApi, login as loginApi, logout as logoutApi, register as registerApi, updateProfile as updateProfileApi } from '../api/auth.js';
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
  const [userProfile, setUserProfile] = useState(null);

  const username = useMemo(() => {
    if (!token) return null;
    const data = decodeTokenPayload(token);
    return data?.sub ?? data?.username ?? null;
  }, [token]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await getProfileApi(token);
      setUserProfile(profile);
    } catch (err) {
      logger.warn('Impossible de charger le profil utilisateur', err);
    }
  }, [token]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateUserProfile = useCallback(async (data) => {
    if (!token) return null;
    const updated = await updateProfileApi(token, data);
    setUserProfile(updated);
    return updated;
  }, [token]);

  const persistToken = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    window.history.replaceState({}, '', '/accueil');
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
    if (token) {
      logoutApi(token).catch(() => logger.warn('Impossible de journaliser la déconnexion'));
    }
    localStorage.removeItem(TOKEN_KEY);
    window.history.replaceState({}, '', '/');
    setToken(null);
    setUserProfile(null);
  }, [token]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const request = args[0];
      const headers = args[1]?.headers ?? (request instanceof Request ? request.headers : undefined);
      const hasBearer = headers && (typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization);
      if (response.status === 401 && hasBearer) {
        logout();
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, [logout, token]);

  const value = useMemo(
    () => ({
      token,
      username,
      userProfile,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateUserProfile,
      refreshProfile,
    }),
    [token, username, userProfile, login, register, logout, updateUserProfile, refreshProfile],
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
