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
