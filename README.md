# Tetrix PLUS

Application web complète de gestion de planification pour traducteurs, remplaçant les fichiers Excel Tetrix.

---

## 📋 Vue d'ensemble

**Version** : 1.0.0  
**Statut** : Pré-production READY (voir audit Agent 4)

Tetrix PLUS permet de :
- Gérer ~500 traducteurs avec leurs compétences linguistiques
- Planifier des tâches en heures décimales (1.25h, 0.50h, 7.5h, etc.)
- Bloquer du temps (blocages)
- Visualiser les plannings individuels et globaux
- Filtrer par division, client, domaine, paire linguistique, période
- Déploiement statique (GitHub Pages) + API séparée

### 📑 Documents clés
- Audit Performance & Accessibilité : `AUDIT-PERF-ACCESSIBILITE.md`
- Guide déploiement : `DEPLOYMENT.md`

### ✅ Readiness
Audit du 2025-11-29 : application jugée **Pré-production READY**. Restant avant Production : pagination planning global, logging structuré, rate limiting, landmarks sémantiques, tests contrôleurs.

---

## 🏗️ Architecture

### Stack Technique

**Backend**
- Node.js 20+ avec Express
- TypeScript 5.3
- PostgreSQL (base de données)
- Prisma ORM (gestion DB et migrations)
- JWT (authentification)
- Zod (validation des données)
- Bcrypt (hashage des mots de passe)

**Frontend**
- React 18 avec TypeScript
- Vite (build tool)
- React Router v6 (navigation)
- Axios (requêtes HTTP)
- date-fns (manipulation de dates)
 - Tailwind CSS (tokens utilitaires)
 - clsx (composition de classes)

**Structure**
```
tetrix-plus/
├── backend/           # API Node.js + Express
│   ├── prisma/        # Schéma DB et migrations
│   ├── src/
│   │   ├── config/    # Configuration (DB, env)
│   │   ├── middleware/ # Auth, validation, erreurs
│   │   ├── controllers/ # Logique des routes
│   │   ├── routes/    # Définition des endpoints
│   │   └── server.ts  # Point d'entrée
│   └── package.json
│
├── frontend/          # Application React
│   ├── src/
│   │   ├── contexts/  # AuthContext (gestion session)
│   │   ├── services/  # API services
│   │   ├── pages/     # Dashboards (Admin, Conseiller, Traducteur)
│   │   ├── types/     # Types TypeScript
│   │   └── App.tsx    # Routes et protection
│   └── package.json
│
└── package.json       # Workspace racine
```

---

## 🗄️ Modèle de données

### Entités principales

**Utilisateur**
- email, motDePasse (hash), role (ADMIN | CONSEILLER | TRADUCTEUR)
- Relation 1:1 avec Traducteur (si rôle = TRADUCTEUR)

**Traducteur**
- nom, division, domaines[], clientsHabituels[]
- capaciteHeuresParJour (float, défaut: 7.5)
- pairesLinguistiques[] (relation 1:N)

**PaireLinguistique**
- langueSource, langueCible (codes ISO: EN, FR, ES, IT, etc.)
- Contrainte unique : un traducteur ne peut avoir qu'une seule fois la même paire

**Client**
- nom, sousDomaines[]

**SousDomaine**
- nom, domaineParent (optionnel)

**Tache**
- description, heuresTotal (float), dateEcheance
- statut (PLANIFIEE | EN_COURS | TERMINEE)
- Relations : traducteur, client (optionnel), sousDomaine (optionnel), paireLinguistique
- ajustementsTemps[] (répartition des heures par jour)

**AjustementTemps**
- date, heures (float), type (TACHE | BLOCAGE)
- Représente soit une allocation d'heures de tâche, soit un blocage
- Contrainte : la somme des heures par jour ≤ capaciteHeuresParJour

---

## 🔐 Authentification et rôles

### Système JWT
- Token valide 24h
- Stocké dans localStorage côté frontend
- Envoyé dans header `Authorization: Bearer <token>`

### Rôles et permissions

**ADMIN**
- Tout accès
- Créer/modifier/désactiver traducteurs
- Gérer clients, sous-domaines, paires linguistiques
- Gérer utilisateurs et rôles

**CONSEILLER**
- Rechercher et filtrer traducteurs
- Voir plannings (individuel + global)
- Créer, modifier, supprimer tâches
- Créer blocages

**TRADUCTEUR**
- Voir son propre planning uniquement
- Créer/supprimer ses propres blocages
- Aucun accès aux tâches (lecture seule)

---

## 🚀 Installation et démarrage

