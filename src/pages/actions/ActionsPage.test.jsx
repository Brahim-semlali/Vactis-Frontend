// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActionsPage from './ActionsPage.jsx';

const { authState, getActions, getVisitesLibresApi, printObjectRows } = vi.hoisted(() => ({
  authState: { userProfile: { role: 'USER' } },
  getActions: vi.fn(),
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
vi.mock('../../api/medecins.js', () => ({ getMedecinEvolution: vi.fn(), getMedecins: vi.fn() }));
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
    getVisitesLibresApi.mockResolvedValue([]);
  });

  it('hides both export controls for non-admins', async () => {
    render(<ActionsPage />);
    await waitFor(() => expect(getActions).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: 'Exporter la table Actions en PDF' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Télécharger les Actions en Excel' })).toBeNull();
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
      ['Médecin', 'Statut', 'Segment', 'Action proposée', 'Décision', 'Urgence', 'État', 'Date visite', 'Commercial'],
      ['Mehdi Ait Taleb', 'SURVEILLANCE', 'C', 'visite diagnostic', '—', 'ELEVE', 'PLANIFIEE', '30/10/2026', '—'],
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
