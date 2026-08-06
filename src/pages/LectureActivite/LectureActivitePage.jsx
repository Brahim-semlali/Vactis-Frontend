import { useCallback, useEffect, useState } from 'react';
import {
  getComparaison,
  getFluxAgreges,
  getKpisMensuels,
  getMoisDisponibles,
  getStatutsRepartition,
  getTopMouvements,
  getTransitionsStatuts,
} from '../../api/activite.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';

function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(val) {
  return `${formatNumber(val)} MAD`;
}

function ActiviteIcon({ name, size = 18 }) {
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
    case 'pulse':
      return (
        <svg {...props}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...props}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case 'dollar':
      return (
        <svg {...props}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
    case 'briefcase':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    default:
      return null;
  }
}

function ComparisonBarChart({ mMinus1, m, refRecente, isCurrency = false }) {
  const values = [mMinus1 ?? 0, m ?? 0, refRecente ?? 0];
  const maxVal = Math.max(...values, 1);

  const formatVal = (v) => (isCurrency ? `${formatNumber(v)} MAD` : formatNumber(v, 2).replace(',00', ''));

  const getBarHeight = (v) => {
    if (!v || v <= 0) return '6%';
    const pct = Math.round((v / maxVal) * 82);
    return `${Math.max(pct, 10)}%`;
  };

  return (
    <div className="activite-chart-container">
      {/* Légende */}
      <div className="activite-chart-legend">
        <span className="activite-chart-legend-item">
          <span className="activite-chart-legend-dot activite-chart-legend-dot--mminus1" />
          M-1
        </span>
        <span className="activite-chart-legend-item">
          <span className="activite-chart-legend-dot activite-chart-legend-dot--m" />
          Mois courant
        </span>
        <span className="activite-chart-legend-item">
          <span className="activite-chart-legend-dot activite-chart-legend-dot--ref" />
          Référence récente
        </span>
      </div>

      {/* Corps du graphique */}
      <div className="activite-chart-body">
        {/* Bar 1: M-1 */}
        <div className="activite-chart-col">
          <div className="activite-chart-value">{formatVal(mMinus1)}</div>
          <div className="activite-chart-bar-wrap">
            <div
              className="activite-chart-bar activite-chart-bar--mminus1"
              style={{ height: getBarHeight(mMinus1) }}
            />
          </div>
          <div className="activite-chart-label activite-chart-label--mminus1">M-1</div>
        </div>

        {/* Bar 2: M */}
        <div className="activite-chart-col">
          <div className="activite-chart-value">{formatVal(m)}</div>
          <div className="activite-chart-bar-wrap">
            <div
              className="activite-chart-bar activite-chart-bar--m"
              style={{ height: getBarHeight(m) }}
            />
          </div>
          <div className="activite-chart-label activite-chart-label--m">M</div>
        </div>

        {/* Bar 3: Référence récente */}
        <div className="activite-chart-col">
          <div className="activite-chart-value">{formatVal(refRecente)}</div>
          <div className="activite-chart-bar-wrap">
            <div
              className="activite-chart-bar activite-chart-bar--ref"
              style={{ height: getBarHeight(refRecente) }}
            />
          </div>
          <div className="activite-chart-label activite-chart-label--ref">Réf. récente</div>
        </div>
      </div>
    </div>
  );
}


