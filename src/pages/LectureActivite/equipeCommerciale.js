// Fonctions pures de l'onglet « Équipe commerciale » (Lecture activité)

/** Convertit une plage de mois (yyyy-MM) en dates ISO de début et de fin incluses. */
export function bornesMois(debutMois, finMois) {
  let [de, a] = [debutMois || null, finMois || null];
  if (de && a && de > a) [de, a] = [a, de];
  let fin = null;
  if (a) {
    const [annee, mois] = a.split('-').map(Number);
    const dernierJour = new Date(annee, mois, 0).getDate();
    fin = `${a}-${String(dernierJour).padStart(2, '0')}`;
  }
  return { debut: de ? `${de}-01` : null, fin };
}

export function libelleMois(mois) {
  if (!mois) return '';
  const [annee, m] = mois.split('-').map(Number);
  return new Date(annee, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function pourcentage(valeur, total) {
  if (!total) return 0;
  return Math.round((valeur * 100) / total);
}

/** Pistes pour le prochain point d'équipe, dérivées des compteurs : jamais un jugement sur un commercial. */
export function pointsDecision(data) {
  const synthese = data?.synthese ?? {};
  const decisions = data?.decisions ?? {};
  const points = [];
  const sansVisite = decisions.actionsSansVisite?.length ?? 0;
  if (sansVisite > 0) {
    points.push(`Planifier les ${sansVisite} action(s) encore sans visite et vérifier leur commercial prioritaire.`);
  }
  if (synthese.relais > 0) {
    points.push(`Examiner les ${synthese.relais} relais et ajuster les priorités si la charge est déséquilibrée.`);
  }
  if (decisions.refusOuReclamations > 0 || decisions.baissesObservees > 0) {
    points.push('Reprendre les médecins avec refus, réclamation ou baisse observée.');
  }
  if (decisions.retoursACompleter > 0) {
    points.push(`Compléter les ${decisions.retoursACompleter} retour(s) terrain avant d'évaluer les résultats.`);
  }
  if (synthese.prospects > 0) {
    points.push(`Suivre les ${synthese.prospects} prospect(s) saisi(s) hors VACTIS dans Zone intelligence.`);
  }
  if (points.length === 0) points.push('Aucun point bloquant relevé sur la période sélectionnée.');
  return points;
}

/** Nature d'un passage pour l'affichage : VACTIS, hors VACTIS ou service. */
export function naturePassage(visite) {
  if (visite?.vactis) return 'VACTIS';
  if (visite?.service) return 'Service';
  return 'Hors VACTIS';
}

export function filtrerVisites(visites, { recherche = '', nature = 'TOUS' } = {}) {
  const terme = recherche.trim().toLowerCase();
  return (visites ?? []).filter((v) => {
    if (nature === 'VACTIS' && !v.vactis) return false;
    if (nature === 'HORS_VACTIS' && (v.vactis || v.service)) return false;
    if (nature === 'SERVICE' && !v.service) return false;
    if (!terme) return true;
    return [v.medecinNom, v.commercial, v.commercialAppui, v.commentaire]
      .some((champ) => (champ ?? '').toLowerCase().includes(terme));
  });
}
