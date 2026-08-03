import { useCallback, useEffect, useState } from 'react';
import { getActions } from '../../api/actions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';

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
  {
    id: 'generated',
    key: 'actionsGenerees',
    label: 'Actions générées',
    icon: 'clipboard',
    variant: 'primary',
  },
  { id: 'planned', key: 'planifiees', label: 'Planifiées', icon: 'calendar', tone: 'blue' },
  { id: 'visits', key: 'visites', label: 'Visites', icon: 'check', tone: 'green' },
  { id: 'backlog', key: 'backlog', label: 'Backlog', icon: 'inbox', tone: 'amber' },
  {
    id: 'silence',
    key: 'urgenceSilence',
    label: 'Urgence silence',
    icon: 'alert',
    tone: 'red',
  },
];

const TABLE_COLUMNS = [
  'Médecin',
  'Statut',
  'Segment',
  'Action recommandée',
  'Urgence',
  'État',
  'Date visite',
];

const STATUT_OPTIONS = [
  'ACTIF',
  'SURVEILLANCE',
  'PROGRESSION',
  'ONBOARDING',
  'SILENCE_CRITIQUE',
];

const SEGMENT_OPTIONS = ['A', 'B', 'C'];

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
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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
    case 'antenna':
      return (
        <svg {...props}>
          <path d="M2 12h4l2-2m4 0l2 2h4M12 2v8M9.5 5.5l5 5m-5 0l5-5" stroke="currentColor" />
          <circle cx="12" cy="10" r="2" fill="currentColor" />
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

function getBadgeClass(type, value) {
  if (!value) return 'medecins-badge medecins-badge--muted';

  const normalized = String(value).toUpperCase();

  if (type === 'segment') {
    if (normalized === 'A') return 'medecins-badge medecins-badge--segment-a';
    if (normalized === 'B') return 'medecins-badge medecins-badge--segment-b';
    return 'medecins-badge medecins-badge--segment-c';
  }

  if (type === 'etat') {
    if (normalized === 'REALISEE') return 'medecins-badge medecins-badge--progression';
    return 'medecins-badge medecins-badge--onboarding';
  }

  if (type === 'urgence') {
    if (normalized === 'SILENCE_CRITIQUE' || normalized === 'URGENT') {
      return 'medecins-badge medecins-badge--silence';
    }
    if (normalized === 'ELEVE') return 'medecins-badge medecins-badge--surveillance';
    if (normalized === 'MOYEN') return 'medecins-badge medecins-badge--segment-b';
    return 'medecins-badge medecins-badge--actif';
  }

  if (normalized === 'SURVEILLANCE') return 'medecins-badge medecins-badge--surveillance';
  if (normalized === 'PROGRESSION') return 'medecins-badge medecins-badge--progression';
  if (normalized === 'ONBOARDING') return 'medecins-badge medecins-badge--onboarding';
  if (normalized === 'SILENCE_CRITIQUE') return 'medecins-badge medecins-badge--silence';
  return 'medecins-badge medecins-badge--actif';
}

function FilterSelect({ label, value, onChange, placeholder, options = [] }) {
  return (
    <label className="medecins-filter">
      <span className="medecins-filter-label">{label}</span>
      <select className="medecins-filter-select" value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? formatEnumLabel(option) : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function KpiCard({ label, icon, variant, tone, value }) {
  return (
    <article
      className={[
        'medecins-kpi',
        variant === 'primary' ? 'medecins-kpi--primary' : '',
        tone ? `medecins-kpi--${tone}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="medecins-kpi-content">
        <span className="medecins-kpi-value">{value ?? '—'}</span>
        <span className="medecins-kpi-label">{label}</span>
      </div>
      <span className="medecins-kpi-icon" aria-hidden="true">
        <ActionsIcon name={icon} size={20} />
      </span>
    </article>
  );
}

export default function ActionsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pageData, setPageData] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
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

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSelectedAction(null);
  };

  const actions = pageData?.items ?? [];
  const kpis = pageData?.kpis ?? {};
  const meta = pageData?.meta ?? {};
  const filterOptions = pageData?.filters ?? {};
  const selectedMedecin = selectedAction?.medecin ?? null;

  return (
    <div className="medecins-page">


      <section className="medecins-card medecins-hero">
        <div className="medecins-hero-main">
          <div className="medecins-hero-heading">
            <span className="medecins-hero-icon" aria-hidden="true">
              <MenuIcon name="actions" />
            </span>
            <div>
              <p className="medecins-eyebrow">Cycle mensuel VACTIS</p>
              <h2 className="medecins-title">Actions</h2>
            </div>
          </div>
          <p className="medecins-description">
            Table centrale filtrable et fiche contextuelle pour prioriser les actions commerciales
            à réaliser.
          </p>
          <div className="medecins-meta">
            <span>Workbook VACTIS</span>
            <span>Dernière mise à jour — {loading ? '…' : 'maintenant'}</span>
            <span>
              {meta.affiches ?? 0} affichées / {meta.charges ?? 0} chargées
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary medecins-refresh-btn"
          onClick={loadActions}
          disabled={loading}
        >
          <ActionsIcon name="refresh" />
          Rafraîchir
        </button>
      </section>

      <section className="medecins-card medecins-filters">
        <div className="medecins-search">
          <ActionsIcon name="search" />
          <input
            type="search"
            placeholder="Rechercher un médecin, une action, un commercial…"
            value={filters.search}
            onChange={updateFilter('search')}
            aria-label="Rechercher une action"
          />
        </div>

        <div className="medecins-filter-group actions-filter-group">
          <FilterSelect
            label="Statut"
            value={filters.statut}
            onChange={updateFilter('statut')}
            placeholder="Tous"
            options={filterOptions.statuts ?? []}
          />
          <FilterSelect
            label="Segment"
            value={filters.segment}
            onChange={updateFilter('segment')}
            placeholder="Tous"
            options={filterOptions.segments ?? []}
          />
          <FilterSelect
            label="Action"
            value={filters.action}
            onChange={updateFilter('action')}
            placeholder="Toutes"
            options={filterOptions.actions ?? []}
          />
          <FilterSelect
            label="Urgence"
            value={filters.urgence}
            onChange={updateFilter('urgence')}
            placeholder="Toutes"
            options={URGENCE_OPTIONS}
          />
          <FilterSelect
            label="État action"
            value={filters.etatAction}
            onChange={updateFilter('etatAction')}
            placeholder="Tous"
            options={ETAT_OPTIONS}
          />
          <FilterSelect
            label="Backlog"
            value={filters.backlog}
            onChange={updateFilter('backlog')}
            placeholder="Tous"
            options={BACKLOG_OPTIONS}
          />
          <FilterSelect
            label="Commercial"
            value={filters.commercial}
            onChange={updateFilter('commercial')}
            placeholder="Tous"
            options={filterOptions.commerciaux ?? []}
          />
          <FilterSelect
            label="Lieu / organisme"
            value={filters.lieuOrganisme}
            onChange={updateFilter('lieuOrganisme')}
            placeholder="Tous"
            options={filterOptions.lieuxOrganismes ?? []}
          />
        </div>

        <button type="button" className="btn btn-ghost medecins-reset-btn" onClick={resetFilters}>
          <ActionsIcon name="reset" />
          Reset
        </button>
      </section>

      {error && (
        <section className="medecins-card medecins-error">
          <p>{error}</p>
        </section>
      )}

      <section className="medecins-kpi-grid actions-kpi-grid" aria-label="Indicateurs actions">
        {KPI_ITEMS.map(({ id, key: kpiKey, label, icon, variant, tone }) => (
          <KpiCard
            key={id}
            label={label}
            icon={icon}
            variant={variant}
            tone={tone}
            value={kpis[kpiKey]}
          />
        ))}
      </section>

      <section className="medecins-split">
        <article className="medecins-card medecins-table-panel">
          <header className="medecins-panel-header">
            <div>
              <h3>Table actions</h3>
              <p>Cliquez sur une ligne pour ouvrir la fiche contextuelle.</p>
            </div>
          </header>

          <div className="medecins-table-wrap actions-table-wrap">
            <table className="medecins-table">
              <thead>
                <tr>
                  {TABLE_COLUMNS.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="medecins-table-empty">
                    <td colSpan={TABLE_COLUMNS.length}>
                      <div className="medecins-empty-state">
                        <p className="medecins-empty-title">Chargement des actions…</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && actions.length === 0 && (
                  <tr className="medecins-table-empty">
                    <td colSpan={TABLE_COLUMNS.length}>
                      <div className="medecins-empty-state">
                        <span className="medecins-empty-icon" aria-hidden="true">
                          <MenuIcon name="actions" />
                        </span>
                        <p className="medecins-empty-title">Aucune action trouvée</p>
                        <p className="medecins-empty-text">
                          Ajustez les filtres ou ajoutez des données en base.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  actions.map((action) => (
                    <tr
                      key={action.id}
                      className={`medecins-table-row${selectedAction?.id === action.id ? ' medecins-table-row--active' : ''
                        }`}
                      onClick={() => setSelectedAction(action)}
                    >
                      <td>
                        <div className="medecins-cell-name">
                          {formatMedecinName(action.medecin)}
                        </div>
                        <div className="medecins-cell-sub">{action.medecin?.specialite ?? '—'}</div>
                      </td>
                      <td>
                        <span className="badge-outline badge-yellow">
                          {formatEnumLabel(action.statut)}
                        </span>
                      </td>
                      <td>
                        <span className="badge-outline badge-yellow">
                          {action.segment ? `SEGMENT ${action.segment}` : '—'}
                        </span>
                      </td>
                      <td>
                        <div className="table-action-recommandee">
                          {action.actionRecommandee ?? '—'}
                        </div>
                      </td>
                      <td>
                        <span className="badge-text badge-red">
                          <ActionsIcon name="heartbeat" size={14} />
                          {formatEnumLabel(action.urgence)}
                        </span>
                      </td>
                      <td>
                        <span className="badge-outline badge-grey">
                          {formatEnumLabel(action.etatAction)}
                        </span>
                      </td>
                      <td>
                        <div className="table-date">
                          {formatDate(action.dateVisite)}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="medecins-card medecins-detail-panel">
          <header className="medecins-panel-header">
            <div>
              <h3>Fiche contextuelle</h3>
              <p>Informations détaillées de l&apos;action sélectionnée.</p>
            </div>
          </header>

          {!selectedAction && (
            <div className="medecins-detail-empty">
              <span className="medecins-detail-avatar" aria-hidden="true">
                <MenuIcon name="actions" />
              </span>
              <p className="medecins-detail-name">Aucune action sélectionnée</p>
              <p className="medecins-detail-specialty">—</p>

              <div className="medecins-detail-section">
                <h4>Contexte</h4>
                <ul className="medecins-detail-list">
                  <li className="medecins-detail-list-empty">
                    <ActionsIcon name="map-pin" size={16} />
                    <span>Sélectionnez une action dans la table.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {selectedAction && (
            <div className="fiche-panel">
              {/* Nom + spécialité */}
              <div className="fiche-identity">
                <p className="fiche-name">{formatMedecinName(selectedMedecin)}</p>
                <p className="fiche-specialty">{selectedMedecin?.specialite ?? '—'}</p>
              </div>

              {/* Ligne 1 de badges : Segment + Statut */}
              <div className="fiche-badges-row">
                {selectedAction.segment && (
                  <span className={`fiche-badge fiche-badge--segment-${selectedAction.segment.toLowerCase()}`}>
                    SEGMENT {selectedAction.segment}
                  </span>
                )}
                {selectedAction.statut && (
                  <span className={`fiche-badge fiche-badge--statut fiche-badge--statut-${selectedAction.statut.toLowerCase()}`}>
                    {formatEnumLabel(selectedAction.statut)}
                  </span>
                )}
              </div>

              {/* Ligne 2 de badges : Urgence + Etat */}
              <div className="fiche-badges-row fiche-badges-row--sm">
                {selectedAction.urgence && (
                  <span className={`fiche-badge fiche-badge--urgence fiche-badge--urgence-${selectedAction.urgence.toLowerCase()}`}>
                    <ActionsIcon name="heartbeat" size={12} />
                    {formatEnumLabel(selectedAction.urgence)}
                  </span>
                )}
                {selectedAction.etatAction && (
                  <span className={`fiche-badge fiche-badge--etat fiche-badge--etat-${selectedAction.etatAction.toLowerCase()}`}>
                    {formatEnumLabel(selectedAction.etatAction)}
                  </span>
                )}
              </div>

              {/* ACTION RECOMMANDEE */}
              <div className="fiche-ar-card">
                <div className="fiche-ar-label">ACTION RECOMMANDÉE</div>
                <div className="fiche-ar-title">{selectedAction.actionRecommandee ?? '—'}</div>
                <div className="fiche-ar-desc">
                  Silence stratégique confirmé : médecin à valeur/potentiel élevé avec rupture de rythme nécessitant une visite urgente.
                </div>
              </div>

              {/* MÉTRIQUES */}
              <div className="fiche-metrics-grid">
                <div className="fiche-metric">
                  <div className="fiche-metric-header">
                    <span className="fiche-metric-label">DEADLINE</span>
                    <span className="fiche-metric-icon fiche-metric-icon--yellow">
                      <ActionsIcon name="calendar" size={14} />
                    </span>
                  </div>
                  <div className="fiche-metric-value">{formatDate(selectedAction.dateVisite)}</div>
                </div>
                <div className="fiche-metric">
                  <div className="fiche-metric-header">
                    <span className="fiche-metric-label">JOURS RESTANTS</span>
                    <span className="fiche-metric-icon fiche-metric-icon--grey">
                      <ActionsIcon name="clock" size={14} />
                    </span>
                  </div>
                  <div className="fiche-metric-value">0</div>
                </div>
                <div className="fiche-metric">
                  <div className="fiche-metric-header">
                    <span className="fiche-metric-label">CA MOIS</span>
                    <span className="fiche-metric-icon fiche-metric-icon--blue">
                      <ActionsIcon name="target" size={14} />
                    </span>
                  </div>
                  <div className="fiche-metric-value">0 MAD</div>
                </div>
                <div className="fiche-metric">
                  <div className="fiche-metric-header">
                    <span className="fiche-metric-label">BASELINE</span>
                    <span className="fiche-metric-icon fiche-metric-icon--green">
                      <ActionsIcon name="target" size={14} />
                    </span>
                  </div>
                  <div className="fiche-metric-value">3 987 MAD</div>
                </div>
              </div>

              {/* SILENCE RADIO */}
              <div className="fiche-silence-card">
                <div className="fiche-silence-header">
                  <ActionsIcon name="heartbeat" size={14} />
                  <span>SILENCE RADIO</span>
                </div>
                <span className="fiche-badge fiche-badge--silence-critique">SILENCE CRITIQUE</span>
                <p className="fiche-silence-desc">
                  44 jours sans activité<br />
                  FRÉQUENCE DÉTECTÉE<br />
                  1 sur tous les 10 jours
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
