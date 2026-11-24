// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EquipeCommercialeTab from './EquipeCommercialeTab.jsx';

const { getEquipeCommerciale } = vi.hoisted(() => ({ getEquipeCommerciale: vi.fn() }));
vi.mock('../../api/activite.js', () => ({ getEquipeCommerciale }));
vi.mock('../../components/medecins/FicheContextuelleDrawer.jsx', () => ({
  default: ({ isOpen, medecinId }) => (isOpen ? <div data-testid="fiche-medecin">fiche {medecinId}</div> : null),
}));

const ligne = (commercial, valeurs) => ({
  commercial, visitesSeul: 0, visitesCommunes: 0, vactisSeul: 0, horsVactisSeul: 0, servicesSeul: 0, echangesSeul: 0,
  medecinsEnEchangeSeul: 0, prospectsSeul: 0, retoursQualifiesSeul: 0, retoursFavorablesSeul: 0, refusSeul: 0,
  progressionsSeul: 0, stablesSeul: 0, baissesSeul: 0, comparablesSeul: 0, echangesCommuns: 0, retoursFavorablesCommuns: 0,
  ...valeurs,
});

const evolution = (id, medecinNom, avant, apres, commercial, qualification, appui = null) => ({
  retourTerrainId: id, medecinId: id, medecinNom, dateVisite: '2026-06-22', statutAvant: avant, statutApres: apres,
  commercial, commercialAppui: appui, qualification,
});

const reponse = {
  commercial: null,
  moisDisponibles: ['2026-11', '2026-10'],
  commerciaux: ['Mouad', 'Khalid'],
  synthese: {
    passagesSaisis: 1042, passagesRealises: 1027, tauxRealisation: 98.6, visitesVactis: 313, horsVactis: 714,
    passagesService: 363, echangesCommerciaux: 664, medecinsEnEchange: 167, prospects: 58, visitesCommunes: 90, participationsAppui: 0,
  },
  parCommercial: [
    ligne('Mouad', { visitesSeul: 469, visitesCommunes: 90, echangesSeul: 387, retoursFavorablesSeul: 209, progressionsSeul: 38, stablesSeul: 42, baissesSeul: 78, comparablesSeul: 158 }),
    ligne('Khalid', { visitesSeul: 468, visitesCommunes: 90, echangesSeul: 190, retoursFavorablesSeul: 95 }),
  ],
  qualifications: { FAVORABLE: 300, NEUTRE: 40, DEFAVORABLE: 6, RECLAMATION: 4, CONGE_ABSENCE: 0, NON_RENSEIGNE: 308 },
  evolutions: { FAVORABLE: 70, STABLE: 53, DEFAVORABLE: 163, NON_OBSERVABLE: 27 },
  rapportBaisses: {
    baisses: 163, comparables: 286, medecinsEnBaisse: 117, medecinsBaissesRepetees: 43, favorablesMalgreBaisse: 132,
    transitionsFrequentes: [{ statutAvant: 'progression', statutApres: 'activite_irreguliere', nombre: 25 }],
    progressions: [evolution(1, 'BENASSER FINECH', 'retention', 'progression', 'Khalid', 'FAVORABLE')],
    baissesObservees: [evolution(2, 'ROCHD Sara', 'progression', 'activite_irreguliere', 'Khalid', 'FAVORABLE', 'Mouad')],
  },
  datesEcartees: [{ retourTerrainId: 9, medecinNom: 'Dr X', commercial: 'Mouad', dateVisite: '2031-01-01', motif: 'Date de visite dans le futur' }],
  visites: [
    {
      retourTerrainId: 1, dateVisite: '2026-10-05', medecinId: 1, medecinNom: 'Dr BIO-P06', commercial: 'Mouad', commercialAppui: 'Khalid',
      vactis: true, service: false, prospect: false, realisee: true, qualification: 'RECLAMATION', reclamation: true,
      statutAvant: 'surveillance', statutApres: 'actif_stable', evolution: 'FAVORABLE', commentaire: 'Délais trop longs',
    },
    {
      retourTerrainId: 2, dateVisite: '2026-10-06', medecinId: 2, medecinNom: 'Dr NOUVEAU', commercial: 'Khalid',
      vactis: false, service: false, prospect: true, realisee: true, qualification: 'NEUTRE', reclamation: false,
    },
  ],
  decisions: {
    cycleActif: '2026-11',
    actionsSansVisite: [{ actionId: 9, medecinNom: 'LAMMAT', actionRecommandee: 'visite_urgence_silence', commercial: 'Mouad' }],
    refusOuReclamations: 10, retoursDefavorables: 6, baissesObservees: 163, baissesMalgreFavorable: 132, retoursACompleter: 308,
  },
  avertissement: 'Observation, pas causalité.',
};

