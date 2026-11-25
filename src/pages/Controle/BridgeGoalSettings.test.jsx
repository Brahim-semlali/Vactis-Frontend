// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BridgeGoalSettings from './BridgeGoalSettings.jsx';

const { getSettings, updateBridgeGoalTarget, getMoisDisponibles, getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget } =
  vi.hoisted(() => ({
    getSettings: vi.fn(),
    updateBridgeGoalTarget: vi.fn(),
    getMoisDisponibles: vi.fn(),
    getBridgeGoalMonthlyTarget: vi.fn(),
    saveBridgeGoalMonthlyTarget: vi.fn(),
  }));

vi.mock('../../api/settings.js', () => ({ getSettings, updateBridgeGoalTarget }));
vi.mock('../../api/activite.js', () => ({ getMoisDisponibles }));
vi.mock('../../api/vactis.js', () => ({ getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const baseSettings = {
  bridgeGoalTarget: 24000000,
  bridgeGoalMethod: 'DIRECT',
  bridgeGoalInputValue: 24000000,
  bridgeGoalReferenceRevenue: 20000000,
};

afterEach(cleanup);

describe('BridgeGoalSettings (table Contrôle)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    getSettings.mockResolvedValue(baseSettings);
    updateBridgeGoalTarget.mockResolvedValue(24000000);
    getMoisDisponibles.mockResolvedValue(['2026-09']);
    getBridgeGoalMonthlyTarget.mockResolvedValue({ mois: '2026-09', method: 'DIRECT', value: null, previousMonthRevenue: 100000 });
    saveBridgeGoalMonthlyTarget.mockResolvedValue({
      mois: '2026-09', method: 'DIRECT', value: 125000, previousMonthRevenue: 100000, targetAmount: 125000,
    });
  });

  it('affiche l’objectif annuel direct et son prorata mensuel', async () => {
    render(<BridgeGoalSettings />);

    await screen.findByLabelText('Méthode de définition de l’objectif annuel');
    const annuel = screen.getByRole('form', { name: 'Objectif annuel Bridge to Goal' });
    expect(within(annuel).getAllByRole('status')[0].textContent).toMatch(/Objectif annuel : 24.*000.*000 MAD/);
    expect(annuel.textContent).toMatch(/Objectif mensuel de référence :\s*2.*000.*000\s*MAD/);
    await waitFor(() => expect(screen.getByLabelText('Objectif du mois en MAD').value).toBe('2000000'));
  });

  it('calcule et enregistre un objectif annuel en pourcentage du CA de l’année précédente', async () => {
    render(<BridgeGoalSettings />);

    fireEvent.change(await screen.findByLabelText('Méthode de définition de l’objectif annuel'), {
      target: { value: 'PERCENTAGE' },
    });
    fireEvent.change(screen.getByLabelText('Pourcentage annuel'), { target: { value: '20' } });
    const annuel = screen.getByRole('form', { name: 'Objectif annuel Bridge to Goal' });
    expect(within(annuel).getAllByRole('status')[0].textContent).toMatch(
      /CA réel de l’année précédente : 20.*000.*000 MAD · objectif annuel calculé : 24.*000.*000 MAD/,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif annuel' }));
    await waitFor(() => expect(updateBridgeGoalTarget).toHaveBeenCalledWith('test-token', 20, 'PERCENTAGE'));
    expect(await screen.findByText(/Objectif annuel enregistré : 24.*000.*000 MAD/)).toBeTruthy();
  });

  it('refuse un objectif annuel direct nul', async () => {
    render(<BridgeGoalSettings />);

    fireEvent.change(await screen.findByLabelText('Objectif annuel en MAD'), { target: { value: '0' } });
    // Le navigateur bloque déjà via min="1" ; on vérifie aussi le contrôle applicatif
    fireEvent.submit(screen.getByRole('form', { name: 'Objectif annuel Bridge to Goal' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(updateBridgeGoalTarget).not.toHaveBeenCalled();
  });

  it('enregistre un objectif mensuel spécifique pour le mois choisi', async () => {
    render(<BridgeGoalSettings />);

    await waitFor(() => expect(getBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', '2026-09'));
    fireEvent.change(screen.getByLabelText('Objectif du mois en MAD'), { target: { value: '125000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif mensuel' }));

    await waitFor(() =>
      expect(saveBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', { mois: '2026-09', method: 'DIRECT', value: 125000 }),
    );
    expect(await screen.findByText(/Objectif de 2026-09 enregistré : 125/)).toBeTruthy();
  });
});
