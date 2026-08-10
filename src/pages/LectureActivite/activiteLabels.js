const VACTIS_STATUT_META = {
  progression: {
    label: 'Progression',
    description: 'CA du mois supérieur de plus de 10 % par rapport au mois précédent.',
    tone: 'green',
  },
  actif_stable: {
    label: 'Actif stable',
    description: 'Activité régulière : CA stable (entre −5 % et +10 %) ou reprise après absence en M−1.',
    tone: 'green',
  },
  surveillance: {
    label: 'Surveillance',
    description: 'Légère baisse d\'activité : CA entre −20 % et −5 % par rapport au mois précédent.',
    tone: 'amber',
  },
  retention: {
    label: 'Rétention',
    description: 'Risque commercial : CA en baisse de 20 % à 70 % par rapport au mois précédent.',
    tone: 'red',
  },
  silence_critique: {
    label: 'Silence critique',
    description: 'Signal radio critique : CA en chute de plus de 70 % par rapport au mois précédent.',
    tone: 'red',
  },
  onboarding: {
    label: 'Onboarding',
    description: 'Nouveau médecin intégré au portefeuille avec une première activité constatée sur le mois.',
    tone: 'blue',
  },
  a_reactiver: {
    label: 'À réactiver',
    description: 'Médecin historiquement actif mais sans CA sur le mois courant.',
    tone: 'amber',
  },
  exclu: {
    label: 'Exclu',
    description: 'Médecin sans activité récente et hors cycle actif du portefeuille.',
    tone: 'gray',
  },
  non_observable: {
    label: 'Non observable',
    description: 'Statut M+1 non calculable : mois suivant non clôturé ou données insuffisantes.',
    tone: 'amber',
  },
};

const TYPE_VISITE_META = {
  fidelisation: {
    label: 'Fidélisation',
    description: 'Visite de consolidation auprès d\'un médecin en progression ou actif stable.',
    tone: 'green',
  },
  retention: {
    label: 'Rétention',
    description: 'Visite ciblée sur un médecin à risque de perte d\'activité.',
    tone: 'red',
  },
  prospection: {
    label: 'Prospection',
    description: 'Visite de découverte ou d\'intégration d\'un nouveau potentiel.',
    tone: 'blue',
  },
  diagnostic: {
    label: 'Diagnostic',
    description: 'Visite d\'analyse pour comprendre une baisse ou un signal de surveillance.',
    tone: 'amber',
  },
  reconnaissance: {
    label: 'Reconnaissance',
    description: 'Visite de reconnaissance ou de remerciement auprès du médecin.',
    tone: 'purple',
  },
  urgence_silence: {
    label: 'Urgence silence',
    description: 'Visite prioritaire face à un silence radio ou une urgence commerciale.',
    tone: 'red',
  },
  autre: {
    label: 'Autre',
    description: 'Visite non classée dans les types standards du référentiel VACTIS.',
    tone: 'gray',
  },
};

const TYPE_ACTION_PATTERNS = [
  { match: /onboarding/, ...TYPE_VISITE_META.prospection, label: 'Onboarding', description: 'Première visite ou intégration d\'un nouveau médecin au portefeuille.' },
  { match: /urgence_silence|urgence|silence/, ...TYPE_VISITE_META.urgence_silence },
  { match: /fidelisation|fidel/, ...TYPE_VISITE_META.fidelisation },
  { match: /retention/, ...TYPE_VISITE_META.retention },
  { match: /prospect/, ...TYPE_VISITE_META.prospection },
  { match: /diagnostic|surveillance/, ...TYPE_VISITE_META.diagnostic },
  { match: /reconnaissance/, ...TYPE_VISITE_META.reconnaissance },
];

const QUALIFICATION_META = {
  favorable: {
    label: 'Favorable',
    description: 'Qualification terrain positive déclarée par le commercial après la visite.',
    tone: 'green',
  },
  defavorable: {
    label: 'Défavorable',
    description: 'Frein, refus ou retour négatif déclaré lors de la visite terrain.',
    tone: 'red',
  },
  non_renseigne: {
    label: 'Non renseigné',
    description: 'Aucune qualification commerciale saisie sur le retour terrain.',
    tone: 'gray',
  },
};

const EVOLUTION_META = {
  FAVORABLE: {
    label: 'Favorable',
    description: 'Statut VACTIS amélioré entre M et M+1 (meilleur rang observé).',
    tone: 'green',
  },
  STABLE: {
    label: 'Stable',
    description: 'Statut VACTIS inchangé entre le mois de la visite (M) et le mois suivant (M+1).',
    tone: 'gray',
  },
  DEFAVORABLE: {
    label: 'Défavorable',
    description: 'Statut VACTIS dégradé entre M et M+1 (rang moins favorable).',
    tone: 'red',
  },
  NON_OBSERVABLE: {
    label: 'Non observable',
    description: 'Comparaison M / M+1 impossible : données du mois suivant non disponibles.',
    tone: 'amber',
  },
};

function normalizeKey(value) {
  return (value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function formatFallbackLabel(value) {
  return normalizeKey(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fallbackMeta(value, prefix) {
  const label = formatFallbackLabel(value);
  return {
    label: label || '—',
    description: prefix ? `${prefix} : ${label || value}.` : (value || 'Information non disponible.'),
    tone: 'gray',
  };
}

export function getVactisStatutMeta(value) {
  const key = normalizeKey(value);
  return VACTIS_STATUT_META[key] || fallbackMeta(value, 'Statut VACTIS');
}

export function getTypeActionMeta(typeActionVisite, typeVisite) {
  const raw = normalizeKey(typeActionVisite);

  for (const pattern of TYPE_ACTION_PATTERNS) {
    if (pattern.match.test(raw)) {
      return {
        label: pattern.label,
        description: pattern.description,
        tone: pattern.tone,
      };
    }
  }

  const typeVisiteKey = normalizeKey(typeVisite);
  if (TYPE_VISITE_META[typeVisiteKey]) {
    return TYPE_VISITE_META[typeVisiteKey];
  }

  return fallbackMeta(raw.replace(/^visite_/, ''), 'Type de visite');
}

export function getQualificationMeta(value) {
  const key = normalizeKey(value);
  return QUALIFICATION_META[key] || fallbackMeta(value, 'Qualification terrain');
}

export function getEvolutionMeta(value) {
  const key = (value || '').toUpperCase();
  return EVOLUTION_META[key] || fallbackMeta(value, 'Évolution observée');
}
