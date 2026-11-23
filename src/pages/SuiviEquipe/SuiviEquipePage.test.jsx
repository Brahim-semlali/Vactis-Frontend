// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuiviEquipePage from './SuiviEquipePage.jsx';

const { getSuiviCommerciaux, getSuiviVisites, getSuiviReclamations, getEvolutionMedecin } = vi.hoisted(() => ({
  getSuiviCommerciaux: vi.fn(),
  getSuiviVisites: vi.fn(),
  getSuiviReclamations: vi.fn(),
  getEvolutionMedecin: vi.fn(),
}));

// jsdom ne fournit pas ResizeObserver, utilisé par le graphique du panneau d'évolution.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userProfile: { role: 'ADMIN' } }),
}));
vi.mock('../../api/direction.js', () => ({
  getSuiviCommerciaux, getSuiviVisites, getSuiviReclamations, getEvolutionMedecin,
}));

const commercial = {
  commercial: 'Mouad', actionsPrevues: 10, actionsEnRetard: 2, visitesRealisees: 7, visitesNonRealisees: 1,
  visitesVactis: 5, visitesLibres: 2, qualificationsFavorables: 4, qualificationsDefavorables: 1,
  qualificationsNeutres: 1, qualificationsNonRenseignees: 1, medecinsVisites: 6,
  reclamationsDeclarees: 1, reclamationsOuvertes: 1, derniereVisite: '2026-10-20',
};

const visite = {
  id: 11, dateVisite: '2026-10-20', commercial: 'Mouad', medecinId: 7, medecinNom: 'ENNOUR Mhammed',
  typeVisite: 'FIDELISATION', vactis: true, statutVisite: 'REALISEE', qualification: 'FAVORABLE',
  commentaire: 'Médecin satisfait des délais.', reclamation: false, visiteRepetee: true,
};

const reclamation = {
  id: 3, dateDeclaration: '2026-10-07', medecinId: 7, medecinNom: 'ENNOUR Mhammed', commercial: 'Mouad',
  categorie: 'DELAIS_RESULTATS', priorite: 'HAUTE', statut: 'EN_COURS', ouverte: true,
  responsable: 'Direction', dateEcheance: '2026-10-15', enRetard: true, description: 'Résultats en retard',
};

describe('SuiviEquipePage', () => {
  beforeEach(() => {
    getSuiviCommerciaux.mockResolvedValue([commercial]);
    getSuiviVisites.mockResolvedValue([visite]);
    getSuiviReclamations.mockResolvedValue([reclamation]);
    getEvolutionMedecin.mockResolvedValue({
      medecinId: 7, medecinNom: 'ENNOUR Mhammed', segment: 'A', statutActuel: 'ACTIF_STABLE', dernierMoisDisponible: '2026-10',
      avertissement: 'Une évolution observée après une visite ne prouve pas que la visite en est la cause.',
      visites: [visite],
      mois: [{ mois: '2026-10', ca: 3000, cas: 5, statut: 'stable', visites: 1 }],
      comparaisons: [{
        visiteId: 11, dateVisite: '2026-10-20', commercial: 'Mouad', qualification: 'FAVORABLE',
        caMoyenAvant: 1000, caMoyenApres: null, moisAvantDisponibles: 3, moisApresDisponibles: 0,
        tendance: 'NON_OBSERVABLE', donneesInsuffisantes: true, visitesRepetees: false,
      }],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche la synthèse par commercial et l’historique des visites', async () => {
    render(<SuiviEquipePage />);

    expect(await screen.findByRole('button', { name: 'Mouad' })).toBeTruthy();
    expect(await screen.findByText('Médecin satisfait des délais.')).toBeTruthy();
    expect(screen.getByText('VACTIS')).toBeTruthy();
    expect(screen.getByText('Répétée')).toBeTruthy();
  });

  it('filtre l’historique sur le commercial sélectionné', async () => {
    render(<SuiviEquipePage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mouad' }));

    await waitFor(() => expect(getSuiviVisites).toHaveBeenLastCalledWith('test-token', expect.objectContaining({ commercial: 'Mouad' })));
    expect(screen.getByText('Historique de Mouad')).toBeTruthy();
  });

  it('affiche le responsable et l’échéance des réclamations', async () => {
    render(<SuiviEquipePage />);

    fireEvent.click(await screen.findByRole('tab', { name: /Réclamations/ }));

    // Le contenu de l'onglet apparaît après l'animation de transition
    expect(await screen.findByText('Direction')).toBeTruthy();
    expect(screen.getByText('15/10/2026')).toBeTruthy();
    expect(screen.getByText('En retard')).toBeTruthy();
  });

  it('ouvre l’évolution du médecin avec l’avertissement de causalité', async () => {
    render(<SuiviEquipePage />);

    const liens = await screen.findAllByRole('button', { name: 'ENNOUR Mhammed' });
    fireEvent.click(liens[0]);

    expect(await screen.findByRole('dialog', { name: 'Évolution du médecin' })).toBeTruthy();
    expect(screen.getByText(/ne prouve pas que la visite en est la cause/)).toBeTruthy();
    expect(screen.getByText('Données insuffisantes')).toBeTruthy();
    expect(getEvolutionMedecin).toHaveBeenCalledWith('test-token', 7);
  });
});
