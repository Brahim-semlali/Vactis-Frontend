import { useEffect, useState } from 'react';
import { getAllMenu } from '../api/menu.js';
import AppLayout from '../components/AppLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MedecinsPage from './Medecins/MedecinsPage.jsx';
import ActionsPage from './Actions/ActionsPage.jsx';
import PlaceholderPage from './PlaceholderPage.jsx';

function isPublicRoute(route) {
  return route === '/' || route === '/accueil';
}

function isRouteAllowed(route, allowedRoutes) {
  if (isPublicRoute(route)) {
    return true;
  }

  return allowedRoutes.includes(route);
}

function resolvePageContent(activeRoute, username) {
  if (activeRoute === '/medecins') {
    return <MedecinsPage />;
  }

  if (activeRoute === '/actions') {
    return <ActionsPage />;
  }

  if (isPublicRoute(activeRoute)) {
    return (
      <section className="page-panel">
        <header className="page-panel-header">
          <p className="page-eyebrow">PILOTAGE</p>
          <h1 className="page-title">Bienvenue {username}</h1>
          <p className="page-description">
            Sélectionnez une rubrique dans le menu pour accéder aux modules VACTIS.
          </p>
        </header>
      </section>
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

  return resolvePageContent(activeRoute, username);
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
        const items = await getAllMenu(token);
        if (!cancelled) {
          setAllowedRoutes(items.map((item) => item.route));
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
