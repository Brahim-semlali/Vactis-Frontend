import { API_BASE } from './config.js';

export class ZoneIntelligenceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ZoneIntelligenceError';
    this.status = status;
  }
}

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText || 'Une erreur est survenue';
    try {
      const body = await response.json();
      message = body?.message ?? body?.error ?? message;
    } catch {
      // Pas de corps JSON
    }
    throw new ZoneIntelligenceError(message, response.status);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const getMedecinsGeolocalises = (token) =>
  request('/api/medecins/geolocalises', token);

export const getMedecinsSansLocalisation = (token) =>
  request('/api/medecins/sans-localisation', token);

export const updateMedecinLocalisation = (token, medecinId, { latitude, longitude }) =>
  request(`/api/medecins/${medecinId}/localisation`, token, {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude }),
  });

export const getAgencesConcurrentes = (token) =>
  request('/api/agences-concurrentes', token);

export const createAgenceConcurrente = (token, data) =>
  request('/api/agences-concurrentes', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAgenceConcurrente = (token, id, data) =>
  request(`/api/agences-concurrentes/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteAgenceConcurrente = (token, id) =>
  request(`/api/agences-concurrentes/${id}`, token, {
    method: 'DELETE',
  });
