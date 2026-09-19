import { logger } from '../utils/logger.js';
import { API_BASE } from './config.js';

async function parseError(response) {
  let message = response.statusText || 'Erreur API';
  try {
    const data = await response.json();
    message = typeof data === 'string' ? data : data?.message ?? data?.error ?? message;
  } catch {
    // ignore
  }
  return new Error(message);
}

// ─── Alertes hebdomadaires ──────────────────────────────────────────────────

export async function getAlertesActives(token) {
  logger.info('Chargement des alertes actives (A_TRAITER)');
  const response = await fetch(`${API_BASE}/api/alertes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function getToutesAlertes(token) {
  logger.info('Chargement de toutes les alertes');
  const response = await fetch(`${API_BASE}/api/alertes/toutes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function runBatchAlertes(token) {
  logger.info('Déclenchement manuel du batch hebdomadaire');
  const response = await fetch(`${API_BASE}/api/alertes/batch-run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function traiterAlerte(token, id, statut) {
  const response = await fetch(`${API_BASE}/api/alertes/${id}/statut?statut=${encodeURIComponent(statut)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function genererActionDepuisAlerte(token, id) {
  const response = await fetch(`${API_BASE}/api/alertes/${id}/generer-action`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

// ─── Recommandations ────────────────────────────────────────────────────────

export async function getRecommandations(token) {
  logger.info('Chargement des recommandations commerciales');
  const response = await fetch(`${API_BASE}/api/recommandations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function creerActionRecommandation(token, medecinId, type) {
  const response = await fetch(
    `${API_BASE}/api/recommandations/${medecinId}/creer-action?type=${encodeURIComponent(type)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw await parseError(response);
  return response.json();
}

// ─── Bridge to Goal ─────────────────────────────────────────────────────────

export async function getBridgeToGoal(token, { target, mois } = {}) {
  logger.info('Chargement simulation Bridge to Goal');
  const params = new URLSearchParams();
  if (target) params.set('target', target);
  if (mois) params.set('mois', mois);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/api/bridge-to-goal${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

// ─── Réclamations ────────────────────────────────────────────────────────────

export async function getReclamations(token, { search, statut, categorie, priorite } = {}) {
  logger.info('Chargement des réclamations');
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statut) params.set('statut', statut);
  if (categorie) params.set('categorie', categorie);
  if (priorite) params.set('priorite', priorite);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/api/reclamations${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function mettreAJourStatutReclamation(token, id, { statut, solution, responsable }) {
  const params = new URLSearchParams();
  params.set('statut', statut);
  if (solution) params.set('solution', solution);
  if (responsable) params.set('responsable', responsable);
  const response = await fetch(`${API_BASE}/api/reclamations/${id}/statut?${params.toString()}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}