### Prérequis
- Node.js 20+ et npm
- PostgreSQL 14+
- Git

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd tetrix-plus
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer le backend

Créer `backend/.env` à partir de `backend/.env.example` :
```bash
cd backend
cp .env.example .env
```

Éditer `backend/.env` :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tetrix_plus?schema=public"
JWT_SECRET="votre-secret-ultra-securise-unique"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. Créer la base de données

```bash
# Dans le dossier backend/
npx prisma migrate dev --name init
npx prisma generate
npm run prisma:seed
```

Cela crée toutes les tables et génère le client Prisma.

### 5. Vérifier données de seed

Le script `npm run prisma:seed` crée :
- 1 utilisateur ADMIN (`admin@tetrix.com` / mot de passe à changer)
- 1 utilisateur CONSEILLER (`conseiller@tetrix.com`)
- 1 traducteur démonstration + paires linguistiques (EN↔FR)
- 1 client + sous-domaines (`COMPLIANCE`, `REPORTING`)

Modifiez les mots de passe immédiatement en production.

### 6. (Optionnel) Créer un utilisateur admin manuel

Option A : Utiliser Prisma Studio
```bash
npx prisma studio
```
Accéder à `http://localhost:5555` et créer manuellement un utilisateur avec role = ADMIN.

Option B : Script SQL direct
```sql
-- Générer un hash bcrypt pour "password123" (à remplacer)
INSERT INTO utilisateurs (id, email, "motDePasse", role, actif)
VALUES (
  gen_random_uuid(),
  'admin@tetrix.com',
  '$2b$10$abcdefghijklmnopqrstuv...', -- hash de votre mot de passe
  'ADMIN',
  true
);
```

### 7. Démarrer le projet

En mode développement (racine du projet) :
```bash
npm run dev
```

Cela démarre :
- Backend sur `http://localhost:3001`
- Frontend sur `http://localhost:5173`

Ou démarrer séparément :
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 📡 API Endpoints

### Authentification
- `POST /api/auth/connexion` - Se connecter
- `POST /api/auth/inscription` - Créer un utilisateur (Admin)

### Traducteurs
- `GET /api/traducteurs` - Liste avec filtres (division, client, domaine, langues, actif)
- `GET /api/traducteurs/:id` - Détails d'un traducteur
- `POST /api/traducteurs` - Créer un traducteur (Admin)
- `PUT /api/traducteurs/:id` - Modifier un traducteur (Admin)
- `DELETE /api/traducteurs/:id` - Désactiver un traducteur (Admin)

### Paires linguistiques
- `POST /api/traducteurs/:traducteurId/paires-linguistiques` - Ajouter une paire (Admin)
- `DELETE /api/traducteurs/paires-linguistiques/:id` - Supprimer une paire (Admin)

### Clients et domaines
- `GET /api/clients` - Liste des clients
- `POST /api/clients` - Créer un client (Admin)
- `PUT /api/clients/:id` - Modifier un client (Admin)
- `GET /api/sous-domaines` - Liste des sous-domaines
- `POST /api/sous-domaines` - Créer un sous-domaine (Admin)
- `PUT /api/sous-domaines/:id` - Modifier un sous-domaine (Admin)

### Tâches
- `GET /api/taches` - Liste avec filtres (traducteurId, statut, dateDebut, dateFin)
- `GET /api/taches/:id` - Détails d'une tâche
- `POST /api/taches` - Créer une tâche avec répartition (Conseiller)
- `PUT /api/taches/:id` - Modifier une tâche (Conseiller)
- `DELETE /api/taches/:id` - Supprimer une tâche (Conseiller)

### Planning
- `GET /api/traducteurs/:traducteurId/planning?dateDebut=...&dateFin=...` - Planning individuel
- `GET /api/planning-global?dateDebut=...&dateFin=...&division=...` - Planning multi-traducteurs
- `POST /api/ajustements` - Créer un blocage
- `DELETE /api/ajustements/:id` - Supprimer un blocage

**Santé du serveur**
- `GET /health` - Vérifier que l'API fonctionne

---

## 🧪 Tests et validation

### Vérifier la connexion DB
```bash
cd backend
npx prisma studio
```

### Tester l'API avec curl
```bash
# Connexion
curl -X POST http://localhost:3001/api/auth/connexion \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tetrix.com","motDePasse":"password123"}'

# Récupérer les traducteurs (avec token)
curl http://localhost:3001/api/traducteurs \
  -H "Authorization: Bearer <votre-token>"
```

---

## 📦 Build et production

### Build du backend
```bash
cd backend
npm run build
npm start
```

### Build du frontend
```bash
cd frontend
npm run build
npm run preview
```

