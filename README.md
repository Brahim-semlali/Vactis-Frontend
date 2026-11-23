# VACTIS — Frontend

Interface web de VACTIS, l'outil de pilotage de la relation médecin du laboratoire : tableaux de bord, lecture d'activité, portefeuille médecins, actions terrain, alertes, recommandations et administration. Elle consomme l'API REST du dépôt `Vactis-back`.

| Composant | Technologie |
|---|---|
| Interface | React 19 |
| Build / serveur de dev | Parcel 2 |
| Styles | Tailwind CSS 3, feuilles CSS dédiées (`src/styles/`) |
| Animations | Framer Motion |
| Graphiques / carte | Recharts, Leaflet |
| Tests | Vitest + Testing Library (jsdom) |
| Déploiement | Docker (build Node, service nginx) |

La documentation technique détaillée (cycle de session, navigation et droits, couche API, styles) est fournie à part : `VACTIS_Documentation_Frontend.pdf`.

---

## Organisation du dépôt GitLab

Le code est livré **par module**, une branche `feature/<module>` par module. Chaque branche ne contient que les fichiers de son module : le projet complet s'obtient en fusionnant toutes les branches dans `main` (les fusions ne présentent aucun conflit).

| Branche | Contenu |
|---|---|
| `feature/base` | Configuration (Parcel, Tailwind, Docker, nginx), point d'entrée, layout, page d'accueil, composants UI, styles, utilitaires, README |
| `feature/auth` | Connexion, inscription, session JWT, profil, changement de mot de passe |
| `feature/menu` | Menu latéral dynamique selon les droits |
| `feature/dashboard-direction` | Tableau de bord direction |
| `feature/rapport-commercial` | Rapport commercial |
| `feature/activite` | Lecture d'activité |
| `feature/bridge-to-goal` | Bridge to Goal |
| `feature/suivi-equipe` | Suivi de l'équipe |
| `feature/medecin` | Médecins et fiche contextuelle |
| `feature/zone-intelligence` | Carte zone intelligence |
| `feature/action` | Actions, saisie du retour terrain, visite libre |
| `feature/alerte` | Alertes |
| `feature/recommandation` | Recommandations |
| `feature/reclamation` | Réclamations |
| `feature/notification` | Notifications |
| `feature/controle` | Contrôle du chiffre d'affaires |
| `feature/administration` | Administration, paramètres système, exports |
| `feature/data-excel` | Import / export Excel |

---

## Démarrage

### En développement

Le backend doit tourner sur `http://localhost:8082` (voir le dépôt `Vactis-back`).

```bash
npm install
npm run dev        # http://localhost:5173
```

### Avec Docker

```bash
cp .env.example .env
docker compose up --build -d   # http://localhost
```

L'image sert l'application avec nginx, qui relaie les appels `/api/` vers le backend (`BACKEND_HOST`, `BACKEND_PORT`) et renvoie `index.html` pour toutes les autres routes. Si le backend tourne déjà dans Docker sur le réseau `stagelabo-network` :

```bash
docker compose -f docker-compose.yml -f docker-compose.backend-network.yml up -d --build
```

### Autres commandes

```bash
npm test           # tests Vitest
npm run build      # build de production dans dist/
```

---

## Architecture

```
src/
├── main.jsx          Point d'entrée : thème, session, styles globaux
├── App.jsx           Affiche l'authentification ou l'application selon la session
├── context/          AuthContext (jeton JWT, profil, expiration), ThemeContext (clair / sombre)
├── api/              Un module par domaine métier ; config.js définit l'URL de l'API
├── pages/            Une page par rubrique du menu ; Home.jsx associe chaque route à sa page
├── components/       Layout, menu latéral, composants d'authentification et d'interface
├── styles/           Système de design, styles d'authentification et de pilotage
├── utils/, lib/      Formatage des indicateurs, périodes, exports, utilitaires
```

Fonctionnement :
1. **Session :** `AuthContext` stocke le jeton JWT, programme la déconnexion à son expiration et déconnecte l'utilisateur sur toute réponse 401.
2. **Navigation :** les rubriques affichées viennent du backend (`/api/menu`) selon le rôle de l'utilisateur ; une route non autorisée redirige vers la première route permise.
3. **Données :** chaque page appelle son module de `src/api/`, qui ajoute le jeton à la requête.

---

## Tests

```bash
npm test
```

100 tests répartis dans 23 fichiers, placés à côté des composants qu'ils testent (`*.test.jsx`, `*.test.js`).

---

Développé dans le cadre d'un stage au laboratoire VACTIS. Usage interne.
