import { describe, expect, it } from 'vitest';
import { filtrerEvenements, formaterDate, grouperParMois, hauteursBarres, libelleMois, libelleStatut } from './fiche360.js';
import { nomFichierPdf } from '../../api/medecins.js';

describe('fiche360', () => {
  it('formate dates, mois et statuts', () => {
    expect(formaterDate('2026-01-15')).toBe('15/01/2026');
    expect(formaterDate(null)).toBe('—');
    expect(libelleMois('2026-01')).toBe('janvier 2026');
    expect(libelleMois('2026-01', true)).toBe('janv. 2026');
    expect(libelleStatut('actif_stable')).toBe('Actif stable');
  });

  it('regroupe la frise par mois du plus récent au plus ancien', () => {
    const groupes = grouperParMois([
      { type: 'VISITE', date: '2025-12-05' },
      { type: 'STATUT', date: '2026-01-01' },
      { type: 'ACTION', date: null },
      { type: 'RECLAMATION', date: '2025-12-18' },
    ]);
    expect(groupes.map((g) => g.libelle)).toEqual(['janvier 2026', 'décembre 2025', 'Sans date']);
    expect(groupes[1].evenements).toHaveLength(2);
    expect(filtrerEvenements([{ type: 'VISITE' }, { type: 'ACTION' }], 'ACTION')).toEqual([{ type: 'ACTION' }]);
  });

  it('calcule la hauteur relative des barres de CA', () => {
    expect(hauteursBarres([{ ca: 500 }, { ca: 1000 }, { ca: 0 }])).toEqual([50, 100, 0]);
    expect(hauteursBarres([{ ca: 0 }])).toEqual([0]);
  });

  it('reprend le nom de fichier proposé par le serveur', () => {
    expect(nomFichierPdf('attachment; filename="fiche-360-chraibi-imane-2026-11-24.pdf"', 7))
      .toBe('fiche-360-chraibi-imane-2026-11-24.pdf');
    expect(nomFichierPdf(null, 7)).toBe('fiche-360-medecin-7.pdf');
  });
});
