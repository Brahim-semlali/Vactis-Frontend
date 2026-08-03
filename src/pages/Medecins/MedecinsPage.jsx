import { useCallback, useEffect, useState } from 'react';
import { getMedecinByCode, getMedecins } from '../../api/medecins.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';

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
  { id: 'total', key: 'total', label: 'Total médecins', icon: 'users', variant: 'primary' },
  { id: 'segments', key: 'segmentsAB', label: 'Segments A/B', icon: 'chart' },
  { id: 'surveillance', key: 'surveillance', label: 'Surveillance', icon: 'warning', tone: 'amber' },
  { id: 'onboarding', key: 'onboarding', label: 'Onboarding', icon: 'search', tone: 'blue' },
  { id: 'silence', key: 'silenceCritique', label: 'Silence critique', icon: 'alert', tone: 'red' },
  { id: 'actions', key: 'actionsEnCours', label: 'Actions en cours', icon: 'bolt', tone: 'green' },
];

const TABLE_COLUMNS = [
  'Médecin',
  'Lieu / organisme',
  'Segment',
  'Statut',
  'CA mobil.',
];

const STATUT_OPTIONS = [
  'ACTIF',
  'SURVEILLANCE',
  'PROGRESSION',
  'ONBOARDING',
  'SILENCE_CRITIQUE',
];

const SEGMENT_OPTIONS = ['A', 'B', 'C'];

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
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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
    default:
      return null;
  }
}

