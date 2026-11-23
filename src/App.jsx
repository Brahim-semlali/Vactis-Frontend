import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import AuthPage from './pages/Authentification/AuthPage.jsx';

export default function App() {
  const { isAuthenticated } = useAuth();
  // Après une connexion réussie, l'application ne s'affiche qu'une fois
  // l'animation de sortie de la page d'authentification terminée.
  const [sortieAuthTerminee, setSortieAuthTerminee] = useState(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) setSortieAuthTerminee(false);
  }, [isAuthenticated]);

  // Home reste volontairement hors d'AnimatePresence : ses propres animations
  // d'entrée ne doivent pas hériter du contexte de présence de la page de connexion.
  return (
    <>
      <AnimatePresence initial={false} onExitComplete={() => setSortieAuthTerminee(true)}>
        {!isAuthenticated && <AuthPage key="auth" />}
      </AnimatePresence>
      {isAuthenticated && sortieAuthTerminee && <Home />}
    </>
  );
}
