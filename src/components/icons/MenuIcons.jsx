const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const icons = {
  home: (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  ),
  dashboard: (
    <svg {...iconProps}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20V8" />
    </svg>
  ),
  mail: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  activity: (
    <svg {...iconProps}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  stethoscope: (
    <svg {...iconProps}>
      <path d="M4.5 3v3a5 5 0 0 0 5 5h1a5 5 0 0 0 5-5V3" />
      <path d="M8 15a6 6 0 0 0 12 0v-2" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
  clipboard: (
    <svg {...iconProps}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  alert: (
    <svg {...iconProps}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  lightbulb: (
    <svg {...iconProps}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.5 14a6.5 6.5 0 1 1 7 0c-.8.8-1.5 1.6-1.5 2.7V18H10v-1.3c0-1.1-.7-1.9-1.5-2.7Z" />
    </svg>
  ),
  diamond: (
    <svg {...iconProps}>
      <path d="M6 3h12l4 7-10 11L2 10l4-7Z" />
      <path d="M2 10h20" />
      <path d="M12 21 6 10" />
      <path d="M12 21l6-11" />
      <path d="M6 3l6 7 6-7" />
    </svg>
  ),
  map: (
    <svg {...iconProps}>
      <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  ),
  copy: (
    <svg {...iconProps}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  layers: (
    <svg {...iconProps}>
      <path d="m12 2 8 4-8 4-8-4 8-4Z" />
      <path d="m4 10 8 4 8-4" />
      <path d="m4 14 8 4 8-4" />
    </svg>
  ),
  export: (
    <svg {...iconProps}>
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v7H3V3h7" />
    </svg>
  ),
  monitor: (
    <svg {...iconProps}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  ),
  default: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  ),
};

const iconAliases = {
  accueil: 'home',
  house: 'home',
  'bar-chart': 'dashboard',
  gauge: 'dashboard',
  rapport: 'mail',
  envelope: 'mail',
  document: 'mail',
  pulse: 'activity',
  lecture: 'activity',
  medecins: 'stethoscope',
  medecin: 'stethoscope',
  doctor: 'stethoscope',
  actions: 'clipboard',
  checklist: 'clipboard',
  alertes: 'alert',
  bell: 'alert',
  warning: 'alert',
  recommandations: 'lightbulb',
  valeur: 'diamond',
  gem: 'diamond',
  zone: 'map',
  location: 'map',
  'map-pin': 'map',
  qualite: 'copy',
  doublons: 'copy',
  batches: 'layers',
  stack: 'layers',
  exports: 'export',
  download: 'export',
  statut: 'monitor',
  api: 'monitor',
  shield: 'monitor',
};

function normalizeIconKey(icon) {
  if (!icon) return 'default';

  const key = icon
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return iconAliases[key] ?? key;
}

export function MenuIcon({ name }) {
  const key = normalizeIconKey(name);
  return icons[key] ?? icons.default;
}

export function VactisLogo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 16c0-5.523 4.477-10 10-10 2.8 0 5.33 1.15 7.15 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M26 16c0 5.523-4.477 10-10 10-2.8 0-5.33-1.15-7.15-3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
