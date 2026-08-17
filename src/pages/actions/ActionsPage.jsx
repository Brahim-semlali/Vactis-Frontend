import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActions } from '../../api/actions.js';
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
  statut: '',
  segment: '',
  action: '',
  urgence: '',
  etatAction: '',
  backlog: '',
  commercial: '',
  lieuOrganisme: '',
};

const KPI_ITEMS = [
  { id: 'generated', key: 'actionsGenerees', label: 'Actions générées', icon: 'clipboard', tone: 'sky' },
  { id: 'planned', key: 'planifiees', label: 'Planifiées', icon: 'calendar', tone: 'blue' },
  { id: 'visits', key: 'visites', label: 'Visites', icon: 'check', tone: 'emerald' },
  { id: 'backlog', key: 'backlog', label: 'Backlog', icon: 'amber' },
  { id: 'silence', key: 'urgenceSilence', label: 'Urgence silence', icon: 'alert', tone: 'red' },
];

const TABLE_COLUMNS = [
  'Médecin',
  'Statut',
  'Segment',
  'Action recommandée',
  'Urgence',
  'État',
  'Date visite',
  '',
];

const URGENCE_OPTIONS = ['SILENCE_CRITIQUE', 'FAIBLE', 'MOYEN', 'ELEVE', 'URGENT'];
const ETAT_OPTIONS = ['PLANIFIEE', 'REALISEE'];
const BACKLOG_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
];