export default function LectureActivitePage() {
  const { token } = useAuth();
  const [moisList, setMoisList] = useState([]);
  const [selectedMois, setSelectedMois] = useState('');
  const [kpis, setKpis] = useState(null);
  const [comparaison, setComparaison] = useState(null);
  const [metriqueTab, setMetriqueTab] = useState('cas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Niveau 2 — états
  const [statuts, setStatuts] = useState(null);
  const [transitions, setTransitions] = useState(null);
  const [flux, setFlux] = useState(null);
  const [topMouvements, setTopMouvements] = useState(null);
  const [metriqueTop, setMetriqueTop] = useState('ca');
  const [loadingN2, setLoadingN2] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);

  // État modal pour afficher les médecins au clic sur un statut ou un flux
  const [selectedModalData, setSelectedModalData] = useState(null);

  // Charger la liste des mois disponibles
  useEffect(() => {
    let cancelled = false;

    async function loadMois() {
      if (!token) return;
      try {
        const list = await getMoisDisponibles(token);
        if (!cancelled && list && list.length > 0) {
          setMoisList(list);
          setSelectedMois((prev) => prev || list[0]);
        }
      } catch (err) {
        logError(err);
      }
    }

    loadMois();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [kpisRes, compRes] = await Promise.all([
        getKpisMensuels(token, selectedMois),
        getComparaison(token, selectedMois, null, 3),
      ]);
      setKpis(kpisRes);
      setComparaison(compRes);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedMois]);

  // Chargement Niveau 2 (statuts, transitions, flux) — dépendant uniquement de selectedMois
  const loadDataN2 = useCallback(async () => {
    if (!token || !selectedMois) return;
    setLoadingN2(true);
    try {
      const [statutsRes, transitionsRes, fluxRes] = await Promise.all([
        getStatutsRepartition(token, selectedMois),
        getTransitionsStatuts(token, selectedMois),
        getFluxAgreges(token, selectedMois),
      ]);
      setStatuts(statutsRes);
      setTransitions(transitionsRes);
      setFlux(fluxRes);
    } catch (err) {
      console.error('Erreur Niveau 2:', err);
    } finally {
      setLoadingN2(false);
    }
  }, [token, selectedMois]);

  // Chargement spécifique Top Mouvements — totalement isolé des statuts/flux
  const loadTopMouvements = useCallback(async () => {
    if (!token || !selectedMois) return;
    setLoadingTop(true);
    try {
      const topRes = await getTopMouvements(token, selectedMois, metriqueTop, 10);
      setTopMouvements(topRes);
    } catch (err) {
      console.error('Erreur Top mouvements:', err);
    } finally {
      setLoadingTop(false);
    }
  }, [token, selectedMois, metriqueTop]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDataN2();
  }, [loadDataN2]);

  useEffect(() => {
    loadTopMouvements();
  }, [loadTopMouvements]);

  function logError(err) {
    console.error('Erreur Activite:', err);
  }

  const activeCompData = metriqueTab === 'ca' ? comparaison?.ca : comparaison?.cas;
  const isCurrency = metriqueTab === 'ca';

  return (
    <div className="activite-page">
      {/* Hero Section — style ANAPAT AMANA */}
      <section className="activite-hero">
        <div className="activite-hero-inner">
          <div className="activite-hero-main">
            <div className="activite-hero-heading">
              <span className="activite-hero-icon" aria-hidden="true">
                <MenuIcon name="lecture" />
              </span>
              <div>
                <p className="activite-eyebrow">CYCLE MENSUEL ACTIF</p>
                <h1 className="activite-title">Lecture activité mensuelle</h1>
              </div>
            </div>
            <p className="activite-description">
              Comparaison du mois clôturé avec le mois précédent et la référence récente.
            </p>

            {/* Tags row */}
            <div className="activite-hero-tags">
              <span className="activite-tag activite-tag--active">
                Mois {selectedMois || '—'}
              </span>
              <span className="activite-tag">Workbook vactis · résultats mensuel · laboratoire</span>
              <span className="activite-tag activite-tag--green">Cycle mensuel actif</span>
              <button
                type="button"
                className="activite-tag activite-tag--btn"
                onClick={loadData}
                disabled={loading}
              >
                <ActiviteIcon name="refresh" size={13} />
                Refresh récent
              </button>
            </div>
          </div>

          <div className="activite-hero-actions">
            <label className="activite-mois-picker">
              <span className="activite-mois-label">Période :</span>
              <select
                value={selectedMois}
                onChange={(e) => setSelectedMois(e.target.value)}
                className="activite-select"
              >
                {moisList.map((m) => (
                  <option key={m} value={m}>
                    Mois {m}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary activite-refresh-btn"
              onClick={loadData}
              disabled={loading}
            >
              <ActiviteIcon name="refresh" />
              Rafraîchir
            </button>
          </div>
        </div>
      </section>

      {/* Encart LECTURE VACTIS */}
      <div className="activite-info-banner">
        <span className="activite-info-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <div>
          <span className="activite-info-label">LECTURE VACTIS</span>
          <p className="activite-info-text">
            Ce mois-ci, l&apos;activité est comparée au mois précédent et à la référence récente afin d&apos;identifier les progressions, baisses et signaux de changement de statut.
          </p>
        </div>
      </div>

      {error && (
        <div className="activite-alert activite-alert--error">
          <ActiviteIcon name="alert" />
          <span>{error}</span>
        </div>
      )}

      {/* Bloc 1: Qualité data - activité labo complète */}
      <section className="activite-card-section">
        <div className="activite-section-header">
          <h2 className="activite-section-title">Qualité data - activité labo complète</h2>
          <p className="activite-section-subtitle">
            Indicateurs globaux du mois (incluant les dossiers non affectés).
          </p>
        </div>

        <div className="activite-kpi-grid">
          {/* Card 1: CA MOIS TOTAL DATA — dark, comme ANAPAT AMANA */}
          <div className="activite-kpi-card activite-kpi-card--dark">
            <div className="activite-kpi-header">
              <span className="activite-kpi-title">CA MOIS TOTAL DATA</span>
              <span className="activite-kpi-badge activite-kpi-badge--ghost">
                <ActiviteIcon name="dollar" />
              </span>
            </div>
            <div className="activite-kpi-value">
              {loading ? '…' : formatCurrency(kpis?.caMoisTotal)}
            </div>
            <div className="activite-kpi-sub">Activité réelle du laboratoire.</div>
          </div>

          {/* Card 2: CAS MOIS TOTAL DATA */}
          <div className="activite-kpi-card">
            <div className="activite-kpi-header">
              <span className="activite-kpi-title">CAS MOIS TOTAL DATA</span>
              <span className="activite-kpi-badge activite-kpi-badge--purple">
                <ActiviteIcon name="pulse" />
              </span>
            </div>
            <div className="activite-kpi-value">
              {loading ? '…' : formatNumber(kpis?.casMoisTotal)}
            </div>
            <div className="activite-kpi-sub">Inclut les cas non affectés.</div>
          </div>

          {/* Card 3: MEDECINS AVEC ACTIVITE CE MOIS */}
          <div className="activite-kpi-card">
            <div className="activite-kpi-header">
              <span className="activite-kpi-title">MÉDECINS AVEC ACTIVITÉ CE MOIS</span>
              <span className="activite-kpi-badge activite-kpi-badge--green">
                <ActiviteIcon name="users" />
              </span>
            </div>
            <div className="activite-kpi-value">
              {loading ? '…' : formatNumber(kpis?.medecinsAvecActivite)}
            </div>
            <div className="activite-kpi-sub">Médecins distincts avec au moins 1 cas.</div>
          </div>

          {/* Card 4: PORTEFEUILLE MÉDECINS */}
          <div className="activite-kpi-card">
            <div className="activite-kpi-header">
              <span className="activite-kpi-title">PORTEFEUILLE MÉDECINS</span>
              <span className="activite-kpi-badge activite-kpi-badge--amber">
                <ActiviteIcon name="briefcase" />
              </span>
            </div>
            <div className="activite-kpi-value">
              {loading ? '…' : formatNumber(kpis?.portefeuilleMedecins)}
            </div>
            <div className="activite-kpi-sub">
              {loading ? '…' : formatCurrency(kpis?.portefeuilleCA)}
            </div>
          </div>

          {/* Card 5: NON AFFECTÉS MÉDECIN */}
          <div className="activite-kpi-card">
            <div className="activite-kpi-header">
              <span className="activite-kpi-title">NON AFFECTÉS MÉDECIN</span>
              <span className="activite-kpi-badge activite-kpi-badge--red">
                <ActiviteIcon name="alert" />
              </span>
            </div>
            <div className="activite-kpi-value">
              {loading ? '…' : formatNumber(kpis?.nonAffectesCount)}
            </div>
            <div className="activite-kpi-sub">
              {loading ? '…' : `${kpis?.nonAffectesPct ?? 0}%`}
            </div>
          </div>
        </div>

        <div className="activite-kpi-footer-note">
          Le total DATA correspond à l&apos;activité réelle du laboratoire. Une partie peut être non affectée à un médecin exploitable : elle est incluse dans le CA/cas global, mais exclue du scoring médecin. CA officiel VACTIS : Prix à payer.
        </div>
      </section>

      {/* Bloc 2: Comparaison temporelle (Cas & CA) */}
      <section className="activite-card-section">
        <div className="activite-comparison-header">
          <div>
            <h2 className="activite-section-title">
              {metriqueTab === 'ca' ? 'Comparaison CA' : 'Comparaison cas'}
            </h2>
            <p className="activite-section-subtitle">
              Lecture de la valeur du mois courant, du mois précédent et de la référence récente.
            </p>
          </div>

          <div className="activite-tab-group" role="tablist" aria-label="Sélection métrique temporelle">
            <button
              type="button"
              role="tab"
              aria-selected={metriqueTab === 'ca'}
              className={`activite-tab-btn${metriqueTab === 'ca' ? ' activite-tab-btn--active' : ''}`}
              onClick={() => setMetriqueTab('ca')}
            >
              <ActiviteIcon name="dollar" size={14} />
              <span>Chiffre d&apos;affaires</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metriqueTab === 'cas'}
              className={`activite-tab-btn${metriqueTab === 'cas' ? ' activite-tab-btn--active' : ''}`}
              onClick={() => setMetriqueTab('cas')}
            >
              <ActiviteIcon name="chart" size={14} />
              <span>Volume Cas</span>
            </button>
          </div>
        </div>

        {/* 5 Cards ANAPAT AMANA Style + Chart enveloppés avec animation au changement */}
        <div key={metriqueTab} className="activite-animated-container">
          <div className="activite-comparison-cards">
            {/* Card M (Dark background) */}
            <div className="activite-comp-card activite-comp-card--dark">
              <div className="activite-comp-card-header">
                <span className="activite-comp-card-title">
                  {metriqueTab === 'ca' ? 'CA MOIS M' : 'CAS MOIS M'}
                </span>
                <span className="activite-comp-card-icon">
                  <ActiviteIcon name="pulse" />
                </span>
              </div>
              <div className="activite-comp-card-value">
                {loading ? '…' : isCurrency ? formatCurrency(activeCompData?.moisCourant) : formatNumber(activeCompData?.moisCourant)}
              </div>
              <div className="activite-comp-card-sub">Volume lu depuis l&apos;endpoint.</div>
            </div>

            {/* Card M-1 */}
            <div className="activite-comp-card">
              <div className="activite-comp-card-header">
                <span className="activite-comp-card-title">
                  {metriqueTab === 'ca' ? 'CA MOIS M-1' : 'CAS MOIS M-1'}
                </span>
                <span className="activite-comp-card-icon activite-comp-card-icon--light">
                  <ActiviteIcon name="calendar" />
                </span>
              </div>
              <div className="activite-comp-card-value">
                {loading ? '…' : isCurrency ? formatCurrency(activeCompData?.moisPrecedent) : formatNumber(activeCompData?.moisPrecedent)}
              </div>
              <div className="activite-comp-card-sub">N/A si non exposé.</div>
            </div>

            {/* Card Référence Récente */}
            <div className="activite-comp-card activite-comp-card--ref">
              <div className="activite-comp-card-header">
                <span className="activite-comp-card-title">
                  {metriqueTab === 'ca' ? 'RÉFÉRENCE RÉCENTE — CA' : 'RÉFÉRENCE RÉCENTE — CAS'}
                </span>
                <span className="activite-comp-card-icon activite-comp-card-icon--green">
                  <ActiviteIcon name="clipboard" />
                </span>
              </div>
              <div className="activite-comp-card-value">
                {loading ? '…' : isCurrency ? formatCurrency(activeCompData?.referenceRecente) : formatNumber(activeCompData?.referenceRecente, 2)}
              </div>
              <div className="activite-comp-card-sub">
                Moyenne des mois précédents (3 mois) utilisée comme point de comparaison.
              </div>
            </div>

            {/* Card Variation M vs M-1 */}
            {(() => {
              const val = activeCompData?.variationVsMPrecedentVal ?? 0;
              const pct = activeCompData?.variationVsMPrecedentPct ?? 0;
              const isNegative = val < 0;

              return (
                <div
                  className={`activite-comp-card activite-comp-card--variation ${
                    isNegative ? 'activite-comp-card--negative' : 'activite-comp-card--positive'
                  }`}
                >
                  <div className="activite-comp-card-header">
                    <span className="activite-comp-card-title">
                      {isNegative ? '↘' : '↗'} M VS M-1
                    </span>
                  </div>
                  <div className="activite-comp-card-value">
                    {loading ? '…' : isCurrency ? `${val >= 0 ? '+' : ''}${formatNumber(val)} MAD` : `${val >= 0 ? '+' : ''}${formatNumber(val, 2)}`}
                  </div>
                  <div className="activite-comp-card-sub">
                    {loading ? '…' : `${pct >= 0 ? '+' : ''}${pct}%`}
                  </div>
                </div>
              );
            })()}

            {/* Card Variation Mois vs Référence récente */}
            {(() => {
              const val = activeCompData?.variationVsRefVal ?? 0;
              const pct = activeCompData?.variationVsRefPct ?? 0;
              const isNegative = val < 0;

              return (
                <div
                  className={`activite-comp-card activite-comp-card--variation ${
                    isNegative ? 'activite-comp-card--negative' : 'activite-comp-card--positive'
                  }`}
                >
                  <div className="activite-comp-card-header">
                    <span className="activite-comp-card-title">
                      {isNegative ? '↘' : '↗'} MOIS VS RÉFÉRENCE RÉCENTE
                    </span>
                  </div>
                  <div className="activite-comp-card-value">
                    {loading ? '…' : isCurrency ? `${val >= 0 ? '+' : ''}${formatNumber(val)} MAD` : `${val >= 0 ? '+' : ''}${formatNumber(val, 2)}`}
                  </div>
                  <div className="activite-comp-card-sub">
                    {loading ? '…' : `${pct >= 0 ? '+' : ''}${pct}%`}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Graphique Comparatif */}
          <div className="activite-chart-section">
            <div className="activite-chart-header">
              <span className="activite-chart-eyebrow">GRAPHIQUE COMPARATIF</span>
              <h3 className="activite-chart-title">
                {metriqueTab === 'ca' ? 'CA comparés' : 'Cas comparés'}
              </h3>
              <p className="activite-chart-subtitle">
                Comparaison du mois précédent, du mois courant et de la référence récente : une valeur absente est indiquée comme non disponible.
              </p>
            </div>

            <ComparisonBarChart
              mMinus1={activeCompData?.moisPrecedent}
              m={activeCompData?.moisCourant}
              refRecente={activeCompData?.referenceRecente}
              isCurrency={isCurrency}
            />
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* NIVEAU 2 — Dynamique du portefeuille médecins                    */}
      {/* ================================================================ */}

      {/* Bloc 3 — Lecture statuts VACTIS */}
      <section className="activite-card-section">
        <div className="activite-section-header">
          <h2 className="activite-section-title">Lecture statuts VACTIS</h2>
          <p className="activite-section-subtitle">
            Répartition des statuts du mois M et transitions M-1 vers M si exposées.
          </p>
        </div>

        {/* Grille 4×2 des 8 statuts */}
        {loadingN2 ? (
          <div className="activite-n2-loading">Chargement des statuts…</div>
        ) : (
          <div className="activite-statuts-grid">
            {(statuts?.statuts ?? []).map((s) => {
              const hasMedecins = s.count > 0 && s.medecins?.length > 0;
              return (
                <div
                  key={s.statut}
                  className={`activite-statut-card activite-statut-card--${s.couleur}${
                    hasMedecins ? ' activite-statut-card--clickable' : ''
                  }`}
                  onClick={() => {
                    if (hasMedecins) {
                      setSelectedModalData({
                        title: `Médecins — Statut : ${s.statut.replace('_', ' ').toUpperCase()}`,
                        subtitle: s.libelle,
                        couleur: s.couleur,
                        count: s.count,
                        medecins: s.medecins,
                      });
                    }
                  }}
                  title={hasMedecins ? 'Cliquer pour voir la liste des médecins' : ''}
                >
                  <div className="activite-statut-card-header">
                    <span className="activite-statut-label">{s.statut.replace('_', ' ').toUpperCase()}</span>
                    <span className={`activite-statut-dot activite-statut-dot--${s.couleur}`} />
                  </div>
                  <div className="activite-statut-count">
                    {s.count > 0 ? s.count : '—'}
                  </div>
                  <div className="activite-statut-libelle">
                    {s.libelle}
                    {hasMedecins && <span className="activite-click-hint"> · Cliquer pour voir ({s.count})</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sous-bloc Transitions statuts */}
        {transitions && (
          <div className="activite-transitions-bloc">
            <div className="activite-transitions-header">
              <span className="activite-transitions-title">TRANSITIONS STATUTS</span>
            </div>
            <p className="activite-transitions-subtitle">
              Comparaison {transitions.moisPrecedent} — {transitions.moisCourant}
            </p>
            <p className="activite-transitions-note">
              {transitions.totalEtudies} médecins suivis avec un statut précédent.
            </p>
            <div className="activite-transitions-grid">
              <div className="activite-transition-item">
                <span className="activite-transition-label">TOTAL MÉDECINS ÉTUDIÉS</span>
                <span className="activite-transition-dot activite-statut-dot--blue" />
                <div className="activite-transition-value">{transitions.totalEtudies} médecins</div>
                <div className="activite-transition-sub">Base de comparaison statuts M-1 vers M.</div>
              </div>
              <div className="activite-transition-item">
                <span className="activite-transition-label">TRANSITIONS FAVORABLES</span>
                <span className="activite-transition-dot activite-statut-dot--green" />
                <div className="activite-transition-value">{transitions.favorables} médecins</div>
                <div className="activite-transition-sub">Montée dans la hiérarchie de statut.</div>
              </div>
              <div className="activite-transition-item">
                <span className="activite-transition-label">TRANSITIONS STABLES</span>
                <span className="activite-transition-dot activite-statut-dot--blue" />
                <div className="activite-transition-value">{transitions.stables} médecins</div>
                <div className="activite-transition-sub">Statut conservé ou transition neutre.</div>
              </div>
              <div className="activite-transition-item">
                <span className="activite-transition-label">TRANSITIONS DÉFAVORABLES</span>
                <span className="activite-transition-dot activite-statut-dot--red" />
                <div className="activite-transition-value">{transitions.defavorables} médecins</div>
                <div className="activite-transition-sub">Descente dans la hiérarchie de statut.</div>
              </div>
              <div className="activite-transition-item">
                <span className="activite-transition-label">NOUVEAUX MÉDECINS</span>
                <span className="activite-transition-dot activite-statut-dot--blue" />
                <div className="activite-transition-value">{transitions.nouveauxMedecins} médecins</div>
                <div className="activite-transition-sub">Entrées onboarding observées.</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bloc 4 — Top mouvements */}
      <section className="activite-card-section">
        <div className="activite-comparison-header">
          <div>
            <h2 className="activite-section-title">Top mouvements</h2>
            <p className="activite-section-subtitle">
              Progressions et baisses de chiffre d&apos;affaires ou de cas observées entre M-1 et M.
            </p>
          </div>
          <div className="activite-tab-group" role="tablist" aria-label="Sélection métrique">
            <button
              type="button"
              role="tab"
              aria-selected={metriqueTop === 'ca'}
              className={`activite-tab-btn${metriqueTop === 'ca' ? ' activite-tab-btn--active' : ''}`}
              onClick={() => setMetriqueTop('ca')}
            >
              <ActiviteIcon name="dollar" size={14} />
              <span>CA</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metriqueTop === 'cas'}
              className={`activite-tab-btn${metriqueTop === 'cas' ? ' activite-tab-btn--active' : ''}`}
              onClick={() => setMetriqueTop('cas')}
            >
              <ActiviteIcon name="chart" size={14} />
              <span>Cas</span>
            </button>
          </div>
        </div>

        {loadingTop ? (
          <div className="activite-n2-loading">Chargement des mouvements…</div>
        ) : !topMouvements ? (
          <div className="activite-n2-empty">Données non disponibles.</div>
        ) : (
          <div key={metriqueTop} className="activite-top-grid activite-animated-container">
            {/* Top progressions */}
            <div className="activite-top-col activite-top-col--pos">
              <div className="activite-top-col-header">
                <span className="activite-top-col-icon activite-top-col-icon--pos">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </span>
                <h3 className="activite-top-col-title">
                  Top progressions {metriqueTop === 'ca' ? 'CA' : 'cas'}
                </h3>
              </div>
              {topMouvements.progressions.length === 0 ? (
                <p className="activite-n2-empty">Aucune progression ce mois.</p>
              ) : (
                topMouvements.progressions.map((item, i) => (
                  <div
                    key={`${metriqueTop}-pos-${item.nomMedecin || i}-${i}`}
                    className="activite-top-row activite-top-row-animated"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <div className="activite-top-rank activite-top-rank--pos">{i + 1}</div>
                    <div className="activite-top-info">
                      <span className="activite-top-nom">{item.nomMedecin}</span>
                      <span className="activite-top-specialite">{item.specialite || 'Non renseigné'}</span>
                    </div>
                    <span className="activite-top-delta activite-top-delta--pos">
                      +{formatNumber(item.delta)}{metriqueTop === 'ca' ? ' MAD' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Top baisses */}
            <div className="activite-top-col activite-top-col--neg">
              <div className="activite-top-col-header">
                <span className="activite-top-col-icon activite-top-col-icon--neg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
                <h3 className="activite-top-col-title">
                  Top baisses {metriqueTop === 'ca' ? 'CA' : 'cas'}
                </h3>
              </div>
              {topMouvements.baisses.length === 0 ? (
                <p className="activite-n2-empty">Aucune baisse ce mois.</p>
              ) : (
                topMouvements.baisses.map((item, i) => (
                  <div
                    key={`${metriqueTop}-neg-${item.nomMedecin || i}-${i}`}
                    className="activite-top-row activite-top-row-animated"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <div className="activite-top-rank activite-top-rank--neg">{i + 1}</div>
                    <div className="activite-top-info">
                      <span className="activite-top-nom">{item.nomMedecin}</span>
                      <span className="activite-top-specialite">{item.specialite || 'Non renseigné'}</span>
                    </div>
                    <span className="activite-top-delta activite-top-delta--neg">
                      {formatNumber(item.delta)}{metriqueTop === 'ca' ? ' MAD' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* Bloc 5 — Flux agrégés */}
      <section className="activite-card-section">
        <div className="activite-flux-header">
          <div>
            <h2 className="activite-section-title">Flux agrégés</h2>
            <p className="activite-section-subtitle">Transitions de statuts observées (M-1 → M), triées par effectif.</p>
          </div>
          {flux && (
            <span className="activite-flux-badge">{flux.totalFlux} flux identifiés</span>
          )}
        </div>

        {loadingN2 ? (
          <div className="activite-n2-loading">Chargement des flux…</div>
        ) : !flux || flux.flux.length === 0 ? (
          <div className="activite-n2-empty">Aucun flux disponible pour ce mois.</div>
        ) : (
          <div className="activite-flux-grid">
            {flux.flux.map((item, i) => {
              const hasMedecins = item.nombreMedecins > 0 && item.medecins?.length > 0;
              const prevStr = item.statutPrecedent ? item.statutPrecedent.replace(/_/g, ' ') : '—';
              const currStr = item.statutCourant ? item.statutCourant.replace(/_/g, ' ') : '—';
              return (
                <div
                  key={i}
                  className={`activite-flux-row${hasMedecins ? ' activite-flux-row--clickable' : ''}`}
                  onClick={() => {
                    if (hasMedecins) {
                      setSelectedModalData({
                        title: `Médecins du flux : ${prevStr} → ${currStr}`,
                        subtitle: `${item.nombreMedecins} médecin(s) ayant effectué cette transition M-1 vers M`,
                        couleur: item.couleurCourant,
                        count: item.nombreMedecins,
                        medecins: item.medecins,
                      });
                    }
                  }}
                  title={hasMedecins ? 'Cliquer pour afficher la liste des médecins concernés' : ''}
                >
                  <div className="activite-flux-transition">
                    <span className={`activite-flux-chip activite-flux-chip--${item.statutPrecedent || 'exclu'}`}>
                      <span className={`activite-statut-dot activite-statut-dot--${item.couleurPrecedent}`} />
                      {prevStr}
                    </span>
                    <span className="activite-flux-arrow">→</span>
                    <span className={`activite-flux-chip activite-flux-chip--${item.statutCourant}`}>
                      <span className={`activite-statut-dot activite-statut-dot--${item.couleurCourant}`} />
                      {currStr}
                    </span>
                  </div>
                  <span className="activite-flux-count-badge">
                    {item.nombreMedecins} médecin{item.nombreMedecins > 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal d'affichage de la liste des médecins */}
      {selectedModalData && (
        <div className="activite-modal-overlay" onClick={() => setSelectedModalData(null)}>
          <div className="activite-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="activite-modal-header">
              <div>
                <div className="activite-modal-title-row">
                  <span className={`activite-statut-dot activite-statut-dot--${selectedModalData.couleur}`} />
                  <h3 className="activite-modal-title">{selectedModalData.title}</h3>
                  <span className="activite-modal-count-badge">
                    {selectedModalData.count} médecin{selectedModalData.count > 1 ? 's' : ''}
                  </span>
                </div>
                {selectedModalData.subtitle && (
                  <p className="activite-modal-subtitle">{selectedModalData.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                className="activite-modal-close"
                onClick={() => setSelectedModalData(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="activite-modal-body">
              <table className="activite-modal-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Médecin</th>
                    <th>Spécialité</th>
                    <th className="text-right">Volume cas (M)</th>
                    <th className="text-right">CA (M)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedModalData.medecins.map((m) => (
                    <tr key={m.id || m.codeMedecin}>
                      <td className="activite-modal-code">{m.codeMedecin || '—'}</td>
                      <td className="activite-modal-nom">{m.nom}</td>
                      <td className="activite-modal-specialite">{m.specialite || '—'}</td>
                      <td className="text-right">{formatNumber(m.casM)}</td>
                      <td className="text-right activite-modal-ca">{formatCurrency(m.caM)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
