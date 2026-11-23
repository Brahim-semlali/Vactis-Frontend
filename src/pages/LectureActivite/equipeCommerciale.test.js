import { describe, expect, it } from 'vitest';
import { bornesMois, filtrerVisites, naturePassage, pointsDecision, pourcentage } from './equipeCommerciale.js';

describe('equipeCommerciale', () => {
  it('convertit une plage de mois en dates incluses, dans l’ordre', () => {
    expect(bornesMois('2026-10', '2026-11')).toEqual({ debut: '2026-10-01', fin: '2026-11-30' });
    expect(bornesMois('2028-02', '2028-02')).toEqual({ debut: '2028-02-01', fin: '2028-02-29' });
    expect(bornesMois('2026-11', '2026-09')).toEqual({ debut: '2026-09-01', fin: '2026-11-30' });
    expect(bornesMois('', '')).toEqual({ debut: null, fin: null });
  });

  it('calcule un pourcentage sans diviser par zéro', () => {
    expect(pourcentage(8, 9)).toBe(89);
    expect(pourcentage(3, 0)).toBe(0);
  });

  it('distingue VACTIS, hors VACTIS et passages de service', () => {
    expect(naturePassage({ vactis: true })).toBe('VACTIS');
    expect(naturePassage({ vactis: false, service: true })).toBe('Service');
    expect(naturePassage({ vactis: false, service: false })).toBe('Hors VACTIS');
  });

  it('filtre les passages par nature et par texte', () => {
    const visites = [
      { retourTerrainId: 1, vactis: true, medecinNom: 'Dr ALAOUI', commercial: 'Commercial 1' },
      { retourTerrainId: 2, vactis: false, service: true, medecinNom: 'Dr BENNANI', commercial: 'Commercial 2' },
      { retourTerrainId: 3, vactis: false, service: false, medecinNom: 'Dr CHRAIBI', commercial: 'Commercial 2', commentaire: 'Délais' },
    ];
    expect(filtrerVisites(visites, { nature: 'HORS_VACTIS' }).map((v) => v.retourTerrainId)).toEqual([3]);
    expect(filtrerVisites(visites, { nature: 'SERVICE' }).map((v) => v.retourTerrainId)).toEqual([2]);
    expect(filtrerVisites(visites, { recherche: 'délais' }).map((v) => v.retourTerrainId)).toEqual([3]);
  });

  it('propose des points de décision à partir des compteurs', () => {
    const points = pointsDecision({
      synthese: { relais: 3, prospects: 2 },
      decisions: { actionsSansVisite: [{}, {}], refusOuReclamations: 1, baissesObservees: 0, retoursACompleter: 4 },
    });
    expect(points).toHaveLength(5);
    expect(points[0]).toContain('2 action(s)');
    expect(pointsDecision({ synthese: {}, decisions: {} })).toEqual(['Aucun point bloquant relevé sur la période sélectionnée.']);
  });
});