function ActionsIcon({ name, size = 18 }) {
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
    case 'clipboard':
      return (
        <svg {...props}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case 'inbox':
      return (
        <svg {...props}>
          <path d="M22 12h-6l-2 3H10l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
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
    case 'map-pin':
      return (
        <svg {...props}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'heartbeat':
      return (
        <svg {...props}>
          <path d="M3 12h3l3 -9l6 18l3 -9h3" />
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
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

  if (type === 'etat') {
    if (normalized === 'REALISEE') return 'progression';
    return 'onboarding';
  }

  if (type === 'urgence') {
    if (normalized === 'SILENCE_CRITIQUE' || normalized === 'URGENT') return 'silence';
    if (normalized === 'ELEVE') return 'surveillance';
    if (normalized === 'MOYEN') return 'segment-b';
    return 'actif';
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
          <ActionsIcon name={icon} size={20} />
        </div>
      </Card>
    </motion.div>
  );
}

export default function ActionsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pageData, setPageData] = useState(null);

  // Selection & View Mode state: 'table' or 'detail'
  const [selectedAction, setSelectedAction] = useState(null);
  const [viewMode, setViewMode] = useState('table');

  // Sauvegarde de la position exacte de scroll avant sélection
  const lastScrollPosition = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActions = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getActions(token, filters);
      setPageData(data);

      setSelectedAction((current) => {
        if (!current) return null;
        return data.items?.find((item) => item.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err.message ?? 'Erreur de chargement des actions');
      setPageData(null);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Scroll automatique garanti à la ligne exacte de l'action sélectionnée lors du retour à la table
  useEffect(() => {
    if (viewMode === 'table' && selectedAction?.id) {
      const scrollToAction = () => {
        const rowEl = document.getElementById(`action-row-${selectedAction.id}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (lastScrollPosition.current > 0) {
          window.scrollTo({ top: lastScrollPosition.current, behavior: 'smooth' });
        }
      };

      const t1 = setTimeout(scrollToAction, 50);
      const t2 = setTimeout(scrollToAction, 200);
      const t3 = setTimeout(scrollToAction, 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [viewMode, selectedAction?.id]);

  const handleSelectAction = (action) => {
    lastScrollPosition.current = window.scrollY || document.documentElement.scrollTop;
    setSelectedAction(action);
    setViewMode('detail');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSelectedAction(null);
    setViewMode('table');
  };

  const actions = pageData?.items ?? [];
  const kpis = pageData?.kpis ?? {};
  const meta = pageData?.meta ?? {};
  const filterOptions = pageData?.filters ?? {};
  const selectedMedecin = selectedAction?.medecin ?? null;

  return (
    <div className="space-y-6">
      {/* Pure White Designer Hero Section avec Bouton Style Soft Red (en bleu) */}
      <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl border border-sky-100">
                <MenuIcon name="actions" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-sky-700">CYCLE MENSUEL VACTIS</p>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Actions</h1>
              </div>
            </div>
            <p className="text-sm text-slate-600 pt-1 max-w-2xl">
              Consultez vos actions. Cliquez sur une action ou sur la flèche <span className="font-bold text-sky-700">→</span> pour consulter son espace complet.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1 font-medium">
              <span>Workbook VACTIS</span>
              <span>•</span>
              <span>Dernière mise à jour — {loading ? '…' : 'maintenant'}</span>
              <span>•</span>
              <span className="font-bold text-sky-700">
                {meta.affiches ?? 0} affichées / {meta.charges ?? 0} chargées
              </span>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/90 font-extrabold text-sm transition-all shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
            onClick={loadActions}
            disabled={loading}
          >
            <div className="p-1 bg-sky-200/80 rounded-lg text-sky-800">
              <ActionsIcon name="refresh" size={16} />
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
                  <ActionsIcon name="search" />
                </div>
                <input
                  type="search"
                  placeholder="Rechercher un médecin, une action, un commercial…"
                  value={filters.search}
                  onChange={updateFilter('search')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                  aria-label="Rechercher une action"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
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
                  label="Action"
                  value={filters.action}
                  onChange={updateFilter('action')}
                  placeholder="Toutes"
                  options={filterOptions.actions ?? []}
                />
                <CustomSelect
                  label="Urgence"
                  value={filters.urgence}
                  onChange={updateFilter('urgence')}
                  placeholder="Toutes"
                  options={URGENCE_OPTIONS}
                />
                <CustomSelect
                  label="État action"
                  value={filters.etatAction}
                  onChange={updateFilter('etatAction')}
                  placeholder="Tous"
                  options={ETAT_OPTIONS}
                />
                <CustomSelect
                  label="Backlog"
                  value={filters.backlog}
                  onChange={updateFilter('backlog')}
                  placeholder="Tous"
                  options={BACKLOG_OPTIONS}
                />
                <CustomSelect
                  label="Commercial"
                  value={filters.commercial}
                  onChange={updateFilter('commercial')}
                  placeholder="Tous"
                  options={filterOptions.commerciaux ?? []}
                />
                <CustomSelect
                  label="Lieu / organisme"
                  value={filters.lieuOrganisme}
                  onChange={updateFilter('lieuOrganisme')}
                  placeholder="Tous"
                  options={filterOptions.lieuxOrganismes ?? []}
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  onClick={resetFilters}
                >
                  <ActionsIcon name="reset" size={14} />
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
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Indicateurs actions">
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
            key="actions-table-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden min-h-[480px]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Table actions</h3>
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
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  )}

                  {!loading && actions.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={TABLE_COLUMNS.length} className="h-80 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                          <MenuIcon name="actions" />
                          <p className="font-semibold text-slate-700">Aucune action trouvée</p>
                          <p className="text-xs text-slate-500">Ajustez les filtres ou réinitialisez la recherche.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    actions.map((action) => {
                      const isSelected = selectedAction?.id === action.id;
                      return (
                        <TableRow
                          key={action.id}
                          id={`action-row-${action.id}`}
                          onClick={() => handleSelectAction(action)}
                          className={`transition-all group cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50/90 border-l-4 border-l-sky-500 shadow-2xs font-semibold'
                              : 'hover:bg-sky-50/30'
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" title="Action actuellement sélectionnée" />
                              )}
                              <div>
                                <div className={`font-bold transition-colors ${isSelected ? 'text-sky-950' : 'text-slate-900 group-hover:text-sky-700'}`}>
                                  {formatMedecinName(action.medecin)}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">{action.medecin?.specialite ?? '—'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant('statut', action.statut)}>
                              {formatEnumLabel(action.statut)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant('segment', action.segment)}>
                              {action.segment ? `SEGMENT ${action.segment}` : '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">
                            {action.actionRecommandee ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant('urgence', action.urgence)} className="gap-1">
                              <ActionsIcon name="heartbeat" size={12} />
                              {formatEnumLabel(action.urgence)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant('etat', action.etatAction)}>
                              {formatEnumLabel(action.etatAction)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">
                            {formatDate(action.dateVisite)}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAction(action);
                              }}
                              className={`px-3.5 py-2 rounded-xl transition-all shadow-2xs font-extrabold text-xs inline-flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200/90'
                                  : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border hover:border-sky-200'
                              }`}
                              title={isSelected ? "Revoir l'espace action" : "Ouvrir l'espace action"}
                            >
                              <span>{isSelected ? 'Sélectionnée' : 'Ouvrir'}</span>
                              <ActionsIcon name="arrow-right" size={16} />
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
          /* VUE 2 : ESPACE ACTION DÉTAILLÉ EN 100% DE L'ESPACE DE LA TABLE */
          <motion.div
            key="actions-detail-view"
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
                  <ActionsIcon name="arrow-left" size={20} />
                </div>
                <span>← Retour à la table des actions</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  FICHE ACTION VACTIS
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className="p-2 rounded-full bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 transition-all shadow-xs"
                  title="Fermer"
                >
                  <ActionsIcon name="x" size={16} />
                </button>
              </div>
            </div>

            {/* Contenu complet de l'action sur 100% de la largeur */}
            {selectedAction && (
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-md overflow-hidden p-6 md:p-8 space-y-8">
                {/* Hero Header Pure White avec Accentuation Bleu Soft */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-50/90 via-white to-slate-50 border border-sky-100 text-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-80 h-80 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-sky-50 text-sky-700 border border-sky-200 rounded-2xl shadow-xs">
                        <MenuIcon name="actions" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{formatMedecinName(selectedMedecin)}</h2>
                        <p className="text-xs font-bold text-sky-700 pt-0.5">{selectedMedecin?.specialite ?? 'Spécialité non renseignée'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 relative z-10">
                    {selectedAction.segment && (
                      <Badge variant={getBadgeVariant('segment', selectedAction.segment)} className="px-3.5 py-1.5 text-xs">
                        SEGMENT {selectedAction.segment}
                      </Badge>
                    )}
                    {selectedAction.statut && (
                      <Badge variant={getBadgeVariant('statut', selectedAction.statut)} className="px-3.5 py-1.5 text-xs">
                        {formatEnumLabel(selectedAction.statut)}
                      </Badge>
                    )}
                    {selectedAction.urgence && (
                      <Badge variant={getBadgeVariant('urgence', selectedAction.urgence)} className="gap-1 px-3.5 py-1.5 text-xs">
                        <ActionsIcon name="heartbeat" size={14} />
                        {formatEnumLabel(selectedAction.urgence)}
                      </Badge>
                    )}
                    {selectedAction.etatAction && (
                      <Badge variant={getBadgeVariant('etat', selectedAction.etatAction)} className="px-3.5 py-1.5 text-xs">
                        {formatEnumLabel(selectedAction.etatAction)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Grid 2 Colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Colonne Gauche (6 cols) : Action recommandée & Métriques */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Action Recommandée */}
                    <div className="p-6 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                      <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider block">
                        Action recommandée
                      </span>
                      <h4 className="text-lg font-black text-sky-950">
                        {selectedAction.actionRecommandee ?? '—'}
                      </h4>
                      <p className="text-xs text-sky-900 leading-relaxed">
                        Silence stratégique confirmé : médecin à valeur/potentiel élevé avec rupture de rythme nécessitant une visite urgente.
                      </p>
                    </div>

                    {/* Métriques Grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Métriques de suivi</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block uppercase">Deadline</span>
                            <span className="text-base font-bold text-slate-900">{formatDate(selectedAction.dateVisite)}</span>
                          </div>
                          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                            <ActionsIcon name="calendar" size={18} />
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block uppercase">Jours restants</span>
                            <span className="text-base font-bold text-slate-900">0</span>
                          </div>
                          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                            <ActionsIcon name="clock" size={18} />
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block uppercase">CA Mois</span>
                            <span className="text-base font-bold text-sky-700">0 MAD</span>
                          </div>
                          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl">
                            <ActionsIcon name="target" size={18} />
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block uppercase">Baseline</span>
                            <span className="text-base font-bold text-emerald-700">3 987 MAD</span>
                          </div>
                          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                            <ActionsIcon name="target" size={18} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Colonne Droite (6 cols) : Silence Radio & Métriques avancées */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Silence Radio */}
                    <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                          <ActionsIcon name="heartbeat" size={16} />
                          <span>SILENCE RADIO</span>
                        </div>
                        <Badge variant="silence">SILENCE CRITIQUE</Badge>
                      </div>
                      <div className="text-xs text-rose-900 font-medium space-y-1 pt-1">
                        <p className="font-extrabold text-lg text-rose-950">44 jours sans activité</p>
                        <p className="text-rose-700 text-[11px] uppercase tracking-wider font-bold pt-2">Fréquence habituelle détectée</p>
                        <p className="text-rose-900 font-semibold text-sm">1 visite tous les 10 jours</p>
                      </div>
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
