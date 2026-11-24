import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAlertesFinCycle } from '../../api/vactis.js';

/**
 * Charge les alertes de fin de cycle de l'utilisateur connecté.
 * `intervalle` (ms) relance le chargement périodiquement (utilisé par la cloche).
 */
export default function useAlertesFinCycle({ intervalle = 0 } = {}) {
  const { token } = useAuth();
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const recharger = useCallback(async () => {
    if (!token) {
      setChargement(false);
      return;
    }
    setChargement(true);
    try {
      setDonnees(await getAlertesFinCycle(token));
      setErreur(null);
    } catch (e) {
      setErreur(e?.message ?? 'Erreur de chargement');
    } finally {
      setChargement(false);
    }
  }, [token]);

  useEffect(() => {
    recharger();
    if (!intervalle) return undefined;
    const minuterie = setInterval(recharger, intervalle);
    return () => clearInterval(minuterie);
  }, [recharger, intervalle]);

  return { donnees, chargement, erreur, recharger };
}
