// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar.jsx';

// Le menu latéral n'affiche que les sections et pages du rôle connecté (réponse de /api/menu/mon-menu).

const { getMonMenu, logout } = vi.hoisted(() => ({ getMonMenu: vi.fn(), logout: vi.fn() }));
vi.mock('../api/menu.js', () => ({ getMonMenu }));
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 't', username: 'commercial1', userProfile: { firstName: 'Karim', lastName: 'B.', role: 'COMMERCIALE' }, logout }),
}));
vi.mock('../context/ThemeContext.jsx', () => ({ useTheme: () => ({ isDark: false }) }));
vi.mock('./AuthLayout.jsx', () => ({ showcaseLogo: 'logo.png' }));

const menuCommercial = [
  {
    idMenuPrinc: 1, nom: 'Terrain & Actions', icone: 'actions',
    sousMenus: [
      { idMenu: 11, label: 'Actions', route: '/actions' },
      { idMenu: 12, label: 'Alertes hebdo', route: '/alertes-hebdo' },
    ],
  },
  { idMenuPrinc: 2, nom: 'Portefeuille', icone: 'medecins', sousMenus: [{ idMenu: 21, label: 'Médecins', route: '/medecins' }] },
];

function afficher(props = {}) {
  return render(<Sidebar activeRoute="/actions" onNavigate={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} {...props} />);
}

describe('Sidebar — menu selon le rôle', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    getMonMenu.mockResolvedValue(menuCommercial);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche uniquement les sections du rôle et ouvre celle de la page courante', async () => {
    afficher();

    expect(await screen.findByText('Terrain & Actions')).toBeTruthy();
    expect(screen.getByText('Portefeuille')).toBeTruthy();
    expect(screen.queryByText('Administration')).toBeNull();
    expect(screen.queryByText('Dashboard direction')).toBeNull();
    await waitFor(() => expect(screen.getByText('Actions').closest('button').className).toContain('menu-subitem-active'));
  });

  it('naviguer vers une page du menu', async () => {
    const onNavigate = vi.fn();
    afficher({ onNavigate });

    fireEvent.click(await screen.findByText('Portefeuille'));
    fireEvent.click(await screen.findByText('Médecins'));

    expect(onNavigate).toHaveBeenCalledWith('/medecins');
  });

  it('l’onglet fin de cycle des alertes garde l’entrée « Alertes hebdo » active', async () => {
    afficher({ activeRoute: '/alertes-fin-cycle' });
    await waitFor(() => expect(screen.getByText('Alertes hebdo').closest('button').className).toContain('menu-subitem-active'));
  });

  it('signale une erreur de chargement du menu', async () => {
    getMonMenu.mockRejectedValue(new Error('Accès refusé'));
    afficher();
    expect(await screen.findByText('Accès refusé')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).toBeNull();
  });

  it('un menu vide n’affiche aucune page', async () => {
    getMonMenu.mockResolvedValue([]);
    afficher();
    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' });
    expect(nav.querySelectorAll('button')).toHaveLength(0);
  });
});
