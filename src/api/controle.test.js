import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ControleError,
  createControle,
  deleteControle,
  getControlesByType,
  reinitialiserControles,
  updateControle,
} from './controle.js';

vi.mock('../utils/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const okJson = (data, status = 200) => ({ ok: true, status, json: () => Promise.resolve(data) });
const erreur = (status, body) => ({
  ok: false,
  status,
  statusText: 'Bad Request',
  json: () => (body === undefined ? Promise.reject(new Error('pas de JSON')) : Promise.resolve(body)),
});

describe('API Contrôle', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('charge les règles d’un type avec le jeton', async () => {
    global.fetch.mockResolvedValue(okJson([{ idControle: 1, etat: 'CRITIQUE' }]));

    const regles = await getControlesByType('jeton', 'RUPTURE');

    expect(regles).toEqual([{ idControle: 1, etat: 'CRITIQUE' }]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/controle\/type\/RUPTURE$/),
      expect.objectContaining({ headers: { Authorization: 'Bearer jeton' } }),
    );
  });

  it('crée une règle en POST JSON', async () => {
    global.fetch.mockResolvedValue(okJson({ idControle: 2 }, 201));
    const payload = { type: 'DELAI_ACTION', etat: 'CRITIQUE', valeur: 5, actif: true };

    await createControle('jeton', payload);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/controle$/);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ Authorization: 'Bearer jeton', 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('met à jour une règle en PUT', async () => {
    global.fetch.mockResolvedValue(okJson({ idControle: 3 }));

    await updateControle('jeton', 3, { type: 'URGENCE', etat: 'ELEVE', minCA: 50, maxCA: 75 });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/controle\/3$/);
    expect(options.method).toBe('PUT');
  });

  it('supprime une règle en DELETE', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204 });

    await deleteControle('jeton', 9);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/controle\/9$/);
    expect(options.method).toBe('DELETE');
  });

  it('réinitialise un type aux valeurs par défaut', async () => {
    global.fetch.mockResolvedValue(okJson([{ etat: 'AUCUNE' }, { etat: 'SURVEILLANCE' }, { etat: 'CRITIQUE' }]));

    const regles = await reinitialiserControles('jeton', 'RUPTURE');

    expect(regles).toHaveLength(3);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/controle\/type\/RUPTURE\/reinitialiser$/);
    expect(options.method).toBe('POST');
  });

  it('remonte le message métier du back en cas d’erreur', async () => {
    global.fetch.mockResolvedValue(erreur(400, { message: 'Ce palier chevauche le palier CRITIQUE [200 ; 100000[' }));

    const promesse = createControle('jeton', { type: 'RUPTURE' });

    await expect(promesse).rejects.toBeInstanceOf(ControleError);
    await expect(createControle('jeton', { type: 'RUPTURE' })).rejects.toMatchObject({
      message: 'Ce palier chevauche le palier CRITIQUE [200 ; 100000[',
      status: 400,
    });
  });

  it('utilise le statut HTTP quand la réponse d’erreur n’est pas du JSON', async () => {
    global.fetch.mockResolvedValue(erreur(403));

    await expect(reinitialiserControles('jeton', 'URGENCE')).rejects.toMatchObject({
      message: 'Bad Request',
      status: 403,
    });
  });
});
