const API_BASE = '';

async function activiteRequest(endpoint, token) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = response.statusText || `Erreur API: ${response.status}`;
    try {
      const data = await response.json();
      message = data?.message ?? data?.error ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json();
}

export async function getKpisMensuels(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/kpis-mensuels${query}`, token);
}

export async function getComparaison(token, mois, metrique, fenetreRef) {
  const params = new URLSearchParams();
  if (mois) params.append('mois', mois);
  if (metrique) params.append('metrique', metrique);
  if (fenetreRef) params.append('fenetreRef', fenetreRef);

  const query = params.toString() ? `?${params.toString()}` : '';
  return activiteRequest(`/api/activite/comparaison${query}`, token);
}

export async function getMoisDisponibles(token) {
  return activiteRequest('/api/activite/mois-disponibles', token);
}

export async function getStatutsRepartition(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/statuts${query}`, token);
}

export async function getTransitionsStatuts(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/statuts/transitions${query}`, token);
}

export async function getFluxAgreges(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/statuts/flux${query}`, token);
}

export async function getTopMouvements(token, mois, metrique = 'ca', limite = 10) {
  const params = new URLSearchParams();
  if (mois) params.append('mois', mois);
  params.append('metrique', metrique);
  params.append('limite', limite);
  return activiteRequest(`/api/activite/top-mouvements?${params.toString()}`, token);
}

export async function getActionsVactis(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/terrain/actions${query}`, token);
}

export async function getCompteRenduTerrain(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/terrain/compte-rendu${query}`, token);
}

// --- Niveau 4 — Impact des visites terrain ---

export async function getRapportImpact(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/impact/rapport${query}`, token);
}

export async function getEvolutionParCommercial(token, mois) {
  const query = mois ? `?mois=${encodeURIComponent(mois)}` : '';
  return activiteRequest(`/api/activite/impact/par-commercial${query}`, token);
}

export async function getDetailEvolution(token, mois, page = 0, taille = 20) {
  const params = new URLSearchParams();
  if (mois) params.append('mois', mois);
  params.append('page', page);
  params.append('taille', taille);
  return activiteRequest(`/api/activite/impact/detail?${params.toString()}`, token);
}
