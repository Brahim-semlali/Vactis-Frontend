import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMedecinByCode, getMedecins, getRetoursTerrain, patchNoteInput, postRetourTerrain } from '../../api/medecins.js';
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
};

const KPI_ITEMS = [
  { id: 'total', key: 'total', label: 'Total médecins', icon: 'users', variant: 'default', tone: 'sky' },
  { id: 'segments', key: 'segmentsAB', label: 'Segments A/B', icon: 'chart', variant: 'default', tone: 'emerald' },
  { id: 'surveillance', key: 'surveillance', label: 'Surveillance', icon: 'warning', tone: 'amber', variant: 'default' },
  { id: 'onboarding', key: 'onboarding', label: 'Onboarding', icon: 'search', tone: 'blue', variant: 'default' },
  { id: 'silence', key: 'silenceCritique', label: 'Silence critique', icon: 'alert', tone: 'red', variant: 'default' },
  { id: 'actions', key: 'actionsEnCours', label: 'Actions en cours', icon: 'bolt', tone: 'purple', variant: 'default' },
];

const TABLE_COLUMNS = [
  'Médecin',
  'Lieu / organisme',
  'Segment',
  'Statut',
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

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('T')[0].split('-');
  return `${day}/${month}/${year}`;
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

function KpiCardComponent({ label, icon, tone, value }) {
  const toneClasses = {
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    red: 'bg-rose-50 text-rose-700 border-rose-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  const bgTone = toneClasses[tone] || toneClasses.sky;

  return (
    <motion.div whileHover={{ y: -3, scale: 1.015 }} transition={{ duration: 0.2 }}>
      <Card className="p-4 sm:p-5 flex items-center justify-between h-full bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md transition-all">
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
  const { token, username } = useAuth();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pageData, setPageData] = useState(null);

  // Selection & View Mode state: 'table' or 'detail'
  const [selectedMedecin, setSelectedMedecin] = useState(null);
  const [viewMode, setViewMode] = useState('table');

  // Sauvegarde de la position exacte de scroll avant sélection
  const lastScrollPosition = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // — Potentiel commercial (noteInput) —
  const [noteInputDraft, setNoteInputDraft] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteSavedTimer = useRef(null);

  // — Note terrain (RetourTerrain) —
  const [retoursTerrain, setRetoursTerrain] = useState([]);
  const [loadingRetours, setLoadingRetours] = useState(false);
  const [terrainNote, setTerrainNote] = useState(null);
  const [terrainDate, setTerrainDate] = useState(getTodayString());
  const [terrainVisiteur, setTerrainVisiteur] = useState(username || '');
  const [terrainCommentaire, setTerrainCommentaire] = useState('');
  const [terrainStatutVisite, setTerrainStatutVisite] = useState('REALISEE');
  const [terrainQualification, setTerrainQualification] = useState('NON_RENSEIGNE');
  const [terrainReclamation, setTerrainReclamation] = useState(false);
  const [terrainSaving, setTerrainSaving] = useState(false);
  const [terrainError, setTerrainError] = useState(null);
  const [terrainSaved, setTerrainSaved] = useState(false);
  const terrainSavedTimer = useRef(null);

  const loadMedecins = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const code = filters.codeMedecin.trim().toUpperCase();
      const { codeMedecin: _codeMedecin, ...listFilters } = filters;

      if (code) {
        const medecin = await getMedecinByCode(token, code);

        if (medecin) {
          setPageData((current) => ({
            items: [medecin],
            kpis: current?.kpis ?? {},
            meta: { affiches: 1, charges: 1 },
            filters: current?.filters ?? {},
          }));
          return;
        }

        const data = await getMedecins(token, { ...listFilters, search: code });
        setPageData(data);

        if ((data.items?.length ?? 0) === 0) {
          setError(`Aucun médecin trouvé pour le code « ${code} ».`);
        }

        return;
      }

      const data = await getMedecins(token, listFilters);
      setPageData(data);

      setSelectedMedecin((current) => {
        if (!current) return null;
        return data.items?.find((item) => item.id === current.id) ?? null;
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
      setNoteInputDraft(selectedMedecin?.noteInput ?? null);
      setNoteError(null);
      setNoteSaved(false);
    }
  }, [selectedMedecin?.id]);

  // Scroll automatique garanti à la ligne exacte du médecin sélectionné lors du retour à la table
  useEffect(() => {
    if (viewMode === 'table' && selectedMedecin?.id) {
      const scrollToDoctor = () => {
        const rowEl = document.getElementById(`medecin-row-${selectedMedecin.id}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (lastScrollPosition.current > 0) {
          window.scrollTo({ top: lastScrollPosition.current, behavior: 'smooth' });
        }
      };

      const t1 = setTimeout(scrollToDoctor, 50);
      const t2 = setTimeout(scrollToDoctor, 200);
      const t3 = setTimeout(scrollToDoctor, 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [viewMode, selectedMedecin?.id]);

  useEffect(() => {
    if (!selectedMedecin?.id || !token) {
      setRetoursTerrain([]);
      return;
    }
    let isMounted = true;
    setLoadingRetours(true);
    getRetoursTerrain(token, selectedMedecin.id)
      .then((data) => {
        if (isMounted) setRetoursTerrain(data || []);
      })
      .catch((err) => {
        console.error('Erreur chargement retours terrain:', err);
        if (isMounted) setRetoursTerrain([]);
      })
      .finally(() => {
        if (isMounted) setLoadingRetours(false);
      });

    setTerrainNote(null);
    setTerrainDate(getTodayString());
    setTerrainVisiteur(username || '');
    setTerrainCommentaire('');
    setTerrainStatutVisite('REALISEE');
    setTerrainQualification('NON_RENSEIGNE');
    setTerrainReclamation(false);
    setTerrainError(null);
    setTerrainSaved(false);

    return () => {
      isMounted = false;
    };
  }, [selectedMedecin?.id, token, username]);

  const handleSelectMedecin = (medecin) => {
    lastScrollPosition.current = window.scrollY || document.documentElement.scrollTop;
    setSelectedMedecin(medecin);
    setViewMode('detail');
    window.scrollTo({ top: 120, behavior: 'smooth' });
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

  const handleSaveRetourTerrain = async (e) => {
    if (e) e.preventDefault();
    if (!selectedMedecin) return;
    setTerrainError(null);
    setTerrainSaved(false);

    if (!terrainNote) {
      setTerrainError('Veuillez sélectionner une note (entre 1 et 5).');
      return;
    }
    if (!terrainDate) {
      setTerrainError('Veuillez sélectionner la date de la visite.');
      return;
    }
    const today = getTodayString();
    if (terrainDate > today) {
      setTerrainError('La date de visite ne peut pas être dans le futur.');
      return;
    }

    setTerrainSaving(true);
    try {
      const newRetour = await postRetourTerrain(token, selectedMedecin.id, {
        note: Number(terrainNote),
        dateVisite: terrainDate,
        visiteur: terrainVisiteur,
        commentaire: terrainCommentaire,
        statutVisite: terrainStatutVisite,
        qualification: terrainQualification,
        reclamation: terrainReclamation,
      });

      setRetoursTerrain((prev) => [newRetour, ...prev]);

      setTerrainNote(null);
      setTerrainDate(getTodayString());
      setTerrainVisiteur(username || '');
      setTerrainCommentaire('');
      setTerrainStatutVisite('REALISEE');
      setTerrainQualification('NON_RENSEIGNE');
      setTerrainReclamation(false);

      setTerrainSaved(true);
      clearTimeout(terrainSavedTimer.current);
      terrainSavedTimer.current = setTimeout(() => setTerrainSaved(false), 3000);
    } catch (err) {
      setTerrainError(err.message ?? "Erreur lors de l'enregistrement de la visite.");
    } finally {
      setTerrainSaving(false);
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
  const derniereVisite = retoursTerrain && retoursTerrain.length > 0 ? retoursTerrain[0] : null;

  return (
    <div className="space-y-6">
      {/* Pure White Designer Hero Section avec Bouton Style Soft Red (en bleu) */}
      <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MedecinsIcon name="search" />
                </div>
                <input
                  type="search"
                  placeholder="Rechercher un médecin, une spécialité, un lieu…"
                  value={filters.search}
                  onChange={updateFilter('search')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                  aria-label="Rechercher un médecin"
                />
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

              <div className="flex justify-end pt-1">
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
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* KPI Cards Grid */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Indicateurs médecins">
            {KPI_ITEMS.map(({ id, key: kpiKey, label, icon, tone }) => (
              <KpiCardComponent
                key={id}
                label={label}
                icon={icon}
                tone={tone}
                value={kpis[kpiKey]}
              />
            ))}
          </motion.section>
        </>
      )}

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          /* VUE 1 : TABLE COMPLÈTE EN 100% */
          <motion.div
            key="table-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
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
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
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
          </motion.div>
        ) : (
          /* VUE 2 : ESPACE MÉDECIN DÉTAILLÉ EN 100% DE L'ESPACE DE LA TABLE */
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header Bar avec grand bouton RETOUR ROUGE CLAIRE */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-2">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 font-extrabold text-sm shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                <div className="p-1.5 bg-rose-200/80 rounded-xl text-rose-800">
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
                  onClick={() => setViewMode('table')}
                  className="p-2 rounded-full bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 transition-all shadow-xs"
                  title="Fermer"
                >
                  <MedecinsIcon name="x" size={16} />
                </button>
              </div>
            </div>

            {/* Contenu complet du médecin sur 100% de la largeur */}
            {selectedMedecin && (
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-md overflow-hidden p-6 md:p-8 space-y-8">
                {/* Hero Card Pure White avec Accentuation Bleu Soft */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-50/90 via-white to-slate-50 border border-sky-100 text-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-80 h-80 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="space-y-2 relative z-10">
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

                  <div className="flex flex-wrap items-center gap-3 relative z-10">
                    <Badge variant={getBadgeVariant('segment', selectedMedecin.segment)} className="px-3.5 py-1.5 text-xs">
                      {selectedMedecin.segment ? `SEGMENT ${selectedMedecin.segment}` : '—'}
                    </Badge>
                    <Badge variant={getBadgeVariant('statut', selectedMedecin.statut || selectedMedecin.statutPilotage)} className="px-3.5 py-1.5 text-xs">
                      {selectedMedecin.statut ? selectedMedecin.statut : formatEnumLabel(selectedMedecin.statutPilotage)}
                    </Badge>
                  </div>
                </div>

                {/* Grid 2 Colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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

                  {/* Colonne Droite (7 cols) : Formulaires Potentiel Commercial & Note Terrain */}
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

                      {/* Bouton Enregistrer la note : MÊME DESIGN QUE LE BOUTON ROUGE MAIS EN BLEU */}
                      <button
                        type="button"
                        className="w-full py-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/90 font-extrabold text-sm shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        onClick={handleSaveNote}
                        disabled={noteSaving}
                      >
                        {noteSaving ? 'Enregistrement…' : 'Enregistrer la note'}
                      </button>
                    </div>

                    {/* Note terrain & Visites */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Note terrain & Visites</h4>
                        <div className="text-xs text-slate-500">
                          Dernière visite :{' '}
                          {loadingRetours ? (
                            <Skeleton className="h-4 w-20 inline-block align-middle" />
                          ) : derniereVisite ? (
                            <strong className="text-slate-900">{derniereVisite.note} / 5 ({formatDateFr(derniereVisite.dateVisite)})</strong>
                          ) : (
                            <span className="italic">Aucune</span>
                          )}
                        </div>
                      </div>

                      {/* Formulaire d'ajout d'une visite */}
                      <form onSubmit={handleSaveRetourTerrain} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 block">Note de la visite (1 à 5)</label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                className={`flex-1 h-9 rounded-xl font-bold text-xs transition-all border ${
                                  terrainNote === n
                                    ? 'bg-sky-50 text-sky-700 border-sky-300 font-black shadow-2xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                                onClick={() => setTerrainNote(n)}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 block">Date de visite</label>
                            <input
                              type="date"
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                              value={terrainDate}
                              max={getTodayString()}
                              onChange={(e) => setTerrainDate(e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 block">Visiteur</label>
                            <input
                              type="text"
                              placeholder="Nom du visiteur..."
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                              value={terrainVisiteur}
                              onChange={(e) => setTerrainVisiteur(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 block">Statut visite</label>
                            <select
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                              value={terrainStatutVisite}
                              onChange={(e) => setTerrainStatutVisite(e.target.value)}
                            >
                              <option value="REALISEE">Réalisée</option>
                              <option value="NON_REALISEE">Non réalisée</option>
                              <option value="NON_RENSEIGNE">Non renseigné</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 block">Qualification</label>
                            <select
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                              value={terrainQualification}
                              onChange={(e) => setTerrainQualification(e.target.value)}
                            >
                              <option value="NON_RENSEIGNE">Non renseigné</option>
                              <option value="FAVORABLE">Favorable</option>
                              <option value="DEFAVORABLE">Défavorable / Refus</option>
                              <option value="NEUTRE">Neutre</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            id="terrain-reclamation-checkbox-full"
                            type="checkbox"
                            className="rounded border-slate-300 text-sky-500 focus:ring-sky-400 h-4 w-4"
                            checked={terrainReclamation}
                            onChange={(e) => setTerrainReclamation(e.target.checked)}
                          />
                          <label htmlFor="terrain-reclamation-checkbox-full" className="text-xs text-slate-700 cursor-pointer font-medium">
                            Visite avec réclamation médecin
                          </label>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 block">Commentaire</label>
                          <textarea
                            rows="3"
                            placeholder="Remarques complémentaires du visiteur..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                            value={terrainCommentaire}
                            onChange={(e) => setTerrainCommentaire(e.target.value)}
                          />
                        </div>

                        {terrainError && <p className="text-xs font-semibold text-rose-600">{terrainError}</p>}
                        {terrainSaved && <p className="text-xs font-semibold text-emerald-600">Visite enregistrée ✓</p>}

                        {/* Bouton Enregistrer la visite : MÊME DESIGN QUE LE BOUTON ROUGE MAIS EN BLEU */}
                        <button
                          type="submit"
                          className="w-full py-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/90 font-extrabold text-sm shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          disabled={terrainSaving}
                        >
                          {terrainSaving ? 'Enregistrement…' : 'Enregistrer la visite'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
