import { cloneElement } from 'react';

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
  compass: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  ),
  users: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4" />
    </svg>
  ),
  database: (
    <svg {...iconProps}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
    </svg>
  ),
  roles: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="m17 11 1.5 1.5L22 9" />
    </svg>
  ),
  controle: (
    <svg {...iconProps}>
      <path d="M12 2 3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  chart: (
    <svg {...iconProps}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 4 6-8" />
    </svg>
  ),
  target: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  building: (
    <svg {...iconProps}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M4 22h16" />
      <path d="M10 8h4M10 12h4M10 16h4" />
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
  pilotage: 'compass',
  'portefeuille-medecins': 'stethoscope',
  'terrain-actions': 'target',
  'qualite-des-donnees': 'controle',
  administration: 'building',
  accueil: 'home',
  house: 'home',
  chart: 'chart',
  'bar-chart': 'dashboard',
  'bar-chart-3': 'dashboard',
  'layout-dashboard': 'dashboard',
  'pie-chart': 'chart',
  gauge: 'dashboard',
  'gauge-circle': 'compass',
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
  'clipboard-list': 'clipboard',
  'clipboard-check': 'clipboard',
  'list-todo': 'clipboard',
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
  shield: 'controle',
  controle: 'controle',
  'shield-check': 'controle',
  role: 'roles',
  users: 'users',
  regle: 'controle',
  regles: 'controle',
  settings: 'settings',
  cog: 'settings',
  gear: 'settings',
  sliders: 'settings',
  'sliders-horizontal': 'settings',
  parametres: 'settings',
  'parametres-systeme': 'settings',
  wrench: 'settings',
  target: 'target',
  crosshair: 'target',
  building: 'building',
  'building-2': 'building',
};

function normalizeIconKey(icon) {
  if (!icon) return '';

  const key = String(icon)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return iconAliases[key] ?? key;
}

function resolveIconKey(...candidates) {
  for (const candidate of candidates) {
    const key = normalizeIconKey(candidate);
    if (key && icons[key]) return key;
  }
  return 'default';
}

export function MenuIcon({ name, fallback }) {
  const key = resolveIconKey(name, fallback);
  return cloneElement(icons[key] ?? icons.default);
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
