// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardDirectionPage from './DashboardDirectionPage.jsx';

const { getDashboardDirection, getMoisDisponibles } = vi.hoisted(() => ({
  getDashboardDirection: vi.fn(),
  getMoisDisponibles: vi.fn(),
}));

// jsdom ne fournit pas ces API navigateur, utilisées par les animations (whileInView) et le graphique.
class IntersectionObserverStub {
  constructor(callback) { this.callback = callback; }
  observe(target) { this.callback([{ isIntersecting: true, intersectionRatio: 1, target }], this); }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver ??= IntersectionObserverStub;
globalThis.ResizeObserver ??= ResizeObserverStub;

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userProfile: { role: 'ADMIN' } }),
}));
const { finCycleMock } = vi.hoisted(() => ({ finCycleMock: { donnees: null } }));
vi.mock('../../components/alertes/useAlertesFinCycle.js', () => ({
  default: () => ({ donnees: finCycleMock.donnees, chargement: false, erreur: null, recharger: () => {} }),
}));
vi.mock('../../api/direction.js', () => ({ getDashboardDirection }));
vi.mock('../../api/activite.js', () => ({ getMoisDisponibles }));

function dashboard(overrides = {}) {
  return {
    mois: '2026-10',
    trajectoire: {
      caMois: 528570, casMois: 739, caPortefeuilleMois: 511380, caNonAffecteMois: 17190,
      objectifDefini: true, objectifMois: 600000, ecartObjectifMois: -71430, tauxAtteinteMois: 88.1,
      caMoisNMoins1: 500000, evolutionMoisNMoins1Pct: 5.7, caCumule: 5000000,
      objectifCumuleProratise: 6000000, ecartObjectifCumule: -1000000, caCumuleNMoins1: 4500000,
      evolutionCumuleNMoins1Pct: 11.1, objectifAnnuel: 7200000, projectionAnnuelle: 6000000,
      statutTrajectoire: 'RETARD IMPORTANT',
      tendance: [{ mois: '2026-10', ca: 528570, cas: 739, caNMoins1: 500000 }],
    },
    portefeuille: {
      totalMedecins: 1, totalCaReference: 20000,
      segments: [
        { segment: 'A', retention: { nombre: 1, caReference: 20000 }, silence: { nombre: 0, caReference: 0 }, surveillance: { nombre: 0, caReference: 0 } },
        { segment: 'B', retention: { nombre: 0, caReference: 0 }, silence: { nombre: 0, caReference: 0 }, surveillance: { nombre: 0, caReference: 0 } },
      ],
      prioritaires: [{ id: 1, nom: 'ENNOUR Mhammed', specialite: 'Chirurgie', segment: 'A', situation: 'RETENTION', caReference: 20000, joursSansActivite: 45 }],
    },
    execution: {
      cycle: '2026-10', actionsDuCycle: 248, actionsPlanifiees: 100, visitesVactisRealisees: 120,
      visitesVactisNonRealisees: 8, actionsSansRetour: 120, actionsEnRetard: 12, tauxRealisation: 48.4,
      visitesLibresRealisees: 15, reclamationsOuvertes: 3, reclamationsEcheanceDepassee: 1, reclamationsSansEcheance: 2,
    },
    sujets: [{ niveau: 'CRITIQUE', titre: 'Retard sur l’objectif cumulé', detail: '1 000 000 MAD sous l’objectif.', lien: '/bridge-to-goal' }],
    ...overrides,
  };
}

describe('DashboardDirectionPage', () => {
  beforeEach(() => {
    getMoisDisponibles.mockResolvedValue(['2026-09', '2026-10']);
    getDashboardDirection.mockResolvedValue(dashboard());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche les 4 blocs et distingue actions planifiées et visites réalisées', async () => {
    render(<DashboardDirectionPage navigate={vi.fn()} />);

    expect(await screen.findByText('Résultat et trajectoire')).toBeTruthy();
    expect(screen.getByText('Portefeuille à arbitrer')).toBeTruthy();
    expect(screen.getByText('Exécution commerciale')).toBeTruthy();
    expect(screen.getByText('Sujets à arbitrer')).toBeTruthy();
    expect(screen.getByText('Retard important')).toBeTruthy();
    expect(screen.getByText('Visites VACTIS réalisées')).toBeTruthy();
    expect(screen.getByText('Visites libres réalisées')).toBeTruthy();
    expect(screen.getByText('ENNOUR Mhammed')).toBeTruthy();
    expect(getDashboardDirection).toHaveBeenCalledWith('test-token', expect.objectContaining({ mois: '2026-10' }));
  });

  it('ouvre la page de détail depuis un sujet à arbitrer', async () => {
    const navigate = vi.fn();
    render(<DashboardDirectionPage navigate={navigate} />);

    await screen.findByText('Retard sur l’objectif cumulé');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(navigate).toHaveBeenCalledWith('/bridge-to-goal');
  });

  it('reste lisible quand aucun objectif n’est paramétré', async () => {
    const data = dashboard();
    data.trajectoire = { ...data.trajectoire, objectifDefini: false, objectifMois: null, ecartObjectifMois: null, statutTrajectoire: 'OBJECTIF_NON_DEFINI' };
    getDashboardDirection.mockResolvedValue(data);

    render(<DashboardDirectionPage navigate={vi.fn()} />);

    expect(await screen.findByText('Non paramétré')).toBeTruthy();
    expect(screen.getAllByText('Objectif non paramétré').length).toBeGreaterThan(0);
  });

  it('affiche une erreur si l’API échoue', async () => {
    getDashboardDirection.mockRejectedValue(new Error('Accès refusé'));

    render(<DashboardDirectionPage navigate={vi.fn()} />);

    expect((await screen.findByRole('alert')).textContent).toContain('Accès refusé');
  });
});
