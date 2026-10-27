// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecommandationsPage from './RecommandationsPage.jsx';

const { getRecommandations, creerActionRecommandation } = vi.hoisted(() => ({
  getRecommandations: vi.fn(),
  creerActionRecommandation: vi.fn(),
}));

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../../api/vactis.js', () => ({ getRecommandations, creerActionRecommandation }));

afterEach(cleanup);

describe('RecommandationsPage', () => {
  it('exposes the three document lists and creates an action from the selected recommendation', async () => {
    getRecommandations.mockResolvedValue({
      developpement: [{ medecinId: 42, nomMedecin: 'Nadia Amrani', segment: 'A', statut: 'ACTIF_STABLE', typeRecommandation: 'DEVELOPPEMENT', pitchCommercial: 'Qualifier le potentiel' }],
      reactivation: [{ medecinId: 43, nomMedecin: 'Youssef Tazi', segment: 'B', statut: 'INACTIF', typeRecommandation: 'REACTIVATION', scoreReactivation: 67.8, prioriteReactivation: 'HIGH' }],
      irreguliersRentables: [{ medecinId: 44, nomMedecin: 'Salma Berrada', segment: 'C', statut: 'ACTIVITE_IRREGULIERE', typeRecommandation: 'IRREGULIER_RENTABLE', tauxPresencePct: 37.5 }],
    });
    creerActionRecommandation.mockResolvedValue({});

    render(<RecommandationsPage />);
    await waitFor(() => expect(getRecommandations).toHaveBeenCalledWith('test-token'));

    expect(screen.getByRole('button', { name: /Développement/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Réactivation/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Irréguliers/ })).toBeTruthy();
    expect(await screen.findByText('Nadia Amrani')).toBeTruthy();

    expect(screen.getByRole('button', { name: /Développement/ }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: /Réactivation/ }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: /Irréguliers/ }).textContent).toContain('1');

    screen.getByRole('button', { name: /Réactivation/ }).click();
    expect(await screen.findByText('Youssef Tazi')).toBeTruthy();
    expect(screen.getByText('HAUTE · 67.8')).toBeTruthy();
    screen.getByRole('button', { name: /Irréguliers/ }).click();
    expect(await screen.findByText('Salma Berrada')).toBeTruthy();
    expect(screen.getByText('37,5 %')).toBeTruthy();
  });
});