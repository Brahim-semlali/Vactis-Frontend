// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FicheContextuelleDrawer from './FicheContextuelleDrawer.jsx';
import { getFicheContextuelleApi } from '../../api/actions.js';

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ userProfile: { role: 'ADMIN' } }),
}));

vi.mock('../../api/actions.js', () => ({
  getFicheContextuelleApi: vi.fn(),
}));

const { getFiche360, telechargerFiche360Pdf } = vi.hoisted(() => ({
  getFiche360: vi.fn(),
  telechargerFiche360Pdf: vi.fn(),
}));
vi.mock('../../api/medecins.js', () => ({ getFiche360, telechargerFiche360Pdf }));

const fiche360 = {
  identite: { nomComplet: 'RAHMANI Youssef', commercialReferent: 'Commercial 1' },
  indicateurs: { ca12Mois: 90000, dossiers12Mois: 90, visites: 4, visitesRealisees: 4, actions: 2, actionsOuvertes: 1, reclamations: 2, reclamationsOuvertes: 1 },
  mois: [{ mois: '2025-12', ca: 1000, dossiers: 2, statut: 'surveillance', visites: 0 }, { mois: '2026-01', ca: 2000, dossiers: 3, statut: 'actif_stable', visites: 1 }],
  evenements: [
    { type: 'STATUT', date: '2026-01-01', titre: 'Statut : Surveillance → Actif stable', tonalite: 'POSITIF' },
    { type: 'VISITE', date: '2025-12-05', titre: 'Visite hors VACTIS', detail: 'Défavorable · obstacle : délais', commercial: 'Commercial 2', tonalite: 'NEGATIF', referenceId: 101 },
  ],
  obstacles: { Délais: 2 },
  commerciaux: [{ commercial: 'Commercial 1', visites: 3, appuis: 0, derniereVisite: '2026-01-10' }],
  reclamations: [
    { id: 91, categorie: 'Autre', statut: 'Traitée', ouverte: false, dateDeclaration: '2025-12-06', solution: 'Circuit express' },
    { id: 92, categorie: 'Délais des résultats', statut: 'À traiter', ouverte: true, dateDeclaration: '2026-01-20' },
  ],
};

