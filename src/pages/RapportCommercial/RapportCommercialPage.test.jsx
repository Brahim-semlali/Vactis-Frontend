// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RapportCommercialPage from './RapportCommercialPage.jsx';

const { authState, getBridgeToGoal, getMoisDisponibles } = vi.hoisted(() => ({
  authState: { userProfile: { role: 'USER' } },
  getBridgeToGoal: vi.fn(),
  getMoisDisponibles: vi.fn(),
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userProfile: authState.userProfile }),
}));
vi.mock('../../api/vactis.js', () => ({ getBridgeToGoal }));
vi.mock('../../api/activite.js', () => ({ getMoisDisponibles }));
vi.mock('./RapportCommercialInsights.jsx', () => ({ default: () => null }));

afterEach(() => cleanup());

describe('RapportCommercialPage export access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userProfile = { role: 'USER' };
    getMoisDisponibles.mockResolvedValue(['2026-09']);
    getBridgeToGoal.mockResolvedValue({
      periode: '2026-09', caMoisTotal: 130530, casMoisTotal: 174,
      opportunites: [], statutYtd: 'EN AVANCE',
    });
  });

  it('hides PDF and Excel export controls for non-admin users', async () => {
    render(<RapportCommercialPage />);

    await waitFor(() => expect(getBridgeToGoal).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /PDF/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Excel/ })).toBeNull();
  });

  it('shows PDF and Excel export controls for administrators', async () => {
    authState.userProfile = { role: 'ADMIN' };
    render(<RapportCommercialPage />);

    await waitFor(() => expect(getBridgeToGoal).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /PDF/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeTruthy();
  });
});
