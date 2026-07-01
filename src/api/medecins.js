import { logger } from '../utils/logger.js';

const API_BASE = '';

export class MedecinsError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'MedecinsError';
    this.status = status;
  }
}

async function parseError(response) {
  let message = response.statusText || 'Impossible de charger les médecins';

  try {
    const data = await response.json();
    message = typeof data === 'string' ? data : data?.message ?? data?.error ?? message;
  } catch {
    logger.warn('Réponse médecins non JSON', { status: response.status });
  }

  return new MedecinsError(message, response.status);
}

function buildQueryParams(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getMedecins(token, filters = {}) {
  logger.info('Chargement des médecins');

  const response = await fetch(`${API_BASE}/api/medecins${buildQueryParams(filters)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement médecins', { status: error.status });
    throw error;
  }

  const data = await response.json();
  logger.info('Médecins chargés', { count: data?.items?.length ?? 0 });
  return data;
}

export async function getMedecinById(token, id) {
  logger.info('Chargement fiche médecin', { id });

  const response = await fetch(`${API_BASE}/api/medecins/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement fiche médecin', { status: error.status, id });
    throw error;
  }

  return response.json();
}
