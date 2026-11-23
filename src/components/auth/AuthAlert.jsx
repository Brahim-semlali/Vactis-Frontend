import { motion, useReducedMotion } from 'framer-motion';
import { CircleAlert } from 'lucide-react';
import { AUTH_EASE } from './authMotion.js';

/**
 * Alerte d'un formulaire d'authentification, à placer dans un AnimatePresence.
 * `pulseKey` rejoue la secousse à chaque nouvel échec (ton « error » uniquement).
 */
export default function AuthAlert({ tone = 'error', icon: Icon = CircleAlert, pulseKey = 0, children }) {
  const reduce = useReducedMotion();
  const secouer = !reduce && tone === 'error';

  return (
    <motion.div
      className={`vxa-alert vxa-alert--${tone}`}
      role="alert"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: AUTH_EASE }}
    >
      <motion.div
        key={pulseKey}
        className="vxa-alert-shake"
        animate={secouer ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
        transition={{ duration: 0.42, ease: 'easeInOut' }}
      >
        <span className="vxa-alert-icon" aria-hidden="true">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <div className="vxa-alert-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}
