// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage.jsx';

const { getSettings, updateSettings } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('../../api/settings.js', () => ({ getSettings, updateSettings }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const baseSettings = {
  dureeSessionMinutes: 60,
  dureeInactiviteJours: 90,
  mdpLongueurMinimale: 8,
  mdpExigeMajuscule: false,
  mdpExigeChiffre: false,
  mdpExigeCaractereSpecial: false,
  maxTentativesConnexion: 5,
  dureeBlocageMinutes: 15,
  journalConnexionActif: true,
  bridgeGoalTarget: 24000000,
  bridgeGoalMethod: 'DIRECT',
  bridgeGoalInputValue: 24000000,
};

afterEach(cleanup);

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    getSettings.mockResolvedValue(baseSettings);
    updateSettings.mockResolvedValue({ ...baseSettings, updatedAt: null, updatedBy: null });
  });

  it('n’affiche plus le réglage Bridge to Goal (déplacé dans Contrôle)', async () => {
    render(<SettingsPage />);

    await screen.findByRole('button', { name: 'Enregistrer' });
    expect(screen.queryByRole('group', { name: 'Bridge to Goal' })).toBeNull();
    expect(screen.queryByLabelText('Méthode de définition de l’objectif annuel')).toBeNull();
  });

  it('enregistre les paramètres sans envoyer l’objectif Bridge to Goal', async () => {
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
    const payload = updateSettings.mock.calls[0][1];
    expect(payload).toMatchObject({ dureeSessionMinutes: 60, maxTentativesConnexion: 5, dureeBlocageMinutes: 15 });
    expect(payload).not.toHaveProperty('bridgeGoalTarget');
    expect(payload).not.toHaveProperty('bridgeGoalMethod');
    expect(payload).not.toHaveProperty('bridgeGoalInputValue');
  });
});
