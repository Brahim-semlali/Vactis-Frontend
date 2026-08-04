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

export async function getMedecinByCode(token, code) {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  logger.info('Recherche médecin par code', { code: normalizedCode });

  const response = await fetch(
    `${API_BASE}/api/medecins/code/${encodeURIComponent(normalizedCode)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec recherche médecin par code', {
      status: error.status,
      code: normalizedCode,
    });
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  const data = JSON.parse(text);
  logger.info('Médecin trouvé par code', { code: normalizedCode, id: data?.id });
  return data;
}

export async function patchNoteInput(token, id, noteInput) {
  logger.info('Mise à jour note input médecin', { id, noteInput });

  const response = await fetch(`${API_BASE}/api/medecins/${id}/note-input`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ noteInput: noteInput ?? null }),
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec mise à jour note input', { status: error.status, id });
    throw error;
  }

  const data = await response.json();
  logger.info('Note input mise à jour', { id, noteInput: data?.noteInput });
  return data;
}

export async function getRetoursTerrain(token, medecinId) {
  logger.info('Chargement des retours terrain', { medecinId });

  const response = await fetch(`${API_BASE}/api/medecins/${medecinId}/retours-terrain`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec chargement retours terrain', { status: error.status, medecinId });
    throw error;
  }

  return response.json();
}

export async function postRetourTerrain(token, medecinId, { note, dateVisite, visiteur, commentaire }) {
  logger.info('Ajout retour terrain', { medecinId, note, dateVisite, visiteur });

  const response = await fetch(`${API_BASE}/api/medecins/${medecinId}/retours-terrain`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      note,
      dateVisite,
      visiteur: visiteur || null,
      commentaire: commentaire || null,
    }),
  });

  if (!response.ok) {
    const error = await parseError(response);
    logger.warn('Échec ajout retour terrain', { status: error.status, medecinId });
    throw error;
  }

  const data = await response.json();
  logger.info('Retour terrain créé', { id: data?.id, medecinId });
  return data;
}

