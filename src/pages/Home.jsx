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
import VactisWorkflow from '../components/VactisWorkflow.tsx';

const workflowSteps = [
  ['Entrée DATA', 'Facturation, profils et retours terrain', 'Collecte des signaux disponibles pour chaque médecin.'],
  ['Normalisation', 'Mise à l’échelle du portefeuille', 'Toutes les métriques sont rendues comparables.'],
  ['Agrégation', 'CA mensuel moyen par médecin', 'Les données sont regroupées par médecin et par mois.'],
  ['Références', 'Moyenne glissante M-1 à M-3', 'Une base de comparaison robuste est construite.'],
  ['Variations', 'Delta CA et volume', 'Les mouvements significatifs sont détectés.'],
  ['Statut', '8 statuts VACTIS automatiques', 'La dynamique commerciale de chaque médecin est résumée.'],
  ['Silence & risque', 'Indice de rupture du rythme', 'Les décrochages potentiels sont anticipés.'],
  ['Segment & fiabilité', 'Segment ABCD, score sur 100', 'Le portefeuille est segmenté et évalué.'],
  ['Score de valeur', 'Potentiel, performance et économie', 'Un score composite synthétise la valeur commerciale.'],
  ['Actions', 'Plan commercial généré', 'L’analyse devient un plan d’action priorisé.'],
];

function HomeWorkflow() {
  const [selectedStep, setSelectedStep] = useState(0);
  const selected = workflowSteps[selectedStep];

  return (
    <section className="home-workflow">
      <div className="home-workflow-header">
        <div>
          <span className="home-eyebrow"><i /> MOTEUR VACTIS · EN CYCLE</span>
          <h2>La donnée brute devient plan d’action</h2>
          <p>Un flux continu de 10 transformations. Chaque donnée se raffine le long du moteur, puis reboucle au recalcul mensuel de chaque médecin.</p>
        </div>
        <div className="home-cycle-badge"><span>10</span> étapes · cycle mensuel</div>
      </div>

      <div className="home-workflow-track" aria-label="Étapes du moteur VACTIS">
        <svg className="home-track-line" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="workflow-gradient" x1="0" x2="1">
              <stop offset="0" stopColor="#0d9488" />
              <stop offset="0.45" stopColor="#2563eb" />
              <stop offset="0.75" stopColor="#9333ea" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <path d="M80 120 C220 65 360 65 500 120 S780 175 920 120 C970 205 970 215 920 300 C780 355 640 355 500 300 S220 245 80 300 C30 215 30 205 80 120" />
        </svg>
        <div className="home-workflow-hint"><span>↗</span> Cliquez une étape pour explorer</div>
        <div className="home-cycle-loop"><span>↻</span> Cycle mensuel</div>
        {workflowSteps.map((step, index) => (
          <button
            type="button"
            key={step[0]}
            className={`home-step home-step--${index < 5 ? 'top' : 'bottom'} home-step--${index} ${selectedStep === index ? 'is-selected' : ''}`}
            onClick={() => setSelectedStep(index)}
            aria-label={`Étape ${index + 1}: ${step[0]}`}
          >
            <span className="home-step-dot">{index + 1}</span>
            <strong>{step[0]}</strong>
            <small>{step[1]}</small>
          </button>
        ))}
      </div>

      <div className="home-workflow-detail">
        <div className="home-detail-index">{String(selectedStep + 1).padStart(2, '0')} / 10</div>
        <div>
          <h3>{selected[0]}</h3>
          <p>{selected[2]}</p>
        </div>
        <button type="button" onClick={() => setSelectedStep((selectedStep + 1) % workflowSteps.length)}>
          Étape suivante <span>→</span>
        </button>
      </div>
    </section>
  );
}

function isPublicRoute(route) {
  return route === '/' || route === '/accueil';
}

function isRouteAllowed(route, allowedRoutes) {
  if (isPublicRoute(route)) {
    return true;
  }

  return allowedRoutes.includes(route);
}

function getFirstAllowedRoute(allowedRoutes) {
  return allowedRoutes[0] ?? '/accueil';
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
      <div className="home-page">
        <VactisWorkflow />
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
      navigate(getFirstAllowedRoute(allowedRoutes));
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