function formatEnumLabel(value) {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function formatMedecinName(medecin) {
  return `${medecin.nom ?? ''} ${medecin.prenom ?? ''}`.trim().toUpperCase();
}

function formatCaMois(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString('fr-FR')} MAD`;
}

function getBadgeClass(type, value) {
  if (!value) return 'medecins-badge medecins-badge--muted';

  const normalized = String(value).toUpperCase();

  if (type === 'segment') {
    if (normalized === 'A') return 'medecins-badge medecins-badge--segment-a';
    if (normalized === 'B') return 'medecins-badge medecins-badge--segment-b';
    return 'medecins-badge medecins-badge--segment-c';
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
        {options.map((option) => (
          <option key={option} value={option}>
            {formatEnumLabel(option)}
          </option>
        ))}
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
        <MedecinsIcon name={icon} size={20} />
      </span>
    </article>
  );
}

export default function MedecinsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pageData, setPageData] = useState(null);
  const [selectedMedecin, setSelectedMedecin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setSelectedMedecin(medecin);
          return;
        }

        const data = await getMedecins(token, { ...listFilters, search: code });
        setPageData(data);
        setSelectedMedecin(data.items?.[0] ?? null);

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

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSelectedMedecin(null);
  };

  const medecins = pageData?.items ?? [];
  const kpis = pageData?.kpis ?? {};
  const meta = pageData?.meta ?? {};
  const filterOptions = pageData?.filters ?? {};

  return (
    <div className="medecins-page">
      <section className="medecins-card medecins-hero">
        <div className="medecins-hero-main">
          <div className="medecins-hero-heading">
            <span className="medecins-hero-icon" aria-hidden="true">
              <MenuIcon name="medecins" />
            </span>
            <div>
              <p className="medecins-eyebrow">Portefeuille médecins</p>
              <h2 className="medecins-title">Médecins</h2>
            </div>
          </div>
          <p className="medecins-description">
            Table centrale filtrable et fiche VACTIS contextuelle pour prioriser les médecins à
            consulter.
          </p>
          <div className="medecins-meta">
            <span>Workbook VACTIS</span>
            <span>Dernière mise à jour — {loading ? '…' : 'maintenant'}</span>
            <span>
              {meta.affiches ?? 0} affichés / {meta.charges ?? 0} chargés
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary medecins-refresh-btn"
          onClick={loadMedecins}
          disabled={loading}
        >
          <MedecinsIcon name="refresh" />
          Rafraîchir
        </button>
      </section>

      <section className="medecins-card medecins-filters">
        <div className="medecins-search">
          <MedecinsIcon name="search" />
          <input
            type="search"
            placeholder="Rechercher un médecin, une spécialité, un lieu…"
            value={filters.search}
            onChange={updateFilter('search')}
            aria-label="Rechercher un médecin"
          />
        </div>

        <div className="medecins-filter-group">
          <label className="medecins-filter">
            <span className="medecins-filter-label">Code médecin</span>
            <input
              type="text"
              className="medecins-filter-input"
              placeholder="MED001"
              value={filters.codeMedecin}
              onChange={updateFilter('codeMedecin')}
              aria-label="Rechercher par code médecin"
            />
          </label>
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
            label="Spécialité"
            value={filters.specialite}
            onChange={updateFilter('specialite')}
            placeholder="Toutes"
            options={filterOptions.specialites ?? []}
          />
          <FilterSelect
            label="Risque / urgence"
            value={filters.risqueUrgence}
            onChange={updateFilter('risqueUrgence')}
            placeholder="Tous"
            options={RISQUE_OPTIONS}
          />
          <FilterSelect
            label="Lieu / organisme"
            value={filters.organisme}
            onChange={updateFilter('organisme')}
            placeholder="Tous"
            options={filterOptions.organismes ?? []}
          />
        </div>

        <button type="button" className="btn btn-ghost medecins-reset-btn" onClick={resetFilters}>
          <MedecinsIcon name="reset" />
          Reset
        </button>
      </section>

      {error && (
        <section className="medecins-card medecins-error">
          <p>{error}</p>
        </section>
      )}

      <section className="medecins-kpi-grid" aria-label="Indicateurs médecins">
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
              <h3>Table médecins</h3>
              <p>Cliquez sur une ligne pour ouvrir la fiche contextuelle.</p>
            </div>
          </header>

          <div className="medecins-table-wrap">
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
                        <p className="medecins-empty-title">Chargement des médecins…</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && medecins.length === 0 && (
                  <tr className="medecins-table-empty">
                    <td colSpan={TABLE_COLUMNS.length}>
                      <div className="medecins-empty-state">
                        <span className="medecins-empty-icon" aria-hidden="true">
                          <MenuIcon name="medecins" />
                        </span>
                        <p className="medecins-empty-title">Aucun médecin trouvé</p>
                        <p className="medecins-empty-text">
                          Ajustez les filtres ou ajoutez des données en base.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  medecins.map((medecin) => (
                    <tr
                      key={medecin.id}
                      className={`medecins-table-row${
                        selectedMedecin?.id === medecin.id ? ' medecins-table-row--active' : ''
                      }`}
                      onClick={() => setSelectedMedecin(medecin)}
                    >
                      <td>
                        <div className="medecins-cell-name">{formatMedecinName(medecin)}</div>
                        <div className="medecins-cell-sub">{medecin.specialite}</div>
                      </td>
                      <td>{medecin.organisme ?? '—'}</td>
                      <td>
                        <span className={getBadgeClass('segment', medecin.segment)}>
                          {medecin.segment ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className={getBadgeClass('statut', medecin.statut || medecin.statutPilotage)}>
                          {medecin.statut ? medecin.statut : formatEnumLabel(medecin.statutPilotage)}
                        </span>
                      </td>
                      <td className="medecins-cell-ca">{formatCaMois(medecin.caMois)}</td>
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
              <p>Informations détaillées du médecin sélectionné.</p>
            </div>
          </header>

          {!selectedMedecin && (
            <div className="medecins-detail-empty">
              <span className="medecins-detail-avatar" aria-hidden="true">
                <MenuIcon name="medecins" />
              </span>
              <p className="medecins-detail-name">Aucun médecin sélectionné</p>
              <p className="medecins-detail-specialty">—</p>

              <div className="medecins-detail-section">
                <h4>Lieux &amp; organismes</h4>
                <ul className="medecins-detail-list">
                  <li className="medecins-detail-list-empty">
                    <MedecinsIcon name="map-pin" size={16} />
                    <span>Sélectionnez un médecin dans la table.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {selectedMedecin && (
            <div className="medecins-detail-content">
              <span className="medecins-detail-avatar" aria-hidden="true">
                <MenuIcon name="medecins" />
              </span>
              <p className="medecins-detail-name">{formatMedecinName(selectedMedecin)}</p>
              <p className="medecins-detail-specialty">{selectedMedecin.specialite}</p>

              <div className="medecins-detail-badges">
                <span className={getBadgeClass('segment', selectedMedecin.segment)}>
                  {selectedMedecin.segment ?? '—'}
                </span>
                <span className={getBadgeClass('statut', selectedMedecin.statut || selectedMedecin.statutPilotage)}>
                  {selectedMedecin.statut ? selectedMedecin.statut : formatEnumLabel(selectedMedecin.statutPilotage)}
                </span>
              </div>

              <div className="medecins-detail-section">
                <h4>Lieux &amp; organismes</h4>
                <ul className="medecins-detail-list">
                  <li className="medecins-detail-list-item">
                    <MedecinsIcon name="map-pin" size={16} />
                    <div>
                      <span className="medecins-detail-list-label">Lieu principal</span>
                      <span>{selectedMedecin.organisme ?? '—'}</span>
                      {selectedMedecin.ville && (
                        <span className="medecins-detail-list-meta">{selectedMedecin.ville}</span>
                      )}
                    </div>
                  </li>
                </ul>
              </div>

              <div className="medecins-detail-section">
                <h4>Informations</h4>
                <ul className="medecins-detail-info">
                  <li>
                    <span>Code</span>
                    <strong>{selectedMedecin.codeMedecin ?? '—'}</strong>
                  </li>
                  <li>
                    <span>CA mobil.</span>
                    <strong>{formatCaMois(selectedMedecin.caMois)}</strong>
                  </li>
                  <li>
                    <span>Risque / urgence</span>
                    <strong>{formatEnumLabel(selectedMedecin.risqueUrgence)}</strong>
                  </li>
                  <li>
                    <span>Commercial référent</span>
                    <strong>{selectedMedecin.commercialReferent ?? '—'}</strong>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
