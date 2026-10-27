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
}));

import { getNotificationsCount, getNotifications, marquerNotificationLue } from '../api/vactis.js';

describe('NotificationDropdown Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('ne montre pas les notifications sans accès aux réclamations', async () => {
    render(<NotificationDropdown onNavigate={vi.fn()} />);

    expect(screen.queryByTestId('notification-bell-btn')).toBeNull();
    expect(getNotificationsCount).not.toHaveBeenCalled();
  });
});
