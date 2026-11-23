import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { AUTH_EASE } from './authMotion.js';

/**
 * Bouton principal des formulaires d'authentification.
 * - enfoncement + onde au clic ;
 * - `loading` : spinner, libellé de chargement et barre de progression ;
 * - `success` : coche et libellé de confirmation (avant l'entrée dans l'application).
 */
export default function AuthSubmitButton({
  loading = false,
  loadingLabel,
  success = false,
  successLabel,
  disabled = false,
  icon: Icon = ArrowRight,
  children,
}) {
  const [ondes, setOndes] = useState([]);

  function handlePointerDown(event) {
    if (disabled || loading || success) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const onde = { id: event.timeStamp, x: event.clientX - rect.left, y: event.clientY - rect.top };
    setOndes((liste) => [...liste.slice(-2), onde]);
  }

  const etat = success ? 'success' : loading ? 'loading' : 'idle';
  const libelle = success ? successLabel : loading ? loadingLabel : children;

  return (
    <motion.button
      type="submit"
      className={`vxa-submit is-${etat}`}
      disabled={disabled || loading || success}
      aria-busy={loading || undefined}
      onPointerDown={handlePointerDown}
      whileTap={disabled || loading || success ? undefined : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
    >
      {ondes.map((onde) => (
        <span
          key={onde.id}
          className="vxa-submit-ripple"
          style={{ left: onde.x, top: onde.y }}
          onAnimationEnd={() => setOndes((liste) => liste.filter((o) => o.id !== onde.id))}
          aria-hidden="true"
        />
      ))}

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={etat}
          className="vxa-submit-label"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: AUTH_EASE }}
        >
          {etat === 'loading' && (
            <LoaderCircle className="vxa-submit-spinner" size={18} strokeWidth={2.4} aria-hidden="true" />
          )}
          {etat === 'success' && <Check className="vxa-submit-check" size={18} strokeWidth={3} aria-hidden="true" />}
          {libelle}
        </motion.span>
      </AnimatePresence>

      {etat === 'idle' && (
        <span className="vxa-submit-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={2.4} />
        </span>
      )}
    </motion.button>
  );
}
