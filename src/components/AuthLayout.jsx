import { MotionConfig, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import AuthBackground from './auth/AuthBackground.jsx';
import AuthShowcase from './auth/AuthShowcase.jsx';
import { AUTH_EASE } from './auth/authMotion.js';
import { vactisLogo, vactisMark } from './auth/brandAssets.js';

/*
 * Sortie de la page après une connexion réussie (App l'affiche dans un
 * AnimatePresence) : on laisse voir l'état « réussi » puis la page s'efface.
 */
const pageExit = {
  opacity: 0,
  scale: 1.015,
  filter: 'blur(6px)',
  transition: { duration: 0.45, delay: 0.3, ease: AUTH_EASE },
};

/**
 * Coque des pages d'authentification : fond animé, panneau de présentation
 * (gauche) et carte du formulaire (droite). Elle reste montée pendant la bascule
 * Connexion ↔ Inscription ; seul son contenu (`children`) change.
 * MotionConfig applique « réduire les animations » à toutes les animations framer-motion.
 */
export default function AuthLayout({ mode = 'login', children }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="vxa-page" data-mode={mode} exit={pageExit}>
        <AuthBackground />

        <div className="vxa-shell">
          <AuthShowcase mode={mode} />

          <main className="vxa-panel">
            <div className="vxa-panel-decor" aria-hidden="true">
              <span />
              <span />
            </div>

            <div className="vxa-panel-scroll">
              <div className="vxa-panel-inner">
                <motion.div
                  className="vxa-panel-logo"
                  initial={{ opacity: 0, scale: 0.6, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.15, ease: AUTH_EASE }}
                >
                  <span className="vxa-panel-logo-ring" aria-hidden="true" />
                  <span className="vxa-panel-logo-halo" aria-hidden="true" />
                  <img src={vactisMark} alt="VACTIS" />
                </motion.div>

                {children}

                <p className="vxa-secure">
                  <ShieldCheck size={14} strokeWidth={2.2} aria-hidden="true" />
                  Votre sécurité, notre priorité
                </p>
              </div>
            </div>
          </main>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

// Conservés pour compatibilité : d'autres écrans (barre latérale) réutilisent ces logos.
export { vactisMark as showcaseLogo, vactisLogo as authLogo };
