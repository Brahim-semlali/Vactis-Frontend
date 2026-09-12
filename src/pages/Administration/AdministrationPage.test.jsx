// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/administration.js', async () => {
  const mockGetUsers = vi.fn();
  const mockGetRoles = vi.fn();
  const mockGetMenus = vi.fn();

  return {
    AdministrationError: class AdministrationError extends Error {
      constructor(message, status, code = null) {
        super(message);
        this.name = 'AdministrationError';
        this.status = status;
        this.code = code;
      }
    },
    assignUserRole: vi.fn(),
    createRole: vi.fn(),
    createUser: vi.fn(),
    deleteRole: vi.fn(),
    deleteUser: vi.fn(),
    getMenus: mockGetMenus,
    getRoles: mockGetRoles,
    getUsers: mockGetUsers,
    updateRole: vi.fn(),
    updateUser: vi.fn(),
    suspendUser: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    __mockFns: { mockGetUsers, mockGetRoles, mockGetMenus },
  };
});

vi.mock('../../api/settings.js', async () => {
  const mockGetSettings = vi.fn();

  return {
    getSettings: mockGetSettings,
    __mockFns: { mockGetSettings },
  };
});

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'mock-token', username: 'admin' }),
}));

const { __mockFns: { mockGetUsers, mockGetRoles, mockGetMenus } } = await import('../../api/administration.js');
const { __mockFns: { mockGetSettings } } = await import('../../api/settings.js');

import AdministrationPage from './AdministrationPage.jsx';

describe('AdministrationPage users view', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUsers.mockResolvedValue([
      {
        id: 1,
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@test.local',
        phone: '0600000000',
        enabled: true,
        avatar: 'data:image/png;base64,avatar-user',
        roles: { idRole: 2, nameRole: 'USER' },
      },
      {
        id: 2,
        username: 'bob',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@test.local',
        phone: '0700000000',
        enabled: true,
        avatar: '',
        roles: { idRole: 2, nameRole: 'USER' },
      },
    ]);

    mockGetRoles.mockResolvedValue([
      { idRole: 2, nameRole: 'USER', menuItems: [] },
    ]);

    mockGetMenus.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue({
      mdpLongueurMinimale: 8,
      mdpExigeMajuscule: false,
      mdpExigeChiffre: false,
      mdpExigeCaractereSpecial: false,
    });
  });

  it('renders avatar images and initials fallback for users list', async () => {
    render(<AdministrationPage mode="users" />);

    expect(await screen.findByText('alice')).toBeTruthy();
    expect(await screen.findByAltText('Alice Martin')).toBeTruthy();
    expect(screen.getByText('BJ')).toBeTruthy();
  });
});
