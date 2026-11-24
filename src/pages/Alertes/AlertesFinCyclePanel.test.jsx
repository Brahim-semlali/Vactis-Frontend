// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AlertesFinCyclePanel from './AlertesFinCyclePanel.jsx';
import EncartClotureCycle from '../../components/alertes/EncartClotureCycle.jsx';

const { etat } = vi.hoisted(() => ({ etat: { donnees: null } }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 't' }) }));
vi.mock('../../components/alertes/useAlertesFinCycle.js', () => ({
  default: () => ({ donnees: etat.donnees, chargement: false, erreur: null, recharger: vi.fn() }),
}));
vi.mock('../../components/medecins/FicheContextuelleDrawer.jsx', () => ({
  default: ({ isOpen, medecinId }) => (isOpen ? <div data-testid="fiche">fiche {medecinId}</div> : null),
}));

const reponseEquipe = {
  cycle: '2026-11',
  joursRestants: 2,
  fenetreActive: true,
  urgent: true,
  vueEquipe: true,
  seuilRealisation: 60,
  alertes: [
    { type: 'ACTION_NON_VISITEE', gravite: 'URGENT', actionId: 11, medecinId: 2, medecinNom: 'BENNANI', commercial: 'Commercial 1', libelle: 'Action non visitée', detail: 'Visite reconnaissance', date: '2026-11-20' },
    { type: 'RECLAMATION_EN_ATTENTE', gravite: 'ATTENTION', reclamationId: 200, medecinId: 1, medecinNom: 'ALAOUI', commercial: 'Commercial 2', libelle: 'Réclamation en attente', detail: 'Ouverte depuis 10 jours', date: '2026-11-14' },
    { type: 'REALISATION_FAIBLE', gravite: 'URGENT', commercial: 'Commercial 1', libelle: 'Réalisation faible', detail: '1 / 2 actions visitées (50 %)' },
  ],
  parCommercial: [
    { commercial: 'Commercial 1', actionsDuCycle: 2, actionsVisitees: 1, actionsNonVisitees: 1, tauxRealisation: 50, retoursAQualifier: 1, reclamationsEnAttente: 0 },
    { commercial: 'Commercial 2', actionsDuCycle: 4, actionsVisitees: 4, actionsNonVisitees: 0, tauxRealisation: 100, retoursAQualifier: 0, reclamationsEnAttente: 1 },
  ],
};

describe('AlertesFinCyclePanel', () => {
  afterEach(() => {
    cleanup();
    etat.donnees = null;
  });

  it('présente l’échéance, l’avancement par commercial et la liste des alertes', () => {
    etat.donnees = reponseEquipe;
    const navigate = vi.fn();
    render(<AlertesFinCyclePanel navigate={navigate} />);

    expect(screen.getByText(/Clôture du cycle novembre 2026 dans 2 jours/)).toBeTruthy();
    const avancement = screen.getByRole('region', { name: 'Avancement par commercial' });
    expect(within(avancement).getByText('50 %')).toBeTruthy();

    const liste = screen.getByRole('region', { name: 'Liste des alertes de fin de cycle' });
    expect(within(liste).getByText('3 alertes')).toBeTruthy();

    fireEvent.change(within(liste).getByLabelText('Gravité'), { target: { value: 'ATTENTION' } });
    expect(within(liste).getByText('1 alerte')).toBeTruthy();
    expect(within(liste).queryByText('BENNANI')).toBeNull();

    fireEvent.click(within(liste).getByRole('button', { name: 'ALAOUI' }));
    expect(screen.getByTestId('fiche').textContent).toBe('fiche 1');

    fireEvent.click(within(liste).getByRole('button', { name: 'Traiter' }));
    expect(navigate).toHaveBeenCalledWith('/reclamations');
  });

  it('indique pour un commercial que la cloche s’activera à J-7', () => {
    etat.donnees = { cycle: '2026-11', joursRestants: 12, fenetreActive: false, vueEquipe: false, fenetreJours: 7, alertes: [], parCommercial: [] };
    render(<AlertesFinCyclePanel />);

    expect(screen.getByText(/remonteront dans la cloche à partir de J-7/)).toBeTruthy();
    expect(screen.getByText('Rien en suspens pour ce cycle.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Avancement par commercial' })).toBeNull();
  });
});

describe('EncartClotureCycle', () => {
  afterEach(() => {
    cleanup();
    etat.donnees = null;
  });

  it('résume les risques de clôture et renvoie vers les alertes', () => {
    etat.donnees = reponseEquipe;
    const navigate = vi.fn();
    render(<EncartClotureCycle navigate={navigate} />);

    const encart = screen.getByRole('region', { name: 'Risques de clôture' });
    expect(within(encart).getByText('J-2')).toBeTruthy();
    expect(within(encart).getByText('1 / 2 · 50 %')).toBeTruthy();
    expect(within(encart).getByText('1 retour(s) à qualifier')).toBeTruthy();

    fireEvent.click(within(encart).getByRole('button', { name: 'Voir les alertes' }));
    expect(navigate).toHaveBeenCalledWith('/alertes-fin-cycle');
  });

  it('ne s’affiche pas sans cycle chargé', () => {
    etat.donnees = { cycle: null, alertes: [] };
    const { container } = render(<EncartClotureCycle />);
    expect(container.innerHTML).toBe('');
  });
});
