// Alertes de fin de cycle : libellés, échéance et regroupements partagés par la cloche,
// la page Alertes, la page Actions et les tableaux de bord.

export const TYPES_ALERTE = {
  ACTION_NON_VISITEE: { label: 'Actions non visitées', route: '/actions' },
  RETOUR_A_QUALIFIER: { label: 'Retours à qualifier', route: '/actions' },
  RECLAMATION_EN_ATTENTE: { label: 'Réclamations en attente', route: '/reclamations' },
  REALISATION_FAIBLE: { label: 'Réalisations faibles', route: '/suivi-equipe' },
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-11 » → « novembre 2026 ». */
export function libelleCycle(cycle) {
  const [annee, mois] = String(cycle ?? '').split('-').map(Number);
  if (!annee || !mois || mois < 1 || mois > 12) return cycle ?? '';
  return `${MOIS[mois - 1]} ${annee}`;
}

/** Phrase d'échéance : « Clôture du cycle novembre 2026 dans 6 jours ». */
export function libelleEcheance(reponse) {
  if (!reponse?.cycle || reponse.joursRestants == null) return 'Aucun cycle en cours';
  const cycle = libelleCycle(reponse.cycle);
  const jours = reponse.joursRestants;
  if (jours < 0) return `Cycle ${cycle} clos depuis ${-jours} jour${jours < -1 ? 's' : ''}`;
  if (jours === 0) return `Clôture du cycle ${cycle} aujourd'hui`;
  return `Clôture du cycle ${cycle} dans ${jours} jour${jours > 1 ? 's' : ''}`;
}

/** Pastille courte : J-6, J-0, clos. */
export function pastilleEcheance(reponse) {
  if (reponse?.joursRestants == null) return '';
  return reponse.joursRestants < 0 ? 'Clos' : `J-${reponse.joursRestants}`;
}

/** Alertes remontées dans la cloche : seulement dans la fenêtre de fin de cycle (J-7). */
export function alertesCloche(reponse) {
  return reponse?.fenetreActive ? (reponse.alertes ?? []) : [];
}

/** Nombre d'alertes par type, dans l'ordre d'affichage, sans les types vides. */
export function resumeParType(alertes) {
  return Object.entries(TYPES_ALERTE)
    .map(([type, { label, route }]) => ({
      type,
      label,
      route,
      count: (alertes ?? []).filter((a) => a.type === type).length,
      urgent: (alertes ?? []).some((a) => a.type === type && a.gravite === 'URGENT'),
    }))
    .filter((ligne) => ligne.count > 0);
}

/** Identifiants des actions du cycle encore non visitées (badge de la page Actions). */
export function actionsAVisiter(reponse) {
  return new Set((reponse?.alertes ?? [])
    .filter((a) => a.type === 'ACTION_NON_VISITEE' && a.actionId != null)
    .map((a) => a.actionId));
}

/** Filtre de la page Alertes par type, gravité et texte libre (médecin, commercial, détail). */
export function filtrerAlertes(alertes, { type = 'TOUS', gravite = 'TOUS', recherche = '' } = {}) {
  const texte = recherche.trim().toLowerCase();
  return (alertes ?? []).filter((a) => {
    if (type !== 'TOUS' && a.type !== type) return false;
    if (gravite !== 'TOUS' && a.gravite !== gravite) return false;
    if (!texte) return true;
    return [a.medecinNom, a.commercial, a.detail, a.libelle]
      .some((champ) => String(champ ?? '').toLowerCase().includes(texte));
  });
}
