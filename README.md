# Tetrix PLUS - Gestion Intelligente de Planification de Traduction

> Plateforme complète de gestion de planification et de répartition des tâches de traduction avec algorithme JAT (Just-in-Time).

[![Frontend Deploy](https://img.shields.io/badge/Frontend-GitHub%20Pages-blue)](https://snarky1980.github.io/tetrix-plus-prototype/)
[![Backend Deploy](https://img.shields.io/badge/Backend-Render-green)](https://tetrix-plus-backend.onrender.com/api)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](./DEPLOYMENT.md)

## 📋 Vue d'ensemble

**Version** : 2.0.0 (Production)  
**Statut** : ✅ Production Ready

Tetrix PLUS est une application complète de gestion de planification conçue pour les entreprises de traduction. Elle offre :

- **Gestion des utilisateurs** : 3 rôles spécialisés (Admin, Conseiller, Traducteur)
- **Algorithme JAT** : Répartition intelligente, équitable et prévisible des heures
- **Planification globale** : Vue 7 jours avec code couleur et blocage de capacité
- **Blocage de temps** : Réserver des slots pour congés, réunions, etc.
- **Tableaux de bord** : Dashboard personnalisés par rôle avec métriques temps réel
- **Validation intelligente** : Blocage des surcharges, respect des capacités
- **Toast notifications** : Feedback immédiat sur toutes les actions
- **Interface élégante** : Design system cohérent (echo-BT-CTD) et responsive

### 📑 Documents complémentaires
- [Audit Performance & Accessibilité](./AUDIT-PERF-ACCESSIBILITE.md) - Rapports détaillés
- [Guide Déploiement](./DEPLOYMENT.md) - Instructions production
- [Architecture Détaillée](./ARCHITECTURE.txt) - Vue technique complète

---

## 🏗️ Architecture

### Stack Technique

**Backend**
- Node.js 20+ avec Express
- TypeScript 5.3
- PostgreSQL (base de données)
- Prisma ORM (gestion DB et migrations)
- JWT (authentification stateless)
- Zod (validation des données)
- Bcrypt (hashage des mots de passe)

**Frontend**
- React 18 + TypeScript
- Vite (build tool ultra-rapide)
- React Router v6 (navigation SPA)
- Axios (client HTTP)
- Tailwind CSS (styling)
- date-fns (manipulation de dates)

**Design System**
- **Thème** : echo-BT-CTD
- **Couleurs** : Navy (#2c3d50), Sage (#aca868), Teal accents
- **Font** : Inter
- **Border radius** : 12px

### Déploiement

**Frontend** : GitHub Pages
- URL: https://snarky1980.github.io/tetrix-plus-prototype/
- Déploiement automatique via GitHub Actions à chaque push sur `main`

**Backend** : Render.com
- URL: https://tetrix-plus-backend.onrender.com/api
- PostgreSQL managée (Render database add-on)

### Hiérarchie des fichiers

```
tetrix-plus-prototype/
├── frontend/                    # Application React
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Composants réutilisables (Button, Input, Select, etc.)
│   │   │   ├── admin/          # Composants admin (UserManagement, ClientForm, etc.)
│   │   │   └── layout/         # Layout principal (AppLayout)
│   │   ├── contexts/           # React Contexts (AuthContext, ToastContext)
│   │   ├── hooks/              # Custom hooks (usePlanning, useRepartition, usePageTitle)
│   │   ├── pages/              # Pages principales (Dashboards, Planning, etc.)
│   │   ├── services/           # Services API (api.ts, authService.ts, etc.)
│   │   ├── types/              # Types TypeScript partagés
│   │   ├── lib/                # Utilitaires (cn.ts, format.ts)
│   │   ├── App.tsx             # Routes et protection
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Tailwind CSS directives
│   ├── public/
│   │   ├── favicon.svg         # Favicon branding
│   │   └── 404.html            # GitHub Pages routing fix
│   └── package.json
│
├── backend/                     # API Node.js
│   ├── src/
│   │   ├── config/             # Configuration (database.ts, env.ts)
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── controllers/        # Route handlers
│   │   ├── services/           # Logique métier (JAT, Capacité, Planning)
│   │   ├── routes/             # Définition des endpoints
│   │   ├── validation/         # Schémas Zod
│   │   └── server.ts           # Express app
│   ├── prisma/
│   │   ├── schema.prisma       # ORM schema
│   │   ├── seed.ts             # Seed de développement
│   │   └── seed-admin.sql      # Admin initial
│   ├── tests/                  # Tests unitaires
│   └── package.json
│
├── DEPLOYMENT.md               # Guide production
├── AUDIT-PERF-ACCESSIBILITE.md # Rapports audit
├── ARCHITECTURE.txt            # Documentation technique
├── render.yaml                 # IaC pour Render
├── Procfile                    # Configuration production
└── package.json                # Workspace root
## 👥 Comptes de test

| Email | Mot de passe | Rôle | URL |
|-------|-------------|------|-----|
| admin@tetrix.com | password123 | Administrateur | /dashboard-admin |
| conseiller@tetrix.com | password123 | Conseiller | /dashboard-conseiller |
| traducteur@tetrix.com | password123 | Traducteur | /dashboard-traducteur |

## 🚀 Démarrage rapide

### Prérequis
- Node.js 20+
- npm ou yarn
- PostgreSQL 14+ (ou utiliser Render managed)

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/snarky1980/tetrix-plus-prototype.git
cd tetrix-plus-prototype

# Installation complète
npm install

# Démarrer (frontend + backend)
npm run dev
```

Cela démarre :
- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:3001

### Configuration backend (.env)

```bash
cd backend
cp .env.example .env
```

Éditer `backend/.env` :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tetrix_plus?schema=public"

# JWT
JWT_SECRET="votre-clé-secrète-très-longue-et-sécurisée"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Initialiser la base de données

```bash
cd backend
npx prisma migrate dev --name init  # Crée les tables
npm run prisma:seed                  # Charge les données de test
```

### Vérifier l'installation

```bash
# Backend healthcheck
curl http://localhost:3001/api/health

# Tester la connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tetrix.com","motDePasse":"password123"}'
```

## 📊 Guide utilisateur

### Pour l'Administrateur

**Gestion des traducteurs** (`/dashboard-admin` → Traducteurs)
- Voir tous les traducteurs avec leurs capacités
- Créer/modifier/désactiver des profils
- Définir la capacité heures/jour
- Gérer les domaines et clients habituels
- Ajouter/supprimer paires linguistiques

**Gestion des clients et domaines** (`/dashboard-admin` → Clients & Domaines)
- Créer/modifier des clients
- Organiser les sous-domaines
- Configurer les divisions

**Gestion des utilisateurs** (`/dashboard-admin` → Utilisateurs)
- Créer des comptes (Admin, Conseiller, Traducteur)
- Assigner les rôles
- Associer aux profils traducteur
- Désactiver/réactiver des utilisateurs

**Vue des statistiques** (`/dashboard-admin` → Statistiques)
- Métriques de capacité (libre, presque pleine, pleine)
- Total de cellules actives
- Cartes métriques avec codes couleur

### Pour le Conseiller

**Créer une tâche** (`/taches/creation`)
1. **Étape 1** : Configurer la tâche
   - Sélectionner traducteur(s)
   - Nombre d'heures total
   - Date d'échéance
   - Client et domaine (optionnels)

2. **Étape 2** : Répartition JAT
   - Visualiser la répartition proposée
   - Bloquer certains jours (congés, réunions)
   - Valider et créer

**Consulter le planning** (`/planning-global`)
- Vue 7 jours multi-traducteurs
- Filtrer par division, client, domaine
- Code couleur de capacité :
  - 🟢 **Libre** : Capacité disponible
  - 🟠 **Presque plein** : >75% utilisé
  - 🔴 **Plein** : 100% utilisé

### Pour le Traducteur

**Consulter son planning** (`/dashboard-traducteur`)
- Vue personnelle 7 jours
- Tâches assignées avec heures/jour
- Capacité restante

**Bloquer du temps** (à partir du planning)
- Réserver des slots (congés, réunions)
- Voir l'impact sur la capacité
- Supprimer des blocages

## 🔧 Technologie stack

| Domaine | Technologies |
|---------|--------------|
| **Frontend** | React 18, TypeScript, Vite, React Router v6, Tailwind CSS, Axios |
| **Backend** | Node.js 20, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, Zod |
| **DevOps** | GitHub Actions, GitHub Pages, Render.com, Docker, npm workspaces |
| **Design** | Tailwind CSS, Inter font, echo-BT-CTD theme |

## 🔐 Sécurité et authentification

- **JWT tokens** : Stateless, valides 24h
- **Password hashing** : Bcrypt avec salt
- **Validation** : Zod schemas côté serveur
- **RBAC** : 3 rôles avec permissions granulaires
- **CORS** : Configuré pour production
- **HTTPS** : Obligatoire en production

### Flux d'authentification

```
1. Utilisateur se connecte (email + mot de passe)
2. Backend valide et génère JWT
3. JWT stocké dans localStorage
4. Envoyé dans Authorization header pour chaque requête
5. Middleware vérifie le token
6. Route protégée exécutée si valide
```

## 📡 API Endpoints

### Authentification
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/logout` - Se déconnecter
- `GET /api/auth/me` - Utilisateur courant

### Traducteurs
- `GET /api/traducteurs` - Liste (filtres: division, client, domaine, langue)
- `POST /api/traducteurs` - Créer (Admin)
- `GET /api/traducteurs/:id` - Détails
- `PUT /api/traducteurs/:id` - Modifier (Admin)
- `DELETE /api/traducteurs/:id` - Désactiver (Admin)

### Paires linguistiques
- `POST /api/traducteurs/:traducteurId/paires-linguistiques` - Ajouter (Admin)
- `DELETE /api/traducteurs/:traducteurId/paires-linguistiques/:pairId` - Supprimer (Admin)

### Tâches
- `GET /api/taches` - Liste (filtres: traducteur, client, domaine, dates)
- `POST /api/taches` - Créer (Conseiller)
- `GET /api/taches/:id` - Détails
- `PUT /api/taches/:id` - Modifier (Conseiller)
- `DELETE /api/taches/:id` - Supprimer (Conseiller)

### Planning
- `GET /api/planning/:traducteurId?dateDebut=...&dateFin=...` - Planning individuel
- `GET /api/planning-global?dateDebut=...&dateFin=...` - Planning multi-traducteurs

### Capacité & Blocages
- `GET /api/capacite/:traducteurId` - Capacité disponible
- `POST /api/blocages` - Créer un blocage
- `DELETE /api/blocages/:id` - Supprimer un blocage

**Santé du serveur**
- `GET /api/health` - Status de l'API

[Documentation API complète](./docs/API.md)

## 🧪 Tests et validation

### Tester l'API en développement

```bash
# Healthcheck
curl http://localhost:3001/api/health

# Connexion et récupération du token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tetrix.com","motDePasse":"password123"}' \
  | jq -r '.token')

# Récupérer les traducteurs
curl http://localhost:3001/api/traducteurs \
  -H "Authorization: Bearer $TOKEN"

# Créer un traducteur
curl -X POST http://localhost:3001/api/traducteurs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nom": "Jean Dupont",
    "division": "IT",
    "capaciteHeuresParJour": 7.5
  }'
```

### Inspector la base de données

```bash
cd backend
npx prisma studio    # Accéder à http://localhost:5555
```

### Tests unitaires backend

```bash
cd backend
npm test              # Exécuter les tests
npm run test:watch   # Mode watch
```

## 📦 Build et déploiement

### Build local

```bash
# Frontend
cd frontend
npm run build    # Crée dist/

# Backend
cd backend
npm run build    # Crée dist/
```

### Déploiement sur GitHub Pages (frontend)

```bash
# Automatique via .github/workflows/deploy-frontend.yml
# Déclenché à chaque push sur main branch
git push origin main
```

**Production URL** : https://snarky1980.github.io/tetrix-plus-prototype/

### Déploiement sur Render (backend)

**Étapes** :
1. Créer un Web Service sur render.com
2. Connecter ce repository GitHub
3. Configurer les variables d'environnement :
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://snarky1980.github.io
   ```
4. Build Command: `cd backend && npm ci && npx prisma generate && npm run build`
5. Start Command: `cd backend && npx prisma migrate deploy && npm start`

**Production URL** : https://tetrix-plus-backend.onrender.com/api

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour détails complets.

## 🎨 Système de design

### Composants réutilisables

**Composants de base** (`frontend/src/components/ui/`)
- `Button` : Variants (primary, secondary, outline, danger, ghost)
- `Input` : Champs texte avec validation et états d'erreur
- `Select` : Dropdowns avec recherche
- `FormField` : Wrapper avec label, helper text, error message
- `Card` : Conteneurs de contenu
- `Modal` : Dialogs accessibles
- `Spinner` : Indicateurs de chargement
- `Toast` : Notifications non-intrusives (success, error, info, warning)
- `Badge` : Étiquettes statut
- `StatCard` : Cartes métriques (5 variants: default, success, warning, danger, info)
- `Skeleton` : Chargement placeholder (Skeleton, SkeletonCard, SkeletonStatGrid, SkeletonTable)
- `EmptyState` : États vides gracieux (NoData, NoResults, Error)

**Utilisation**

```tsx
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { useToast } from '@/contexts/ToastContext'

export function MonFormulaire() {
  const { toast } = useToast()
  
  const handleSubmit = async () => {
    try {
      await apiCall()
      toast({
        type: 'success',
        title: 'Succès',
        message: 'L\'action a été complétée.'
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <FormField label="Nom" required helper="Prénom + nom de famille">
        <Input placeholder="Jean Dupont" />
      </FormField>
      <Button type="submit">Soumettre</Button>
    </form>
  )
}
```

### Personnalisation du thème

**Couleurs primaires** (`frontend/src/index.css`)
```css
:root {
  --color-navy: #2c3d50;      /* Texte principal */
  --color-sage: #aca868;      /* Accents */
  --color-teal: #059669;      /* Success */
  --color-warning: #ea580c;   /* Warning */
  --color-danger: #dc2626;    /* Errors */
  --color-bg: #fefbe8;        /* Fond très clair */
}
```

**Étendre Tailwind** (`frontend/tailwind.config.js`)
```js
theme: {
  extend: {
    colors: {
      navy: '#2c3d50',
      sage: '#aca868',
      // ...
    },
    borderRadius: {
      DEFAULT: '12px',
    }
  }
}
```

## 🔍 Algorithme JAT (Just-in-Time)

### Concept

L'algorithme JAT distribue les heures de manière **équitable et prévisible** :

```
Données : 35 heures sur 7 jours (du lundi au dimanche)
Capacité : 7.5 heures/jour
Blocage : Vendredi (congé)

Calcul :
- Jours disponibles : 6 (sauf vendredi)
- Heures/jour : 35 ÷ 6 = 5.83 h/jour
- Distribution :
  Lun: 5.83h ✓
  Mar: 5.83h ✓
  Mer: 5.84h ✓  (arrondi)
  Jeu: 5.83h ✓
  Ven: BLOCAGE 🔴
  Sam: 5.84h ✓
  Dim: 5.83h ✓
```

### Implémentation

Voir `backend/src/services/repartitionService.ts` pour la logique complète.

**Validations** :
- Jamais plus que la capacité quotidienne
- Respecte les blocages
- Distribution uniforme
- Gestion des arrondis

## 🚧 Dépannage

### Frontend

**Page blanche au chargement**
- Vider le cache : `Ctrl+Shift+Delete` → Aller à Cookies et données de site → Vider
- Redémarrer le serveur dev : `Ctrl+C` puis `npm run dev`

**Erreur "Token invalide"**
- Vérifier que le backend est accessible
- Vérifier JWT_SECRET identique entre frontend et backend
- Réinitialiser la session : `localStorage.clear()`

**Styles Tailwind ne s'appliquent pas**
- Hard refresh : `Ctrl+Shift+R`
- Vérifier que postcss.config.cjs existe
- Redémarrer Vite : `npm run dev`

### Backend

**Erreur de base de données**
```bash
# Réinitialiser la BD
cd backend
npx prisma migrate reset
npm run prisma:seed
```

**Seed échoue**
- Vérifier DATABASE_URL dans .env
- Vérifier que PostgreSQL est en cours d'exécution
- Consulter logs : `npm run prisma:seed 2>&1 | tail -20`

**Port 3001 déjà utilisé**
```bash
# Trouver et tuer le processus
lsof -i :3001
kill -9 <PID>
```

### Déploiement

**Frontend ne se met pas à jour**
- Force le redeploiement : Vérifier que `main` est à jour
- Vider le cache GitHub Pages : Settings → Pages → Redeploy
- Vérifier les GitHub Actions : Actions tab

**Backend crashe**
- Vérifier les logs Render : Dashboard → Logs
- Vérifier DATABASE_URL dans Render environment
- Vérifier JWT_SECRET n'est pas vide

## 📚 Ressources et documentation

- [Spec fonctionnelle complète](./docs/SPEC.md)
- [Guide d'architecture détaillé](./ARCHITECTURE.txt)
- [Guide de déploiement](./DEPLOYMENT.md)
- [Rapports audit](./AUDIT-PERF-ACCESSIBILITE.md)
- [API Documentation](./docs/API.md)

### Technologies de référence

- **React** : https://react.dev
- **Express.js** : https://expressjs.com
- **Prisma** : https://www.prisma.io
- **Tailwind CSS** : https://tailwindcss.com
- **React Router** : https://reactrouter.com

## 🤝 Contribution et support

### Workflow de développement

```bash
# 1. Créer une branche
git checkout -b feature/ma-feature

# 2. Faire les changements
# ... modifications ...

# 3. Tester localement
npm run dev
npm test

# 4. Commit
git add .
git commit -m "feat: Description claire de la feature"

# 5. Push
git push origin feature/ma-feature

# 6. Créer une Pull Request
# Décrire les changements, tests effectués
```

### Directives de contribution

- ✅ Code TypeScript avec typage complet
- ✅ Tests unitaires pour la logique métier
- ✅ Commits descriptifs en anglais ou français
- ✅ Respecter le style du projet (Prettier, ESLint)
- ✅ Accessibilité WCAG 2.1 AA minimum

### Support et signalement de bugs

- 🐛 **Issues** : https://github.com/snarky1980/tetrix-plus-prototype/issues
- 💬 **Discussions** : https://github.com/snarky1980/tetrix-plus-prototype/discussions
- 📧 **Email** : support@tetrix.com

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

---

## ✅ État du projet

| Phase | Statut | Détails |
|-------|--------|---------|
| **Phase 1** | ✅ Complète | Architecture, Backend API, Authentification |
| **Phase 2** | ✅ Complète | Design system, Composants UI, Accessibilité |
| **Phase 3** | ✅ Complète | Algorithme JAT, Répartition, Blocage temps |
| **Phase 4** | ✅ Complète | Toast, Validation formulaires, Animations |
| **Phase 5** | ✅ Complète | Page titles, Browser tabs, Favicon |
| **Phase 6** | ✅ Complète | Components avancés (StatCard, Skeleton, EmptyState) |
| **Production** | 🟢 READY | Tous les critères validés |

---

**Tetrix PLUS** — Planification intelligente pour les traducteurs 🚀
