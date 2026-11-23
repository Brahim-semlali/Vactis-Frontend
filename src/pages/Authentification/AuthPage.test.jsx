// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import AuthPage from './AuthPage.jsx';
import { splitFullName } from './Register.jsx';

const login = vi.fn();
const register = vi.fn();

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ login, register }),
}));

vi.mock('../../api/auth.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getAccountStatus: vi.fn().mockResolvedValue(null),
}));

beforeAll(() => {
  // jsdom ne dessine pas sur <canvas> : les particules se désactivent d'elles-mêmes
  HTMLCanvasElement.prototype.getContext = () => null;
});

afterEach(() => {
  cleanup();
  login.mockReset();
  register.mockReset();
});

function remplirInscription({ nom = 'Marie de la Tour', motDePasse = 'Secret123', confirmation = motDePasse } = {}) {
  fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: nom } });
  fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'mdelatour' } });
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), { target: { value: 'marie@exemple.fr' } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: motDePasse } });
  fireEvent.change(screen.getByLabelText('Confirmation du mot de passe'), { target: { value: confirmation } });
}

describe('AuthPage', () => {
  it('affiche le panneau de présentation et le formulaire de connexion', () => {
    render(<AuthPage />);

    const panneau = screen.getByRole('complementary', { name: 'Présentation de VACTIS' });
    expect(panneau.textContent).toContain('plan d’action');
    expect(panneau.textContent).toContain('Analyse intelligente');
    expect(panneau.textContent).toContain('Décisions éclairées');
    expect(panneau.textContent).toContain('Performance garantie');
    expect(screen.getByRole('heading', { level: 1, name: 'Ravi de vous revoir' })).toBeTruthy();
  });

  it('bascule vers l’inscription puis revient à la connexion sans recharger la page', async () => {
    render(<AuthPage />);
    const panneau = screen.getByRole('complementary', { name: 'Présentation de VACTIS' });

    fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }));

    const titreInscription = await screen.findByRole('heading', { level: 1, name: 'Créez votre compte' });
    expect(screen.getByText('Rejoignez votre espace VACTIS')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(titreInscription));
    await waitFor(
      () => expect(screen.queryByRole('heading', { level: 1, name: 'Ravi de vous revoir' })).toBeNull(),
      { timeout: 2000 },
    );
    // Le panneau de présentation reste le même élément pendant la bascule
    expect(screen.getByRole('complementary', { name: 'Présentation de VACTIS' })).toBe(panneau);

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ravi de vous revoir' })).toBeTruthy();
  });

  it('refuse un nom complet sans nom de famille', async () => {
    render(<AuthPage initialView="register" />);
    remplirInscription({ nom: 'Marie' });

    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Indiquez votre prénom et votre nom');
    expect(register).not.toHaveBeenCalled();
  });

  it('signale des mots de passe différents', async () => {
    render(<AuthPage initialView="register" />);
    remplirInscription({ confirmation: 'Autre123' });

    expect(screen.getAllByText('Les mots de passe ne correspondent pas').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Les mots de passe ne correspondent pas');
    expect(register).not.toHaveBeenCalled();
  });

  it('envoie le prénom et le nom attendus par l’API', async () => {
    register.mockResolvedValue({});
    render(<AuthPage initialView="register" />);
    remplirInscription();

    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register).toHaveBeenCalledWith({
      username: 'mdelatour',
      password: 'Secret123',
      firstName: 'Marie',
      lastName: 'de la Tour',
      email: 'marie@exemple.fr',
      phone: null,
    });
  });
});

describe('splitFullName', () => {
  it('sépare le prénom du nom', () => {
    expect(splitFullName('  Jean-Pierre   Dupont ')).toEqual({ firstName: 'Jean-Pierre', lastName: 'Dupont' });
    expect(splitFullName('Marie de la Tour')).toEqual({ firstName: 'Marie', lastName: 'de la Tour' });
    expect(splitFullName('Marie')).toEqual({ firstName: 'Marie', lastName: '' });
    expect(splitFullName('')).toEqual({ firstName: '', lastName: '' });
  });
});
