import { API_BASE } from './config.js';
import { logger } from '../utils/logger.js';

export class AdministrationError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = 'AdministrationError';
    this.status = status;
    this.code = code;
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
    let code = null;
    try {
      const body = await response.json();
      message = body?.message ?? body?.error ?? message;
      code = body?.code ?? null;
    } catch {
      // Some Spring errors have no JSON body.
    }
    const error = new AdministrationError(message, response.status, code);
    logger.warn('Échec requête administration', {
      method: options.method ?? 'GET',
      path,
      status: response.status,
      code,
      message,
    });
    throw error;
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const getRoles = (token) => request('/roles/', token);
export const getMenus = (token) => request('/api/admin/menu-tree-complet', token);
export const getUsers = (token) => request('/users/', token);

export const createRole = (token, body) => request('/roles/add', token, { method: 'POST', body: JSON.stringify(body) });
export const updateRole = (token, id, body) => request(`/roles/${id}`, token, { method: 'PUT', body: JSON.stringify(body) });
export const deleteRole = (token, id) => request(`/roles/${id}`, token, { method: 'DELETE' });

export const createUser = (token, body) => request('/users', token, { method: 'POST', body: JSON.stringify(body) });
export const updateUser = (token, id, body) => request(`/users/${id}`, token, { method: 'PUT', body: JSON.stringify(body) });
export const deleteUser = (token, id) => request(`/users/${id}`, token, { method: 'DELETE' });
export const assignUserRole = (token, userId, roleId) => request(`/users/${userId}/role/${roleId}`, token, { method: 'PUT' });
export const suspendUser = (token, userId, minutes) => request(`/users/${userId}/suspend?minutes=${minutes}`, token, { method: 'PUT' });
export const blockUser = (token, userId) => request(`/users/${userId}/block`, token, { method: 'PUT' });
export const unblockUser = (token, userId) => request(`/users/${userId}/unblock`, token, { method: 'PUT' });
