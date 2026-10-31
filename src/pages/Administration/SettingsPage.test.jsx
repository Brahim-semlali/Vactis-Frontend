// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage.jsx';

const { getSettings, updateSettings, getMoisDisponibles, getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getMoisDisponibles: vi.fn(),
  getBridgeGoalMonthlyTarget: vi.fn(),
  saveBridgeGoalMonthlyTarget: vi.fn(),
}));

vi.mock('../../api/settings.js', () => ({ getSettings, updateSettings }));
vi.mock('../../api/activite.js', () => ({ getMoisDisponibles }));
vi.mock('../../api/vactis.js', () => ({ getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget }));
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
  bridgeGoalReferenceRevenue: 20000000,
};

afterEach(cleanup);

describe('SettingsPage Bridge to Goal annual target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    getSettings.mockResolvedValue(baseSettings);
    updateSettings.mockResolvedValue({ ...baseSettings, updatedAt: null, updatedBy: null });
    getMoisDisponibles.mockResolvedValue(['2026-09']);
    getBridgeGoalMonthlyTarget.mockResolvedValue({ mois: '2026-09', method: 'DIRECT', value: null, previousMonthRevenue: 100000 });
    saveBridgeGoalMonthlyTarget.mockResolvedValue({ mois: '2026-09', method: 'DIRECT', value: 125000, previousMonthRevenue: 100000, targetAmount: 125000 });
  });

  it('previews the annual direct target and its monthly prorata', async () => {
    render(<SettingsPage />);

    await screen.findByLabelText('Méthode de définition de l’objectif annuel');
    const bridgeSettings = screen.getByRole('group', { name: 'Bridge to Goal' });
    const preview = within(bridgeSettings).getAllByRole('status')[0];
    expect(preview.textContent).toMatch(/Objectif annuel : 24.*000.*000 MAD/);
    expect(bridgeSettings.textContent).toMatch(/Objectif mensuel de référence :\s*2.*000.*000\s*MAD/);
    await waitFor(() => expect(screen.getByLabelText('Objectif du mois en MAD').value).toBe('2000000'));
  });

  it('previews and saves an annual percentage goal from previous year revenue', async () => {
    render(<SettingsPage />);

    await screen.findByLabelText('Méthode de définition de l’objectif annuel');
    fireEvent.change(await screen.findByLabelText('Méthode de définition de l’objectif annuel'), {
      target: { value: 'PERCENTAGE' },
    });
    fireEvent.change(screen.getByLabelText('Pourcentage annuel'), { target: { value: '20' } });
    const bridgeSettings = screen.getByRole('group', { name: 'Bridge to Goal' });
    expect(within(bridgeSettings).getAllByRole('status')[0].textContent).toMatch(/CA réel de l’année précédente : 20.*000.*000 MAD · objectif annuel calculé : 24.*000.*000 MAD/);

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith('test-token', expect.objectContaining({
      bridgeGoalTarget: 24000000,
      bridgeGoalMethod: 'PERCENTAGE',
      bridgeGoalInputValue: 20,
    })));
  });

  it('saves a specific monthly goal for the selected period', async () => {
    render(<SettingsPage />);

    await waitFor(() => expect(getBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', '2026-09'));
    fireEvent.change(screen.getByLabelText('Objectif du mois en MAD'), { target: { value: '125000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif mensuel' }));

    await waitFor(() => expect(saveBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', {
      mois: '2026-09',
      method: 'DIRECT',
      value: 125000,
    }));
    expect((await screen.findByText(/Objectif de 2026-09 enregistré : 125/)).textContent).toMatch(/Objectif de 2026-09 enregistré : 125/);
  });
});
