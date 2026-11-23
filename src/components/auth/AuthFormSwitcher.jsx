import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AUTH_EASE, AUTH_SWITCH_DURATION } from './authMotion.js';
import useElementHeight from './useElementHeight.js';

const DECALAGE = 56;

/*
 * direction = 1  : le formulaire courant part vers la gauche, le nouveau arrive de la droite.
 * direction = -1 : sens inverse (retour à la connexion).
 */
const panneauVariants = {
  enter: (direction) => ({ opacity: 0, x: direction * DECALAGE, filter: 'blur(6px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (direction) => ({ opacity: 0, x: direction * -DECALAGE, filter: 'blur(6px)' }),
};

/**
 * Bascule animée entre deux formulaires (Connexion ↔ Inscription) :
 * glissement + fondu croisés, hauteur du conteneur ajustée en douceur,
 * puis focus déplacé sur le titre du nouveau formulaire.
 */
export default function AuthFormSwitcher({ viewKey, direction = 1, children }) {
  const reduce = useReducedMotion();
  const [contenuRef, hauteur] = useElementHeight();
  const vuePrecedente = useRef(viewKey);

  useEffect(() => {
    if (vuePrecedente.current === viewKey) return;
    vuePrecedente.current = viewKey;
    const titre = contenuRef.current?.querySelector(`[data-view="${viewKey}"] h1`);
    titre?.focus({ preventScroll: true });
  }, [viewKey, contenuRef]);

  const transition = { duration: reduce ? 0 : AUTH_SWITCH_DURATION, ease: AUTH_EASE };

  return (
    <motion.div
      className="vxa-stage"
      initial={false}
      animate={{ height: hauteur ?? 'auto' }}
      transition={transition}
    >
      <div ref={contenuRef} className="vxa-stage-inner">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={viewKey}
            data-view={viewKey}
            className="vxa-stage-panel"
            custom={direction}
            variants={panneauVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
