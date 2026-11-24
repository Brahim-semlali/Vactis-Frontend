import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getNotifications, getNotificationsCount, marquerNotificationLue } from '../api/vactis.js';
import useAlertesFinCycle from './alertes/useAlertesFinCycle.js';
import { alertesCloche, libelleEcheance, pastilleEcheance, resumeParType } from './alertes/finCycle.js';

const INTERVALLE_FIN_CYCLE = 5 * 60 * 1000;

export default function NotificationDropdown({ onNavigate, canAccessReclamations = false }) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const { donnees: finCycle, recharger: rechargerFinCycle } = useAlertesFinCycle({ intervalle: INTERVALLE_FIN_CYCLE });
  const alertesCycle = alertesCloche(finCycle);
  const resumeCycle = resumeParType(alertesCycle);
  const total = count + alertesCycle.length;

  const fetchCount = async () => {
    if (!token || !canAccessReclamations) return;
    try {
      const res = await getNotificationsCount(token);
      setCount(res?.count ?? 0);
    } catch {
      // Ignorer si non disponible
    }
  };

  const fetchList = async () => {
    if (!token || !canAccessReclamations) return;
    setLoading(true);
    try {
      const list = await getNotifications(token);
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [token, canAccessReclamations]);

  useEffect(() => {
    if (isOpen) {
      fetchList();
      fetchCount();
      rechargerFinCycle();
    }
  }, [isOpen]);

  // Fermer la liste au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.lu) {
      try {
        await marquerNotificationLue(token, notif.id);
        setCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, lu: true } : n))
        );
      } catch (err) {
        console.error('Erreur marquer notification lue:', err);
      }
    }
    setIsOpen(false);
    if (onNavigate) {
      onNavigate('/reclamations');
    }
  };

  const ouvrir = (route) => {
    setIsOpen(false);
    if (onNavigate) onNavigate(route);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id="notification-bell-btn"
        data-testid="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="notification-dropdown-menu"
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
        aria-label="Notifications"
        title="Notifications"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {total > 0 && (
          <span
            id="notification-badge"
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none animate-pulse"
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown-menu"
          data-testid="notification-dropdown-menu"
          className="absolute right-0 top-full z-[100] mt-2 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">Notifications</span>
              {canAccessReclamations && count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                  {count} non lue{count > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { fetchList(); rechargerFinCycle(); }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Actualiser
            </button>
          </div>

          {resumeCycle.length > 0 && (
            <section
              data-testid="fin-cycle-section"
              aria-label="Clôture du cycle"
              className={`border-b px-4 py-3 ${finCycle?.urgent
                ? 'border-rose-100 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20'
                : 'border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{libelleEcheance(finCycle)}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${finCycle?.urgent
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'}`}
                >
                  {pastilleEcheance(finCycle)}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {resumeCycle.map((ligne) => (
                  <li key={ligne.type}>
                    <button
                      type="button"
                      onClick={() => ouvrir(ligne.route)}
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs text-slate-700 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ligne.urgent ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <span className="font-bold tabular-nums">{ligne.count}</span>
                      <span>{ligne.label.toLowerCase()}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => ouvrir('/alertes-fin-cycle')}
                className="mt-1.5 text-xs font-semibold text-[#009B83] hover:underline"
              >
                Voir les alertes de fin de cycle →
              </button>
            </section>
          )}

          {canAccessReclamations && (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  data-testid={`notification-item-${notif.id}`}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 cursor-pointer ${
                    !notif.lu ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      !notif.lu ? 'bg-indigo-600' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {notif.titre}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleString('fr-FR') : ''}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          )}

          {!canAccessReclamations && resumeCycle.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              Aucune notification pour le moment.
            </div>
          )}

          {canAccessReclamations && (
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onNavigate) onNavigate('/reclamations');
              }}
              className="text-xs font-semibold text-[#009B83] hover:underline"
            >
              Voir toutes les réclamations →
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
