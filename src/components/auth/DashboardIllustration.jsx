import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { BellRing, CalendarCheck, Stethoscope, TrendingDown, TrendingUp, UserPlus } from 'lucide-react';
import { AUTH_EASE } from './authMotion.js';

/*
 * Illustration décorative : tableau de bord d'intelligence commerciale médicale
 * en 3D, posé sur un socle lumineux, avec un flux de notifications flottantes.
 * Toutes les valeurs sont illustratives (aucune donnée réelle) et l'ensemble
 * est masqué aux lecteurs d'écran.
 */

const NOMBRE = new Intl.NumberFormat('fr-FR');
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'];

/** Séries affichées tour à tour (barres et tendance de 0 à 1). */
const SERIES = [
  {
    barres: [0.42, 0.58, 0.5, 0.74, 0.62, 0.88, 0.7],
    tendance: [0.36, 0.44, 0.48, 0.58, 0.62, 0.74, 0.8],
    medecins: 1248,
    prioritaires: 18,
    segments: [32, 41, 27],
  },
  {
    barres: [0.5, 0.46, 0.66, 0.6, 0.8, 0.72, 0.94],
    tendance: [0.4, 0.42, 0.52, 0.56, 0.66, 0.7, 0.84],
    medecins: 1263,
    prioritaires: 21,
    segments: [34, 40, 26],
  },
  {
    barres: [0.36, 0.52, 0.62, 0.56, 0.7, 0.9, 0.82],
    tendance: [0.32, 0.4, 0.5, 0.54, 0.64, 0.76, 0.78],
    medecins: 1281,
    prioritaires: 16,
    segments: [35, 42, 23],
  },
];
const SEGMENTS = ['A', 'B', 'C'];

const MEDECINS = [
  { initiales: 'CM', nom: 'Dr C. Martin', specialite: 'Cardiologie', score: 92, priorite: 'A' },
  { initiales: 'NL', nom: 'Dr N. Leroy', specialite: 'Médecine générale', score: 81, priorite: 'A' },
  { initiales: 'SB', nom: 'Dr S. Benali', specialite: 'Pédiatrie', score: 67, priorite: 'B' },
];

const NOTIFICATIONS = [
  { ton: 'rose', icon: BellRing, titre: 'Silence radio', detail: 'Dr Martin · visite sous 15 j' },
  { ton: 'emerald', icon: TrendingUp, titre: 'Segment A +18 %', detail: 'Croissance du trimestre' },
  { ton: 'cyan', icon: UserPlus, titre: 'Nouveau prescripteur', detail: 'Plan d’accueil généré' },
  { ton: 'amber', icon: TrendingDown, titre: 'Volume −12 %', detail: 'Dr Benali à surveiller' },
  { ton: 'blue', icon: CalendarCheck, titre: 'Visite planifiée', detail: 'Dr Leroy · jeudi 10 h' },
];
/** Emplacements autour du tableau, avec leur profondeur de parallaxe. */
const EMPLACEMENTS = [
  { nom: 'haut', profondeur: 26 },
  { nom: 'droite', profondeur: 34 },
  { nom: 'bas', profondeur: 20 },
];

const DEBUT_NOTIFICATIONS = 1800;
const INTERVALLE_NOTIFICATION = 2600;
const INTERVALLE_SERIE = 4200;
const INTERVALLE_LIGNE = 1800;
const DELAI_GRAPHIQUES = 1300;

/* Apparition progressive : socle, puis tableau qui se déplie, puis son contenu */
const socleVariants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, delay: 0.25, ease: AUTH_EASE } },
};
const tableauVariants = {
  hidden: { opacity: 0, y: 40, rotateX: 28, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 8,
    scale: 1,
    transition: { duration: 0.9, delay: 0.5, ease: AUTH_EASE, staggerChildren: 0.12, delayChildren: 0.85 },
  },
};
const blocVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: AUTH_EASE } },
};
const puceVariants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, delay: 1.4, ease: AUTH_EASE } },
};

