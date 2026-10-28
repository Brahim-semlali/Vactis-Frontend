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