describe('FicheContextuelleDrawer fiche 360°', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFicheContextuelleApi).mockResolvedValue({ medecin: { nom: 'RAHMANI', prenom: 'Youssef' }, historiqueVisites: [] });
    getFiche360.mockResolvedValue(fiche360);
  });
  afterEach(() => cleanup());

  it('charge l’historique 360° seulement à l’ouverture de son onglet', async () => {
    render(<FicheContextuelleDrawer medecinId={42} token="token" isOpen onClose={vi.fn()} />);
    await screen.findByText('RAHMANI Youssef');
    expect(getFiche360).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Historique 360°' }));

    const frise = await screen.findByRole('region', { name: 'Frise chronologique' });
    expect(getFiche360).toHaveBeenCalledWith('token', 42);
    expect(within(frise).getByText('Statut : Surveillance → Actif stable')).toBeTruthy();
    expect(within(frise).getByText('janvier 2026')).toBeTruthy();
    fireEvent.change(within(frise).getByLabelText("Type d'événement"), { target: { value: 'VISITE' } });
    expect(within(frise).queryByText('Statut : Surveillance → Actif stable')).toBeNull();
    expect(screen.getByText('Délais × 2')).toBeTruthy();
  });

  it('liste les réclamations, ouvertes en premier', async () => {
    render(<FicheContextuelleDrawer medecinId={42} token="token" isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Réclamations' }));

    const liste = await screen.findByRole('region', { name: 'Réclamations du médecin' });
    const titres = within(liste).getAllByText(/^Réclamation #/).map((n) => n.textContent);
    expect(titres).toEqual(['Réclamation #92 · Délais des résultats', 'Réclamation #91 · Autre']);
    expect(within(liste).getByText('Circuit express')).toBeTruthy();
  });

  it('télécharge le PDF complet et signale une erreur', async () => {
    telechargerFiche360Pdf.mockResolvedValueOnce().mockRejectedValueOnce(new Error('Serveur indisponible'));
    render(<FicheContextuelleDrawer medecinId={42} token="token" isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Télécharger PDF/ }));
    await waitFor(() => expect(telechargerFiche360Pdf).toHaveBeenCalledWith('token', 42));

    fireEvent.click(screen.getByRole('button', { name: /Télécharger PDF/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Serveur indisponible');
  });
});

describe('FicheContextuelleDrawer indicators', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('shows numeric why-values for the September reference example', async () => {
    vi.mocked(getFicheContextuelleApi).mockResolvedValue({
      medecin: {
        nom: 'RAHMANI',
        prenom: 'Youssef',
        statut: 'RETENTION',
        dateReferenceIndicateurs: '2026-09-30',
        caMoisAnalyse: 760,
        casMoisAnalyse: 1,
        referenceCa: 3556.6667,
        referenceCas: 4,
        variationCa: -78.63,
        variationCas: -75,
        variationMixteSur100: -77.18,
        joursSansActivite: 22,
        dateDerniereActiviteCalcul: '2026-09-08',
        intervalleEffectif: 12.71,
        sourceRythme: 'RECENT',
        scoreSilence: 34.61,
        classeSilence: 'AUCUNE_RUPTURE',
        urgenceBrute: 66.7,
        scoreUrgence: 38.17,
        perteCa: 2796.67,
        seuilImpact: 8181.43,
        facteurMaterialite: 0.57,
        baisseReference: 77.18,
        baisseCourte: 56.97,
        scoreRisque: 41.76,
        nombreMoisReference: 3,
      },
      commentaireMoteurTitre: 'Risque commercial majeur — Protocole Rétention',
      commentaireMoteurDetail: 'Baisse d’activité. Objectif de visite : diagnostiquer.',
      historiqueVisites: [],
      frequenceJours: 10,
    });

    render(<FicheContextuelleDrawer medecinId={42} token="token" isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(getFicheContextuelleApi).toHaveBeenCalledWith('token', 42));
    fireEvent.click(await screen.findByText('Pourquoi ces valeurs ?'));

    const panel = screen.getByText('Pourquoi ces valeurs ?').parentElement;
    const detail = within(panel);
    expect(detail.getByText(/Référence CA = moyenne des 3 mois disponibles/)).toBeTruthy();
    expect(detail.getByText(/Variation CA =/)).toBeTruthy();
    expect(detail.getByText(/Silence = min\(100/)).toBeTruthy();
    expect(detail.getByText(/Urgence finale = urgence brute/)).toBeTruthy();
    expect(detail.getByText('−78,63 %')).toBeTruthy();
    expect(detail.getByText('34,61 %')).toBeTruthy();
    expect(screen.getAllByText('Risque commercial majeur — Protocole Rétention')).toHaveLength(2);
  });

  it('shows unavailable inactivity duration when the backend has no date evidence', async () => {
    vi.mocked(getFicheContextuelleApi).mockResolvedValue({
      medecin: { nom: 'TEST', statut: 'INACTIF' },
      commentaireMoteurTitre: 'Statut inactif à vérifier',
      commentaireMoteurDetail: 'La durée sans activité n’est pas disponible.',
      historiqueVisites: [],
      joursSansActivite: null,
      frequenceJours: 10,
      silenceRadioStatus: 'DONNÉES INDISPONIBLES',
    });

    render(<FicheContextuelleDrawer medecinId={43} token="token" isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(getFicheContextuelleApi).toHaveBeenCalledWith('token', 43));

    expect(await screen.findByText('Données indisponibles')).toBeTruthy();
    expect(screen.queryByText('null jours sans activité détectée')).toBeNull();
  });
});
