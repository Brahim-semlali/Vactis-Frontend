// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getControlesByType: vi.fn(),
  createControle: vi.fn(),
  updateControle: vi.fn(),
  deleteControle: vi.fn(),
  reinitialiserControles: vi.fn(),
}));

vi.mock('../../api/controle.js', () => api);
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ token: 'jeton' }) }));
vi.mock('../../components/icons/MenuIcons.jsx', () => ({ MenuIcon: () => null }));
vi.mock('./BridgeGoalSettings.jsx', () => ({ default: () => <div>Réglage Bridge to Goal</div> }));

import ControlePage, { TABS, formatRuleVal } from './ControlePage.jsx';

const tab = (id) => TABS.find((t) => t.id === id);

describe('ControlePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.getControlesByType.mockResolvedValue([]);
  });

  it('affiche les onglets des nouveaux paliers', async () => {
    render(<ControlePage />);
    for (const label of ['Statuts', 'Segments', 'Rupture', 'Urgence', 'Fiabilité', 'Délai d’action']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'STATUT'));
  });

  it('charge les règles de rupture et propose uniquement les états reconnus', async () => {
    api.getControlesByType.mockImplementation(async (_t, type) =>
      type === 'RUPTURE'
        ? [{ idControle: 1, type, etat: 'CRITIQUE', minCA: 200, maxCA: 100000, actif: true }]
        : [],
    );
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rupture' }));

    expect(await screen.findByText('CRITIQUE', { selector: '[class*="font-semibold"]' })).toBeTruthy();
    expect(screen.getByText('∞')).toBeTruthy();
    const options = Array.from(screen.getByLabelText('État / libellé').querySelectorAll('option'))
      .map((o) => o.value)
      .filter(Boolean);
    expect(options).toEqual(['AUCUNE', 'SURVEILLANCE', 'CRITIQUE']);
  });

  it('envoie un délai en jours pour l’onglet Délai d’action', async () => {
    api.createControle.mockResolvedValue({});
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Délai d’action' }));
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'DELAI_ACTION'));

    fireEvent.change(screen.getByLabelText('Niveau d’intensité'), { target: { value: 'CRITIQUE' } });
    fireEvent.change(screen.getByLabelText('Délai (jours)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() =>
      expect(api.createControle).toHaveBeenCalledWith('jeton', {
        type: 'DELAI_ACTION',
        etat: 'CRITIQUE',
        valeur: 5,
        actif: true,
      }),
    );
  });

  it('réinitialise un onglet aux valeurs par défaut après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.reinitialiserControles.mockResolvedValue([
      { idControle: 9, type: 'URGENCE', etat: 'URGENT', minCA: 75, maxCA: 100, actif: true },
    ]);
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Urgence' }));
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'URGENCE'));

    fireEvent.click(screen.getByRole('button', { name: /Valeurs par défaut/ }));

    await waitFor(() => expect(api.reinitialiserControles).toHaveBeenCalledWith('jeton', 'URGENCE'));
    expect(await screen.findByText('URGENT', { selector: '[class*="font-semibold"]' })).toBeTruthy();
  });

  it('affiche le réglage Bridge to Goal sans charger de règles', async () => {
    render(<ControlePage />);
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'STATUT'));
    api.getControlesByType.mockClear();

    fireEvent.click(screen.getByRole('tab', { name: 'Bridge to Goal' }));

    expect(await screen.findByText('Réglage Bridge to Goal')).toBeTruthy();
    expect(screen.queryByText('Ajouter une règle')).toBeNull();
    expect(api.getControlesByType).not.toHaveBeenCalled();
  });

  it('crée un palier avec ses bornes numériques', async () => {
    api.createControle.mockResolvedValue({});
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Fiabilité' }));
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'FIABILITE'));

    fireEvent.change(screen.getByLabelText('État / libellé'), { target: { value: 'PARTIEL' } });
    fireEvent.change(screen.getByLabelText(/Mois actifs min/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Mois actifs max/), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() =>
      expect(api.createControle).toHaveBeenCalledWith('jeton', {
        type: 'FIABILITE',
        etat: 'PARTIEL',
        minCA: 2,
        maxCA: 4,
        actif: true,
      }),
    );
    // La liste est rechargée après la création
    await waitFor(() =>
      expect(api.getControlesByType.mock.calls.filter(([, type]) => type === 'FIABILITE')).toHaveLength(2),
    );
  });

  it('affiche le message du back quand la règle est refusée', async () => {
    api.createControle.mockRejectedValue(new Error('Ce palier chevauche le palier CRITIQUE [200 ; 100000['));
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rupture' }));
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'RUPTURE'));

    fireEvent.change(screen.getByLabelText('État / libellé'), { target: { value: 'SURVEILLANCE' } });
    fireEvent.change(screen.getByLabelText(/Ratio min/), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/Ratio max/), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/chevauche le palier CRITIQUE/);
  });

  it('modifie une règle d’urgence existante', async () => {
    api.getControlesByType.mockImplementation(async (_t, type) =>
      type === 'URGENCE' ? [{ idControle: 3, type, etat: 'ELEVE', minCA: 50, maxCA: 75, actif: true }] : [],
    );
    api.updateControle.mockResolvedValue({});
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Urgence' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Modifier ELEVE' }));
    const champsMin = screen.getAllByLabelText(/Score min/);
    fireEvent.change(champsMin[champsMin.length - 1], { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(api.updateControle).toHaveBeenCalledWith('jeton', 3, {
        type: 'URGENCE',
        etat: 'ELEVE',
        minCA: 45,
        maxCA: 75,
        actif: true,
      }),
    );
  });

  it('modifie un délai d’action en conservant le format délai', async () => {
    api.getControlesByType.mockImplementation(async (_t, type) =>
      type === 'DELAI_ACTION' ? [{ idControle: 5, type, etat: 'CRITIQUE', valeur: 7, actif: true }] : [],
    );
    api.updateControle.mockResolvedValue({});
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Délai d’action' }));

    expect(await screen.findByText('7 jours')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier CRITIQUE' }));
    const champsDelai = screen.getAllByLabelText('Délai (jours)');
    fireEvent.change(champsDelai[champsDelai.length - 1], { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(api.updateControle).toHaveBeenCalledWith('jeton', 5, {
        type: 'DELAI_ACTION',
        etat: 'CRITIQUE',
        valeur: 4,
        actif: true,
      }),
    );
  });

  it('supprime une règle seulement après confirmation', async () => {
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    api.getControlesByType.mockImplementation(async (_t, type) =>
      type === 'RUPTURE' ? [{ idControle: 8, type, etat: 'AUCUNE', minCA: 0, maxCA: 150, actif: true }] : [],
    );
    api.deleteControle.mockResolvedValue();
    render(<ControlePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rupture' }));

    const supprimer = await screen.findByRole('button', { name: 'Supprimer AUCUNE' });
    fireEvent.click(supprimer);
    expect(api.deleteControle).not.toHaveBeenCalled();

    fireEvent.click(supprimer);
    await waitFor(() => expect(api.deleteControle).toHaveBeenCalledWith('jeton', 8));
    expect(confirmation).toHaveBeenCalledTimes(2);
  });

  it('ne réinitialise pas sans confirmation et masque le bouton sur Statuts', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ControlePage />);
    await waitFor(() => expect(api.getControlesByType).toHaveBeenCalledWith('jeton', 'STATUT'));
    expect(screen.queryByRole('button', { name: /Valeurs par défaut/ })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Rupture' }));
    fireEvent.click(await screen.findByRole('button', { name: /Valeurs par défaut/ }));

    expect(api.reinitialiserControles).not.toHaveBeenCalled();
  });

  it('formate les valeurs selon le type', () => {
    expect(formatRuleVal(150, tab('RUPTURE'))).toBe('150 % (×1,5)');
    expect(formatRuleVal(3, tab('FIABILITE'))).toBe('3 mois');
    expect(formatRuleVal(15, tab('DELAI_ACTION'))).toBe('15 jours');
    expect(formatRuleVal(-10, tab('STATUT'))).toBe('-10%');
    expect(formatRuleVal(null, tab('URGENCE'))).toBe('—');
  });
});
