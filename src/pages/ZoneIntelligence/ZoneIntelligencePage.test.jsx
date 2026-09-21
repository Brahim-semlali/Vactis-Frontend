// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
  useMapEvents: () => null,
  useMap: () => ({ flyTo: vi.fn(), setView: vi.fn() }),
}));

vi.mock('../../api/zoneIntelligence.js', () => ({
  getMedecinsGeolocalises: vi.fn(),
  getMedecinsSansLocalisation: vi.fn(),
  updateMedecinLocalisation: vi.fn(),
  getAgencesConcurrentes: vi.fn(),
  createAgenceConcurrente: vi.fn(),
  updateAgenceConcurrente: vi.fn(),
  deleteAgenceConcurrente: vi.fn(),
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userProfile: { role: 'ADMIN' },
  }),
}));

const {
  getMedecinsGeolocalises,
  getMedecinsSansLocalisation,
  getAgencesConcurrentes,
} = await import('../../api/zoneIntelligence.js');

import ZoneIntelligencePage from './ZoneIntelligencePage.jsx';

describe('ZoneIntelligencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getMedecinsGeolocalises.mockResolvedValue([
      {
        id: 1,
        nom: 'Alami',
        prenom: 'Driss',
        segment: 'A',
        statut: 'PROGRESSION',
        specialite: 'Cardiologie',
        organisme: 'Clinique Marrakech',
        caMobile: 24000,
        latitude: 31.6295,
        longitude: -7.9811,
      },
    ]);

    getMedecinsSansLocalisation.mockResolvedValue([
      {
        id: 2,
        nom: 'Berrada',
        prenom: 'Samir',
        segment: 'B',
        statut: 'ACTIF_STABLE',
        specialite: 'Pédiatrie',
        organisme: 'Hôpital',
        ville: 'Marrakech',
      },
    ]);

    getAgencesConcurrentes.mockResolvedValue([
      {
        id: 101,
        nom: 'Labo Concurrence 1',
        enseigne: 'BioGroup',
        latitude: 31.63,
        longitude: -7.99,
      },
    ]);
  });

  it('renders the map container, controls and doctor counters', async () => {
    render(<ZoneIntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('Zone Intelligence')).toBeDefined();
      expect(screen.getByText('Marrakech')).toBeDefined();
    });

    expect(screen.getByTestId('map-container')).toBeDefined();
    expect(screen.getByText('Ajouter agence')).toBeDefined();
    expect(screen.getByText(/Sans localisation/)).toBeDefined();
  });
});
