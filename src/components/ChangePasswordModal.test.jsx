// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChangePasswordModal from './ChangePasswordModal.jsx';

const { changePassword, getPasswordPolicy } = vi.hoisted(() => ({ changePassword: vi.fn(), getPasswordPolicy: vi.fn() }));
vi.mock('../api/auth.js', () => ({ changePassword, getPasswordPolicy }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 't' }) }));

const saisir = (libelle, valeur) => fireEvent.change(screen.getByLabelText(new RegExp(`^${libelle}`)), { target: { value: valeur } });
const valider = () => fireEvent.submit(document.querySelector('form'));

describe('ChangePasswordModal — politique de mot de passe', () => {
  beforeEach(() => {
    getPasswordPolicy.mockResolvedValue({ mdpLongueurMinimale: 10, mdpExigeMajuscule: true, mdpExigeChiffre: true, mdpExigeCaractereSpecial: true });
    changePassword.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function ouvrir() {
    render(<ChangePasswordModal onClose={vi.fn()} />);
    await screen.findByText('Au moins 10 caractères');
  }

  it.each(['Court1!', 'sansmajuscule1!', 'SansChiffre!!!', 'SansSpecial123'])(
    'refuse « %s » sans appeler le serveur',
    async (faible) => {
      await ouvrir();
      saisir('Mot de passe actuel', 'Ancien-2025');
      saisir('Nouveau mot de passe', faible);
      saisir('Confirmation', faible);
      valider();
      expect(screen.getByRole('alert').textContent).toMatch(/politique de sécurité/);
      expect(changePassword).not.toHaveBeenCalled();
    },
  );

  it('affiche les exigences remplies au fil de la saisie', async () => {
    await ouvrir();
    saisir('Nouveau mot de passe', 'abc');
    expect(screen.getByText('Une majuscule').className).toContain('rose');
    saisir('Nouveau mot de passe', 'Abcdefgh1!');
    expect(screen.getByText('Une majuscule').className).toContain('emerald');
    expect(screen.getByText('Au moins 10 caractères').className).toContain('emerald');
  });

  it('exige une confirmation identique', async () => {
    await ouvrir();
    saisir('Nouveau mot de passe', 'Robuste-2026');
    saisir('Confirmation', 'Robuste-2027');
    valider();
    expect(screen.getByRole('alert').textContent).toBe('Les deux nouveaux mots de passe doivent être identiques.');
  });

  it('change le mot de passe puis confirme', async () => {
    await ouvrir();
    saisir('Mot de passe actuel', 'Ancien-2025');
    saisir('Nouveau mot de passe', 'Robuste-2026');
    saisir('Confirmation', 'Robuste-2026');
    valider();
    await screen.findByText('Votre mot de passe a été modifié.');
    expect(changePassword).toHaveBeenCalledWith('t', 'Ancien-2025', 'Robuste-2026');
  });

  it('affiche le refus du serveur (mot de passe actuel incorrect)', async () => {
    changePassword.mockRejectedValue(new Error('Le mot de passe actuel est incorrect'));
    await ouvrir();
    saisir('Mot de passe actuel', 'faux');
    saisir('Nouveau mot de passe', 'Robuste-2026');
    saisir('Confirmation', 'Robuste-2026');
    valider();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Le mot de passe actuel est incorrect'));
  });
});
