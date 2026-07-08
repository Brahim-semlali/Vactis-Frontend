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
  'Commercial',
  'Lieu / organisme',
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
      <header className="medecins-subheader">
        <div className="medecins-subheader-left">
          <div className="medecins-breadcrumbs">
            <span>LOT 2.A — SHELL FRONTEND</span>
            <span className="medecins-breadcrumbs-sep" aria-hidden="true">
              /
            </span>
            <span className="medecins-breadcrumbs-muted">PRODUIT LOCAL</span>
          </div>
          <div className="medecins-subheader-title">
            <h1>Actions</h1>
            <p>Espace actions préparé pour les données métier.</p>
          </div>
        </div>

        <div className="medecins-subheader-right">
          <span className="medecins-api-badge">API PRÊTE</span>
          <div className="medecins-api-url">
            <span className="medecins-api-url-label">Endpoint</span>
            <input type="text" readOnly value="/api/actions" aria-label="URL API" />
          </div>
          <button type="button" className="medecins-settings-btn" aria-label="Paramètres">
            <ActionsIcon name="settings" />
          </button>
        </div>
      </header>

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
            options={STATUT_OPTIONS}
          />
          <FilterSelect
            label="Segment"
            value={filters.segment}
            onChange={updateFilter('segment')}
            placeholder="Tous"
            options={SEGMENT_OPTIONS}
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
                      className={`medecins-table-row${
                        selectedAction?.id === action.id ? ' medecins-table-row--active' : ''
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
                        <span className={getBadgeClass('statut', action.statut)}>
                          {formatEnumLabel(action.statut)}
                        </span>
                      </td>
                      <td>
                        <span className={getBadgeClass('segment', action.segment)}>
                          {action.segment ? `SEGMENT ${action.segment}` : '—'}
                        </span>
                      </td>
                      <td>{action.actionRecommandee ?? '—'}</td>
                      <td>
                        <span className={getBadgeClass('urgence', action.urgence)}>
                          {formatEnumLabel(action.urgence)}
                        </span>
                      </td>
                      <td>
                        <span className={getBadgeClass('etat', action.etatAction)}>
                          {formatEnumLabel(action.etatAction)}
                        </span>
                      </td>
                      <td>{formatDate(action.dateVisite)}</td>
                      <td>{action.commercial ?? '—'}</td>
                      <td>{action.lieuOrganisme ?? '—'}</td>
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
            <div className="medecins-detail-content">
              <span className="medecins-detail-avatar" aria-hidden="true">
                <MenuIcon name="actions" />
              </span>
              <p className="medecins-detail-name">{formatMedecinName(selectedMedecin)}</p>
              <p className="medecins-detail-specialty">{selectedMedecin?.specialite ?? '—'}</p>

              <div className="medecins-detail-badges">
                <span className={getBadgeClass('segment', selectedAction.segment)}>
                  {selectedAction.segment ? `SEGMENT ${selectedAction.segment}` : '—'}
                </span>
                <span className={getBadgeClass('statut', selectedAction.statut)}>
                  {formatEnumLabel(selectedAction.statut)}
                </span>
                <span className={getBadgeClass('urgence', selectedAction.urgence)}>
                  {formatEnumLabel(selectedAction.urgence)}
                </span>
                <span className={getBadgeClass('etat', selectedAction.etatAction)}>
                  {formatEnumLabel(selectedAction.etatAction)}
                </span>
              </div>

              <div className="medecins-detail-section">
                <h4>Lieu &amp; organisme</h4>
                <ul className="medecins-detail-list">
                  <li className="medecins-detail-list-item">
                    <ActionsIcon name="map-pin" size={16} />
                    <div>
                      <span className="medecins-detail-list-label">Lieu principal</span>
                      <span>{selectedAction.lieuOrganisme ?? '—'}</span>
                      {selectedMedecin?.ville && (
                        <span className="medecins-detail-list-meta">{selectedMedecin.ville}</span>
                      )}
                    </div>
                  </li>
                </ul>
              </div>

              <div className="medecins-detail-section">
                <h4>Informations action</h4>
                <ul className="medecins-detail-info">
                  <li>
                    <span>Action recommandée</span>
                    <strong>{selectedAction.actionRecommandee ?? '—'}</strong>
                  </li>
                  <li>
                    <span>Date visite</span>
                    <strong>{formatDate(selectedAction.dateVisite)}</strong>
                  </li>
                  <li>
                    <span>Commercial</span>
                    <strong>{selectedAction.commercial ?? '—'}</strong>
                  </li>
                  <li>
                    <span>Cycle mensuel</span>
                    <strong>{selectedAction.cycleMensuel ?? '—'}</strong>
                  </li>
                  <li>
                    <span>Backlog</span>
                    <strong>{selectedAction.backlog ? 'Oui' : 'Non'}</strong>
                  </li>
                  <li>
                    <span>Urgence silence</span>
                    <strong>{selectedAction.urgenceSilence ? 'Oui' : 'Non'}</strong>
                  </li>
                  {selectedAction.commentaire && (
                    <li>
                      <span>Commentaire</span>
                      <strong>{selectedAction.commentaire}</strong>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
