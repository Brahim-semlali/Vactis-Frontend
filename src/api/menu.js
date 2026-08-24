import { logger } from '../utils/logger.js';

const API_BASE = '';
const menuCache = new Map();

export class MenuError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'MenuError';
    this.status = status;
  }
}

async function parseError(response) {
  let message = response.statusText || 'Impossible de charger le menu';

  try {
    const data = await response.json();
    message = typeof data === 'string' ? data : data?.message ?? data?.error ?? message;
  } catch {
    logger.warn('Réponse menu non JSON', { status: response.status });
  }

  return new MenuError(message, response.status);
}

async function getTree(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export function getMonMenu(token) {
  if (!token) return Promise.resolve([]);
  if (!menuCache.has(token)) {
    menuCache.set(token, getTree('/api/menu/mon-menu', token).catch((error) => {
      menuCache.delete(token);
      throw error;
    }));
  }
  return menuCache.get(token);
}

