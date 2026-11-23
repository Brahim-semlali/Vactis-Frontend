import { API_BASE } from './config.js';

async function getJson(endpoint, token) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    let message = response.statusText || `Erreur API (${response.status})`;
    try {
      const data = await response.json();
      message = typeof data === 'string' ? data : data?.message ?? data?.error ?? message;
    } catch {
      // réponse sans JSON
    }
    throw new Error(message);
  }
  return response.json();
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') search.set(key, String(value).trim());
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// ── Dashboard Direction ──────────────────────────────────────────────────────

export function getDashboardDirection(token, { mois } = {}) {
  return getJson(`/api/dashboard-direction${buildQuery({ mois })}`, token);
}

// ── Suivi équipe ─────────────────────────────────────────────────────────────

export function getSuiviCommerciaux(token, { debut, fin } = {}) {
  return getJson(`/api/suivi-equipe/commerciaux${buildQuery({ debut, fin })}`, token);
}

export function getSuiviVisites(token, { commercial, debut, fin, type, statut } = {}) {
  return getJson(`/api/suivi-equipe/visites${buildQuery({ commercial, debut, fin, type, statut })}`, token);
}

export function getSuiviReclamations(token, { commercial, debut, fin } = {}) {
  return getJson(`/api/suivi-equipe/reclamations${buildQuery({ commercial, debut, fin })}`, token);
}

export function getEvolutionMedecin(token, medecinId) {
  return getJson(`/api/suivi-equipe/medecins/${encodeURIComponent(medecinId)}/evolution`, token);
}
