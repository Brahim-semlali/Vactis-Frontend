import { useCallback, useEffect, useState } from 'react';
import {
  getActionsVactis,
  getComparaison,
  getCompteRenduTerrain,
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

const RANG_STATUT_MAP = {
  progression: 1,
  actif_stable: 2,
  actif: 2,
  surveillance: 3,
  retention: 4,
  silence_critique: 5,
  activite_irreguliere: 5,
  onboarding: 6,
  a_reactiver: 7,
  exclu: 8,
  inactif: 8,
};

function getCouleurFlux(item) {
  if (item.couleurFlux) return item.couleurFlux;

  const statM = item.statutCourant || '';
  const statMm1 = item.statutPrecedent || '';

  if (statM === 'onboarding' && (statMm1 === 'exclu' || statMm1 === 'inactif' || !statMm1)) {
    return 'blue';
  }

  const rangM = RANG_STATUT_MAP[statM] ?? 8;
  const rangMm1 = RANG_STATUT_MAP[statMm1] ?? 8;

  if (rangM > rangMm1) return 'red';    // Statut fort -> statut moins fort (Défavorable)
  if (rangM < rangMm1) return 'green';  // Statut moins fort -> statut plus fort (Favorable)
  return 'gray';                        // Statut identique / inchangé
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
    case 'checkCircle':
      return (
        <svg {...props}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'trendingDown':
      return (
        <svg {...props}>
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    case 'trendingUp':
      return (
        <svg {...props}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'thumbsDown':
      return (
        <svg {...props}>
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      );
    case 'thumbsUp':
      return (
        <svg {...props}>
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4.33A2.31 2.31 0 0 1 2 19.67V12.33A2.31 2.31 0 0 1 4.33 10H7" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...props}>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...props}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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

  // Niveau 3 — états (Exécution terrain)
  const [actionsVactis, setActionsVactis] = useState(null);
  const [compteRenduTerrain, setCompteRenduTerrain] = useState(null);
  const [loadingN3, setLoadingN3] = useState(false);

  // État modal pour afficher les médecins ou retours terrain au clic
  const [selectedModalData, setSelectedModalData] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const [modalSearch, setModalSearch] = useState('');
  const MODAL_PAGE_SIZE = 15;

  const openRetoursModal = useCallback((title, subtitle, couleur, items) => {
    const list = items || [];
    setModalPage(1);
    setModalSearch('');
    setSelectedModalData({
      type: 'retours',
      title,
      subtitle,
      couleur: couleur || 'blue',
      count: list.length,
      retours: list,
    });
  }, []);

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

  // Chargement Niveau 3 (Actions VACTIS & Compte-rendu terrain)
  const loadDataN3 = useCallback(async () => {
    if (!token || !selectedMois) return;
    setLoadingN3(true);
    try {
      const [actionsRes, crRes] = await Promise.allSettled([
        getActionsVactis(token, selectedMois),
        getCompteRenduTerrain(token, selectedMois),
      ]);
      if (actionsRes.status === 'fulfilled') {
        setActionsVactis(actionsRes.value);
      } else {
        console.warn('Impossible de charger les actions VACTIS (Niveau 3):', actionsRes.reason);
        setActionsVactis(null);
      }
      if (crRes.status === 'fulfilled') {
        setCompteRenduTerrain(crRes.value);
      } else {
        console.warn('Impossible de charger le compte-rendu terrain (Niveau 3):', crRes.reason);
        setCompteRenduTerrain(null);
      }
    } catch (err) {
      console.warn('Erreur Niveau 3:', err);
    } finally {
      setLoadingN3(false);
    }
  }, [token, selectedMois]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDataN2();
  }, [loadDataN2]);

  useEffect(() => {
    loadTopMouvements();
  }, [loadTopMouvements]);

  useEffect(() => {
    loadDataN3();
  }, [loadDataN3]);

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
                      setModalPage(1);
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
              const colorType = getCouleurFlux(item);
              return (
                <div
                  key={i}
                  className={`activite-flux-row activite-flux-row--${colorType}${hasMedecins ? ' activite-flux-row--clickable' : ''}`}
                  onClick={() => {
                    if (hasMedecins) {
                      setModalPage(1);
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
                    <span className="activite-statut-dot" />
                    <span className="activite-flux-statut">
                      {prevStr} <span className="activite-flux-arrow">→</span> {currStr}
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

      {/* Bloc 6 — Lecture réalisation commerciale / actions VACTIS */}
      <section className="activite-card-section">
        <div className="activite-section-header">
          <h2 className="activite-section-title">Lecture réalisation commerciale / actions VACTIS</h2>
          <p className="activite-section-subtitle">
            Observation mensuelle des actions couvertes si données exposées.
          </p>
        </div>

        {loadingN3 ? (
          <div className="activite-n2-loading">Chargement de la réalisation commerciale…</div>
        ) : !actionsVactis ? (
          <div className="activite-n2-empty">Données d&apos;actions non disponibles.</div>
        ) : (
          <>
            {/* 5 compteurs */}
            <div className="activite-kpi-grid">
              <div className="activite-kpi-card">
                <div className="activite-kpi-header">
                  <span className="activite-kpi-title">ACTIONS GÉNÉRÉES</span>
                  <span className="activite-kpi-badge activite-kpi-badge--ghost">
                    <ActiviteIcon name="clipboard" />
                  </span>
                </div>
                <div className="activite-kpi-value">{formatNumber(actionsVactis.actionsGenerees)}</div>
                <div className="activite-kpi-sub">Observation mensuelle.</div>
              </div>

              <div
                className="activite-kpi-card activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Visites Renseignées',
                  'Retours terrain enregistrés pour le mois',
                  'purple',
                  compteRenduTerrain?.retours || []
                )}
                title="Cliquer pour voir le détail des visites"
              >
                <div className="activite-kpi-header">
                  <span className="activite-kpi-title">VISITES RENSEIGNÉES</span>
                  <span className="activite-kpi-badge activite-kpi-badge--purple">
                    <ActiviteIcon name="pulse" />
                  </span>
                </div>
                <div className="activite-kpi-value">{formatNumber(actionsVactis.visitesRenseignees)}</div>
                <div className="activite-kpi-sub">Retour terrain lu. · Cliquer pour voir</div>
              </div>

              <div
                className="activite-kpi-card activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Visites Réalisées',
                  'Visites effectivement exécutées sur le terrain',
                  'green',
                  (compteRenduTerrain?.retours || []).filter(r => r.statutVisite === 'REALISEE')
                )}
                title="Cliquer pour voir les visites réalisées"
              >
                <div className="activite-kpi-header">
                  <span className="activite-kpi-title">VISITES RÉALISÉES</span>
                  <span className="activite-kpi-badge activite-kpi-badge--green">
                    <ActiviteIcon name="checkCircle" />
                  </span>
                </div>
                <div className="activite-kpi-value">{formatNumber(actionsVactis.visitesRealisees)}</div>
                <div className="activite-kpi-sub">Réalisation terrain. · Cliquer pour voir</div>
              </div>

              <div
                className="activite-kpi-card activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Visites Non Réalisées',
                  'Visites non exécutées sur le terrain',
                  'amber',
                  (compteRenduTerrain?.retours || []).filter(r => r.statutVisite === 'NON_REALISEE')
                )}
                title="Cliquer pour voir les visites non réalisées"
              >
                <div className="activite-kpi-header">
                  <span className="activite-kpi-title">NON RÉALISÉES</span>
                  <span className="activite-kpi-badge activite-kpi-badge--amber">
                    <ActiviteIcon name="trendingDown" />
                  </span>
                </div>
                <div className="activite-kpi-value">{formatNumber(actionsVactis.nonRealisees)}</div>
                <div className="activite-kpi-sub">Retour terrain non exécuté. · Cliquer pour voir</div>
              </div>

              <div className="activite-kpi-card">
                <div className="activite-kpi-header">
                  <span className="activite-kpi-title">TAUX TERRAIN</span>
                  <span className="activite-kpi-badge activite-kpi-badge--green">
                    <ActiviteIcon name="trendingUp" />
                  </span>
                </div>
                <div className="activite-kpi-value">
                  {formatNumber(actionsVactis.tauxTerrain, 1)}%
                </div>
                <div className="activite-kpi-sub">Visites réalisées / renseignées.</div>
              </div>
            </div>

            {/* Répartition par commercial (3 colonnes) */}
            <div className="activite-subblock">
              <h3 className="activite-subblock-title">RÉPARTITION PAR COMMERCIAL</h3>
              {actionsVactis.repartitionParCommercial.length === 0 ? (
                <p className="activite-n2-empty">Aucune visite terrain enregistrée.</p>
              ) : (
                <div className="activite-commercial-grid">
                  {actionsVactis.repartitionParCommercial.map((c, idx) => (
                    <div
                      key={idx}
                      className="activite-commercial-card activite-cr-card--clickable"
                      onClick={() => openRetoursModal(
                        `Visites terrain — Commercial : ${c.commercial}`,
                        `Ensemble des retours terrain pour le commercial ${c.commercial}`,
                        'blue',
                        (compteRenduTerrain?.retours || []).filter(r => r.visiteur === c.commercial)
                      )}
                      title={`Cliquer pour voir les visites de ${c.commercial}`}
                    >
                      <div className="activite-commercial-name">{c.commercial}</div>
                      <div className="activite-commercial-stat">
                        Renseignées : <span>{c.renseignees}</span>
                      </div>
                      <div className="activite-commercial-stat">
                        Réalisées : <span>{c.realisees}</span>
                      </div>
                      <div className="activite-commercial-stat">
                        Non réalisées : <span>{c.nonRealisees}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Bloc 7 — Compte-rendu terrain du mois */}
      <section className="activite-card-section">
        <div className="activite-section-header">
          <h2 className="activite-section-title">Compte-rendu terrain du mois</h2>
          <p className="activite-section-subtitle">
            Lecture managériale des visites renseignées dans le retour terrain lié au workbook mensuel actif.
          </p>
        </div>

        {loadingN3 ? (
          <div className="activite-n2-loading">Chargement du compte-rendu terrain…</div>
        ) : !compteRenduTerrain ? (
          <div className="activite-n2-empty">Données non disponibles.</div>
        ) : (
          <>
            {/* 4 compteurs principaux */}
            <div className="activite-cr-grid">
              <div
                className="activite-cr-card activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Visites Renseignées du mois',
                  'Ensemble des retours terrain enregistrés',
                  'blue',
                  compteRenduTerrain.retours || []
                )}
                title="Cliquer pour voir la liste complète des visites"
              >
                <span className="activite-cr-title">VISITES RENSEIGNÉES</span>
                <div className="activite-cr-value">{formatNumber(compteRenduTerrain.visitesRenseignees)}</div>
                <div className="activite-cr-sub">Retours terrain lus pour le mois. · Cliquer pour voir les détails</div>
              </div>

              <div
                className="activite-cr-card activite-cr-card--green activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Visites Réalisées',
                  'Visites terrain effectivement exécutées',
                  'green',
                  (compteRenduTerrain.retours || []).filter(r => r.statutVisite === 'REALISEE')
                )}
                title="Cliquer pour voir la liste des visites réalisées"
              >
                <span className="activite-cr-title">VISITES RÉALISÉES</span>
                <div className="activite-cr-value">{formatNumber(compteRenduTerrain.visitesRealisees)}</div>
                <div className="activite-cr-sub">Taux terrain : {formatNumber(compteRenduTerrain.tauxTerrain, 1)}% · Cliquer pour voir les détails</div>
              </div>

              <div
                className="activite-cr-card activite-cr-card--amber activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Visites Non Réalisées',
                  'Actions à reprogrammer ou expliquer',
                  'amber',
                  (compteRenduTerrain.retours || []).filter(r => r.statutVisite === 'NON_REALISEE')
                )}
                title="Cliquer pour voir la liste des visites non réalisées"
              >
                <span className="activite-cr-title">VISITES NON RÉALISÉES</span>
                <div className="activite-cr-value">{formatNumber(compteRenduTerrain.visitesNonRealisees)}</div>
                <div className="activite-cr-sub">Actions à reprogrammer ou expliquer. · Cliquer pour voir les détails</div>
              </div>

              <div
                className="activite-cr-card activite-cr-card--gray activite-cr-card--clickable"
                onClick={() => openRetoursModal(
                  'Statut Non Renseigné',
                  'Retours à compléter avant arbitrage',
                  'gray',
                  (compteRenduTerrain.retours || []).filter(r => r.statutVisite === 'NON_RENSEIGNE')
                )}
                title="Cliquer pour voir la liste des retours incomplets"
              >
                <span className="activite-cr-title">STATUT NON RENSEIGNÉ</span>
                <div className="activite-cr-value">{formatNumber(compteRenduTerrain.statutNonRenseigne)}</div>
                <div className="activite-cr-sub">Retours à compléter avant arbitrage. · Cliquer pour voir les détails</div>
              </div>
            </div>

            {/* 5 cartes cliquables */}
            <div className="activite-subblock">
              <h3 className="activite-subblock-title">CARTES CLIQUABLES</h3>
              <div className="activite-clickable-cards-grid">
                {/* 1. Visites avec réclamation */}
                <div
                  className="activite-clickable-card activite-clickable-card--red"
                  onClick={() => openRetoursModal(
                    'Visites avec Réclamation',
                    'Retours terrain avec réclamation médecin enregistrée',
                    'red',
                    (compteRenduTerrain.retours || []).filter(r => r.reclamation)
                  )}
                  title="Cliquer pour afficher les détails des réclamations"
                >
                  <div className="activite-clickable-card-header">
                    <span className="activite-clickable-card-title">VISITES AVEC RÉCLAMATION</span>
                    <span className="activite-clickable-card-icon">
                      <ActiviteIcon name="flag" size={16} />
                    </span>
                  </div>
                  <div className="activite-clickable-card-value">
                    {formatNumber(compteRenduTerrain.visitesAvecReclamation)}
                  </div>
                  <div className="activite-clickable-card-sub">Retours à discuter en priorité. · Cliquer pour voir</div>
                </div>

                {/* 2. Défavorables / Refus */}
                <div
                  className="activite-clickable-card activite-clickable-card--amber"
                  onClick={() => openRetoursModal(
                    'Visites Défavorables / Refus',
                    'Freins ou refus déclarés lors des retours terrain',
                    'amber',
                    (compteRenduTerrain.retours || []).filter(r => r.qualification === 'DEFAVORABLE')
                  )}
                  title="Cliquer pour afficher les détails des refus"
                >
                  <div className="activite-clickable-card-header">
                    <span className="activite-clickable-card-title">DÉFAVORABLES / REFUS</span>
                    <span className="activite-clickable-card-icon">
                      <ActiviteIcon name="thumbsDown" size={16} />
                    </span>
                  </div>
                  <div className="activite-clickable-card-value">
                    {formatNumber(compteRenduTerrain.defavorablesRefus)}
                  </div>
                  <div className="activite-clickable-card-sub">Freins ou refus déclarés. · Cliquer pour voir</div>
                </div>

                {/* 3. Non réalisées */}
                <div
                  className="activite-clickable-card activite-clickable-card--amber"
                  onClick={() => openRetoursModal(
                    'Visites Non Réalisées',
                    'Actions non exécutées sur le mois',
                    'amber',
                    (compteRenduTerrain.retours || []).filter(r => r.statutVisite === 'NON_REALISEE')
                  )}
                  title="Cliquer pour afficher les détails des visites non réalisées"
                >
                  <div className="activite-clickable-card-header">
                    <span className="activite-clickable-card-title">NON RÉALISÉES</span>
                    <span className="activite-clickable-card-icon">
                      <ActiviteIcon name="alert" size={16} />
                    </span>
                  </div>
                  <div className="activite-clickable-card-value">
                    {formatNumber(compteRenduTerrain.nonRealisees)}
                  </div>
                  <div className="activite-clickable-card-sub">Actions non exécutées sur le mois. · Cliquer pour voir</div>
                </div>

                {/* 4. Statut non renseigné */}
                <div
                  className="activite-clickable-card activite-clickable-card--gray"
                  onClick={() => openRetoursModal(
                    'Statut Non Renseigné',
                    'Visites avec retour incomplet',
                    'gray',
                    (compteRenduTerrain.retours || []).filter(r => r.statutVisite === 'NON_RENSEIGNE')
                  )}
                  title="Cliquer pour afficher les détails des retours incomplets"
                >
                  <div className="activite-clickable-card-header">
                    <span className="activite-clickable-card-title">STATUT NON RENSEIGNÉ</span>
                    <span className="activite-clickable-card-icon">
                      <ActiviteIcon name="lock" size={16} />
                    </span>
                  </div>
                  <div className="activite-clickable-card-value">
                    {formatNumber(compteRenduTerrain.statutNonRenseigneCarte)}
                  </div>
                  <div className="activite-clickable-card-sub">Visites avec retour incomplet. · Cliquer pour voir</div>
                </div>

                {/* 5. Favorables */}
                <div
                  className="activite-clickable-card activite-clickable-card--green"
                  onClick={() => openRetoursModal(
                    'Visites Favorables',
                    'Retours positifs exploitables sur le terrain',
                    'green',
                    (compteRenduTerrain.retours || []).filter(r => r.qualification === 'FAVORABLE')
                  )}
                  title="Cliquer pour afficher les détails des visites favorables"
                >
                  <div className="activite-clickable-card-header">
                    <span className="activite-clickable-card-title">FAVORABLES</span>
                    <span className="activite-clickable-card-icon">
                      <ActiviteIcon name="thumbsUp" size={16} />
                    </span>
                  </div>
                  <div className="activite-clickable-card-value">
                    {formatNumber(compteRenduTerrain.favorables)}
                  </div>
                  <div className="activite-clickable-card-sub">Retours positifs exploitables. · Cliquer pour voir</div>
                </div>
              </div>
            </div>

            {/* Répartition par commercial (tableau 4 colonnes) */}
            <div className="activite-subblock">
              <h3 className="activite-subblock-title">RÉPARTITION PAR COMMERCIAL</h3>
              {compteRenduTerrain.repartitionParCommercial.length === 0 ? (
                <p className="activite-n2-empty">Aucune visite terrain enregistrée.</p>
              ) : (
                <div className="activite-table-container">
                  <table className="activite-commercial-table">
                    <thead>
                      <tr>
                        <th>COMMERCIAL</th>
                        <th className="text-right">RENSEIGNÉES</th>
                        <th className="text-right">RÉALISÉES</th>
                        <th className="text-right">RÉCLAMATIONS</th>
                        <th className="text-right">FAVORABLES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compteRenduTerrain.repartitionParCommercial.map((c, idx) => (
                        <tr key={idx} className="activite-comm-row--clickable">
                          <td
                            className="activite-comm-name activite-clickable-cell"
                            onClick={() => openRetoursModal(
                              `Retours terrain — ${c.commercial}`,
                              `Toutes les visites enregistrées pour ${c.commercial}`,
                              'blue',
                              (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial)
                            )}
                            title={`Cliquer pour voir toutes les visites de ${c.commercial}`}
                          >
                            {c.commercial}
                          </td>
                          <td
                            className="text-right activite-clickable-cell"
                            onClick={() => openRetoursModal(
                              `Visites Renseignées — ${c.commercial}`,
                              `Visites renseignées pour ${c.commercial}`,
                              'blue',
                              (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial)
                            )}
                            title={`Voir les ${c.renseignees} visites de ${c.commercial}`}
                          >
                            {formatNumber(c.renseignees)}
                          </td>
                          <td
                            className="text-right activite-clickable-cell"
                            onClick={() => openRetoursModal(
                              `Visites Réalisées — ${c.commercial}`,
                              `Visites réalisées pour ${c.commercial}`,
                              'green',
                              (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial && r.statutVisite === 'REALISEE')
                            )}
                            title={`Voir les ${c.realisees} visites réalisées par ${c.commercial}`}
                          >
                            {formatNumber(c.realisees)}
                          </td>
                          <td
                            className="text-right activite-clickable-cell"
                            onClick={() => openRetoursModal(
                              `Réclamations — ${c.commercial}`,
                              `Visites avec réclamation pour ${c.commercial}`,
                              'red',
                              (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial && r.reclamation)
                            )}
                            title={`Voir les ${c.reclamations} réclamations de ${c.commercial}`}
                          >
                            {formatNumber(c.reclamations)}
                          </td>
                          <td
                            className="text-right activite-clickable-cell"
                            onClick={() => openRetoursModal(
                              `Favorables — ${c.commercial}`,
                              `Visites favorables pour ${c.commercial}`,
                              'green',
                              (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial && r.qualification === 'FAVORABLE')
                            )}
                            title={`Voir les ${c.favorables} visites favorables de ${c.commercial}`}
                          >
                            {formatNumber(c.favorables)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Modal d'affichage des détails (Médecins ou Retours terrain) */}
      {selectedModalData && (() => {
        const isRetours = selectedModalData.type === 'retours';
        const rawList = isRetours
          ? selectedModalData.retours || []
          : selectedModalData.medecins || [];

        const filteredList = isRetours
          ? rawList.filter((r) => {
              if (!modalSearch) return true;
              const q = modalSearch.toLowerCase();
              return (
                (r.nomMedecin && r.nomMedecin.toLowerCase().includes(q)) ||
                (r.codeMedecin && r.codeMedecin.toLowerCase().includes(q)) ||
                (r.visiteur && r.visiteur.toLowerCase().includes(q)) ||
                (r.specialite && r.specialite.toLowerCase().includes(q)) ||
                (r.commentaire && r.commentaire.toLowerCase().includes(q))
              );
            })
          : rawList;

        const totalItems = filteredList.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / MODAL_PAGE_SIZE));
        const pageStart = (modalPage - 1) * MODAL_PAGE_SIZE;
        const pageEnd = pageStart + MODAL_PAGE_SIZE;
        const pageItems = filteredList.slice(pageStart, pageEnd);
        const hasPrev = modalPage > 1;
        const hasNext = modalPage < totalPages;

        return (
          <div className="activite-modal-overlay" onClick={() => setSelectedModalData(null)}>
            <div className="activite-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="activite-modal-header">
                <div>
                  <div className="activite-modal-title-row">
                    <span className={`activite-statut-dot activite-statut-dot--${selectedModalData.couleur}`} />
                    <h3 className="activite-modal-title">{selectedModalData.title}</h3>
                    <span className="activite-modal-count-badge">
                      {totalItems} {isRetours ? `visite${totalItems > 1 ? 's' : ''}` : `médecin${totalItems > 1 ? 's' : ''}`}
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

              {isRetours && rawList.length > 3 && (
                <div className="activite-modal-search-bar">
                  <input
                    type="text"
                    className="activite-modal-search-input"
                    placeholder="Filtrer par médecin, commercial, spécialité ou commentaire..."
                    value={modalSearch}
                    onChange={(e) => {
                      setModalSearch(e.target.value);
                      setModalPage(1);
                    }}
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      className="activite-modal-search-clear"
                      onClick={() => {
                        setModalSearch('');
                        setModalPage(1);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              <div className="activite-modal-body">
                {totalItems === 0 ? (
                  <p className="activite-n2-empty" style={{ padding: '2rem 0' }}>
                    Aucune visite trouvée pour ce critère.
                  </p>
                ) : isRetours ? (
                  <table className="activite-modal-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Médecin</th>
                        <th>Spécialité</th>
                        <th>Commercial</th>
                        <th>Statut</th>
                        <th>Qualification</th>
                        <th>Réclamation</th>
                        <th className="text-right">Note</th>
                        <th>Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((r, idx) => (
                        <tr key={r.id || idx}>
                          <td className="activite-modal-rank">{pageStart + idx + 1}</td>
                          <td className="activite-modal-code">{r.dateVisite || '—'}</td>
                          <td className="activite-modal-nom">{r.nomMedecin || '—'}</td>
                          <td className="activite-modal-specialite">{r.specialite || '—'}</td>
                          <td>{r.visiteur || 'Non renseigné'}</td>
                          <td>
                            <span className={`activite-badge activite-badge--${
                              r.statutVisite === 'REALISEE' ? 'green' : r.statutVisite === 'NON_REALISEE' ? 'amber' : 'gray'
                            }`}>
                              {r.statutVisite === 'REALISEE' ? 'Réalisée' : r.statutVisite === 'NON_REALISEE' ? 'Non réalisée' : 'Non renseigné'}
                            </span>
                          </td>
                          <td>
                            <span className={`activite-badge activite-badge--${
                              r.qualification === 'FAVORABLE' ? 'green' : r.qualification === 'DEFAVORABLE' ? 'red' : 'gray'
                            }`}>
                              {r.qualification === 'FAVORABLE' ? 'Favorable' : r.qualification === 'DEFAVORABLE' ? 'Défavorable' : 'Non renseigné'}
                            </span>
                          </td>
                          <td>
                            {r.reclamation ? (
                              <span className="activite-badge activite-badge--red">🚩 Oui</span>
                            ) : (
                              <span className="activite-badge activite-badge--gray">Non</span>
                            )}
                          </td>
                          <td className="text-right" style={{ fontWeight: 600 }}>
                            {r.note != null ? `${r.note}/5` : '—'}
                          </td>
                          <td className="activite-modal-comment">{r.commentaire || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="activite-modal-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Code</th>
                        <th>Médecin</th>
                        <th>Spécialité</th>
                        <th className="text-right">Cas (M)</th>
                        <th className="text-right">CA (M)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((m, idx) => (
                        <tr key={m.id || m.codeMedecin || idx}>
                          <td className="activite-modal-rank">{pageStart + idx + 1}</td>
                          <td className="activite-modal-code">{m.codeMedecin || '—'}</td>
                          <td className="activite-modal-nom">{m.nom}</td>
                          <td className="activite-modal-specialite">{m.specialite || '—'}</td>
                          <td className="text-right">{formatNumber(m.casM)}</td>
                          <td className="text-right activite-modal-ca">{formatCurrency(m.caM)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <div className="activite-modal-pagination">
                  <span className="activite-modal-pag-info">
                    {pageStart + 1}–{Math.min(pageEnd, totalItems)} sur {totalItems}
                  </span>
                  <div className="activite-modal-pag-controls">
                    <button
                      type="button"
                      className="activite-modal-pag-btn"
                      disabled={!hasPrev}
                      onClick={() => setModalPage((p) => p - 1)}
                      aria-label="Page précédente"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - modalPage) <= 1)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="activite-modal-pag-ellipsis">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`activite-modal-pag-btn${p === modalPage ? ' activite-modal-pag-btn--active' : ''}`}
                            onClick={() => setModalPage(p)}
                          >
                            {p}
                          </button>
                        )
                      )
                    }
                    <button
                      type="button"
                      className="activite-modal-pag-btn"
                      disabled={!hasNext}
                      onClick={() => setModalPage((p) => p + 1)}
                      aria-label="Page suivante"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
