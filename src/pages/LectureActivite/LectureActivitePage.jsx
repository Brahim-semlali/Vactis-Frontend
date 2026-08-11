import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActionsVactis,
  getComparaison,
  getCompteRenduTerrain,
  getDetailEvolution,
  getEvolutionParCommercial,
  getFluxAgreges,
  getKpisMensuels,
  getMoisDisponibles,
  getRapportImpact,
  getStatutsRepartition,
  getTopMouvements,
  getTransitionsStatuts,
} from '../../api/activite.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';
import {
  getEvolutionMeta,
  getQualificationMeta,
  getTypeActionMeta,
  getVactisStatutMeta,
} from './activiteLabels.js';

function ActiviteMetaBadge({ meta, className = '' }) {
  const badgeRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  if (!meta) return null;

  const showTooltip = () => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;

    const maxWidth = 260;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - maxWidth / 2),
      window.innerWidth - maxWidth - 12,
    );

    setTooltip({
      top: rect.bottom + 8,
      left,
      width: maxWidth,
    });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <>
      <span
        ref={badgeRef}
        className={`activite-meta-badge activite-meta-badge--${meta.tone} ${className}`.trim()}
        tabIndex={0}
        title={meta.description}
        aria-label={`${meta.label} — ${meta.description}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <span className="activite-meta-badge__label">{meta.label}</span>
      </span>

      {tooltip && (
        <span
          className="activite-meta-badge__tooltip activite-meta-badge__tooltip--fixed"
          style={{ top: tooltip.top, left: tooltip.left, width: tooltip.width }}
          role="tooltip"
        >
          {meta.description}
        </span>
      )}
    </>
  );
}

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
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'fileEdit':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    case 'messageCircle':
      return (
        <svg {...props}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'ban':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      );
    case 'helpCircle':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
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

  // Niveau 4 — états (Impact des visites terrain)
  const [rapportImpact, setRapportImpact] = useState(null);
  const [evolutionParCommercial, setEvolutionParCommercial] = useState(null);
  const [detailEvolution, setDetailEvolution] = useState(null);
  const [loadingN4, setLoadingN4] = useState(false);
  const [detailPage, setDetailPage] = useState(0);

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

  // Chargement Niveau 4 (Impact des visites terrain)
  const loadDataN4 = useCallback(async () => {
    if (!token || !selectedMois) return;
    setLoadingN4(true);
    try {
      const [rapportRes, evoRes, detailRes] = await Promise.allSettled([
        getRapportImpact(token, selectedMois),
        getEvolutionParCommercial(token, selectedMois),
        getDetailEvolution(token, selectedMois, detailPage, 20),
      ]);
      if (rapportRes.status === 'fulfilled') setRapportImpact(rapportRes.value);
      if (evoRes.status === 'fulfilled') setEvolutionParCommercial(evoRes.value);
      if (detailRes.status === 'fulfilled') setDetailEvolution(detailRes.value);
    } catch (err) {
      console.warn('Erreur Niveau 4:', err);
    } finally {
      setLoadingN4(false);
    }
  }, [token, selectedMois, detailPage]);

  useEffect(() => {
    loadDataN4();
  }, [loadDataN4]);

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
                        <th>
                          <span className="activite-th-content">
                            <ActiviteIcon name="users" size={14} />
                            <span>COMMERCIAL</span>
                          </span>
                        </th>
                        <th className="text-right">
                          <span className="activite-th-content activite-th-content--right">
                            <ActiviteIcon name="pulse" size={14} />
                            <span>RENSEIGNÉES</span>
                          </span>
                        </th>
                        <th className="text-right">
                          <span className="activite-th-content activite-th-content--right">
                            <ActiviteIcon name="checkCircle" size={14} />
                            <span>RÉALISÉES</span>
                          </span>
                        </th>
                        <th className="text-right">
                          <span className="activite-th-content activite-th-content--right">
                            <ActiviteIcon name="flag" size={14} />
                            <span>RÉCLAMATIONS</span>
                          </span>
                        </th>
                        <th className="text-right">
                          <span className="activite-th-content activite-th-content--right">
                            <ActiviteIcon name="thumbsUp" size={14} />
                            <span>FAVORABLES</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {compteRenduTerrain.repartitionParCommercial.map((c, idx) => {
                        const initials = c.commercial
                          ? c.commercial.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          : 'CO';

                        return (
                          <tr key={idx} className="activite-comm-row">
                            <td
                              className="activite-comm-cell"
                              onClick={() => openRetoursModal(
                                `Retours terrain — ${c.commercial}`,
                                `Toutes les visites enregistrées pour ${c.commercial}`,
                                'blue',
                                (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial)
                              )}
                              title={`Cliquer pour voir toutes les visites de ${c.commercial}`}
                            >
                              <div className="activite-comm-info">
                                <div className="activite-comm-avatar">{initials}</div>
                                <div>
                                  <div className="activite-comm-name">{c.commercial}</div>
                                  <div className="activite-comm-hint">Cliquer pour voir les détails</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-right">
                              <span
                                className="activite-metric-pill activite-metric-pill--blue"
                                onClick={() => openRetoursModal(
                                  `Visites Renseignées — ${c.commercial}`,
                                  `Visites renseignées pour ${c.commercial}`,
                                  'blue',
                                  (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial)
                                )}
                                title={`Voir les ${c.renseignees} visites de ${c.commercial}`}
                              >
                                {formatNumber(c.renseignees)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span
                                className={`activite-metric-pill ${c.realisees > 0 ? 'activite-metric-pill--green' : 'activite-metric-pill--zero'}`}
                                onClick={() => openRetoursModal(
                                  `Visites Réalisées — ${c.commercial}`,
                                  `Visites réalisées pour ${c.commercial}`,
                                  'green',
                                  (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial && r.statutVisite === 'REALISEE')
                                )}
                                title={`Voir les ${c.realisees} visites réalisées par ${c.commercial}`}
                              >
                                {formatNumber(c.realisees)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span
                                className={`activite-metric-pill ${c.reclamations > 0 ? 'activite-metric-pill--red' : 'activite-metric-pill--zero'}`}
                                onClick={() => openRetoursModal(
                                  `Réclamations — ${c.commercial}`,
                                  `Visites avec réclamation pour ${c.commercial}`,
                                  'red',
                                  (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial && r.reclamation)
                                )}
                                title={`Voir les ${c.reclamations} réclamations de ${c.commercial}`}
                              >
                                {c.reclamations > 0 && <span className="activite-pill-dot" />}
                                {formatNumber(c.reclamations)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span
                                className={`activite-metric-pill ${c.favorables > 0 ? 'activite-metric-pill--emerald' : 'activite-metric-pill--zero'}`}
                                onClick={() => openRetoursModal(
                                  `Favorables — ${c.commercial}`,
                                  `Visites favorables pour ${c.commercial}`,
                                  'green',
                                  (compteRenduTerrain.retours || []).filter(r => r.visiteur === c.commercial && r.qualification === 'FAVORABLE')
                                )}
                                title={`Voir les ${c.favorables} visites favorables de ${c.commercial}`}
                              >
                                {formatNumber(c.favorables)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {compteRenduTerrain.repartitionParCommercial.length > 1 && (
                      <tfoot>
                        <tr className="activite-comm-total-row">
                          <td>
                            <div className="activite-comm-total-label">TOTAL GÉNÉRAL</div>
                          </td>
                          <td className="text-right">
                            <span className="activite-total-pill activite-total-pill--blue">
                              {formatNumber(compteRenduTerrain.repartitionParCommercial.reduce((acc, curr) => acc + (curr.renseignees || 0), 0))}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="activite-total-pill activite-total-pill--green">
                              {formatNumber(compteRenduTerrain.repartitionParCommercial.reduce((acc, curr) => acc + (curr.realisees || 0), 0))}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="activite-total-pill activite-total-pill--red">
                              {formatNumber(compteRenduTerrain.repartitionParCommercial.reduce((acc, curr) => acc + (curr.reclamations || 0), 0))}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="activite-total-pill activite-total-pill--emerald">
                              {formatNumber(compteRenduTerrain.repartitionParCommercial.reduce((acc, curr) => acc + (curr.favorables || 0), 0))}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          NIVEAU 4 — Impact des visites terrain
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="activite-card-section">
        {loadingN4 && !rapportImpact ? (
          <div className="activite-n2-empty">
            <div className="activite-n2-empty-spinner" />
            <p>Chargement du rapport d'impact...</p>
          </div>
        ) : (
          <>
            {/* Bloc 1 — Rapport d'impact des actions VACTIS */}
            <div className="activite-section-header">
              <div>
                <h2 className="activite-section-title">
                  Rapport d'impact des actions VACTIS
                </h2>
                <p className="activite-section-subtitle">
                  Lecture des visites terrain et de l'évolution observée après visites VACTIS, sans attribution causale.
                </p>
              </div>
            </div>

            {rapportImpact && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* 1.1 Vue globale des visites terrain */}
                <div>
                  <div className="activite-kpi-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    VUE GLOBALE DES VISITES TERRAIN — Toutes visites confondues, VACTIS et hors VACTIS.
                  </div>
                  <div className="activite-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">TOTAL VISITES RENSEIGNÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--blue"><ActiviteIcon name="calendar" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.totalVisitesRenseignees)}</div>
                      <div className="activite-kpi-sub">Retours terrain lus.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#166534' }}>TOTAL VISITES RÉALISÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--green"><ActiviteIcon name="checkCircle" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#15803d' }}>{formatNumber(rapportImpact.totalVisitesRealisees)}</div>
                      <div className="activite-kpi-sub" style={{ color: '#166534' }}>Visites exécutées.</div>
                    </div>

                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">VISITES VACTIS RÉALISÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--blue"><ActiviteIcon name="target" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.visitesVactisRealisees)}</div>
                      <div className="activite-kpi-sub">Issues d'actions VACTIS.</div>
                    </div>

                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">VISITES HORS VACTIS RÉALISÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--purple"><ActiviteIcon name="fileEdit" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.visitesHorsVactisRealisees)}</div>
                      <div className="activite-kpi-sub">Saisies terrain hors demande VACTIS.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#9f1239' }}>VISITES AVEC RÉCLAMATION</span>
                        <span className="activite-kpi-badge activite-kpi-badge--red"><ActiviteIcon name="messageCircle" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#be123c' }}>{formatNumber(rapportImpact.visitesAvecReclamation)}</div>
                      <div className="activite-kpi-sub" style={{ color: '#9f1239' }}>Détails à traiter.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#166534' }}>VISITES FAVORABLES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--green"><ActiviteIcon name="thumbsUp" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#15803d' }}>{formatNumber(rapportImpact.visitesFavorables)}</div>
                      <div className="activite-kpi-sub" style={{ color: '#166534' }}>Qualification commerciale positive.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#9a3412' }}>DÉFAVORABLES / REFUS</span>
                        <span className="activite-kpi-badge activite-kpi-badge--amber"><ActiviteIcon name="thumbsDown" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#c2410c' }}>{formatNumber(rapportImpact.visitesDefavorables)}</div>
                      <div className="activite-kpi-sub" style={{ color: '#9a3412' }}>Freins déclarés.</div>
                    </div>

                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">SANS QUALIFICATION</span>
                        <span className="activite-kpi-badge activite-kpi-badge--gray"><ActiviteIcon name="helpCircle" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.visitesSansQualification)}</div>
                      <div className="activite-kpi-sub">Statut visite absent.</div>
                    </div>
                  </div>
                </div>

                {/* 1.2 Exécution des actions VACTIS */}
                <div>
                  <div className="activite-kpi-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    EXÉCUTION DES ACTIONS VACTIS — Lecture globale, sans taux de non-réalisation par commercial.
                  </div>
                  <div className="activite-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">ACTIONS VACTIS GÉNÉRÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--blue"><ActiviteIcon name="target" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.actionsVactisGenerees)}</div>
                      <div className="activite-kpi-sub">Lignes d'actions mensuelles.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#166534' }}>VACTIS RÉALISÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--green"><ActiviteIcon name="checkCircle" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#15803d' }}>{formatNumber(rapportImpact.vactisRealisees)}</div>
                      <div className="activite-kpi-sub" style={{ color: '#166534' }}>Visites exécutées.</div>
                    </div>

                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">VACTIS RENSEIGNÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--blue"><ActiviteIcon name="clipboard" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.vactisRenseignees)}</div>
                      <div className="activite-kpi-sub">Retours associés.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#fefce8', borderColor: '#fef08a' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#854d0e' }}>VACTIS NON RÉALISÉES</span>
                        <span className="activite-kpi-badge activite-kpi-badge--amber"><ActiviteIcon name="alert" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#a16207' }}>{formatNumber(rapportImpact.vactisNonRealisees)}</div>
                      <div className="activite-kpi-sub" style={{ color: '#854d0e' }}>Détails disponibles.</div>
                    </div>

                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">SANS RETOUR TERRAIN</span>
                        <span className="activite-kpi-badge activite-kpi-badge--gray"><ActiviteIcon name="ban" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.sanRetourTerrain)}</div>
                      <div className="activite-kpi-sub">Actions VACTIS sans retour renseigné.</div>
                    </div>

                    <div className="activite-kpi-card">
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title">EXCLUES DIRECTION</span>
                        <span className="activite-kpi-badge activite-kpi-badge--gray"><ActiviteIcon name="lock" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value">{formatNumber(rapportImpact.excluesDirection)}</div>
                      <div className="activite-kpi-sub">Actions retirées du périmètre terrain.</div>
                    </div>

                    <div className="activite-kpi-card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <div className="activite-kpi-header">
                        <span className="activite-kpi-title" style={{ color: '#166534' }}>TAUX RÉALISATION VACTIS HORS EXCLUSIONS</span>
                        <span className="activite-kpi-badge activite-kpi-badge--green"><ActiviteIcon name="chart" size={14} /></span>
                      </div>
                      <div className="activite-kpi-value" style={{ color: '#15803d' }}>
                        {formatNumber(rapportImpact.tauxRealisation, 1)}%
                      </div>
                      <div className="activite-kpi-sub" style={{ color: '#166534' }}>Réalisées / actions hors exclusions.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bloc 2 — Graphique empilé & Évolution observée */}
            {evolutionParCommercial && (
              <div className="activite-n4-grid" style={{ marginBottom: '2rem' }}>
                {/* 2.1 Graphique empilé */}
                <div className="activite-cr-card" style={{ padding: '1.25rem' }}>
                  <div className="activite-cr-header">
                    <div>
                      <h3 className="activite-cr-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ActiviteIcon name="chart" size={16} /> VISITES RÉALISÉES PAR COMMERCIAL ET TYPE DE VISITE
                      </h3>
                      <p className="activite-cr-subtitle">
                        Graphique empilé des visites réalisées uniquement, classées par type_visite puis type_action.
                      </p>
                    </div>
                  </div>

                  {/* Légende type_visite */}
                  <div className="activite-n4-legend">
                    {[
                      { key: 'FIDELISATION', label: 'Fidélisation', color: '#10b981' },
                      { key: 'RETENTION', label: 'Rétention', color: '#ef4444' },
                      { key: 'PROSPECTION', label: 'Prospection', color: '#06b6d4' },
                      { key: 'DIAGNOSTIC', label: 'Diagnostic', color: '#f59e0b' },
                      { key: 'RECONNAISSANCE', label: 'Reconnaissance', color: '#8b5cf6' },
                      { key: 'URGENCE_SILENCE', label: 'Urgence silence', color: '#f97316' },
                      { key: 'AUTRE', label: 'Autre', color: '#6b7280' },
                    ].map((item) => (
                      <div key={item.key} className="activite-n4-legend-item">
                        <span className="activite-n4-legend-dot" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Liste par commercial */}
                  {(evolutionParCommercial.visitesParCommercial || []).map((c) => {
                    const total = c.totalRealisees || 1;
                    const types = c.parTypeVisite || {};
                    return (
                      <div key={c.commercial} className="activite-n4-comm-card">
                        <div className="activite-n4-comm-header">
                          <span className="activite-n4-comm-name">{c.commercial}</span>
                          <span className="activite-n4-comm-total">{c.totalRealisees}</span>
                        </div>
                        {/* Bar empilée */}
                        <div className="activite-n4-stacked-bar">
                          {[
                            { key: 'FIDELISATION', color: '#10b981' },
                            { key: 'RETENTION', color: '#ef4444' },
                            { key: 'PROSPECTION', color: '#06b6d4' },
                            { key: 'DIAGNOSTIC', color: '#f59e0b' },
                            { key: 'RECONNAISSANCE', color: '#8b5cf6' },
                            { key: 'URGENCE_SILENCE', color: '#f97316' },
                            { key: 'AUTRE', color: '#6b7280' },
                          ].map((t) => {
                            const count = types[t.key] || 0;
                            if (count === 0) return null;
                            const pct = (count / total) * 100;
                            return (
                              <div
                                key={t.key}
                                className="activite-n4-stacked-seg"
                                style={{ width: `${pct}%`, backgroundColor: t.color }}
                                title={`${t.key}: ${count} (${Math.round(pct)}%)`}
                              />
                            );
                          })}
                        </div>
                        {/* Grille des compteurs par type */}
                        <div className="activite-n4-types-grid">
                          {[
                            { key: 'FIDELISATION', label: 'Fidélisation' },
                            { key: 'RETENTION', label: 'Rétention' },
                            { key: 'PROSPECTION', label: 'Prospection' },
                            { key: 'DIAGNOSTIC', label: 'Diagnostic' },
                            { key: 'RECONNAISSANCE', label: 'Reconnaissance' },
                            { key: 'URGENCE_SILENCE', label: 'Urgence silence' },
                            { key: 'AUTRE', label: 'Autre' },
                          ].map((t) => (
                            <div key={t.key} className="activite-n4-type-item">
                              <span>{t.label}</span>
                              <span className="activite-n4-type-count">{types[t.key] || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2.2 Évolution observée après visites VACTIS */}
                <div className="activite-cr-card" style={{ padding: '1.25rem' }}>
                  <div className="activite-cr-header">
                    <div>
                      <h3 className="activite-cr-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ActiviteIcon name="target" size={16} /> ÉVOLUTION OBSERVÉE APRÈS VISITES VACTIS
                      </h3>
                      <p className="activite-cr-subtitle">
                        Classification favorable / stable / défavorable / non observable.
                      </p>
                    </div>
                  </div>

                  {/* Compteurs globaux avec barres d'indicateurs */}
                  {(() => {
                    const totalG = evolutionParCommercial.totalAnalyse || 1;
                    const favG = evolutionParCommercial.favorable || 0;
                    const staG = evolutionParCommercial.stable || 0;
                    const defG = evolutionParCommercial.defavorable || 0;
                    const nonObsG = evolutionParCommercial.nonObservable || 0;

                    return (
                      <div style={{ marginBottom: '1.5rem' }}>
                        {[
                          { label: 'Favorable', count: favG, color: '#10b981' },
                          { label: 'Stable', count: staG, color: '#475569' },
                          { label: 'Défavorable', count: defG, color: '#ef4444' },
                          { label: 'Non observable', count: nonObsG, color: '#f59e0b' },
                        ].map((item) => (
                          <div key={item.label} className="activite-n4-evo-item">
                            <span className="activite-n4-evo-label">{item.label}</span>
                            <div className="activite-n4-evo-bar-bg">
                              <div
                                className="activite-n4-evo-bar-fill"
                                style={{
                                  width: `${Math.min(100, (item.count / totalG) * 100)}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                            <span className="activite-n4-evo-count">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Évolution observée par commercial */}
                  <div>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: '0.25rem' }}>
                      ÉVOLUTION OBSERVÉE PAR COMMERCIAL
                    </h4>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.85rem' }}>
                      Lecture par commercial des médecins visités suite aux actions VACTIS.
                    </p>

                    {(evolutionParCommercial.evolutionParCommercial || []).map((c) => {
                      const totalC = c.totalAnalyse || 1;
                      const favP = (c.favorable / totalC) * 100;
                      const staP = (c.stable / totalC) * 100;
                      const defP = (c.defavorable / totalC) * 100;
                      const nonObsP = (c.nonObservable / totalC) * 100;

                      return (
                        <div key={c.commercial} className="activite-n4-comm-evo-card">
                          <div className="activite-n4-comm-evo-header">
                            <span className="activite-n4-comm-evo-title">{c.commercial}</span>
                            <span className="activite-n4-table-badge">{c.totalAnalyse}</span>
                          </div>
                          <div className="activite-n4-comm-evo-sub" style={{ marginBottom: '0.4rem' }}>
                            {c.totalAnalyse} visites VACTIS analysées : taux favorable {formatNumber(c.tauxFavorable, 1)}%
                          </div>

                          {/* Bar multi-couleurs */}
                          <div className="activite-n4-comm-evo-bar">
                            <div style={{ width: `${favP}%`, backgroundColor: '#10b981' }} title={`Favorable: ${c.favorable}`} />
                            <div style={{ width: `${staP}%`, backgroundColor: '#475569' }} title={`Stable: ${c.stable}`} />
                            <div style={{ width: `${defP}%`, backgroundColor: '#ef4444' }} title={`Défavorable: ${c.defavorable}`} />
                            <div style={{ width: `${nonObsP}%`, backgroundColor: '#f59e0b' }} title={`Non observable: ${c.nonObservable}`} />
                          </div>

                          {/* Ligne récapitulative */}
                          <div className="activite-n4-comm-evo-stats">
                            <span className="activite-n4-comm-evo-stat-item">
                              <span style={{ color: '#10b981', fontWeight: 700 }}>• Favorable</span> {c.favorable}
                            </span>
                            <span className="activite-n4-comm-evo-stat-item">
                              <span style={{ color: '#475569', fontWeight: 700 }}>• Stable</span> {c.stable}
                            </span>
                            <span className="activite-n4-comm-evo-stat-item">
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>• Défavorable</span> {c.defavorable}
                            </span>
                            <span className="activite-n4-comm-evo-stat-item">
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>• Non observable</span> {c.nonObservable}
                            </span>
                            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
                              Taux favorable {formatNumber(c.tauxFavorable, 1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bloc 3 — Détail évolution post-visite VACTIS */}
            <div className="activite-cr-card" style={{ padding: '1.25rem' }}>
              <div className="activite-n4-table-header-row">
                <div>
                  <h3 className="activite-cr-title">DÉTAIL ÉVOLUTION POST-VISITE VACTIS</h3>
                  <p className="activite-cr-subtitle">
                    Lecture médecin par médecin : statut avant, qualification terrain, statut après.
                  </p>
                </div>
                {detailEvolution && (
                  <span className="activite-n4-table-badge">
                    {detailEvolution.totalLignes} lignes
                  </span>
                )}
              </div>

              {detailEvolution && detailEvolution.lignes && detailEvolution.lignes.length > 0 ? (
                <>
                  <div className="activite-n4-table-container">
                    <table className="activite-n4-table">
                      <thead>
                        <tr>
                          <th>Médecin</th>
                          <th>Commercial</th>
                          <th>Type action / visite</th>
                          <th>Statut avant</th>
                          <th>Qualification terrain</th>
                          <th>Statut après</th>
                          <th>Évolution</th>
                          <th>Commentaire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailEvolution.lignes.map((l, idx) => (
                          <tr key={l.retourTerrainId || idx}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{l.nomMedecin}</td>
                            <td>{l.commercial}</td>
                            <td>
                              <ActiviteMetaBadge meta={getTypeActionMeta(l.typeActionVisite, l.typeVisite)} />
                            </td>
                            <td>
                              <ActiviteMetaBadge meta={getVactisStatutMeta(l.statutAvant)} />
                            </td>
                            <td>
                              <ActiviteMetaBadge meta={getQualificationMeta(l.qualification)} />
                            </td>
                            <td>
                              <ActiviteMetaBadge meta={getVactisStatutMeta(l.statutApres)} />
                            </td>
                            <td>
                              <ActiviteMetaBadge meta={getEvolutionMeta(l.evolution)} />
                            </td>
                            <td className="activite-modal-comment">{l.commentaire || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Contrôles de pagination */}
                  {detailEvolution.totalPages > 1 && (
                    <div className="activite-n4-pagination">
                      <span className="activite-n4-page-info">
                        Page {detailEvolution.page + 1} sur {detailEvolution.totalPages} ({detailEvolution.totalLignes} lignes)
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="activite-n4-page-btn"
                          disabled={detailPage === 0}
                          onClick={() => setDetailPage((p) => Math.max(0, p - 1))}
                        >
                          ‹ Précédent
                        </button>

                        {Array.from({ length: detailEvolution.totalPages }, (_, i) => i)
                          .filter((p) => p === 0 || p === detailEvolution.totalPages - 1 || Math.abs(p - detailPage) <= 1)
                          .reduce((acc, p, i, arr) => {
                            if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, idx) =>
                            p === '...' ? (
                              <span key={`ell-${idx}`} style={{ padding: '0.3rem 0.5rem', color: '#94a3b8' }}>…</span>
                            ) : (
                              <button
                                key={p}
                                type="button"
                                className={`activite-n4-page-btn ${p === detailPage ? 'activite-n4-page-btn--active' : ''}`}
                                onClick={() => setDetailPage(p)}
                              >
                                {p + 1}
                              </button>
                            )
                          )}

                        <button
                          type="button"
                          className="activite-n4-page-btn"
                          disabled={detailPage >= detailEvolution.totalPages - 1}
                          onClick={() => setDetailPage((p) => p + 1)}
                        >
                          Suivant ›
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="activite-n2-empty" style={{ padding: '2rem 0' }}>
                  Aucune donnée disponible pour le détail post-visite VACTIS sur ce mois.
                </p>
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
