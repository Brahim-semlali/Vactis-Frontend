// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mapEventState = vi.hoisted(() => ({ handlers: null, profile: { role: 'ADMIN' } }));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
  useMapEvents: (handlers) => {
    mapEventState.handlers = handlers;
    return null;
  },
  useMap: () => ({ flyTo: vi.fn(), setView: vi.fn() }),
}));

vi.mock('../../api/zoneIntelligence.js', () => ({
  getMedecinsGeolocalises: vi.fn(),
  getMedecinsSansLocalisation: vi.fn(),
  updateMedecinLocalisation: vi.fn(),
  getAgencesConcurrentes: vi.fn(),
  getLaboratoireLocation: vi.fn(),
  updateLaboratoireLocation: vi.fn(),
  createAgenceConcurrente: vi.fn(),
  updateAgenceConcurrente: vi.fn(),
  deleteAgenceConcurrente: vi.fn(),
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userProfile: mapEventState.profile,
  }),
}));

const {
  getMedecinsGeolocalises,
  getMedecinsSansLocalisation,
  getAgencesConcurrentes,
  getLaboratoireLocation,
  updateLaboratoireLocation,
} = await import('../../api/zoneIntelligence.js');

import ZoneIntelligencePage from './ZoneIntelligencePage.jsx';

afterEach(cleanup);

describe('ZoneIntelligencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapEventState.profile = { role: 'ADMIN' };

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
    getLaboratoireLocation.mockResolvedValue(null);
  });

  it('renders the map container, controls and doctor counters', async () => {
    render(<ZoneIntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('Zone Intelligence')).toBeDefined();
      expect(screen.getByText('Marrakech')).toBeDefined();
    });

    expect(screen.getByTestId('map-container')).toBeDefined();
    expect(screen.getByText('Ajouter agence')).toBeDefined();
    expect(screen.getByText('Localiser le labo')).toBeDefined();
    expect(screen.getByText(/Sans localisation/)).toBeDefined();
  });

  it('displays the saved laboratory location on the map', async () => {
    getLaboratoireLocation.mockResolvedValue({ latitude: 31.63, longitude: -7.99 });

    render(<ZoneIntelligencePage />);

    expect(await screen.findByText('Laboratoire VACTIS')).toBeDefined();
    expect(screen.getByText('Modifier labo')).toBeDefined();
  });

  it('lets an admin place and save the laboratory by clicking the map', async () => {
    const location = { latitude: 31.64, longitude: -8.01 };
    updateLaboratoireLocation.mockResolvedValue(location);

    render(<ZoneIntelligencePage />);
    fireEvent.click(await screen.findByText('Localiser le labo'));

    await act(async () => {
      mapEventState.handlers.click({ latlng: { lat: 31.6401234, lng: -8.0109876 } });
    });

    expect(updateLaboratoireLocation).toHaveBeenCalledWith('test-token', {
      latitude: 31.640123,
      longitude: -8.010988,
    });
    expect(await screen.findByText('Laboratoire VACTIS')).toBeDefined();
  });

  it('does not offer laboratory placement to non-admin users', async () => {
    mapEventState.profile = { role: 'COMMERCIAL' };

    render(<ZoneIntelligencePage />);

    expect(screen.getByTestId('map-container')).toBeDefined();
    expect(screen.queryByText('Localiser le labo')).toBeNull();
    expect(screen.queryByText('Modifier labo')).toBeNull();
  });
});
