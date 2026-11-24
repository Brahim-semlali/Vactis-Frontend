// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.jsx';

const api = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock('../api/auth.js', () => api);
vi.mock('../utils/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

/** Jeton JWT factice (signature non vérifiée côté interface). */
function jeton(sub, expDansSecondes) {
  const encoder = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${encoder({ alg: 'HS256' })}.${encoder({ sub, exp: Math.floor(Date.now() / 1000) + expDansSecondes })}.signature`;
}

let auth;
function Sonde() {
  auth = useAuth();
  return <span data-testid="etat">{auth.isAuthenticated ? `connecté:${auth.username}` : 'anonyme'}</span>;
}
const monter = () => render(<AuthProvider><Sonde /></AuthProvider>);

describe('AuthContext — session et jeton', () => {
  let fetchOriginal;

  beforeEach(() => {
    localStorage.clear();
    fetchOriginal = window.fetch;
    window.fetch = vi.fn().mockResolvedValue({ status: 200 });
    api.getProfile.mockResolvedValue({ username: 'commercial1', role: 'COMMERCIALE' });
    api.logout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.fetch = fetchOriginal;
    vi.clearAllMocks();
  });

  it('reprend une session valide stockée et lit l’utilisateur dans le jeton', async () => {
    localStorage.setItem('stagelabo_token', jeton('commercial1', 3600));
    monter();
    expect(screen.getByTestId('etat').textContent).toBe('connecté:commercial1');
    await waitFor(() => expect(auth.userProfile?.role).toBe('COMMERCIALE'));
  });

  it('supprime un jeton expiré ou illisible au démarrage', () => {
    localStorage.setItem('stagelabo_token', jeton('ancien', -10));
    monter();
    expect(screen.getByTestId('etat').textContent).toBe('anonyme');
    expect(localStorage.getItem('stagelabo_token')).toBeNull();

    cleanup();
    localStorage.setItem('stagelabo_token', 'pas-un-jwt');
    monter();
    expect(screen.getByTestId('etat').textContent).toBe('anonyme');
  });

  it('la connexion enregistre le jeton et ouvre l’accueil', async () => {
    const nouveau = jeton('direction', 3600);
    api.login.mockResolvedValue({ token: nouveau });
    monter();

    await act(() => auth.login('direction', 'secret'));

    expect(api.login).toHaveBeenCalledWith('direction', 'secret');
    expect(localStorage.getItem('stagelabo_token')).toBe(nouveau);
    expect(window.location.pathname).toBe('/accueil');
    expect(screen.getByTestId('etat').textContent).toBe('connecté:direction');
  });

  it('une connexion refusée ne crée pas de session', async () => {
    api.login.mockRejectedValue(new Error('Identifiants invalides'));
    monter();
    await expect(auth.login('x', 'y')).rejects.toThrow('Identifiants invalides');
    expect(localStorage.getItem('stagelabo_token')).toBeNull();
  });

  it('la déconnexion vide la session et prévient le serveur', async () => {
    const actuel = jeton('commercial1', 3600);
    localStorage.setItem('stagelabo_token', actuel);
    monter();

    act(() => auth.logout());

    expect(api.logout).toHaveBeenCalledWith(actuel);
    expect(localStorage.getItem('stagelabo_token')).toBeNull();
    expect(window.location.pathname).toBe('/');
    expect(screen.getByTestId('etat').textContent).toBe('anonyme');
  });

  it('un 401 sans jeton (mauvais mot de passe) ne ferme pas la session en cours', async () => {
    window.fetch = vi.fn().mockResolvedValue({ status: 401 });
    localStorage.setItem('stagelabo_token', jeton('commercial1', 3600));
    monter();

    await act(async () => {
      await window.fetch('/api/auth/login', { headers: {} });
    });

    expect(screen.getByTestId('etat').textContent).toBe('connecté:commercial1');
  });

  it('la session se ferme automatiquement à l’expiration du jeton', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem('stagelabo_token', jeton('commercial1', 5));
    monter();
    expect(screen.getByTestId('etat').textContent).toBe('connecté:commercial1');

    await act(async () => { vi.advanceTimersByTime(6000); });

    expect(screen.getByTestId('etat').textContent).toBe('anonyme');
    expect(localStorage.getItem('stagelabo_token')).toBeNull();
    expect(api.logout).not.toHaveBeenCalled();
  });

  it('constat d’audit : si le profil ne se charge pas, l’interface suppose le rôle « Directeur »', async () => {
    api.getProfile.mockRejectedValue(new Error('réseau'));
    localStorage.setItem('stagelabo_token', jeton('commercial1', 3600));
    monter();
    await waitFor(() => expect(auth.userProfile?.role).toBe('Directeur'));
    expect(auth.userProfile.username).toBe('commercial1');
  });

  it('useAuth hors du fournisseur lève une erreur explicite', () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Orphelin() { useAuth(); return null; }
    expect(() => render(<Orphelin />)).toThrow('useAuth must be used within AuthProvider');
    erreur.mockRestore();
  });
});

describe('AuthContext — rejet du jeton par le serveur', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('déconnecte quand le serveur répond 401 à une requête portant le jeton', async () => {
    localStorage.setItem('stagelabo_token', jeton('commercial1', 3600));
    const reseau = vi.fn().mockResolvedValue({ status: 401 });
    window.fetch = reseau;
    api.getProfile.mockResolvedValue({ role: 'COMMERCIALE' });
    monter();

    await act(async () => {
      await window.fetch('/api/medecins', { headers: { Authorization: 'Bearer x' } });
    });

    expect(screen.getByTestId('etat').textContent).toBe('anonyme');
    expect(localStorage.getItem('stagelabo_token')).toBeNull();
    expect(api.logout).not.toHaveBeenCalled();
  });
});
