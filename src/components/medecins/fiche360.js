// Fiche médecin 360° : mise en forme partagée par les onglets du tiroir.

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août',
  'sept.', 'oct.', 'nov.', 'déc.'];

export const TYPES_EVENEMENT = {
  VISITE: 'Visite',
  ACTION: 'Action',
  RECLAMATION: 'Réclamation',
  STATUT: 'Statut',
  ALERTE: 'Alerte',
};

/** « 2026-01-15 » → « 15/01/2026 ». */
export function formaterDate(iso) {
  if (!iso) return '—';
  const [a, m, j] = String(iso).split('-');
  return a && m && j ? `${j.slice(0, 2)}/${m}/${a}` : String(iso);
}

/** « 2026-01 » → « janv. 2026 » (court) ou « janvier 2026 ». */
export function libelleMois(mois, court = false) {
  const [a, m] = String(mois ?? '').split('-').map(Number);
  if (!a || !m || m < 1 || m > 12) return mois ?? '—';
  return `${(court ? MOIS_COURTS : MOIS)[m - 1]} ${a}`;
}

/** « actif_stable » → « Actif stable ». */
export function libelleStatut(code) {
  if (!code) return '—';
  const texte = String(code).replaceAll('_', ' ').toLowerCase();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export function formaterMad(valeur) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(valeur) || 0)} MAD`;
}

/** Frise regroupée par mois (du plus récent au plus ancien), événements sans date à la fin. */
export function grouperParMois(evenements) {
  const groupes = [];
  const index = new Map();
  for (const evenement of evenements ?? []) {
    const cle = evenement.date ? String(evenement.date).slice(0, 7) : 'sans-date';
    if (!index.has(cle)) {
      const groupe = { cle, libelle: cle === 'sans-date' ? 'Sans date' : libelleMois(cle), evenements: [] };
      index.set(cle, groupe);
      groupes.push(groupe);
    }
    index.get(cle).evenements.push(evenement);
  }
  return groupes.sort((a, b) => {
    if (a.cle === 'sans-date') return 1;
    if (b.cle === 'sans-date') return -1;
    return b.cle.localeCompare(a.cle);
  });
}

/** Filtre de la frise par type d'événement ('TOUS' pour tout afficher). */
export function filtrerEvenements(evenements, type) {
  return type === 'TOUS' ? (evenements ?? []) : (evenements ?? []).filter((e) => e.type === type);
}

/** Hauteur relative (0-100) de la barre de CA de chaque mois. */
export function hauteursBarres(mois) {
  const max = Math.max(0, ...(mois ?? []).map((m) => Number(m.ca) || 0));
  return (mois ?? []).map((m) => (max === 0 ? 0 : Math.round(((Number(m.ca) || 0) / max) * 100)));
}
