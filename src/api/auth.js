// En dev : le serveur Parcel proxifie /api (voir .proxyrc).
// En prod (Docker + nginx) : /api est proxifié vers le backend ; URLs relatives suffisent.
const API_BASE = '';
// En prod (Docker + nginx) : /api est proxifié vers le backend ; URLs relatives suffisent.
const API_BASE = '';

async function parseError(response) {
  try {
    const data = await response.json();
    if (typeof data === 'string') return data;
    return data.message ?? data.error ?? JSON.stringify(data);
  } catch {
    return response.statusText || 'Une erreur est survenue';
  }
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function register(username, password) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
