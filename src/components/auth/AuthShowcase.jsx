import { useRef } from 'react';
import { useMotionValue, useReducedMotion } from 'framer-motion';
import { ChartColumnIncreasing, ShieldCheck, Zap } from 'lucide-react';
import DashboardIllustration from './DashboardIllustration.jsx';
import ParticleField from './ParticleField.jsx';
import { vactisMark } from './brandAssets.js';

const FONCTIONNALITES = [
  { icon: ChartColumnIncreasing, titre: 'Analyse intelligente', detail: 'Chaque médecin scoré et segmenté' },
  { icon: Zap, titre: 'Décisions éclairées', detail: 'Des priorités fondées sur vos données' },
  { icon: ShieldCheck, titre: 'Performance garantie', detail: 'Un suivi fiable et sécurisé' },
];

/** Panneau de présentation VACTIS (partie gauche des pages d'authentification). */
export default function AuthShowcase({ mode }) {
  const reduce = useReducedMotion();
  const panneauRef = useRef(null);

  // Position du pointeur dans le panneau, de −0,5 à +0,5 (0 = centre)
  const pointeurX = useMotionValue(0);
  const pointeurY = useMotionValue(0);

  function handlePointerMove(event) {
    if (event.pointerType !== 'mouse') return;
    const panneau = panneauRef.current;
    if (!panneau) return;

    const rect = panneau.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    panneau.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    panneau.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);

    if (!reduce) {
      pointeurX.set(x - 0.5);
      pointeurY.set(y - 0.5);
    }
  }

  function handlePointerLeave() {
    pointeurX.set(0);
    pointeurY.set(0);
  }

  return (
    <aside
      ref={panneauRef}
      className="vxa-showcase"
      aria-label="Présentation de VACTIS"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="vxa-showcase-floor" aria-hidden="true" />
      <div className="vxa-showcase-spot" aria-hidden="true" />
      <ParticleField className="vxa-showcase-particles" density={48} linkDistance={96} speed={0.8} interactive />

      <header className="vxa-brand">
        <img src={vactisMark} alt="" />
        <span>
          <strong>VACTIS</strong>
          <small>Smart Data. <em>Smarter Decisions.</em></small>
        </span>
      </header>

      <div className="vxa-showcase-body">
        <div className="vxa-showcase-copy">
          <span className="vxa-eyebrow">
            <span className="vxa-eyebrow-dot" aria-hidden="true" />
            Intelligence commerciale médicale
          </span>

          <h2 className="vxa-headline">
            <span className="vxa-headline-top">
              La donnée <span className="is-soft">brute devient</span>
            </span>
            <span className="vxa-headline-main">
              plan{' '}
              <em>
                d’action
                <svg className="vxa-headline-stroke" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 9 C 50 3, 120 2, 198 6" pathLength="100" />
                </svg>
              </em>
            </span>
          </h2>

          <p className="vxa-lead">
            VACTIS analyse chaque médecin de votre portefeuille et indique à vos équipes où agir en priorité.
          </p>

          <ul className="vxa-features">
            {FONCTIONNALITES.map(({ icon: Icon, titre, detail }, i) => (
              <li key={titre} className="vxa-feature" style={{ '--i': i }}>
                <span className="vxa-feature-icon">
                  <Icon size={19} strokeWidth={2} aria-hidden="true" />
                </span>
                <span>
                  <strong>{titre}</strong>
                  <small>{detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <DashboardIllustration mode={mode} pointeurX={pointeurX} pointeurY={pointeurY} />
      </div>
    </aside>
  );
}
