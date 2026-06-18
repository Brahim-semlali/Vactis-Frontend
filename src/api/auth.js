import { logger } from '../utils/logger.js';

const API_BASE = '';

export class AuthError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = details.code ?? null;
    this.remainingAttempts = details.remainingAttempts ?? null;
    this.maxAttempts = details.maxAttempts ?? null;
    this.lockedUntil = details.lockedUntil ?? null;
    this.lockMinutes = details.lockMinutes ?? null;
    this.remainingSeconds = details.remainingSeconds ?? null;
    this.status = details.status ?? null;
  }
}

async function parseError(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    logger.warn('Réponse API non JSON', { status: response.status });
  }

  const message = typeof data === 'string'
    ? data
    : data?.message ?? data?.error ?? response.statusText ?? 'Une erreur est survenue';

  return new AuthError(message, {
    code: data?.code ?? null,
    remainingAttempts: data?.remainingAttempts ?? null,
    maxAttempts: data?.maxAttempts ?? null,
    lockedUntil: data?.lockedUntil ?? null,
    lockMinutes: data?.lockMinutes ?? null,
    remainingSeconds: data?.remainingSeconds ?? null,
    status: response.status,
  });
}

export async function login(username, password) {
  logger.info('Tentative de connexion', { username });

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec connexion', {
      username,
      code: error.code,
      status: error.status,
      remainingAttempts: error.remainingAttempts,
      lockedUntil: error.lockedUntil,
    });
    throw error;
  }

  const data = await response.json();
  logger.info('Connexion réussie', { username });
  return data;
}

export async function getAccountStatus(username) {
  const params = new URLSearchParams({ username: username.trim() });
  const response = await fetch(`${API_BASE}/api/auth/account-status?${params}`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function register(userData) {
  logger.info('Tentative inscription', { username: userData.username, email: userData.email });

  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec inscription', {
      username: userData.username,
      code: error.code,
      status: error.status,
    });
    throw error;
  }

  const data = await response.json();
  logger.info('Inscription réussie', { username: userData.username });
  return data;
}