/**
 * Nombre qui glisse vers sa nouvelle valeur (montée depuis 0 à la première
 * apparition, après `delai`). Renvoie la valeur courante, non arrondie.
 */
function useAnimatedNumber(cible, { duree = 1200, delai = 0 } = {}) {
  const reduce = useReducedMotion();
  const [valeur, setValeur] = useState(reduce ? cible : 0);
  const valeurRef = useRef(valeur);

  useEffect(() => {
    if (reduce) {
      valeurRef.current = cible;
      setValeur(cible);
      return undefined;
    }
    const depart = valeurRef.current;
    let frame = 0;
    let debut = 0;
    const timer = window.setTimeout(() => {
      const tick = (time) => {
        if (!debut) debut = time;
        const progression = Math.min(1, (time - debut) / duree);
        const courante = depart + (cible - depart) * (1 - (1 - progression) ** 3);
        valeurRef.current = courante;
        setValeur(courante);
        if (progression < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    }, depart === 0 ? delai : 0);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [cible, duree, delai, reduce]);

  return valeur;
}

/** Nombre animé isolé dans son composant : seul lui se réaffiche à chaque image. */
function NombreAnime({ valeur, duree, suffixe = '' }) {
  const courante = useAnimatedNumber(valeur, { duree });
  return `${NOMBRE.format(Math.round(courante))}${suffixe}`;
}

/** Compteur cyclique : avance de 1 à intervalle régulier (figé si animations réduites). */
function useTicker(intervalle, { depart = 0, delai = 0, valeurFigee = depart } = {}) {
  const reduce = useReducedMotion();
  const [valeur, setValeur] = useState(depart);

  useEffect(() => {
    if (reduce) {
      setValeur(valeurFigee);
      return undefined;
    }
    let interval = 0;
    const timer = window.setTimeout(() => {
      setValeur((v) => v + 1);
      interval = window.setInterval(() => setValeur((v) => v + 1), intervalle);
    }, delai);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [intervalle, delai, valeurFigee, reduce]);

  return valeur;
}

/** Élément décalé en parallaxe selon sa profondeur (suit la souris). */
function Parallaxe({ className, profondeur, pointeurX, pointeurY, children }) {
  const x = useTransform(pointeurX, (v) => v * profondeur);
  const y = useTransform(pointeurY, (v) => v * profondeur);
  return (
    <motion.div className={className} style={{ x, y, z: profondeur * 1.6 }}>
      {children}
    </motion.div>
  );
}

/** Tracé lissé de la tendance (repère 100 × 40, 0 = bas). */
function tracerTendance(points) {
  const pas = 100 / points.length;
  const coords = points.map((v, i) => [pas * (i + 0.5), 40 - v * 36]);
  return coords.reduce((d, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [xp, yp] = coords[i - 1];
    const milieu = (xp + x) / 2;
    return `${d} C ${milieu} ${yp}, ${milieu} ${y}, ${x} ${y}`;
  }, '');
}

export default function DashboardIllustration({ mode, pointeurX, pointeurY }) {
  const reduce = useReducedMotion();
  const ressort = { stiffness: 90, damping: 18, mass: 0.7 };
  const rotateX = useSpring(useTransform(pointeurY, [-0.5, 0.5], [7, -7]), ressort);
  const rotateY = useSpring(useTransform(pointeurX, [-0.5, 0.5], [-9, 9]), ressort);

  const [pret, setPret] = useState(false);
  const [decalageSerie, setDecalageSerie] = useState(0);
  const modePrecedent = useRef(mode);

  const tickSerie = useTicker(INTERVALLE_SERIE, { delai: DELAI_GRAPHIQUES + INTERVALLE_SERIE });
  const ligneActive = useTicker(INTERVALLE_LIGNE, { delai: DELAI_GRAPHIQUES + 600 }) % MEDECINS.length;
  // −1 : aucune notification avant l'apparition du tableau ; figé sur 1 (deux visibles) si animations réduites
  const tickNotif = useTicker(INTERVALLE_NOTIFICATION, { depart: -1, delai: DEBUT_NOTIFICATIONS, valeurFigee: 1 });

  // Les graphiques se remplissent une fois le tableau déplié
  useEffect(() => {
    const timer = window.setTimeout(() => setPret(true), reduce ? 0 : DELAI_GRAPHIQUES);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  // Le changement Connexion / Inscription fait réagir les graphiques
  useEffect(() => {
    if (modePrecedent.current === mode) return;
    modePrecedent.current = mode;
    setDecalageSerie((d) => d + 1);
  }, [mode]);

  const serie = SERIES[(tickSerie + decalageSerie) % SERIES.length];
  const barres = pret ? serie.barres : serie.barres.map(() => 0);
  const pic = serie.barres.indexOf(Math.max(...serie.barres));

  const segmentA = pret ? serie.segments[0] : 0;

  // Portions de l'anneau (circonférence 100) avec un petit espace entre segments
  let cumul = 0;
  const portions = serie.segments.map((part) => {
    const portion = { longueur: pret ? Math.max(0, part - 1.6) : 0, decalage: -cumul };
    cumul += part;
    return portion;
  });

  return (
    <motion.div className="vxa-illu" aria-hidden="true" initial="hidden" animate="visible">
      <div className="vxa-illu-glow" />

      <motion.div className="vxa-illu-scene" style={reduce ? undefined : { rotateX, rotateY }}>
        <motion.div className="vxa-pedestal" variants={socleVariants}>
          <span className="vxa-pedestal-beam" />
          <span className="vxa-pedestal-ring vxa-pedestal-ring--1" />
          <span className="vxa-pedestal-ring vxa-pedestal-ring--2" />
          <span className="vxa-pedestal-ring vxa-pedestal-ring--3" />
          <span className="vxa-pedestal-pulse" />
          <span className="vxa-pedestal-pulse vxa-pedestal-pulse--late" />
        </motion.div>

        <span className="vxa-stream vxa-stream--1" />
        <span className="vxa-stream vxa-stream--2" />
        <span className="vxa-stream vxa-stream--3" />
        <span className="vxa-stream vxa-stream--4" />

        <motion.div className="vxa-board" variants={tableauVariants} style={{ rotateY: -16, z: 20 }}>
          <motion.div className="vxa-board-head" variants={blocVariants}>
            <span className="vxa-board-dots"><span /><span /><span /></span>
            <span className="vxa-board-title">Portefeuille médecins</span>
            <span className="vxa-board-live"><span />Analyse</span>
          </motion.div>

          <motion.div className="vxa-board-kpis" variants={blocVariants}>
            <div className="vxa-kpi">
              <small>Médecins suivis</small>
              <strong><NombreAnime valeur={pret ? serie.medecins : 0} duree={1400} /></strong>
              <em className="is-up">+4,2 %</em>
            </div>
            <div className="vxa-kpi">
              <small>Segment A</small>
              <strong><NombreAnime valeur={segmentA} duree={1100} suffixe=" %" /></strong>
              <em className="is-up">+18 %</em>
            </div>
            <div className="vxa-kpi">
              <small>Prioritaires</small>
              <strong><NombreAnime valeur={pret ? serie.prioritaires : 0} duree={1100} /></strong>
              <em>cette semaine</em>
            </div>
          </motion.div>

          <motion.div className="vxa-board-charts" variants={blocVariants}>
            <div className="vxa-chart">
              <div className="vxa-chart-head">
                <span>Chiffre d’affaires</span>
                <span className="vxa-chart-legend"><i />Tendance</span>
              </div>
              <div className="vxa-bars">
                {barres.map((h, i) => (
                  <span key={MOIS[i]} className={`vxa-bar ${i === pic ? 'is-peak' : ''}`} style={{ '--h': h, '--i': i }}>
                    {i === pic && pret && <span className="vxa-bar-tip">+18 %</span>}
                  </span>
                ))}
                {pret && (
                  <svg key={`tendance-${serie.medecins}`} className="vxa-trend" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path d={tracerTendance(serie.tendance)} vectorEffect="non-scaling-stroke" />
                  </svg>
                )}
              </div>
              <div className="vxa-bars-axis">
                {MOIS.map((mois) => <span key={mois}>{mois}</span>)}
              </div>
            </div>

            <div className="vxa-donut">
              <div className="vxa-donut-ring">
                <svg viewBox="0 0 42 42">
                  <circle className="vxa-donut-track" cx="21" cy="21" r="15.915" />
                  {portions.map((portion, i) => (
                    <circle
                      key={SEGMENTS[i]}
                      className={`vxa-donut-seg vxa-donut-seg--${SEGMENTS[i].toLowerCase()}`}
                      cx="21"
                      cy="21"
                      r="15.915"
                      style={{
                        strokeDasharray: `${portion.longueur} ${100 - portion.longueur}`,
                        strokeDashoffset: portion.decalage,
                        transitionDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </svg>
                <span className="vxa-donut-label">
                  <strong><NombreAnime valeur={segmentA} duree={1100} suffixe=" %" /></strong>
                  <small>Segment A</small>
                </span>
              </div>
              <ul className="vxa-donut-legend">
                {SEGMENTS.map((segment, i) => (
                  <li key={segment} className={`is-${segment.toLowerCase()}`}>
                    <i />
                    {segment}
                    <b>{serie.segments[i]} %</b>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div className="vxa-board-list" variants={blocVariants}>
            <div className="vxa-list-head">
              <span>Médecins prioritaires</span>
              <span>Score</span>
            </div>
            {MEDECINS.map((medecin, i) => (
              <div key={medecin.nom} className={`vxa-doc ${i === ligneActive ? 'is-active' : ''}`}>
                <span className="vxa-doc-avatar">{medecin.initiales}</span>
                <span className="vxa-doc-id">
                  <strong>{medecin.nom}</strong>
                  <small>{medecin.specialite}</small>
                </span>
                <span className="vxa-doc-score">
                  <span className="vxa-doc-bar">
                    <span style={{ '--s': pret ? medecin.score / 100 : 0, '--i': i }} />
                  </span>
                  <b>{medecin.score}</b>
                </span>
                <span className={`vxa-doc-badge is-${medecin.priorite.toLowerCase()}`}>{medecin.priorite}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Flux de notifications : au plus deux visibles, chacune à un emplacement différent */}
        {EMPLACEMENTS.map(({ nom, profondeur }, index) => {
          const numero = [tickNotif, tickNotif - 1].find((n) => n >= 0 && n % EMPLACEMENTS.length === index);
          const notification = numero == null ? null : NOTIFICATIONS[numero % NOTIFICATIONS.length];
          const Icon = notification?.icon;

          return (
            <Parallaxe
              key={nom}
              className={`vxa-notif-slot vxa-notif-slot--${nom}`}
              profondeur={profondeur}
              pointeurX={pointeurX}
              pointeurY={pointeurY}
            >
              <AnimatePresence>
                {notification && (
                  <motion.div
                    key={numero}
                    className={`vxa-notif vxa-tone-${notification.ton}`}
                    initial={{ opacity: 0, y: 14, scale: 0.92, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, scale: 0.96, filter: 'blur(4px)' }}
                    transition={{ duration: 0.45, ease: AUTH_EASE }}
                  >
                    <span className="vxa-notif-icon"><Icon size="1.15em" strokeWidth={2.2} /></span>
                    <span className="vxa-notif-text">
                      <strong>{notification.titre}</strong>
                      <small>{notification.detail}</small>
                    </span>
                    <span className="vxa-notif-time">à l’instant</span>
                    <span className="vxa-notif-life" style={{ '--vie': `${INTERVALLE_NOTIFICATION * 2}ms` }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Parallaxe>
          );
        })}

        <Parallaxe className="vxa-chip-slot" profondeur={40} pointeurX={pointeurX} pointeurY={pointeurY}>
          <motion.span className="vxa-chip" variants={puceVariants}>
            <Stethoscope size="1.3em" strokeWidth={2} />
          </motion.span>
        </Parallaxe>
      </motion.div>
    </motion.div>
  );
}