describe('EquipeCommercialeTab — lecture en quatre étapes', () => {
  beforeEach(() => {
    getEquipeCommerciale.mockResolvedValue(reponse);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('1 · présente l’origine de l’activité, les visites communes et les dates écartées', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const activite = await screen.findByRole('region', { name: /d’où vient l’activité/i });
    expect(within(activite).getByText('1042 saisis · 99 % réalisés')).toBeTruthy();
    expect(within(activite).getByText('363 passage(s) de service')).toBeTruthy();
    expect(within(activite).getByText('Visites communes')).toBeTruthy();
    expect(within(activite).getByText('Comptées une seule fois pour l’équipe')).toBeTruthy();
    expect(within(activite).getByText('1 date(s) incohérente(s) écartée(s)')).toBeTruthy();
    expect(within(activite).getByText(/Date de visite dans le futur/)).toBeTruthy();
    expect(getEquipeCommerciale).toHaveBeenCalledWith('t', { debut: null, fin: null, commercial: '' });
  });

  it('recharge la vue individuelle quand un commercial est choisi', async () => {
    render(<EquipeCommercialeTab token="t" />);
    const activite = await screen.findByRole('region', { name: /d’où vient l’activité/i });

    fireEvent.change(within(activite).getByLabelText('Commercial'), { target: { value: 'Khalid' } });

    await waitFor(() => expect(getEquipeCommerciale).toHaveBeenCalledWith('t', { debut: null, fin: null, commercial: 'Khalid' }));
  });

  it('2 · le tableau des contributions sépare visites seul et communes', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const tableau = await screen.findByRole('table', { name: 'Contributions par commercial' });
    const mouad = within(tableau).getByText('Mouad').closest('tr');
    expect(within(mouad).getByText('469')).toBeTruthy();
    expect(within(mouad).getByText('90')).toBeTruthy();
    expect(within(mouad).getByText('54 %')).toBeTruthy();
    expect(within(mouad).getByText('↑ 38 (24 %)')).toBeTruthy();
    expect(within(mouad).getByText('↓ 78 (49 %)')).toBeTruthy();
    expect(within(mouad).getByText('sur 158 transition(s) comparable(s)')).toBeTruthy();
    const khalid = within(tableau).getByText('Khalid').closest('tr');
    expect(within(khalid).getByText('Aucune transition comparable')).toBeTruthy();
  });

  it('2 · compare deux commerciaux sur la même période', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const comparaison = await screen.findByRole('region', { name: /comparer deux commerciaux/i });
    await waitFor(() => expect(getEquipeCommerciale).toHaveBeenCalledWith('t', { debut: '2026-10-01', fin: '2026-11-30' }));
    await within(comparaison).findByText('469 seul');
    const favorables = within(comparaison).getByText('Retours favorables / échanges seul').closest('tr');
    expect(within(favorables).getByText('209 / 387')).toBeTruthy();
    expect(within(favorables).getByText('95 / 190')).toBeTruthy();
  });

  it('3 · lit les baisses de façon équilibrée et ouvre la fiche du médecin', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const observation = await screen.findByRole('region', { name: /qu’observe-t-on/i });
    const lecture = within(observation).getByRole('note', { name: 'Lecture des baisses' });
    expect(lecture.textContent).toContain('163 baisse(s) de statut sur 286 transition(s) comparable(s) (57 %), concernant 117 médecin(s)');
    expect(lecture.textContent).toContain('43 médecin(s) présentent une baisse sur plusieurs mois');
    expect(lecture.textContent).toContain('132 retour(s) de visite favorable(s)');
    expect(lecture.textContent).toMatch(/Progression → .* \(25\)/);

    expect(within(observation).getByText('Khalid et Mouad · Favorable')).toBeTruthy();
    fireEvent.click(within(observation).getByRole('button', { name: 'ROCHD Sara' }));
    expect(screen.getByTestId('fiche-medecin').textContent).toBe('fiche 2');
  });

  it('4 · propose les décisions du prochain cycle', async () => {
    render(<EquipeCommercialeTab token="t" />);

    const decisions = await screen.findByRole('region', { name: /décisions et suites/i });
    expect(within(decisions).getByText('Baisses malgré retour favorable')).toBeTruthy();
    expect(within(decisions).getByText(/LAMMAT/)).toBeTruthy();
    expect(within(decisions).getByText(/Reprendre les 6 échange\(s\) défavorable\(s\)/)).toBeTruthy();
    expect(within(decisions).getByText(/en commençant par les 43 en baisse sur plusieurs mois/)).toBeTruthy();
  });

  it('la lecture détaillée filtre les passages et ouvre la fiche 360°', async () => {
    render(<EquipeCommercialeTab token="t" />);
    const detail = await screen.findByRole('group', { name: /lecture détaillée des passages/i });

    expect(within(detail).getByText('Prospect')).toBeTruthy();
    expect(within(detail).getByText('Mouad et Khalid')).toBeTruthy();
    fireEvent.change(within(detail).getByLabelText('Nature du passage'), { target: { value: 'VACTIS' } });
    expect(within(detail).queryByText('Dr NOUVEAU')).toBeNull();

    fireEvent.click(within(detail).getByRole('button', { name: 'Dr BIO-P06' }));
    expect(screen.getByTestId('fiche-medecin').textContent).toBe('fiche 1');

    fireEvent.click(within(detail).getByRole('button', { expanded: false }));
    expect(within(detail).getAllByText('Délais trop longs').length).toBeGreaterThan(1);
  });
});
