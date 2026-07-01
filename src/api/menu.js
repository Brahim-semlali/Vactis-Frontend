import { logger } from '../utils/logger.js';

const API_BASE = '';

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

export async function getAllMenu(token) {
  logger.info('Chargement du menu');

  const response = await fetch(`${API_BASE}/api/menu/getAll`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement menu', { status: error.status });
    throw error;
  }

  const items = await response.json();
  logger.info('Menu chargé', { count: items.length });
  return items;
}
