import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMedecinByCode, getMedecins, patchNoteInput } from '../../api/medecins.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';

// UI components shadcn/ui
import { Card } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { CustomSelect } from '../../components/ui/select.jsx';
import { Skeleton } from '../../components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.jsx';

const FILTER_DEFAULTS = {
  search: '',
  codeMedecin: '',
  statutPilotage: '',
  segment: '',
  specialite: '',
  risqueUrgence: '',
  organisme: '',
  sansNoteInput: false,
};

const KPI_ITEMS = [
  { id: 'total', key: 'total', label: 'Total médecins', icon: 'users', variant: 'default', tone: 'sky' },
  { id: 'segments', key: 'segmentsAB', label: 'Segments A/B', icon: 'chart', variant: 'default', tone: 'emerald' },
  { id: 'sansNote', key: 'sansNoteInput', label: 'Sans note potentielle', icon: 'star', variant: 'default', tone: 'amber' },
  { id: 'surveillance', key: 'surveillance', label: 'Surveillance', icon: 'warning', tone: 'amber', variant: 'default' },
  { id: 'onboarding', key: 'onboarding', label: 'Onboarding', icon: 'search', tone: 'blue', variant: 'default' },
  { id: 'silence', key: 'silenceCritique', label: 'Silence critique', icon: 'alert', tone: 'red', variant: 'default' },
];

const TABLE_COLUMNS = [
  'Médecin',
  'Lieu / organisme',
  'Segment',
  'Statut',
  'Note potentielle',
  'CA mobil.',
  '',
];

const RISQUE_OPTIONS = ['FAIBLE', 'MOYEN', 'ELEVE', 'URGENT'];

function MedecinsIcon({ name, size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'refresh':
      return (
        <svg {...props}>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'reset':
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-3" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...props}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...props}>
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
        </svg>
      );
    case 'trend':
      return (
        <svg {...props}>
          <path d="m4 16 6-6 4 3 6-7" />
          <path d="M15 6h5v5" />
        </svg>
      );
    case 'performance':
      return (
        <svg {...props}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20H2" />
        </svg>
      );
    case 'pie':
      return (
        <svg {...props}>
          <path d="M12 3v9h9" />
          <path d="M20.5 15a9 9 0 1 1-11.5-11" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...props}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4v2a4 4 0 0 0 4 4" />
          <path d="M17 6h3v2a4 4 0 0 1-4 4" />
        </svg>
      );
    case 'map-pin':
      return (
        <svg {...props}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...props}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg {...props}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return null;
  }
}

function formatEnumLabel(value) {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function formatMedecinName(medecin) {
  if (!medecin) return '—';
  return `${medecin.nom ?? ''} ${medecin.prenom ?? ''}`.trim().toUpperCase();
}

function formatCaMois(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString('fr-FR')} MAD`;
}

function formatScore(value) {
  return value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatPotentialSource(source) {
  if (source === 'NOTE_TERRAIN') return 'Note terrain';
  if (source === 'INPUT_PROFIL') return 'Input profil';
  return 'Valeur par défaut (3/5)';
}

function calculateFrequenceJours(segment) {
  if (!segment) return null;
  switch (String(segment).trim().toUpperCase()) {
    case 'A': return 7;
    case 'B': return 10;
    case 'C': return 15;
    case 'D': return 30;
    default: return null;
  }
}

function formatWeightedScore(value, weight) {
  return value == null ? '—' : formatScore(Number(value) * weight);
}

function formatDateTooltip(value) {
  if (!value) return 'date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'date inconnue' : date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

function variationPct(medecin) {
  if (medecin.caBaseline == null || Number(medecin.caBaseline) === 0) return null;
  return ((Number(medecin.caMois ?? 0) - Number(medecin.caBaseline)) / Number(medecin.caBaseline)) * 100;
}

function segmentTooltip(medecin) {
  const segment = medecin.segment || 'Non renseigné';
  if ([medecin.scoreValeur, medecin.potentielSur100, medecin.performanceSur100, medecin.poidsEcoSur100].some((value) => value == null)) {
    return `Segment ${segment} — détail du score indisponible.`;
  }
  return `Segment ${segment} (score ${formatScore(medecin.scoreValeur)}/100) — Potentiel ${formatScore(medecin.potentielSur100)}/100 (40%) + Performance ${formatScore(medecin.performanceSur100)}/100 (40%) + Poids économique ${formatScore(medecin.poidsEcoSur100)}/100 (20%)`;
}

function statutTooltip(medecin) {
  const statut = (medecin.statut || medecin.statutPilotage || 'Non renseigné').replace(/_/g, ' ');
  const normalized = statut.toUpperCase();
  if (normalized === 'ONBOARDING') return `Onboarding — nouveau médecin, première collaboration en ${formatDateTooltip(medecin.datePremiereCollaboration)}.`;
  if (normalized === 'EXCLU') return `Exclu — aucune activité depuis 6 mois (dernière activité : ${formatDateTooltip(medecin.dateDerniereActivite)}).`;
  if (normalized === 'A REACTIVER' || normalized === 'A_REACTIVER') return `À réactiver — aucune activité ce mois, dernière activité en ${formatDateTooltip(medecin.dateDerniereActivite)}.`;
  const variation = medecin.variationMixteSur100 ?? variationPct(medecin);
  if (variation == null) return `${statut} — premier mois d'activité, pas de comparaison possible.`;
  const threshold = normalized === 'SURVEILLANCE' ? 'entre -10% et -40%' : normalized === 'RETENTION' ? 'entre -40% et -70%' : normalized === 'SILENCE CRITIQUE' ? 'inférieure à -70%' : normalized === 'PROGRESSION' ? 'supérieure à +20%' : 'entre -10% et +20%';
  return `${statut} — variation mixte CA/volume : ${formatScore(variation)}% (60% CA + 40% volume ; seuil : ${threshold}).`;
}

