import { logger } from '../utils/logger.js';

const API_BASE = '';

export class ActionsError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ActionsError';
    this.status = status;
  }
}

async function parseError(response) {
  let message = response.statusText || 'Impossible de charger les actions';

  try {
    const data = await response.json();
    message = typeof data === 'string' ? data : data?.message ?? data?.error ?? message;
  } catch {
    logger.warn('Réponse actions non JSON', { status: response.status });
  }

  return new ActionsError(message, response.status);
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

export async function getActions(token, filters = {}) {
  logger.info('Chargement des actions');

  const response = await fetch(`${API_BASE}/api/actions${buildQueryParams(filters)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement actions', { status: error.status });
    throw error;
  }

  const data = await response.json();
  logger.info('Actions chargées', { count: data?.items?.length ?? 0 });
  return data;
}

export async function getActionById(token, id) {
  logger.info('Chargement fiche action', { id });

  const response = await fetch(`${API_BASE}/api/actions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement fiche action', { status: error.status, id });
    throw error;
  }

  return response.json();
}

export async function reserverActionApi(token, id) {
  logger.info('Réservation action VACTIS', { id });

  const response = await fetch(`${API_BASE}/api/actions/${id}/reserver`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec réservation action', { status: error.status, id });
    throw error;
  }

  return response.json();
}

export async function soumettreRetourTerrainApi(token, id, payload) {
  logger.info('Soumission retour terrain action', { id, payload });

  const response = await fetch(`${API_BASE}/api/actions/${id}/retour-terrain`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec soumission retour terrain', { status: error.status, id });
    throw error;
  }

  return response.json();
}

export async function creerVisiteLibreApi(token, payload) {
  logger.info('Création visite commerciale libre', { payload });

  const response = await fetch(`${API_BASE}/api/actions/visite-libre`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec création visite libre', { status: error.status });
    throw error;
  }

  return response.json();
}

export async function getFicheContextuelleApi(token, medecinId) {
  logger.info('Chargement fiche contextuelle médecin', { medecinId });

  const response = await fetch(`${API_BASE}/api/actions/medecins/${medecinId}/fiche-contextuelle`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement fiche contextuelle', { status: error.status, medecinId });
    throw error;
  }

  return response.json();
}

export async function getVisitesLibresApi(token) {
  logger.info('Chargement de la liste des visites commerciales libres');

  const response = await fetch(`${API_BASE}/api/actions/visite-libre`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement visites libres', { status: error.status });
    throw error;
  }

  return response.json();
}
