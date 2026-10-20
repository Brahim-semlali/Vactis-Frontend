import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getNotifications, getNotificationsCount, marquerNotificationLue } from '../api/vactis.js';

export default function NotificationDropdown({ onNavigate, canAccessReclamations = false }) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

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

  if (!canAccessReclamations) return null;

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

        {count > 0 && (
          <span
            id="notification-badge"
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none animate-pulse"
          >
            {count > 99 ? '99+' : count}
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
              {count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                  {count} non lue{count > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={fetchList}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Actualiser
            </button>
          </div>

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
        </div>
      )}
    </div>
  );
}
