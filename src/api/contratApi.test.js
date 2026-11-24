// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as actions from './actions.js';
import * as activite from './activite.js';
import * as auth from './auth.js';
import * as medecins from './medecins.js';
import * as vactis from './vactis.js';
import { API_BASE } from './config.js';

// Contrat de la couche API : chaque appel authentifié vise la bonne route avec la bonne méthode,
// porte le jeton « Bearer », et remonte le message d'erreur du serveur.

vi.mock('../utils/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const TOKEN = 'jeton-test';
const ok = (corps = {}) => ({ ok: true, status: 200, json: async () => corps, blob: async () => new Blob(), headers: new Headers() });
const ko = (status, corps) => ({ ok: false, status, statusText: 'Erreur', json: async () => corps });

const appels = [
  ['actions.getActions', () => actions.getActions(TOKEN, { statut: 'RETENTION', vide: '' }), '/api/actions?statut=RETENTION', 'GET'],
  ['actions.getActionById', () => actions.getActionById(TOKEN, 4), '/api/actions/4', 'GET'],
  ['actions.reserverActionApi', () => actions.reserverActionApi(TOKEN, 4), '/api/actions/4/reserver', 'POST'],
  ['actions.soumettreRetourTerrainApi', () => actions.soumettreRetourTerrainApi(TOKEN, 4, { qualification: 'FAVORABLE' }), '/api/actions/4/retour-terrain', 'POST'],
  ['actions.creerVisiteLibreApi', () => actions.creerVisiteLibreApi(TOKEN, { medecinId: 7 }), '/api/actions/visite-libre', 'POST'],
  ['actions.getVisitesLibresApi', () => actions.getVisitesLibresApi(TOKEN), '/api/actions/visite-libre', 'GET'],
  ['actions.getFicheContextuelleApi', () => actions.getFicheContextuelleApi(TOKEN, 7), '/api/actions/medecins/7/fiche-contextuelle', 'GET'],
  ['activite.getKpisMensuels', () => activite.getKpisMensuels(TOKEN, '2026-11'), '/api/activite/kpis-mensuels?mois=2026-11', 'GET'],
  ['activite.getEquipeCommerciale', () => activite.getEquipeCommerciale(TOKEN, { debut: '2026-10-01', fin: '2026-11-30' }), '/api/activite/equipe-commerciale', 'GET'],
  ['vactis.getAlertesFinCycle', () => vactis.getAlertesFinCycle(TOKEN), '/api/alertes/fin-cycle', 'GET'],
  ['vactis.runBatchAlertes', () => vactis.runBatchAlertes(TOKEN), '/api/alertes/batch-run', 'POST'],
  ['vactis.traiterAlerte', () => vactis.traiterAlerte(TOKEN, 3, 'TRAITEE'), '/api/alertes/3/statut?statut=TRAITEE', 'PATCH'],
  ['vactis.genererActionDepuisAlerte', () => vactis.genererActionDepuisAlerte(TOKEN, 3), '/api/alertes/3/generer-action', 'POST'],
  ['vactis.creerActionRecommandation', () => vactis.creerActionRecommandation(TOKEN, 7, 'REACTIVATION'), '/api/recommandations/7/creer-action?type=REACTIVATION', 'POST'],
  ['vactis.saveBridgeGoalMonthlyTarget', () => vactis.saveBridgeGoalMonthlyTarget(TOKEN, { mois: '2026-11', value: 10 }), '/api/bridge-to-goal/target', 'PUT'],
  ['vactis.mettreAJourStatutReclamation', () => vactis.mettreAJourStatutReclamation(TOKEN, 9, { statut: 'TRAITEE' }), '/api/reclamations/9/statut', 'PATCH'],
  ['vactis.creerReclamation', () => vactis.creerReclamation(TOKEN, { medecinId: 7 }), '/api/reclamations', 'POST'],
  ['vactis.getReclamationHistorique', () => vactis.getReclamationHistorique(TOKEN, 9), '/api/reclamations/9/historique', 'GET'],
  ['vactis.marquerNotificationLue', () => vactis.marquerNotificationLue(TOKEN, 2), '/api/notifications/2/lire', 'PATCH'],
  ['medecins.getMedecinById', () => medecins.getMedecinById(TOKEN, 7), '/api/medecins/7', 'GET'],
  ['medecins.patchNoteInput', () => medecins.patchNoteInput(TOKEN, 7, 4), '/api/medecins/7/note-input', 'PATCH'],
  ['medecins.getFiche360', () => medecins.getFiche360(TOKEN, 7), '/api/medecins/7/fiche-360', 'GET'],
  ['auth.getProfile', () => auth.getProfile(TOKEN), '/api/auth/profile', 'GET'],
  ['auth.changePassword', () => auth.changePassword(TOKEN, 'ancien', 'Nouveau-2026'), '/api/auth/change-password', 'POST'],
];

describe('Contrat de la couche API', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(appels)('%s : route, méthode et jeton', async (_nom, appeler, chemin, methode) => {
    fetch.mockResolvedValue(ok());
    await appeler();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options = {}] = fetch.mock.calls[0];
    expect(url.startsWith(`${API_BASE}${chemin}`)).toBe(true);
    expect((options.method ?? 'GET').toUpperCase()).toBe(methode);
    const entetes = new Headers(options.headers);
    expect(entetes.get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it.each(appels)('%s : remonte le message d’erreur du serveur', async (_nom, appeler) => {
    fetch.mockResolvedValue(ko(403, { message: 'Accès refusé à cette ressource' }));
    await expect(appeler()).rejects.toThrow('Accès refusé à cette ressource');
  });
});

describe('API d’authentification', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('la connexion n’envoie pas de jeton et renvoie celui du serveur', async () => {
    fetch.mockResolvedValue(ok({ token: 'nouveau' }));
    await expect(auth.login('direction', 'secret')).resolves.toEqual({ token: 'nouveau' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/auth/login`);
    expect(options.headers.Authorization).toBeUndefined();
    expect(JSON.parse(options.body)).toEqual({ username: 'direction', password: 'secret' });
  });

  it('un échec de connexion transmet tentatives restantes et verrouillage', async () => {
    fetch.mockResolvedValue(ko(401, { code: 'BAD_CREDENTIALS', message: 'Identifiants invalides', remainingAttempts: 2, maxAttempts: 3 }));
    const echec = await auth.login('x', 'y').catch((e) => e);
    expect(echec).toBeInstanceOf(auth.AuthError);
    expect(echec).toMatchObject({ code: 'BAD_CREDENTIALS', remainingAttempts: 2, maxAttempts: 3, status: 401 });

    fetch.mockResolvedValue(ko(423, { code: 'ACCOUNT_LOCKED', message: 'Compte suspendu', lockMinutes: 15, remainingSeconds: 840 }));
    const verrou = await auth.login('x', 'y').catch((e) => e);
    expect(verrou).toMatchObject({ code: 'ACCOUNT_LOCKED', lockMinutes: 15, remainingSeconds: 840 });
  });

  it('une réponse d’erreur non JSON garde un message lisible', async () => {
    fetch.mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway', json: async () => { throw new Error('html'); } });
    await expect(auth.getProfile(TOKEN)).rejects.toThrow('Bad Gateway');
  });

  it('l’état du compte est public et renvoie null en cas d’erreur', async () => {
    fetch.mockResolvedValue(ok({ suspended: false, remainingAttempts: 3 }));
    await expect(auth.getAccountStatus('  commercial1 ')).resolves.toEqual({ suspended: false, remainingAttempts: 3 });
    expect(fetch.mock.calls[0][0]).toBe(`${API_BASE}/api/auth/account-status?username=commercial1`);

    fetch.mockResolvedValue(ko(500, {}));
    await expect(auth.getAccountStatus('commercial1')).resolves.toBeNull();
  });
});
