import { motion } from 'framer-motion';
import { AUTH_EASE } from './authMotion.js';

const titreVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const motVariants = {
  hidden: { opacity: 0, y: '0.45em', filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: AUTH_EASE } },
};

/**
 * Titre et sous-titre d'un formulaire d'authentification.
 * Le titre se révèle mot par mot à chaque affichage du formulaire.
 */
export default function AuthFormHeader({ title, subtitle }) {
  const mots = title.split(' ');

  return (
    <header className="vxa-form-head">
      {/* tabIndex -1 : reçoit le focus après la bascule Connexion ↔ Inscription */}
      <motion.h1 tabIndex={-1} aria-label={title} variants={titreVariants} initial="hidden" animate="visible">
        {mots.map((mot, i) => (
          <motion.span key={`${mot}-${i}`} className="vxa-form-head-word" variants={motVariants} aria-hidden="true">
            {mot}
            {i < mots.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 + mots.length * 0.06, ease: AUTH_EASE }}
        >
          {subtitle}
        </motion.p>
      )}
    </header>
  );
}
