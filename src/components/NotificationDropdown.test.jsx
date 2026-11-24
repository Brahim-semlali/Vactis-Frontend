// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationDropdown from './NotificationDropdown.jsx';

// Mocks
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'fake-jwt-token',
    username: 'admin',
    userProfile: { role: 'ADMIN' },
  }),
}));

vi.mock('../api/vactis.js', () => ({
  getNotificationsCount: vi.fn(),
  getNotifications: vi.fn(),
  marquerNotificationLue: vi.fn(),
  getAlertesFinCycle: vi.fn(),
}));

import { getNotificationsCount, getNotifications, marquerNotificationLue, getAlertesFinCycle } from '../api/vactis.js';

describe('NotificationDropdown Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAlertesFinCycle.mockResolvedValue({ fenetreActive: false, alertes: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('affiche le compteur non lu lorsque des notifications sont disponibles', async () => {
    getNotificationsCount.mockResolvedValueOnce({ count: 4 });

    render(<NotificationDropdown onNavigate={vi.fn()} canAccessReclamations />);

    await waitFor(() => {
      const badge = screen.getByTestId('notification-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('4');
    });
  });

  it('ne montre pas de badge si le compteur est à zéro', async () => {
    getNotificationsCount.mockResolvedValueOnce({ count: 0 });

    render(<NotificationDropdown onNavigate={vi.fn()} canAccessReclamations />);

    await waitFor(() => {
      expect(getNotificationsCount).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('ouvre le menu déroulant au clic et liste les notifications', async () => {
    getNotificationsCount.mockResolvedValueOnce({ count: 2 });
    getNotifications.mockResolvedValueOnce([
      {
        id: 101,
        titre: 'Nouvelle réclamation',
        message: 'Réclamation pour le Dr Martin',
        type: 'RECLAMATION',
        referenceId: 5,
        lu: false,
        createdAt: '2026-05-18T10:00:00',
      },
    ]);

    render(<NotificationDropdown onNavigate={vi.fn()} canAccessReclamations />);

    const bellBtn = screen.getByTestId('notification-bell-btn');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByTestId('notification-dropdown-menu')).toBeTruthy();
      expect(screen.getByText('Nouvelle réclamation')).toBeTruthy();
      expect(screen.getByText('Réclamation pour le Dr Martin')).toBeTruthy();
    });
  });

  it('cliquer sur une notification la marque comme lue et navigue vers les réclamations', async () => {
    const onNavigate = vi.fn();
    getNotificationsCount.mockResolvedValueOnce({ count: 1 });
    getNotifications.mockResolvedValueOnce([
      {
        id: 42,
        titre: 'Alerte qualité',
        message: 'Délai dépassé pour analyses',
        type: 'RECLAMATION',
        referenceId: 99,
        lu: false,
        createdAt: '2026-05-18T11:00:00',
      },
    ]);
    marquerNotificationLue.mockResolvedValueOnce({});

    render(<NotificationDropdown onNavigate={onNavigate} canAccessReclamations />);

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-item-42')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('notification-item-42'));

    await waitFor(() => {
      expect(marquerNotificationLue).toHaveBeenCalledWith('fake-jwt-token', 42);
      expect(onNavigate).toHaveBeenCalledWith('/reclamations');
    });
  });

  it('sans accès aux réclamations, la cloche reste visible mais ne charge pas leurs notifications', async () => {
    render(<NotificationDropdown onNavigate={vi.fn()} />);

    expect(screen.getByTestId('notification-bell-btn')).toBeTruthy();
    await waitFor(() => expect(getAlertesFinCycle).toHaveBeenCalled());
    expect(getNotificationsCount).not.toHaveBeenCalled();
  });

  it('remonte les alertes de fin de cycle à partir de J-7 et ouvre leur page', async () => {
    const onNavigate = vi.fn();
    getAlertesFinCycle.mockResolvedValue({
      cycle: '2026-11',
      joursRestants: 5,
      fenetreActive: true,
      urgent: false,
      alertes: [
        { type: 'ACTION_NON_VISITEE', gravite: 'ATTENTION', actionId: 1 },
        { type: 'ACTION_NON_VISITEE', gravite: 'ATTENTION', actionId: 2 },
        { type: 'RETOUR_A_QUALIFIER', gravite: 'ATTENTION', retourTerrainId: 3 },
      ],
    });

    render(<NotificationDropdown onNavigate={onNavigate} />);

    await waitFor(() => expect(screen.getByTestId('notification-badge').textContent).toBe('3'));
    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    const section = await screen.findByTestId('fin-cycle-section');
    expect(section.textContent).toContain('Clôture du cycle novembre 2026 dans 5 jours');
    expect(section.textContent).toContain('J-5');
    expect(section.textContent).toContain('2actions non visitées');

    fireEvent.click(screen.getByText('Voir les alertes de fin de cycle →'));
    expect(onNavigate).toHaveBeenCalledWith('/alertes-fin-cycle');
  });

  it('n’affiche pas les alertes de fin de cycle avant J-7', async () => {
    getAlertesFinCycle.mockResolvedValue({
      cycle: '2026-11', joursRestants: 12, fenetreActive: false,
      alertes: [{ type: 'ACTION_NON_VISITEE', gravite: 'ATTENTION', actionId: 1 }],
    });

    render(<NotificationDropdown onNavigate={vi.fn()} />);

    await waitFor(() => expect(getAlertesFinCycle).toHaveBeenCalled());
    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });
});
