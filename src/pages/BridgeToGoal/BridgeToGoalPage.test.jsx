// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BridgeToGoalPage from './BridgeToGoalPage.jsx';

const { getBridgeToGoal, getMoisDisponibles, getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget, getSettings, updateBridgeGoalTarget, authState } = vi.hoisted(() => ({
  getBridgeToGoal: vi.fn(),
  getMoisDisponibles: vi.fn(),
  getBridgeGoalMonthlyTarget: vi.fn(),
  saveBridgeGoalMonthlyTarget: vi.fn(),
  getSettings: vi.fn(),
  updateBridgeGoalTarget: vi.fn(),
  authState: { userProfile: { role: 'USER' } },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userProfile: authState.userProfile }),
}));

vi.mock('../../api/vactis.js', () => ({ getBridgeToGoal, getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget }));
vi.mock('../../api/activite.js', () => ({ getMoisDisponibles }));
vi.mock('../../api/settings.js', () => ({ getSettings, updateBridgeGoalTarget }));

const coverageCases = [
  [24.9, 'Acquisition nécessaire'],
  [25, 'Prospection indispensable'],
  [49.9, 'Prospection indispensable'],
  [50, 'Prospection ciblée'],
  [99.9, 'Prospection ciblée'],
  [100, 'Portefeuille suffisant'],
];

function bridgeResponse(coverage) {
  return {
    periode: '2026-05', caActuel: 1000, caYtdReel: 5000, targetBudget: 10000,
    gap: 5000, gapProjete: 1000, gainOnboarding: coverage * 10,
    gainRetention: 0, gainDeveloppement: 0, opportunites: [],
    moisEcoules: 5, moisRestants: 7, runRateAnnuel: 12000,
    objectifYtdProratise: 4167, varianceYtd: 833, varianceYtdPct: 20,
    statutYtd: 'EN AVANCE', effortAdditionnelMensuel: 0,
    nouveauxMedecinsSegmentA: 0, nouveauxMedecinsSegmentB: 0,
    nouveauxMedecinsSegmentC: 0, nouveauxMedecinsSegmentD: 0,
  };
}

afterEach(cleanup);

describe('BridgeToGoalPage coverage wording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userProfile = { role: 'USER' };
    getMoisDisponibles.mockResolvedValue(['2026-05']);
    getBridgeGoalMonthlyTarget.mockResolvedValue(null);
    getSettings.mockResolvedValue({
      bridgeGoalTarget: 10000,
      bridgeGoalMethod: 'DIRECT',
      bridgeGoalInputValue: 10000,
      bridgeGoalReferenceRevenue: 9000,
    });
    updateBridgeGoalTarget.mockResolvedValue(12000);
  });

  it.each(coverageCases)('uses document label at %s%% coverage', async (coverage, expectedLabel) => {
    getBridgeToGoal.mockResolvedValue(bridgeResponse(coverage));
    render(<BridgeToGoalPage />);

    await waitFor(() => expect(getBridgeToGoal).toHaveBeenCalled());
    expect(await screen.findByText(new RegExp(`Recommandation Commerciale Prioritaire : ${expectedLabel}`, 'i'))).toBeTruthy();
  });

  it('previews a monthly goal from prior month revenue for administrators', async () => {
    authState.userProfile = { role: 'ADMIN' };
    getBridgeToGoal.mockResolvedValue({ ...bridgeResponse(50), previousMonthRevenue: 1500000 });
    render(<BridgeToGoalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Objectif du mois' }));
    const methodSelect = await screen.findByLabelText('Méthode de calcul mensuel');
    fireEvent.change(methodSelect, { target: { value: 'PERCENTAGE' } });
    fireEvent.change(screen.getByLabelText('Pourcentage d’augmentation'), { target: { value: '20' } });
    expect(await screen.findByText(/CA précédent 1.*500.*000 × \(1 \+ 20 %\)/i)).toBeTruthy();
    expect(getBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', '2026-05');

    saveBridgeGoalMonthlyTarget.mockResolvedValue({ mois: '2026-05', method: 'PERCENTAGE', value: 20 });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(saveBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', {
      mois: '2026-05', method: 'PERCENTAGE', value: 20,
    }));
    expect(await screen.findByText('Objectif Bridge to Goal enregistré.')).toBeTruthy();
  });

  it('lets an administrator update the annual target without changing the monthly target', async () => {
    authState.userProfile = { role: 'ADMIN' };
    getBridgeToGoal.mockResolvedValue(bridgeResponse(50));
    render(<BridgeToGoalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Objectif annuel' }));
    const annualInput = await screen.findByLabelText('Objectif annuel en MAD');
    expect(annualInput.value).toBe('10000');
    fireEvent.change(annualInput, { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateBridgeGoalTarget).toHaveBeenCalledWith('test-token', 12000, 'DIRECT'));
    expect(await screen.findByText(/Objectif annuel enregistré : 12\s?000 MAD\./)).toBeTruthy();
    expect(saveBridgeGoalMonthlyTarget).not.toHaveBeenCalled();
  });

  it('saves a directly entered monthly goal for the selected month', async () => {
    authState.userProfile = { role: 'ADMIN' };
    getBridgeToGoal.mockResolvedValue(bridgeResponse(50));
    saveBridgeGoalMonthlyTarget.mockResolvedValue({ mois: '2026-05', method: 'DIRECT', value: 2000000 });
    render(<BridgeToGoalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Objectif du mois' }));
    fireEvent.change(await screen.findByLabelText('Objectif mensuel en MAD'), { target: { value: '2000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(saveBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', {
      mois: '2026-05', method: 'DIRECT', value: 2000000,
    }));
    expect(await screen.findByText('Objectif Bridge to Goal enregistré.')).toBeTruthy();
  });

  it('does not persist an edited value when the administrator cancels', async () => {
    authState.userProfile = { role: 'ADMIN' };
    getBridgeToGoal.mockResolvedValue({ ...bridgeResponse(50), previousMonthRevenue: 1500000 });
    getBridgeGoalMonthlyTarget.mockResolvedValue({ mois: '2026-05', method: 'DIRECT', value: 1200000 });
    render(<BridgeToGoalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Objectif du mois' }));
    fireEvent.change(await screen.findByLabelText('Objectif mensuel en MAD'), { target: { value: '2000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(getBridgeGoalMonthlyTarget).toHaveBeenLastCalledWith('test-token', '2026-05'));
    expect(saveBridgeGoalMonthlyTarget).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Objectif mensuel en MAD')).toBeNull();
  });

  it('refreshes the goal for the newly selected month', async () => {
    authState.userProfile = { role: 'ADMIN' };
    getMoisDisponibles.mockResolvedValue(['2026-05', '2026-06']);
    getBridgeToGoal.mockResolvedValue(bridgeResponse(50));
    getBridgeGoalMonthlyTarget.mockResolvedValue(null);
    render(<BridgeToGoalPage />);

    const monthSelect = await screen.findByLabelText('Choisir le mois Bridge to Goal');
    await waitFor(() => expect(getBridgeGoalMonthlyTarget).toHaveBeenCalledWith('test-token', '2026-06'));
    fireEvent.change(monthSelect, { target: { value: '2026-06' } });

    await waitFor(() => {
      expect(getBridgeToGoal).toHaveBeenLastCalledWith('test-token', { mois: '2026-06' });
      expect(getBridgeGoalMonthlyTarget).toHaveBeenLastCalledWith('test-token', '2026-06');
    });
  });
});