function getBadgeVariant(type, value) {
  if (!value) return 'muted';
  const normalized = String(value).toUpperCase();

  if (type === 'segment') {
    if (normalized === 'A') return 'segment-a';
    if (normalized === 'B') return 'segment-b';
    if (normalized === 'C') return 'segment-c';
    if (normalized === 'D') return 'segment-d';
    return 'muted';
  }

  if (normalized === 'SURVEILLANCE') return 'surveillance';
  if (normalized === 'PROGRESSION') return 'progression';
  if (normalized === 'ONBOARDING') return 'onboarding';
  if (normalized === 'SILENCE_CRITIQUE') return 'silence';
  return 'actif';
}

function KpiCardComponent({ label, icon, tone, value, active, onClick }) {
  const toneClasses = {
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    red: 'bg-rose-50 text-rose-700 border-rose-100',
    purple: 'bg-sky-50 text-sky-700 border-sky-100',
  };

  const bgTone = toneClasses[tone] || toneClasses.sky;

  return (
    <motion.div whileHover={{ y: -3, scale: 1.015 }} transition={{ duration: 0.2 }}>
      <Card
        onClick={onClick}
        className={`p-4 sm:p-5 flex items-center justify-between h-full bg-white border rounded-2xl shadow-2xs transition-all ${
          onClick ? 'cursor-pointer' : ''
        } ${
          active
            ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/40 shadow-xs'
            : 'border-slate-200/80 hover:shadow-md'
        }`}
      >
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tight text-slate-900">
            {value ?? '—'}
          </span>
          <span className="text-xs font-semibold pt-0.5 text-slate-500">
            {label}
          </span>
        </div>
        <div className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-center shrink-0 border ${bgTone}`}>
          <MedecinsIcon name={icon} size={20} />
        </div>
      </Card>
    </motion.div>
  );
}

export default function MedecinsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pageData, setPageData] = useState(null);

  // Selection & View Mode state: 'table' or 'detail'
  const [selectedMedecin, setSelectedMedecin] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [openCalculationBlocks, setOpenCalculationBlocks] = useState({
    segment: true,
    statut: true,
    fiabilite: true,
    silence: true,
    risque: true,
  });

  const toggleCalculationBlock = (block) => {
    setOpenCalculationBlocks((current) => ({ ...current, [block]: !current[block] }));
  };

  useEffect(() => {
    if (!isExplanationOpen) return;
    document.querySelectorAll('.calculation-explanation details.group').forEach((detail) => {
      detail.open = true;
    });
  }, [isExplanationOpen, selectedMedecin]);

  // Sauvegarde de la position exacte de scroll avant sélection
  const lastScrollPosition = useRef(0);
  const lastSelectedDoctorIdRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // — Potentiel commercial (noteInput) —
  const [noteInputDraft, setNoteInputDraft] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteSavedTimer = useRef(null);

  const loadMedecins = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const code = filters.codeMedecin.trim().toUpperCase();
      const { codeMedecin: _codeMedecin, ...listFilters } = filters;

      const apiFilters = {
        ...listFilters,
        sansNoteInput: filters.sansNoteInput ? true : undefined,
      };

      if (code) {
        let medecin = null;
        try {
          medecin = await getMedecinByCode(token, code);
        } catch (err) {
          if (err?.status !== 404) throw err;
        }

        if (medecin) {
          let items = [medecin];
          if (filters.sansNoteInput && medecin.noteInput != null) {
            items = [];
          }
          setPageData((current) => ({
            items,
            kpis: current?.kpis ?? {},
            meta: { affiches: items.length, charges: 1 },
            filters: current?.filters ?? {},
          }));
          return;
        }

        const data = await getMedecins(token, { ...apiFilters, search: code });
        let items = data.items ?? [];
        if (filters.sansNoteInput) {
          items = items.filter((m) => m.noteInput === null || m.noteInput === undefined);
        }
        setPageData({
          ...data,
          items,
          meta: { ...(data.meta ?? {}), affiches: items.length },
        });

        if (items.length === 0) {
          setError(`Aucun médecin trouvé pour le code « ${code} ».`);
        }

        return;
      }

      const data = await getMedecins(token, apiFilters);
      let items = data.items ?? [];
      if (filters.sansNoteInput) {
        items = items.filter((m) => m.noteInput === null || m.noteInput === undefined);
      }
      setPageData({
        ...data,
        items,
        meta: { ...(data.meta ?? {}), affiches: items.length },
      });

      setSelectedMedecin((current) => {
        if (!current) return null;
        return items.find((item) => item.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err.message ?? 'Erreur de chargement des médecins');
      setPageData(null);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadMedecins();
  }, [loadMedecins]);

  useEffect(() => {
    if (selectedMedecin) {
      setIsExplanationOpen(false);
      setNoteInputDraft(selectedMedecin?.noteInput ?? null);
      setNoteError(null);
      setNoteSaved(false);
    }
  }, [selectedMedecin?.id]);

  const scrollToSelectedDoctorRow = useCallback((targetId, fallbackPos) => {
    const docId = targetId || lastSelectedDoctorIdRef.current;
    const pos = fallbackPos || lastScrollPosition.current;

    const performScroll = () => {
      if (docId) {
        const rowEl = document.getElementById(`medecin-row-${docId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ block: 'center', behavior: 'auto' });
          // Subtly highlight target row so user immediately sees returned doctor
          rowEl.classList.add('bg-sky-100/90', 'ring-2', 'ring-sky-400');
          setTimeout(() => {
            rowEl.classList.remove('bg-sky-100/90', 'ring-2', 'ring-sky-400');
          }, 1500);
          return true;
        }
      }
      if (pos > 0) {
        window.scrollTo({ top: pos, behavior: 'auto' });
        return true;
      }
      return false;
    };

    performScroll();
    requestAnimationFrame(performScroll);
    const t1 = setTimeout(performScroll, 40);
    const t2 = setTimeout(performScroll, 120);
    const t3 = setTimeout(performScroll, 250);
    const t4 = setTimeout(performScroll, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Scroll automatique garanti à la ligne exacte du médecin sélectionné lors du retour à la table
  useEffect(() => {
    if (viewMode === 'table' && (selectedMedecin?.id || lastSelectedDoctorIdRef.current)) {
      return scrollToSelectedDoctorRow(selectedMedecin?.id, lastScrollPosition.current);
    }
  }, [viewMode, selectedMedecin?.id, scrollToSelectedDoctorRow]);

  const handleSelectMedecin = (medecin) => {
    // Sauvegarder la position exacte de scroll avant d'ouvrir la fiche
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    lastScrollPosition.current = currentScroll;
    lastSelectedDoctorIdRef.current = medecin.id;

    setSelectedMedecin(medecin);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToTable = () => {
    const targetId = selectedMedecin?.id || lastSelectedDoctorIdRef.current;
    const targetPos = lastScrollPosition.current;

    setViewMode('table');
    scrollToSelectedDoctorRow(targetId, targetPos);
  };

  const handleSaveNote = async () => {
    if (!selectedMedecin) return;
    setNoteSaving(true);
    setNoteError(null);
    setNoteSaved(false);
    try {
      const updated = await patchNoteInput(token, selectedMedecin.id, noteInputDraft);
      setSelectedMedecin((prev) => ({ ...prev, noteInput: updated.noteInput }));
      setPageData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((m) =>
                m.id === updated.id ? { ...m, noteInput: updated.noteInput } : m
              ),
            }
          : prev
      );
      setNoteSaved(true);
      clearTimeout(noteSavedTimer.current);
      noteSavedTimer.current = setTimeout(() => setNoteSaved(false), 3000);
    } catch (err) {
      setNoteError(err.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setNoteSaving(false);
    }
  };

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSelectedMedecin(null);
    setViewMode('table');
  };

  const medecins = pageData?.items ?? [];
  const kpis = pageData?.kpis ?? {};
  const meta = pageData?.meta ?? {};
  const filterOptions = pageData?.filters ?? {};

  const countSansNote = kpis.sansNoteInput ?? (pageData?.items ? pageData.items.filter((m) => m.noteInput == null).length : 0);

  return (
    <div className="space-y-6">
      {/* Pure White Clean Hero Section */}
      <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl border border-sky-100">
                <MenuIcon name="medecins" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-sky-700">PORTEFEUILLE MÉDECINS</p>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Médecins</h1>
              </div>
            </div>
            <p className="text-sm text-slate-600 pt-1 max-w-2xl">
              Consultez vos médecins. Cliquez sur un médecin ou sur la flèche <span className="font-bold text-sky-700">→</span> pour consulter son espace complet.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1 font-medium">
              <span>Workbook VACTIS</span>
              <span>•</span>
              <span>Dernière mise à jour — {loading ? '…' : 'maintenant'}</span>
              <span>•</span>
              <span className="font-bold text-sky-700">
                {meta.affiches ?? 0} affichés / {meta.charges ?? 0} chargés
              </span>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/90 font-extrabold text-sm transition-all shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
            onClick={loadMedecins}
            disabled={loading}
          >
            <div className="p-1 bg-sky-200/80 rounded-lg text-sky-800">
              <MedecinsIcon name="refresh" size={16} />
            </div>
            Rafraîchir
          </button>
        </div>
      </Card>

      {/* AFFICHAGE CONDITIONNEL : Masquer les filtres et les KPIs en mode 'detail' */}
      {viewMode === 'table' && (
        <>
          {/* Filters Section */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative w-80 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MedecinsIcon name="search" />
                  </div>
                  <input
                    type="search"
                    placeholder="Rechercher un médecin…"
                    value={filters.search}
                    onChange={updateFilter('search')}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                    aria-label="Rechercher un médecin"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, sansNoteInput: !current.sansNoteInput }))}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                    filters.sansNoteInput
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50/90 text-amber-900 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300'
                  }`}
                  title="Afficher uniquement les médecins sans note potentielle"
                >
                  <MedecinsIcon name="star" size={15} />
                  <span>Sans note potentielle</span>
                  {countSansNote > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      filters.sansNoteInput ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {countSansNote}
                    </span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Code médecin</span>
                  <input
                    type="text"
                    placeholder="MED001"
                    value={filters.codeMedecin}
                    onChange={updateFilter('codeMedecin')}
                    className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <CustomSelect
                  label="Statut"
                  value={filters.statut}
                  onChange={updateFilter('statut')}
                  placeholder="Tous"
                  options={filterOptions.statuts ?? []}
                />
                <CustomSelect
                  label="Segment"
                  value={filters.segment}
                  onChange={updateFilter('segment')}
                  placeholder="Tous"
                  options={filterOptions.segments ?? []}
                />
                <CustomSelect
                  label="Spécialité"
                  value={filters.specialite}
                  onChange={updateFilter('specialite')}
                  placeholder="Toutes"
                  options={filterOptions.specialites ?? []}
                />
                <CustomSelect
                  label="Risque / urgence"
                  value={filters.risqueUrgence}
                  onChange={updateFilter('risqueUrgence')}
                  placeholder="Tous"
                  options={RISQUE_OPTIONS}
                />
                <CustomSelect
                  label="Lieu / organisme"
                  value={filters.organisme}
                  onChange={updateFilter('organisme')}
                  placeholder="Tous"
                  options={filterOptions.organismes ?? []}
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  onClick={resetFilters}
                >
                  <MedecinsIcon name="reset" size={14} />
                  Réinitialiser les filtres
                </button>
              </div>
            </Card>
          </motion.div>

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-2xl bg-white border border-rose-200 text-rose-700 text-sm font-semibold shadow-2xs">
              {error}
            </div>
          )}

          {/* KPI Cards Grid */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Indicateurs médecins">
            {KPI_ITEMS.map(({ id, key: kpiKey, label, icon, tone }) => {
              const isSansNote = id === 'sansNote';
              return (
                <KpiCardComponent
                  key={id}
                  label={label}
                  icon={icon}
                  tone={tone}
                  value={kpis[kpiKey]}
                  active={isSansNote ? filters.sansNoteInput : false}
                  onClick={isSansNote ? () => setFilters((current) => ({ ...current, sansNoteInput: !current.sansNoteInput })) : undefined}
                />
              );
            })}
          </motion.section>
        </>
      )}

      {/* Main Container */}
      {viewMode === 'table' ? (
        /* VUE 1 : TABLE COMPLÈTE EN 100% */
        <div key="table-view">
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden min-h-[480px]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Table médecins</h3>
                <p className="text-xs text-slate-500">Cliquez sur une ligne ou sur la flèche <span className="font-bold text-sky-700">→</span> pour ouvrir son espace complet.</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-slate-50/80 cursor-default bg-slate-50/90">
                  {TABLE_COLUMNS.map((column, idx) => (
                    <TableHead key={idx} className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx} className="hover:bg-transparent">
                      <TableCell><Skeleton className="h-4 w-36 mb-1.5" /><Skeleton className="h-3 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-lg" /></TableCell>
                    </TableRow>
                  ))
                )}

                {!loading && medecins.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={TABLE_COLUMNS.length} className="h-80 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <MenuIcon name="medecins" />
                        <p className="font-semibold text-slate-700">Aucun médecin trouvé</p>
                        <p className="text-xs text-slate-500">Ajustez les filtres ou réinitialisez la recherche.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  medecins.map((medecin) => {
                    const isSelected = selectedMedecin?.id === medecin.id;
                    return (
                      <TableRow
                        key={medecin.id}
                        id={`medecin-row-${medecin.id}`}
                        onClick={() => handleSelectMedecin(medecin)}
                        className={`transition-all group cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/90 border-l-4 border-l-sky-500 shadow-2xs font-semibold'
                            : 'hover:bg-sky-50/30'
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" title="Médecin actuellement sélectionné" />
                            )}
                            <div>
                              <div className={`font-bold transition-colors ${isSelected ? 'text-sky-950' : 'text-slate-900 group-hover:text-sky-700'}`}>
                                {formatMedecinName(medecin)}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">{medecin.specialite || '—'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700 font-medium">{medecin.organisme ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant('segment', medecin.segment)}>
                            {medecin.segment ? `SEGMENT ${medecin.segment}` : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant('statut', medecin.statut || medecin.statutPilotage)}>
                            {medecin.statut ? medecin.statut : formatEnumLabel(medecin.statutPilotage)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {medecin.noteInput != null ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/90 text-xs font-extrabold shadow-2xs">
                              <MedecinsIcon name="star" size={12} />
                              <span>{medecin.noteInput} / 5</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200/80 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                              <span>Non renseignée</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-extrabold text-slate-900">
                          {formatCaMois(medecin.caMois)}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectMedecin(medecin);
                            }}
                            className={`px-3.5 py-2 rounded-xl transition-all shadow-2xs font-extrabold text-xs inline-flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-sky-50 text-sky-700 border border-sky-200/90'
                                : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border hover:border-sky-200'
                            }`}
                            title={isSelected ? "Revoir l'espace médecin" : "Ouvrir l'espace médecin"}
                          >
                            <span>{isSelected ? 'Sélectionné' : 'Ouvrir'}</span>
                            <MedecinsIcon name="arrow-right" size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : (
        /* VUE 2 : ESPACE MÉDECIN DÉTAILLÉ EN 100% DE L'ESPACE DE LA TABLE */
        <div key="detail-view" className="space-y-6">
          {/* Header Bar avec grand bouton RETOUR BLANC PUR ET ROUGE */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-2">
            <button
              type="button"
              onClick={handleBackToTable}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-rose-700 border border-slate-200/90 font-extrabold text-sm shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
            >
              <div className="p-1.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
                <MedecinsIcon name="arrow-left" size={20} />
              </div>
              <span>← Retour à la table des médecins</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                FICHE DÉTAILLÉE VACTIS
              </span>
              <button
                type="button"
                onClick={handleBackToTable}
                className="p-2 rounded-full bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 transition-all shadow-xs"
                title="Fermer"
              >
                <MedecinsIcon name="x" size={16} />
              </button>
            </div>
          </div>

          {/* Contenu complet du médecin sur 100% de la largeur */}
          {selectedMedecin && (
            <Card className="action-detail-card flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-md overflow-hidden p-6 md:p-8 space-y-8">
              {/* Hero Card Pure White */}
              <div className="action-detail-hero order-1 p-6 rounded-2xl bg-white border border-slate-200/80 text-slate-900 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-50 text-sky-700 border border-sky-200 rounded-2xl shadow-xs">
                      <MenuIcon name="medecins" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{formatMedecinName(selectedMedecin)}</h2>
                      <p className="text-xs font-bold text-sky-700 pt-0.5">{selectedMedecin.specialite || 'Spécialité non renseignée'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getBadgeVariant('segment', selectedMedecin.segment)} className="px-3.5 py-1.5 text-xs">
                    {selectedMedecin.segment ? `SEGMENT ${selectedMedecin.segment}` : '—'}
                  </Badge>
                  <Badge variant={getBadgeVariant('statut', selectedMedecin.statut || selectedMedecin.statutPilotage)} className="px-3.5 py-1.5 text-xs">
                    {selectedMedecin.statut ? selectedMedecin.statut : formatEnumLabel(selectedMedecin.statutPilotage)}
                  </Badge>
                </div>
              </div>

              <section className="action-detail-explanation calculation-explanation order-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-5 space-y-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={isExplanationOpen}
                  onClick={() => setIsExplanationOpen((open) => !open)}
                >
                  <span className="text-sm font-black text-sky-950">Pourquoi ces valeurs ?</span>
                  <span className="text-lg font-bold text-sky-700" aria-hidden="true">{isExplanationOpen ? '−' : '+'}</span>
                </button>
                {isExplanationOpen && <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
                  <div className="action-detail-value-panel rounded-xl border border-white/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-3">
                      <button type="button" onClick={() => toggleCalculationBlock('segment')} className="flex flex-1 items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-slate-500"><span>Segment {selectedMedecin.segment || '—'}</span><span className="text-base text-sky-700">{openCalculationBlocks.segment ? '⌃' : '⌄'}</span></button>
                      <strong className="text-sm text-slate-900">Score {formatScore(selectedMedecin.scoreValeur)} / 100 · Position CA {selectedMedecin.rangPerformance ?? '—'} / {selectedMedecin.totalPortefeuillePerformance ?? '—'}</strong>
                    </div>
                    <div className={`${openCalculationBlocks.segment ? '' : 'hidden'} mt-3 space-y-2 text-xs leading-relaxed text-slate-600`}>
                      <div className="action-metric action-metric--potential rounded-lg border border-sky-100 bg-sky-50/50">
                        <div className="p-3 font-bold text-slate-900"><span className="explanation-metric-icon explanation-metric-icon--blue"><MedecinsIcon name="trend" size={18} /></span><span>1. Potentiel</span></div>
                        <div className="space-y-1 border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : potentiel = note / 5 × 100 ; contribution = potentiel × 0,40</p><p className="font-semibold text-teal-800"><strong>Valeur</strong> : note utilisée par le scoring = {formatScore(Number(selectedMedecin.potentielSur100) / 20)} / 5 <span className="ml-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">Source : {formatPotentialSource(selectedMedecin.sourcePotentiel)}</span></p><p className="font-semibold text-teal-800"><strong>Calcul</strong> : ({formatScore(Number(selectedMedecin.potentielSur100) / 20)} / 5) × 100 = {formatScore(selectedMedecin.potentielSur100)}</p><p className="font-semibold text-teal-800"><strong>Résultat</strong> : {formatScore(selectedMedecin.potentielSur100)} × 0,40 = {formatWeightedScore(selectedMedecin.potentielSur100, 0.4)}</p><div className="action-contribution action-contribution--blue"><span>Contribution</span><strong>{formatWeightedScore(selectedMedecin.potentielSur100, 0.4)}</strong><small>40% du score final</small></div></div>
                      </div>
                      <div className="action-metric action-metric--performance rounded-lg border border-sky-100 bg-sky-50/50">
                        <div className="p-3 font-bold text-slate-900"><span className="explanation-metric-icon explanation-metric-icon--violet"><MedecinsIcon name="performance" size={18} /></span><span>2. Performance</span></div>
                        <div className="px-3 pt-2 text-xs font-bold text-indigo-700">Position CA : {selectedMedecin.rangPerformance ?? '—'} / {selectedMedecin.totalPortefeuillePerformance ?? '—'} ; N − 1 = {selectedMedecin.totalPortefeuillePerformance != null ? selectedMedecin.totalPortefeuillePerformance - 1 : '—'}</div>
                        <div className="space-y-1 border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : performance = 100 × (rang − 1) / (N − 1) ; contribution = performance × 0,40</p><p className="font-semibold text-teal-800"><strong>Valeur</strong> : CA moyen = {formatCaMois(selectedMedecin.caMensuelMoyen)} ; performance = {formatScore(selectedMedecin.performanceSur100)} / 100</p><p className="font-semibold text-teal-800"><strong>Calcul</strong> : {formatScore(selectedMedecin.performanceSur100)} × 0,40 = {formatWeightedScore(selectedMedecin.performanceSur100, 0.4)}</p><p className="text-[11px] text-slate-500"><strong>Sens</strong> : 0 = CA moyen le plus faible ; 100 = CA moyen le plus élevé ; position relative dans le portefeuille.</p><p className="font-semibold text-teal-800"><strong>Résultat</strong> : contribution performance = {formatWeightedScore(selectedMedecin.performanceSur100, 0.4)}</p><div className="action-contribution action-contribution--violet"><span>Contribution</span><strong>{formatWeightedScore(selectedMedecin.performanceSur100, 0.4)}</strong><small>40% du score final</small></div></div>
                      </div>
                      <div className="action-metric action-metric--economic rounded-lg border border-sky-100 bg-sky-50/50">
                        <div className="p-3 font-bold text-slate-900"><span className="explanation-metric-icon explanation-metric-icon--teal"><MedecinsIcon name="pie" size={18} /></span><span>3. Poids économique</span></div>
                        <div className="economic-weight-breakdown"><div><strong>CA normalisé</strong><span>{formatScore(selectedMedecin.caNormaliseSur100)} / 100</span><small>CA médecin {formatCaMois(selectedMedecin.caMois)} / maximum portefeuille {formatCaMois(selectedMedecin.maxCaPortefeuille)}</small></div><div><strong>Volume normalisé</strong><span>{formatScore(selectedMedecin.volumeNormaliseSur100)} / 100</span><small>{selectedMedecin.totalCas ?? '—'} cas / maximum portefeuille {formatScore(selectedMedecin.maxVolumePortefeuille)} cas</small></div></div>
                        <div className="space-y-1 border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : poids économique = 50% CA normalisé + 50% volume normalisé ; contribution = poids × 0,20</p><p className="font-semibold text-teal-800"><strong>Valeur</strong> : poids économique = {formatScore(selectedMedecin.poidsEcoSur100)} / 100</p><p className="font-semibold text-teal-800"><strong>Calcul</strong> : {formatScore(selectedMedecin.poidsEcoSur100)} × 0,20 = {formatWeightedScore(selectedMedecin.poidsEcoSur100, 0.2)}</p><p className="font-semibold text-teal-800"><strong>Résultat</strong> : contribution économique = {formatWeightedScore(selectedMedecin.poidsEcoSur100, 0.2)}</p><div className="action-contribution action-contribution--teal"><span>Contribution</span><strong>{formatWeightedScore(selectedMedecin.poidsEcoSur100, 0.2)}</strong><small>20% du score final</small></div></div>
                      </div>
                      <div className="action-metric action-metric--final rounded-lg border border-sky-100 bg-sky-50/50">
                        <div className="p-3 font-bold text-slate-900"><span className="explanation-metric-icon explanation-metric-icon--orange"><MedecinsIcon name="trophy" size={18} /></span><span>4. Score final</span></div>
                        <div className="space-y-1 border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : score final = 40% potentiel + 40% performance + 20% poids économique</p><p className="font-semibold text-teal-800"><strong>Étape 1</strong> : potentiel × 0,40 = {formatWeightedScore(selectedMedecin.potentielSur100, 0.4)}</p><p className="font-semibold text-teal-800"><strong>Étape 2</strong> : performance × 0,40 = {formatWeightedScore(selectedMedecin.performanceSur100, 0.4)}</p><p className="font-semibold text-teal-800"><strong>Étape 3</strong> : poids économique × 0,20 = {formatWeightedScore(selectedMedecin.poidsEcoSur100, 0.2)}</p><p className="font-semibold text-teal-800"><strong>Résultat</strong> : {formatWeightedScore(selectedMedecin.potentielSur100, 0.4)} + {formatWeightedScore(selectedMedecin.performanceSur100, 0.4)} + {formatWeightedScore(selectedMedecin.poidsEcoSur100, 0.2)} = <strong className="text-slate-900">{formatScore(selectedMedecin.scoreValeur)} / 100</strong> ; segment <strong className="text-slate-900">{selectedMedecin.segment || '—'}</strong></p><div className="action-score-donut" style={{ background: `conic-gradient(#f97316 ${Math.min(100, Math.max(0, Number(selectedMedecin.scoreValeur ?? 0)))}%, #e5e7eb 0)` }}><div><strong>{formatScore(selectedMedecin.scoreValeur)}</strong><span>/ 100</span></div></div><span className="action-score-segment">SEGMENT&nbsp; {selectedMedecin.segment || '—'}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white p-4 shadow-2xs">
                    <button type="button" onClick={() => toggleCalculationBlock('statut')} className="flex w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-slate-500"><span>Statut {formatEnumLabel(selectedMedecin.statut || selectedMedecin.statutPilotage)}</span><span className="text-base text-sky-700">{openCalculationBlocks.statut ? '⌃' : '⌄'}</span></button>
                    <div className={`${openCalculationBlocks.statut ? '' : 'hidden'} mt-3 space-y-2 text-xs leading-relaxed text-slate-600`}>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>1. Référence récente</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : référence = moyenne de M-1, M-2 et M-3</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : CA = {formatScore(selectedMedecin.referenceCa)} MAD ; volume = {formatScore(selectedMedecin.referenceVolume)} cas</p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>2. Variations CA / volume</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : variation = (valeur courante − référence) / max(référence, plancher) × 100</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : CA = {formatScore(selectedMedecin.variationCa)}% avec plancher 300 ; volume = {formatScore(selectedMedecin.variationVolume)}% avec plancher 1</p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>3. Variation mixte</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : 60% variation CA + 40% variation volume</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : ({formatScore(selectedMedecin.variationCa)} × 0,60) + ({formatScore(selectedMedecin.variationVolume)} × 0,40) = <strong className="text-slate-900">{formatScore(selectedMedecin.variationMixteSur100)}%</strong></p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>4. Décision du statut</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : progression &gt; 20% ; stable de −10% à 20% ; surveillance de −40% à −10% ; rétention de −70% à −40% ; silence critique &lt; −70%</p><p className="mt-1 font-semibold text-teal-800"><strong>Résultat</strong> : {formatEnumLabel(selectedMedecin.statut || selectedMedecin.statutPilotage)}</p></div></details>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white p-4 shadow-2xs">
                    <button type="button" onClick={() => toggleCalculationBlock('fiabilite')} className="flex w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-slate-500"><span>Fiabilité & silence</span><span className="text-base text-sky-700">{openCalculationBlocks.fiabilite ? '⌃' : '⌄'}</span></button>
                    <div className={`${openCalculationBlocks.fiabilite ? '' : 'hidden'} mt-3 space-y-2 text-xs leading-relaxed text-slate-600`}>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>1. Fiabilité</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : FIABLE si au moins 3 mois actifs et 6 mois d’ancienneté ; PARTIEL si au moins 2 mois actifs ; sinon NON FIABLE</p><p className="mt-1 font-semibold text-teal-800"><strong>Résultat</strong> : {formatEnumLabel(selectedMedecin.fiabilite)}</p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>2. Intervalle effectif</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : intervalle = moyenne des écarts entre les dernières dates</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : intervalle = {selectedMedecin.intervalleEffectif ?? '—'} jours</p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>3. Score de silence</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : score = min(100, jours sans activité / intervalle × 20)</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : min(100, {selectedMedecin.joursSansActivite ?? '—'} ÷ {selectedMedecin.intervalleEffectif ?? '—'} × 20) = <strong className="text-slate-900">{formatScore(selectedMedecin.scoreSilence)} / 100</strong></p></div></details>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white p-4 shadow-2xs">
                    <button type="button" onClick={() => toggleCalculationBlock('silence')} className="flex w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-slate-500"><span>Pourquoi ce niveau de silence ?</span><span className="text-base text-sky-700">{openCalculationBlocks.silence ? '⌃' : '⌄'}</span></button>
                    <ol className={`${openCalculationBlocks.silence ? '' : 'hidden'} mt-3 space-y-2 text-xs leading-relaxed text-slate-600`}>
                      <li><strong className="text-slate-900">1. Activité :</strong> {selectedMedecin.joursSansActivite ?? '—'} jours depuis le dernier dossier envoyé au laboratoire.</li>
                      <li><strong className="text-slate-900">2. Seuil :</strong> fréquence attendue de 1 dossier tous les {calculateFrequenceJours(selectedMedecin.segment) ?? '—'} jours pour le segment {selectedMedecin.segment || '—'}.</li>
                      <li><strong className="text-slate-900">3. Décision :</strong> au-delà du seuil = <strong className="text-slate-900">SILENCE CRITIQUE</strong>; au-delà de 70% du seuil = <strong className="text-slate-900">ALERTE SILENCE</strong>; sinon = <strong className="text-slate-900">SUIVI REGULIER</strong>.</li>
                    </ol>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white p-4 shadow-2xs">
                    <button type="button" onClick={() => toggleCalculationBlock('risque')} className="flex w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-slate-500"><span>Risque</span><span className="text-base text-sky-700">{openCalculationBlocks.risque ? '⌃' : '⌄'}</span></button>
                    <div className={`${openCalculationBlocks.risque ? '' : 'hidden'} mt-3 space-y-2 text-xs leading-relaxed text-slate-600`}>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>1. Baisse</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : baisse de référence et baisse courte</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : référence = {formatScore(selectedMedecin.baisseReference)}% ; courte = {formatScore(selectedMedecin.baisseCourte)}%</p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>2. Tendance</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : tendance = 40% baisse de référence + 60% baisse courte</p><p className="mt-1 font-semibold text-teal-800"><strong>Application</strong> : ({formatScore(selectedMedecin.baisseReference)} × 0,40) + ({formatScore(selectedMedecin.baisseCourte)} × 0,60)</p></div></details>
                      <details className="group rounded-lg border border-sky-100 bg-sky-50/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>3. Risque final</span><span className="text-base text-sky-700 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-sky-100 px-3 pb-3 pt-2"><p className="text-[11px] text-sky-700"><strong>Relation</strong> : risque = (60% tendance + 40% silence) × poids économique</p><p className="mt-1 font-semibold text-teal-800"><strong>Résultat</strong> : <strong className="text-slate-900">{formatScore(selectedMedecin.scoreRisque)} / 100</strong> ; niveau = <strong className="text-slate-900">{formatEnumLabel(selectedMedecin.risqueUrgence)}</strong></p></div></details>
                    </div>
                  </div>
                </div>}
              </section>

              {/* Grid 2 Colonnes */}
              <div className="order-2 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Colonne Gauche (5 cols) : Lieux & Infos Générales */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Lieux & Organismes */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Lieux & organismes</h4>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3.5">
                      <span className="p-2 bg-white text-sky-700 rounded-xl shadow-2xs mt-0.5 border border-slate-200/60">
                        <MedecinsIcon name="map-pin" size={18} />
                      </span>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-bold uppercase">Lieu principal</span>
                        <span className="text-base font-bold text-slate-800">{selectedMedecin.organisme ?? '—'}</span>
                        {selectedMedecin.ville && (
                          <span className="text-xs text-slate-500 block pt-0.5">{selectedMedecin.ville}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informations Générales */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Informations générales</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Code Médecin</span>
                        <span className="text-base font-bold text-slate-800">{selectedMedecin.codeMedecin ?? '—'}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">CA mobil.</span>
                        <span className="text-base font-black text-sky-700">{formatCaMois(selectedMedecin.caMois)}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Risque / urgence</span>
                        <span className="text-sm font-bold text-slate-800">{formatEnumLabel(selectedMedecin.risqueUrgence)}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Commercial référent</span>
                        <span className="text-sm font-bold text-slate-800">{selectedMedecin.commercialReferent ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne Droite (7 cols) : Potentiel Commercial */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Potentiel commercial */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Potentiel commercial</h4>
                      <span className="text-xs text-slate-500 font-semibold">
                        Note actuelle : <strong className="text-slate-900">{selectedMedecin.noteInput != null ? `${selectedMedecin.noteInput} / 5` : 'Non renseignée'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2" role="group" aria-label="Choisir une note de potentiel">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`flex-1 h-10 rounded-xl font-bold text-sm transition-all border ${
                            noteInputDraft === n
                              ? 'bg-sky-50 text-sky-700 border-sky-300 font-black shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                          onClick={() => setNoteInputDraft(n)}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`h-10 px-4 rounded-xl font-bold text-sm transition-all border ${
                          noteInputDraft == null
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        onClick={() => setNoteInputDraft(null)}
                        title="Effacer la note"
                      >
                        —
                      </button>
                    </div>

                    {noteError && <p className="text-xs font-semibold text-rose-600">{noteError}</p>}
                    {noteSaved && <p className="text-xs font-semibold text-emerald-600">Note enregistrée ✓</p>}

                    <button
                      type="button"
                      className="w-full py-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/90 font-extrabold text-sm shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      onClick={handleSaveNote}
                      disabled={noteSaving}
                    >
                      {noteSaving ? 'Enregistrement…' : 'Enregistrer la note'}
                    </button>
                  </div>

                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
