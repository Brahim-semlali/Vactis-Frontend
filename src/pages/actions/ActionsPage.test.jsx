// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActionsPage from './ActionsPage.jsx';

const { authState, getActions, getMedecins, getVisitesLibresApi, printObjectRows } = vi.hoisted(() => ({
  authState: { userProfile: { role: 'USER' } },
  getActions: vi.fn(),
  getMedecins: vi.fn(),
  getVisitesLibresApi: vi.fn(),
  printObjectRows: vi.fn(),
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userProfile: authState.userProfile }),
}));
vi.mock('../../api/actions.js', () => ({
  getActions,
  getVisitesLibresApi,
  reserverActionApi: vi.fn(),
  soumettreRetourTerrainApi: vi.fn(),
  creerVisiteLibreApi: vi.fn(),
}));
vi.mock('../../api/medecins.js', () => ({ getMedecinEvolution: vi.fn(), getMedecins }));
vi.mock('../../components/actions/ModalSaisieRetour.jsx', () => ({ default: () => null }));
vi.mock('../../components/actions/ModalVisiteLibre.jsx', () => ({ default: () => null }));
vi.mock('../../components/medecins/FicheContextuelleDrawer.jsx', () => ({ default: () => null }));
vi.mock('../../utils/adminExports.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, printObjectRows };
});

afterEach(cleanup);

describe('ActionsPage exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userProfile = { role: 'USER' };
    getActions.mockResolvedValue({
      items: [{
        id: 101,
        statut: 'SURVEILLANCE',
        segment: 'C',
        actionRecommandee: 'visite diagnostic',
        commentaireMoteurTitre: 'Signal d’alerte précoce à surveiller',
        commentaireMoteurDetail: 'Baisse modérée observée. Objectif de visite : diagnostiquer.',
        urgence: 'ELEVE',
        horizonJours: 15,
        etatAction: 'PLANIFIEE',
        dateVisite: '2026-10-30',
        medecin: { id: 7, nom: 'Mehdi', prenom: 'Ait Taleb', scoreUrgence: 17.81, caMois: 0, totalCas: 0 },
      }],
      kpis: {},
      meta: { affiches: 1, charges: 1 },
      filters: {},
    });
    getMedecins.mockResolvedValue({ items: [] });
    getVisitesLibresApi.mockResolvedValue([]);
  });

  it('hides both export controls for non-admins', async () => {
    render(<ActionsPage />);
    await waitFor(() => expect(getActions).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: 'Exporter la table Actions en PDF' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Télécharger les Actions en Excel' })).toBeNull();
  });

  it('filters onboarding doctors and toggles back to all actions', async () => {
    render(<ActionsPage />);
    await screen.findByText('visite diagnostic');

    getActions.mockResolvedValue({ items: [], kpis: {}, meta: {}, filters: {} });
    getMedecins.mockResolvedValue({
      items: [{
        id: 88,
        nom: 'Onboarding',
        prenom: 'Dina',
        statut: 'ONBOARDING',
        segment: 'B',
        specialite: 'Cardiologie',
      }],
    });

    const onboardingButton = screen.getByRole('button', { name: 'Médecins onboarding' });
    onboardingButton.click();

    await waitFor(() => expect(getActions).toHaveBeenLastCalledWith(
      'test-token',
      expect.objectContaining({ statut: 'ONBOARDING' }),
    ));
    expect(getMedecins).toHaveBeenLastCalledWith(
      'test-token',
      expect.objectContaining({ statut: 'ONBOARDING' }),
    );
    expect(await screen.findByText(/ONBOARDING DINA/)).toBeTruthy();
    expect(screen.getByText('Visite onboarding à planifier')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Médecins onboarding (1)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Réserver' })).toBeNull();
    expect(onboardingButton.getAttribute('aria-pressed')).toBe('true');

    onboardingButton.click();

    await waitFor(() => expect(getActions).toHaveBeenLastCalledWith(
      'test-token',
      expect.objectContaining({ statut: '' }),
    ));
    expect(onboardingButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows exports for admins and offers them on the free-visits tab too', async () => {
    authState.userProfile = { role: 'ADMIN' };
    render(<ActionsPage />);
    await waitFor(() => expect(getActions).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: 'Exporter la table Actions en PDF' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Télécharger les Actions en Excel' })).toBeTruthy();
    screen.getByRole('button', { name: /Visites commerciales libres/ }).click();
    expect(await screen.findByRole('button', { name: 'Exporter les visites libres en PDF' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Télécharger les visites libres en Excel' })).toBeTruthy();
  });

  it('sends a compact business table to the Actions PDF export', async () => {
    authState.userProfile = { role: 'ADMIN' };
    render(<ActionsPage />);
    await waitFor(() => expect(getActions).toHaveBeenCalled());

    screen.getByRole('button', { name: 'Exporter la table Actions en PDF' }).click();

    expect(printObjectRows).toHaveBeenCalledWith([
      ['Médecin', 'Statut', 'Segment', 'Note', 'Action proposée', 'Décision', 'Variation CA', 'Variation cas', 'Silence', 'Urgence %', 'Intensité VACTIS', 'État', 'Date visite', 'Commercial'],
      ['Mehdi Ait Taleb', 'SURVEILLANCE', 'C (Standard)', '—', 'visite diagnostic', '—', '—', '—', '—', '17,81 %', 'ELEVE · Horizon 15j', 'PLANIFIEE', '30/10/2026', '—'],
    ], 'Actions VACTIS');
  });

  it('shows the synthesis title and detailed comment in the action view', async () => {
    render(<ActionsPage />);
    await waitFor(() => expect(getActions).toHaveBeenCalled());

    screen.getByRole('button', { name: 'Ouvrir' }).click();

    expect(await screen.findByText('Signal d’alerte précoce à surveiller')).toBeTruthy();
    expect(screen.getByText('Baisse modérée observée. Objectif de visite : diagnostiquer.')).toBeTruthy();
    expect(screen.getByText('0 MAD')).toBeTruthy();
    expect(screen.getByText('0 cas')).toBeTruthy();
  });
});
