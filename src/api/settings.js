import { API_BASE } from './config.js';

export class SettingsError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'SettingsError';
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
      // Some Spring errors have no JSON body.
    }
    throw new SettingsError(message, response.status);
  }

  return response.json();
}

export const getSettings = (token) => request('/api/admin/settings', token);
export const updateSettings = (token, settings) => request('/api/admin/settings', token, {
  method: 'PUT',
  body: JSON.stringify(settings),
});

export const getConnexionLogs = (token, filters = {}) => {
  const params = new URLSearchParams({ page: filters.page ?? 0, size: filters.size ?? 10 });
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateDebut) params.set('dateDebut', `${filters.dateDebut}T00:00:00`);
  if (filters.dateFin) params.set('dateFin', `${filters.dateFin}T23:59:59`);
  return request(`/api/admin/connexion-logs?${params}`, token);
};