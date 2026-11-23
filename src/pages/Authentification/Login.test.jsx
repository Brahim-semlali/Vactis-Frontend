// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Login from './Login.jsx';
import { AuthError } from '../../api/auth.js';

const login = vi.fn();

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ login }),
}));

vi.mock('../../api/auth.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getAccountStatus: vi.fn().mockResolvedValue(null),
}));

afterEach(() => {
  cleanup();
  login.mockReset();
});

describe('Login', () => {
  it('affiche le formulaire de connexion', () => {
    render(<Login onShowRegister={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Ravi de vous revoir' })).toBeTruthy();
    expect(screen.getByText('Connectez-vous à votre espace personnel')).toBeTruthy();
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeTruthy();
    expect(screen.getByLabelText('Mot de passe')).toBeTruthy();
    expect(screen.getByLabelText('Se souvenir de moi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mot de passe oublié ?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeTruthy();
  });

  it('affiche et masque le mot de passe', () => {
    render(<Login onShowRegister={vi.fn()} />);
    const password = screen.getByLabelText('Mot de passe');

    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(password.getAttribute('type')).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(password.getAttribute('type')).toBe('password');
  });

  it('signale le verrouillage des majuscules dans le champ mot de passe', () => {
    render(<Login onShowRegister={vi.fn()} />);
    const password = screen.getByLabelText('Mot de passe');

    fireEvent.keyDown(password, { key: 'A', modifierCapsLock: true });
    expect(screen.getByText('Verrouillage des majuscules activé')).toBeTruthy();

    fireEvent.blur(password);
    expect(screen.queryByText('Verrouillage des majuscules activé')).toBeNull();
  });

  it('affiche l’alerte avec les tentatives restantes après un refus', async () => {
    login.mockRejectedValue(
      new AuthError('Identifiants incorrects', { code: 'BAD_CREDENTIALS', remainingAttempts: 2, maxAttempts: 3 }),
    );
    render(<Login onShowRegister={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'jdupont' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'mauvais-mdp' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Identifiants incorrects');
    await waitFor(() => expect(alerte.textContent).toContain('Tentatives restantes : 2 / 3'));
    expect(alerte.querySelectorAll('.vxa-attempts-segments .is-on')).toHaveLength(2);

    // Les champs passent en erreur jusqu'à la prochaine saisie
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'autre-mdp' } });
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-invalid')).toBeNull();
  });

  it('confirme visuellement une connexion réussie', async () => {
    login.mockResolvedValue('jwt');
    render(<Login onShowRegister={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'jdupont' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'bon-mdp' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByRole('button', { name: /connexion réussie/i })).toBeTruthy();
    expect(login).toHaveBeenCalledWith('jdupont', 'bon-mdp');
  });

  it('demande l’affichage de l’inscription', () => {
    const onShowRegister = vi.fn();
    render(<Login onShowRegister={onShowRegister} />);

    fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }));
    expect(onShowRegister).toHaveBeenCalledTimes(1);
  });
});
