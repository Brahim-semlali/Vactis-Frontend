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
  const baisses = data?.rapportBaisses ?? {};
  const points = [];
  const sansVisite = decisions.actionsSansVisite?.length ?? 0;
  if (sansVisite > 0) {
    points.push(`Vérifier les ${sansVisite} action(s) sans retour rapproché, puis planifier celles qui restent à réaliser.`);
  }
  if (decisions.retoursDefavorables > 0) {
    points.push(`Reprendre les ${decisions.retoursDefavorables} échange(s) défavorable(s) avec le commercial concerné.`);
  }
  if (decisions.baissesObservees > 0) {
    const repetees = baisses.medecinsBaissesRepetees > 0 ? `, en commençant par les ${baisses.medecinsBaissesRepetees} en baisse sur plusieurs mois` : '';
    points.push(`Revoir les médecins dont le statut a baissé${repetees}.`);
  }
  if (decisions.baissesMalgreFavorable > 0) {
    points.push(`Confronter les ${decisions.baissesMalgreFavorable} retour(s) favorable(s) suivis d'une baisse aux données du laboratoire.`);
  }
  if (decisions.retoursACompleter > 0) {
    points.push(`Compléter les ${decisions.retoursACompleter} retour(s) terrain avant d'évaluer les résultats.`);
  }
  if (synthese.prospects > 0) {
    points.push(`Suivre les ${synthese.prospects} prospect(s) saisi(s) hors VACTIS dans Zone intelligence.`);
  }
  if (points.length === 0) return ['Aucun point bloquant relevé sur la période sélectionnée.'];
  points.push('Définir les priorités par médecin ou par type d’action pour organiser le prochain cycle.');
  return points;
}

/** Évolution du statut après les visites faites seul : progression, stabilité, baisse (en % des comparables). */
export function evolutionSeul(ligne) {
  const comparables = ligne?.comparablesSeul ?? 0;
  const hausse = ligne?.progressionsSeul ?? 0;
  const stable = ligne?.stablesSeul ?? 0;
  const baisse = ligne?.baissesSeul ?? 0;
  return {
    comparables,
    hausse,
    stable,
    baisse,
    pctHausse: pourcentage(hausse, comparables),
    pctStable: pourcentage(stable, comparables),
    pctBaisse: pourcentage(baisse, comparables),
  };
}

/** Part des échanges faits seul qualifiés favorables. */
export function tauxFavorableSeul(ligne) {
  return pourcentage(ligne?.retoursFavorablesSeul ?? 0, ligne?.echangesSeul ?? 0);
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
