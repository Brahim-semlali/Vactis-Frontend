import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

const RAYON = 22;
const CIRCONFERENCE = 2 * Math.PI * RAYON;
const SEUIL_AFFICHAGE = 400;

/**
 * Bouton flottant « retour en haut » : apparaît après un défilement de la page
 * et affiche autour de lui un anneau indiquant la progression de lecture.
 */
export default function ScrollToTopButton() {
  const reduireMouvements = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progression, setProgression] = useState(0);

  useEffect(() => {
    let frame = 0;

    const mettreAJour = () => {
      frame = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(y > SEUIL_AFFICHAGE);
      setProgression(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
    };

    const surDefilement = () => {
      if (!frame) frame = window.requestAnimationFrame(mettreAJour);
    };

    mettreAJour();
    window.addEventListener('scroll', surDefilement, { passive: true });
    window.addEventListener('resize', surDefilement);
    return () => {
      window.removeEventListener('scroll', surDefilement);
      window.removeEventListener('resize', surDefilement);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const remonter = () => {
    window.scrollTo({ top: 0, behavior: reduireMouvements ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          className="vx-scroll-top"
          onClick={remonter}
          aria-label="Revenir en haut de la page"
          title="Revenir en haut"
          initial={{ opacity: 0, y: 16, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.8 }}
          whileHover={reduireMouvements ? undefined : { y: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        >
          <svg className="vx-scroll-top-ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r={RAYON}
              strokeDasharray={CIRCONFERENCE}
              strokeDashoffset={CIRCONFERENCE * (1 - progression)}
            />
          </svg>
          <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
