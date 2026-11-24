// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home.jsx';

// Contrôle d'accès aux pages côté interface : une page n'est affichée que si le menu du rôle la contient.

const { getMonMenu, etat, page } = vi.hoisted(() => ({
  getMonMenu: vi.fn(),
  etat: { route: '/', navigate: null, canAccessReclamations: null },
  page: (nom) => ({ default: () => <div data-testid="page">{nom}</div> }),
}));

vi.mock('../api/menu.js', () => ({ getMonMenu }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 't', username: 'commercial1' }) }));
vi.mock('../components/AppLayout.jsx', () => ({
  default: ({ children, canAccessReclamations }) => {
    etat.canAccessReclamations = canAccessReclamations;
    return children({ activeRoute: etat.route, navigate: etat.navigate });
  },
}));

vi.mock('./Medecins/MedecinsPage.jsx', () => page('Médecins'));
vi.mock('./Actions/ActionsPage.jsx', () => page('Actions'));
vi.mock('./Controle/Controle.jsx', () => page('Contrôle'));
vi.mock('./LectureActivite/LectureActivitePage.jsx', () => page('Lecture activité'));
vi.mock('./PlaceholderPage.jsx', () => page('Bientôt'));
vi.mock('./Administration/AdministrationPage.jsx', () => ({ default: ({ mode }) => <div data-testid="page">Administration {mode}</div> }));
vi.mock('./Administration/SettingsPage.jsx', () => page('Paramètres système'));
vi.mock('./UserSettings/UserSettingsPage.jsx', () => page('Mes paramètres'));
vi.mock('../components/VactisWorkflow.tsx', () => page('Accueil'));
vi.mock('./Alertes/AlertesPage.jsx', () => ({ default: ({ ongletInitial = 'silence' }) => <div data-testid="page">Alertes {ongletInitial}</div> }));
vi.mock('./Recommandations/RecommandationsPage.jsx', () => page('Recommandations'));
vi.mock('./BridgeToGoal/BridgeToGoalPage.jsx', () => page('Bridge to goal'));
vi.mock('./RapportCommercial/RapportCommercialPage.jsx', () => page('Rapport commercial'));
vi.mock('./ZoneIntelligence/ZoneIntelligencePage.jsx', () => page('Zone intelligence'));
vi.mock('./ReclamationsPage', () => page('Réclamations'));
vi.mock('./Administration/ImportExportExcelPage.jsx', () => page('Import / export'));
vi.mock('./DashboardDirection/DashboardDirectionPage.jsx', () => page('Dashboard direction'));
vi.mock('./SuiviEquipe/SuiviEquipePage.jsx', () => page('Suivi équipe'));

const menuCommercial = [
  { titre: 'Terrain', sousMenus: [{ route: '/actions' }, { route: '/medecins' }] },
  { titre: 'Analyse', sousMenus: [{ route: '/lecture-activite' }] },
];

function afficher(route) {
  etat.route = route;
  return render(<Home />);
}

describe('Home — accès aux pages selon le menu du rôle', () => {
  beforeEach(() => {
    etat.navigate = vi.fn();
    getMonMenu.mockResolvedValue(menuCommercial);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche une page présente dans le menu du rôle', async () => {
    afficher('/actions');
    expect((await screen.findByTestId('page')).textContent).toBe('Actions');
    expect(etat.navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['/users', 'gestion des utilisateurs'],
    ['/roles', 'gestion des rôles'],
    ['/dashboard-direction', 'tableau de bord direction'],
    ['/suivi-equipe', 'suivi équipe'],
    ['/import-export-excel', 'import des données'],
    ['/parametres-systeme', 'paramètres système'],
    ['/reclamations', 'réclamations'],
  ])('refuse %s (%s) hors du menu et redirige vers la première page autorisée', async (route) => {
    afficher(route);
    await waitFor(() => expect(etat.navigate).toHaveBeenCalledWith('/actions'));
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it.each([
    ['/alertes-hebdo', 'Alertes silence'],
    ['/alertes-fin-cycle', 'Alertes fin-cycle'],
    ['/recommandations', 'Recommandations'],
    ['/accueil', 'Accueil'],
    ['/parametres', 'Mes paramètres'],
  ])('%s reste accessible à tous les rôles', async (route, attendu) => {
    afficher(route);
    expect((await screen.findByTestId('page')).textContent).toBe(attendu);
    expect(etat.navigate).not.toHaveBeenCalled();
  });

  it('les pages d’administration s’ouvrent avec le bon mode quand le menu les autorise', async () => {
    getMonMenu.mockResolvedValue([{ sousMenus: [{ route: '/users' }, { route: '/roles' }] }]);
    afficher('/roles');
    expect((await screen.findByTestId('page')).textContent).toBe('Administration roles');
  });

  it('n’affiche rien tant que le menu n’est pas chargé', () => {
    getMonMenu.mockReturnValue(new Promise(() => {}));
    afficher('/actions');
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('si le menu ne se charge pas, seules les pages publiques restent accessibles', async () => {
    getMonMenu.mockRejectedValue(new Error('403'));
    afficher('/medecins');
    await waitFor(() => expect(etat.navigate).toHaveBeenCalledWith('/accueil'));
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('la cloche des réclamations n’est activée que si le menu contient /reclamations', async () => {
    afficher('/actions');
    await screen.findByTestId('page');
    expect(etat.canAccessReclamations).toBe(false);

    cleanup();
    getMonMenu.mockResolvedValue([{ sousMenus: [{ route: '/actions' }, { route: '/reclamations' }] }]);
    afficher('/actions');
    await screen.findByTestId('page');
    await waitFor(() => expect(etat.canAccessReclamations).toBe(true));
  });
});
