import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMedecinsGeolocalises,
  getMedecinsSansLocalisation,
  updateMedecinLocalisation,
  getAgencesConcurrentes,
  createAgenceConcurrente,
  updateAgenceConcurrente,
  deleteAgenceConcurrente,
  ZoneIntelligenceError,
} from './zoneIntelligence.js';

describe('zoneIntelligence API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches geolocalised doctors', async () => {
    const mockData = [{ id: 1, nom: 'Dr. Test', latitude: 31.62, longitude: -7.98 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockData)),
    });

    const result = await getMedecinsGeolocalises('dummy-token');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/medecins/geolocalises'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer dummy-token',
        }),
      })
    );
  });

  it('updates doctor localization via PATCH', async () => {
    const updatedDoc = { id: 10, latitude: 31.63, longitude: -7.99 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(updatedDoc)),
    });

    const result = await updateMedecinLocalisation('dummy-token', 10, {
      latitude: 31.63,
      longitude: -7.99,
    });
    expect(result).toEqual(updatedDoc);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/medecins/10/localisation'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ latitude: 31.63, longitude: -7.99 }),
      })
    );
  });

  it('throws ZoneIntelligenceError on 403 Forbidden', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: 'Accès refusé' }),
    });

    await expect(
      createAgenceConcurrente('non-admin-token', {
        nom: 'Agence',
        latitude: 31.6,
        longitude: -7.9,
      })
    ).rejects.toThrow(ZoneIntelligenceError);
  });

  it('handles 204 No Content for deleteAgenceConcurrente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    const result = await deleteAgenceConcurrente('admin-token', 5);
    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/agences-concurrentes/5'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});
