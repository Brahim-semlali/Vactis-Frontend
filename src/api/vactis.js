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

/** Alertes de fin de cycle : celles du commercial connecté, ou de toute l'équipe pour la direction. */
export async function getAlertesFinCycle(token) {
  const response = await fetch(`${API_BASE}/api/alertes/fin-cycle`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

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

export async function getBridgeToGoal(token, { mois } = {}) {
  logger.info('Chargement simulation Bridge to Goal');
  const params = new URLSearchParams();
  if (mois) params.set('mois', mois);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/api/bridge-to-goal${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function getBridgeGoalMonthlyTarget(token, mois) {
  const response = await fetch(`${API_BASE}/api/bridge-to-goal/target?mois=${encodeURIComponent(mois)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function saveBridgeGoalMonthlyTarget(token, target) {
  const response = await fetch(`${API_BASE}/api/bridge-to-goal/target`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(target),
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

export async function mettreAJourStatutReclamation(token, id, { statut, solution, responsable, prochaineInstruction, dateTraitement, dateEcheance }) {
  const body = { statut };
  if (solution) body.solution = solution;
  if (responsable) body.responsable = responsable;
  if (prochaineInstruction) body.prochaineInstruction = prochaineInstruction;
  if (dateTraitement) body.dateTraitement = dateTraitement;
  // Chaîne vide = retirer l'échéance ; undefined = ne pas la modifier
  if (dateEcheance !== undefined) body.dateEcheance = dateEcheance;
  const response = await fetch(`${API_BASE}/api/reclamations/${id}/statut`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function creerReclamation(token, body) {
  const response = await fetch(`${API_BASE}/api/reclamations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function getReclamationById(token, id) {
  const response = await fetch(`${API_BASE}/api/reclamations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function getReclamationHistorique(token, id) {
  const response = await fetch(`${API_BASE}/api/reclamations/${id}/historique`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

// ─── Notifications ───────────────────────────────────────────────────────────────

export async function getNotifications(token) {
  const response = await fetch(`${API_BASE}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function getNotificationsCount(token) {
  const response = await fetch(`${API_BASE}/api/notifications/count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}

export async function marquerNotificationLue(token, id) {
  const response = await fetch(`${API_BASE}/api/notifications/${id}/lire`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response);
}
