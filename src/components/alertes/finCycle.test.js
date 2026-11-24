import { describe, expect, it } from 'vitest';
import {
  actionsAVisiter,
  alertesCloche,
  filtrerAlertes,
  libelleCycle,
  libelleEcheance,
  pastilleEcheance,
  resumeParType,
} from './finCycle.js';

const alertes = [
  { type: 'ACTION_NON_VISITEE', gravite: 'URGENT', actionId: 1, medecinNom: 'ALAOUI', commercial: 'Commercial 1' },
  { type: 'ACTION_NON_VISITEE', gravite: 'ATTENTION', actionId: 2, medecinNom: 'BENNANI', commercial: 'Commercial 2' },
  { type: 'RECLAMATION_EN_ATTENTE', gravite: 'ATTENTION', reclamationId: 9, medecinNom: 'CHRAIBI', detail: 'Ouverte depuis 10 jours' },
];

describe('finCycle', () => {
  it('formule l’échéance du cycle', () => {
    expect(libelleCycle('2026-11')).toBe('novembre 2026');
    expect(libelleEcheance({ cycle: '2026-11', joursRestants: 6 })).toBe('Clôture du cycle novembre 2026 dans 6 jours');
    expect(libelleEcheance({ cycle: '2026-11', joursRestants: 1 })).toBe('Clôture du cycle novembre 2026 dans 1 jour');
    expect(libelleEcheance({ cycle: '2026-11', joursRestants: 0 })).toBe("Clôture du cycle novembre 2026 aujourd'hui");
    expect(libelleEcheance({ cycle: '2026-10', joursRestants: -3 })).toBe('Cycle octobre 2026 clos depuis 3 jours');
    expect(libelleEcheance({ cycle: null })).toBe('Aucun cycle en cours');
    expect(pastilleEcheance({ joursRestants: 6 })).toBe('J-6');
    expect(pastilleEcheance({ joursRestants: -1 })).toBe('Clos');
  });

  it('ne remonte les alertes dans la cloche qu’à partir de J-7', () => {
    expect(alertesCloche({ fenetreActive: true, alertes })).toHaveLength(3);
    expect(alertesCloche({ fenetreActive: false, alertes })).toEqual([]);
    expect(alertesCloche(null)).toEqual([]);
  });

  it('regroupe par type en signalant l’urgence', () => {
    expect(resumeParType(alertes).map(({ type, count, urgent }) => ({ type, count, urgent }))).toEqual([
      { type: 'ACTION_NON_VISITEE', count: 2, urgent: true },
      { type: 'RECLAMATION_EN_ATTENTE', count: 1, urgent: false },
    ]);
    expect(actionsAVisiter({ alertes })).toEqual(new Set([1, 2]));
  });

  it('filtre par type, gravité et texte', () => {
    expect(filtrerAlertes(alertes, { type: 'ACTION_NON_VISITEE' })).toHaveLength(2);
    expect(filtrerAlertes(alertes, { gravite: 'URGENT' })).toHaveLength(1);
    expect(filtrerAlertes(alertes, { recherche: 'commercial 2' }).map((a) => a.actionId)).toEqual([2]);
    expect(filtrerAlertes(alertes, { recherche: '10 jours' }).map((a) => a.reclamationId)).toEqual([9]);
  });
});
