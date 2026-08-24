import { useEffect, useState } from 'react';
import { getMonMenu } from '../api/menu.js';
import AppLayout from '../components/AppLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MedecinsPage from './Medecins/MedecinsPage.jsx';
import ActionsPage from './Actions/ActionsPage.jsx';
import Controle from './Controle/Controle.jsx';
import LectureActivitePage from './LectureActivite/LectureActivitePage.jsx';
import PlaceholderPage from './PlaceholderPage.jsx';
import AdministrationPage from './Administration/AdministrationPage.jsx';

function isPublicRoute(route) {
  return route === '/' || route === '/accueil';
}

function isRouteAllowed(route, allowedRoutes) {
  if (isPublicRoute(route)) {
    return true;
  }

  return allowedRoutes.includes(route);
}

function resolvePageContent(activeRoute, username, navigate) {
  if (activeRoute === '/medecins') {
    return <MedecinsPage />;
  }

  if (activeRoute === '/actions') {
    return <ActionsPage />;
  }

  if (activeRoute === '/controle') {
    return <Controle navigate={navigate} />;
  }

  if (activeRoute === '/lecture-activite') {
    return <LectureActivitePage />;
  }

  if (activeRoute === '/roles') {
    return <AdministrationPage mode="roles" />;
  }

  if (activeRoute === '/users') {
    return <AdministrationPage mode="users" />;
  }


  if (isPublicRoute(activeRoute)) {
    return (
      <div className="space-y-6">
        <div className="p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              PLATEFORME DE PILOTAGE VACTIS
            </div>
            <h1 className="text-3xl font-black tracking-tight">Bienvenue, {username} 👋</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              De la donnée à l&apos;action terrain. Sélectionnez un module dans le menu de navigation pour consulter vos analyses, prioriser vos médecins et exécuter vos actions commerciales.
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/medecins')}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-teal-600/30 active:scale-95 flex items-center gap-2"
              >
                Accéder au Portefeuille Médecins →
              </button>
              <button
                type="button"
                onClick={() => navigate('/actions')}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 active:scale-95 flex items-center gap-2"
              >
                Voir les Actions →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle = activeRoute
    .replace(/^\//, '')
    .split(/[-_/]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return <PlaceholderPage title={pageTitle || 'Page'} />;
}

function HomeContent({ activeRoute, navigate, username, allowedRoutes, menuLoaded }) {
  useEffect(() => {
    if (!menuLoaded) {
      return;
    }

    if (!isRouteAllowed(activeRoute, allowedRoutes)) {
      navigate('/accueil');
    }
  }, [activeRoute, allowedRoutes, menuLoaded, navigate]);

  if (!menuLoaded) {
    return null;
  }

  if (!isRouteAllowed(activeRoute, allowedRoutes)) {
    return null;
  }

  return resolvePageContent(activeRoute, username, navigate);
}

export default function Home() {
  const { username, token } = useAuth();
  const [allowedRoutes, setAllowedRoutes] = useState([]);
  const [menuLoaded, setMenuLoaded] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadAllowedRoutes() {
      try {
        const sections = await getMonMenu(token);
        if (!cancelled) {
          setAllowedRoutes(sections.flatMap((section) => section.sousMenus ?? []).map((item) => item.route));
        }
      } catch {
        if (!cancelled) {
          setAllowedRoutes([]);
        }
      } finally {
        if (!cancelled) {
          setMenuLoaded(true);
        }
      }
    }

    loadAllowedRoutes();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AppLayout>
      {({ activeRoute, navigate }) => (
        <HomeContent
          activeRoute={activeRoute}
          navigate={navigate}
          username={username}
          allowedRoutes={allowedRoutes}
          menuLoaded={menuLoaded}
        />
      )}
    </AppLayout>
  );
}
