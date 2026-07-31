import { logger } from '../utils/logger.js';

const API_BASE = '';

export class ControleError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ControleError';
    this.status = status;
  }
}

async function parseError(response) {
  let message = response.statusText || 'Erreur contrôle';

  try {
    const data = await response.json();
    message = typeof data === 'string' ? data : data?.message ?? data?.error ?? message;
  } catch {
    logger.warn('Réponse contrôle non JSON', { status: response.status });
  }

  return new ControleError(message, response.status);
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function getControlesByType(token, type) {
  logger.info('Chargement règles contrôle', { type });

  const response = await fetch(`${API_BASE}/api/controle/type/${encodeURIComponent(type)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement contrôle', { type, status: error.status });
    throw error;
  }

  return response.json();
}

export async function createControle(token, payload) {
  const response = await fetch(`${API_BASE}/api/controle`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function updateControle(token, idControle, payload) {
  const response = await fetch(`${API_BASE}/api/controle/${idControle}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function deleteControle(token, idControle) {
  const response = await fetch(`${API_BASE}/api/controle/${idControle}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw await parseError(response);
  }
}