Les fichiers sont générés dans `frontend/dist/`.

---

## 🔧 Points d'attention

### Choix d'Agent 1 (Architecte)

1. **Format décimal strict** : Toutes les heures sont des `Float` (pas d'arrondis débiles)
2. **Sécurité** : JWT + bcrypt + validation Zod sur toutes les entrées
3. **Modèle flexible** : `AjustementTemps` unifié pour tâches ET blocages
4. **Contraintes DB** : Index sur les champs fréquemment filtrés
5. **Séparation claire** : Backend entièrement indépendant du frontend
6. **Évolutivité** : Structure prête pour ajouter exports, notifications, stats

### Ce qui reste à faire

**Agent 2 — UI Integrator** ✅ PARTIEL
- Thème visuel inspiré de https://github.com/snarky1980/echo-BT-CTD importé (couleurs, radius, structure)
- Design system de base : Button, Card, Input, Select, Modal, Layout
- Accessibilité initiale (focus visible, aria-labels, contraste)
- Code couleur disponibilité (vert / orange / rouge)
- Pages refactorisées avec composants réutilisables
- Reste à faire : calendrier interactif, grille réelle planning, notifications toast

**Agent 3 — Business Logic**
- Implémenter l'algorithme de répartition "Juste-à-temps" (JAT)
- Créer les validations de capacité journalière (blocage des surcharges)
- Implémenter la répartition manuelle + uniformément
- Créer les filtres multi-critères complexes
- Ajouter la logique de détail de journée (tâches + blocages)
- Calculer les disponibilités et appliquer les codes couleur

---

## 📚 Références

- **Spec fonctionnelle** : Version 1.2 (fournie)
- **Thème visuel** : https://github.com/snarky1980/echo-BT-CTD
- **Prisma Docs** : https://www.prisma.io/docs
- **Express.js** : https://expressjs.com/
- **React Router** : https://reactrouter.com/

---

## 🤝 Pipeline de travail

**Agent 1 (Architecte)** ✅ TERMINÉ
- Structure projet, DB, backend API, authentification, routes de base
- Routes protégées par rôle
- Frontend : structure, services API, contexte auth, pages squelettes

**Agent 2 (UI Integrator)** ⚙️ EN PROGRÈS
- Design tokens + composants de base implémentés
- Pas de logique métier ajoutée
- Prochaine étape : vues dynamiques (calendrier, grille planning), éventuel système de notifications

**Agent 3 (Business Logic)** ⏳ EN ATTENTE
## 🎨 Design System (Agent 2)

### Fichiers clés
- `frontend/src/index.css` : Variables CSS & directives Tailwind
- `frontend/tailwind.config.js` : Extension couleurs/radius
- `frontend/src/components/ui/*` : Composants UI réutilisables (sans logique métier)
- `frontend/src/components/layout/AppLayout.tsx` : En-tête + pied de page cohérents

### Couleurs
| Rôle | Valeur |
|------|--------|
| Fond | `#fefbe8` |
| Texte principal | `#2c3d50` |
| Secondaire / Accent | `#aca868` |
| Muted | `#e0f2fe` |
| Libre | `#16a34a` |
| Presque plein | `#ea580c` |
| Plein / surcharge | `#dc2626` |

### Composants
- **Button** (`variant`: primaire, secondaire, outline, ghost, danger)
- **Card** (Header, Title, Content)
- **Input / Select** (champs formulaires de base)
- **Modal** (dialog accessible, fermeture ESC / backdrop)
- **AppLayout** (structure de l'application, header + footer)

### Accessibilité
- Focus visible (outline + ring)
- Aria-labels sur actions isolées
- Contrastes élevés (texte foncé sur fond très clair)

### Personnalisation
Modifier les variables dans `:root` (`index.css`). Ajouter toute nouvelle couleur dans `tailwind.config.js` sous `theme.extend.colors` pour bénéficier des utilitaires.

### Extensions futures proposées
- Système de toast (succès/erreur/info)
- Badge statut tâche (PLANIFIÉE / EN COURS / TERMINÉE)
- Composant calendrier interactif (drag & drop JAT ou manuel) – logique Agent 3

- Répartition automatique (JAT)
- Validations métier
- Filtres complexes
- Ne PAS toucher au thème visuel ni à la structure

---

## 👤 Contact et support

Pour questions ou problèmes techniques, consulter :
- README de chaque agent
- Documentation inline dans le code
- Spec fonctionnelle V1.2

---

**Agent 1 — Mission accomplie** ✅  
Architecture solide, backend complet, authentification sécurisée, API RESTful prête.  
Prochaine étape : Agent 2 pour la beauté visuelle.
