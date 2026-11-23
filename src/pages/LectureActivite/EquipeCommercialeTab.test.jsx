// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EquipeCommercialeTab from './EquipeCommercialeTab.jsx';

const { getEquipeCommerciale } = vi.hoisted(() => ({ getEquipeCommerciale: vi.fn() }));
vi.mock('../../api/activite.js', () => ({ getEquipeCommerciale }));

const ligne = (commercial, valeurs) => ({
  commercial, passagesSaisis: 0, passagesPrincipaux: 0, participationsAppui: 0, visitesVactis: 0, horsVactis: 0,
  services: 0, echanges: 0, medecinsEnEchange: 0, prospects: 0, retoursQualifies: 0, retoursFavorables: 0,
  refusOuReclamations: 0, progressions: 0, comparables: 0, baisses: 0, relais: 0, ...valeurs,
});

const reponse = {
  commercial: null,
  moisDisponibles: ['2026-11', '2026-10'],
  commerciaux: ['Commercial 1', 'Commercial 3'],
  synthese: {
    passagesSaisis: 48, passagesRealises: 40, tauxRealisation: 83.3, visitesVactis: 28, horsVactis: 12,
    passagesService: 6, echangesCommerciaux: 34, medecinsEnEchange: 15, prospects: 3, relais: 3, participationsAppui: 1,
  },
  parCommercial: [
    ligne('Commercial 1', { passagesPrincipaux: 9, retoursQualifies: 8, echanges: 9, progressions: 1, comparables: 3 }),
    ligne('Commercial 3', { passagesPrincipaux: 9, participationsAppui: 1, retoursQualifies: 6, echanges: 6 }),
  ],
  qualifications: { FAVORABLE: 7, NEUTRE: 8, DEFAVORABLE: 7, RECLAMATION: 7, CONGE_ABSENCE: 0, NON_RENSEIGNE: 5 },
  evolutions: { FAVORABLE: 7, STABLE: 9, DEFAVORABLE: 2, NON_OBSERVABLE: 10 },
  visites: [
    {
      retourTerrainId: 1, dateVisite: '2026-10-05', medecinId: 1, medecinNom: 'Dr BIO-P06', commercial: 'Commercial 1',
      vactis: true, service: false, prospect: false, realisee: true, qualification: 'RECLAMATION', reclamation: true,
      statutAvant: 'surveillance', statutApres: 'actif_stable', evolution: 'FAVORABLE', commentaire: 'Délais trop longs',
    },
    {
      retourTerrainId: 2, dateVisite: '2026-10-06', medecinId: 2, medecinNom: 'Dr NOUVEAU', commercial: 'Commercial 3',
      vactis: false, service: false, prospect: true, realisee: true, qualification: 'NEUTRE', reclamation: false,
    },
  ],
  decisions: {
    cycleActif: '2026-11',
    actionsSansVisite: [{ actionId: 9, medecinNom: 'Dr Imane CHRAIBI', actionRecommandee: 'visite_reconnaissance', commercial: 'Commercial 1' }],
    refusOuReclamations: 14, baissesObservees: 2, retoursACompleter: 5,
  },
  avertissement: 'Observation, pas causalité.',
};

describe('EquipeCommercialeTab', () => {
  beforeEach(() => {
    getEquipeCommerciale.mockResolvedValue(reponse);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche le terrain parcouru, la répartition et les suites à donner', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const terrain = await screen.findByRole('region', { name: /travail confié/i });
    expect(within(terrain).getByText('48 saisis · 83 % réalisés')).toBeTruthy();
    expect(within(terrain).getByText('6 passage(s) de service')).toBeTruthy();

    const decisions = screen.getByRole('region', { name: /décisions et suites/i });
    expect(within(decisions).getByText(/Dr Imane CHRAIBI/)).toBeTruthy();
    expect(within(decisions).getByText(/Examiner les 3 relais/)).toBeTruthy();
    expect(getEquipeCommerciale).toHaveBeenCalledWith('t', { debut: null, fin: null, commercial: '' });
  });

  it('recharge la vue individuelle quand un commercial est choisi', async () => {
    render(<EquipeCommercialeTab token="t" />);
    const terrain = await screen.findByRole('region', { name: /travail confié/i });

    fireEvent.change(within(terrain).getByLabelText('Commercial'), { target: { value: 'Commercial 3' } });

    await waitFor(() => expect(getEquipeCommerciale).toHaveBeenCalledWith('t', { debut: null, fin: null, commercial: 'Commercial 3' }));
  });

  it('compare deux commerciaux sur la même période', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const comparaison = await screen.findByRole('region', { name: /comparer deux commerciaux/i });
    await waitFor(() => expect(getEquipeCommerciale).toHaveBeenCalledWith('t', { debut: '2026-10-01', fin: '2026-11-30' }));
    const ligneQualifies = within(comparaison).getByText('Retours qualifiés / échanges').closest('tr');
    expect(within(ligneQualifies).getByText('8 / 9')).toBeTruthy();
    expect(within(ligneQualifies).getByText('6 / 6')).toBeTruthy();
  });

  it('filtre le détail et déplie les réclamations collectées', async () => {
    render(<EquipeCommercialeTab token="t" />);
    const detail = await screen.findByRole('region', { name: /lecture détaillée/i });

    expect(within(detail).getByText('Prospect')).toBeTruthy();
    expect(within(detail).getByText('Surveillance → Actif stable')).toBeTruthy();
    fireEvent.change(within(detail).getByLabelText('Nature du passage'), { target: { value: 'VACTIS' } });
    expect(within(detail).queryByText('Dr NOUVEAU')).toBeNull();

    fireEvent.click(within(detail).getByRole('button', { expanded: false }));
    expect(within(detail).getAllByText('Délais trop longs').length).toBeGreaterThan(1);
  });
});
