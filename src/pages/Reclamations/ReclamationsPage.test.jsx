// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReclamationsPage from './ReclamationsPage.jsx';
import { getMedecins } from '../../api/medecins.js';
import { creerReclamation } from '../../api/vactis.js';

const VALID_CATEGORIES = [
  'DELAIS_RESULTATS',
  'ERREUR_TECHNIQUE',
  'FACTURATION_TARIFS',
  'LOGISTIQUE_COURSIER',
  'RELATIONNEL_ACCUEIL',
  'AUTRE',
];

const VALID_PRIORITIES = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];

async function openCreateFormWithDoctor() {
  vi.mocked(getMedecins).mockResolvedValue({ items: [{ id: 42, prenom: 'Nadia', nom: 'Amrani' }] });
  render(<ReclamationsPage />);
  await waitFor(() => expect(getMedecins).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Déclarer une réclamation' }));
  fireEvent.change(screen.getByLabelText('Médecin prescripteur *'), { target: { value: '42' } });
  fireEvent.change(screen.getByLabelText('Date de la visite *'), { target: { value: '2026-10-18' } });
  fireEvent.change(screen.getByPlaceholderText(/Décrivez précisément/), { target: { value: 'Incident de test' } });
}

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userProfile: { role: 'ADMIN' },
  }),
}));

vi.mock('../../api/vactis.js', () => ({
  getReclamations: vi.fn().mockResolvedValue([]),
  creerReclamation: vi.fn().mockResolvedValue({ id: 1 }),
  mettreAJourStatutReclamation: vi.fn(),
  getReclamationHistorique: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../api/medecins.js', () => ({
  getMedecins: vi.fn().mockResolvedValue({ items: [] }),
}));

describe('ReclamationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly with title and filters', async () => {
    render(<ReclamationsPage />);
    expect(screen.getByText('Gestion des Réclamations')).toBeTruthy();
    expect(screen.getByText('Déclarer une réclamation')).toBeTruthy();
    expect(screen.getByText('Vue Direction / Pilotage')).toBeTruthy();
  });

  it('shows doctors returned in the API items array in the complaint selector', async () => {
    vi.mocked(getMedecins).mockResolvedValue({
      items: [{ id: 42, prenom: 'Nadia', nom: 'Amrani', specialite: 'Anatomopathologie', organisme: 'Clinique Atlas' }],
    });

    render(<ReclamationsPage />);
    await waitFor(() => expect(getMedecins).toHaveBeenCalledWith('test-token'));
    fireEvent.click(screen.getByRole('button', { name: 'Déclarer une réclamation' }));

    const doctorOption = await screen.findByRole('option', { name: 'Dr Nadia Amrani — Anatomopathologie · Clinique Atlas' });
    const doctorSelect = screen.getByLabelText('Médecin prescripteur *');
    expect(doctorOption).toBeTruthy();
    fireEvent.change(doctorSelect, { target: { value: '42' } });
    expect(doctorSelect.value).toBe('42');
  });

  it('submits a category code accepted by the backend', async () => {
    await openCreateFormWithDoctor();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la réclamation' }));

    await waitFor(() => expect(creerReclamation).toHaveBeenCalledWith('test-token', {
      medecinId: 42,
      dateVisite: '2026-10-18',
      categorie: 'DELAIS_RESULTATS',
      priorite: 'MOYENNE',
      description: 'Incident de test',
    }));
  });

  it.each(VALID_CATEGORIES)('submits the accepted category %s', async (categorie) => {
    await openCreateFormWithDoctor();
    fireEvent.change(screen.getByLabelText('Catégorie *'), { target: { value: categorie } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la réclamation' }));

    await waitFor(() => expect(creerReclamation).toHaveBeenCalledWith('test-token', expect.objectContaining({ categorie })));
  });

  it.each(VALID_PRIORITIES)('submits the accepted priority %s', async (priorite) => {
    await openCreateFormWithDoctor();
    fireEvent.change(screen.getByLabelText('Priorité *'), { target: { value: priorite } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la réclamation' }));

    await waitFor(() => expect(creerReclamation).toHaveBeenCalledWith('test-token', expect.objectContaining({ priorite })));
  });

  it('does not submit when no doctor is selected', async () => {
    render(<ReclamationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Déclarer une réclamation' }));
    fireEvent.change(screen.getByPlaceholderText(/Décrivez précisément/), { target: { value: 'Incident de test' } });
    fireEvent.submit(screen.getByPlaceholderText(/Décrivez précisément/).closest('form'));

    expect(await screen.findByText('Veuillez sélectionner un médecin.')).toBeTruthy();
    expect(creerReclamation).not.toHaveBeenCalled();
  });

  it('does not submit an empty description', async () => {
    await openCreateFormWithDoctor();
    fireEvent.change(screen.getByPlaceholderText(/Décrivez précisément/), { target: { value: '   ' } });
    fireEvent.submit(screen.getByPlaceholderText(/Décrivez précisément/).closest('form'));

    expect(await screen.findByText('La description / motif de la réclamation est obligatoire.')).toBeTruthy();
    expect(creerReclamation).not.toHaveBeenCalled();
  });

  it('displays the API reason when complaint creation fails', async () => {
    vi.mocked(getMedecins).mockResolvedValue({ items: [{ id: 42, prenom: 'Nadia', nom: 'Amrani' }] });
    vi.mocked(creerReclamation).mockRejectedValue(new Error('Catégorie invalide. Valeurs autorisées : DELAIS_RESULTATS, AUTRE.'));
    render(<ReclamationsPage />);
    await waitFor(() => expect(getMedecins).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Déclarer une réclamation' }));
    fireEvent.change(screen.getByLabelText('Médecin prescripteur *'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Date de la visite *'), { target: { value: '2026-10-18' } });
    fireEvent.change(screen.getByPlaceholderText(/Décrivez précisément/), { target: { value: 'Incident de test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la réclamation' }));

    expect(await screen.findByText('Catégorie invalide. Valeurs autorisées : DELAIS_RESULTATS, AUTRE.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Catégorie *'), { target: { value: 'DELAIS_RESULTATS' } });
    expect(screen.queryByText('Catégorie invalide. Valeurs autorisées : DELAIS_RESULTATS, AUTRE.')).toBeNull();
  });
});
