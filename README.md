# Tetrix PLUS - Système de Gestion de Traduction Gouvernementale

> **Plateforme complète de gestion de planification, de répartition des tâches de traduction et de coordination des équipes linguistiques**. Conçue pour les services de traduction gouvernementaux avec algorithmes de distribution intelligents (JAT, PEPS, Équilibré, Manuel), système de liaison traducteur-réviseur, détection de conflits et tableaux de bord analytiques avancés.

[![Frontend Deploy](https://img.shields.io/badge/Frontend-GitHub%20Pages-blue)](https://snarky1980.github.io/tetrix-plus-prototype/)
[![Backend Deploy](https://img.shields.io/badge/Backend-Render-green)](https://tetrix-plus-backend.onrender.com/api)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](./DEPLOYMENT.md)
[![Version](https://img.shields.io/badge/Version-2.3.0-purple)](./CHANGELOG.md)

---

## 📋 Vue d'ensemble

**Version** : 2.3.0 (Production)  
**Statut** : ✅ Production Ready  
**Dernière mise à jour** : Décembre 2024

Tetrix PLUS est une application web complète de gestion de planification et de coordination des tâches de traduction, conçue pour les services linguistiques gouvernementaux et les grandes équipes de traduction.

### 🎯 Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **4 Rôles utilisateurs** | Admin, Gestionnaire, Conseiller, Traducteur - chacun avec permissions granulaires |
| **4 Modes de distribution** | JAT (Just-in-Time), PEPS (Premier Entré Premier Sorti), Équilibré, Manuel |
| **12 Divisions** | CISR, Droit, ESB, IMMI, PAT, PMO, RH, STI, TRAD, et autres |
| **Système de liaisons** | Association traducteur-réviseur (TR01/TR02/TR03) avec vérification de disponibilité |
| **Détection de conflits** | 5 types de conflits détectés avec suggestions de résolution |
| **Tableaux de bord** | Tetrix MAX (analytique) et Tetrix Orion (statistiques avancées) |
| **Demandes de ressources** | Système de notification conseiller ↔ traducteur pour recherche de disponibilité |
| **Gestion des jours fériés** | Calendrier intégré des jours fériés canadiens |
| **Multi-divisions** | Traducteurs peuvent appartenir à plusieurs divisions |

### 🏛️ Contexte d'utilisation

L'application est conçue pour gérer :
- **~120+ traducteurs** répartis dans 12 divisions
- **Paires linguistiques multiples** (EN→FR, FR→EN, et autres)
- **Types de tâches variés** : Traduction, Révision, Relecture, Encadrement
- **Niveaux de priorité** : Régulier, Urgent, Critique
- **Classifications** : AS-01 à AS-05, EC-03, PM-03, PM-04, PM-05, etc.

### 📑 Documentation complète
- [Index de la documentation](./DOCUMENTATION-INDEX.md) - Vue d'ensemble de toute la documentation
- [Guide de démarrage rapide](./DEMARRAGE-RAPIDE.md) - Pour commencer en 5 minutes
- [Architecture détaillée](./ARCHITECTURE.txt) - Vue technique complète
- [Changelog](./CHANGELOG.md) - Historique des versions
- [Audit Performance & Accessibilité](./AUDIT-PERF-ACCESSIBILITE.md) - Rapports détaillés

---

## 🏗️ Architecture Technique

### Stack Technique

**Backend (API REST)**
| Technologie | Version | Rôle |
|-------------|---------|------|
| Node.js | 20+ | Runtime JavaScript |
| Express | 4.18 | Framework HTTP |
| TypeScript | 5.3 | Typage statique |
| PostgreSQL | 14+ | Base de données relationnelle |
| Prisma | 5.7 | ORM et migrations |
| JWT | 9.0 | Authentification stateless |
| Zod | 3.22 | Validation des schémas |
| Bcrypt | 5.1 | Hashage des mots de passe |

**Frontend (SPA React)**
| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 18.2 | Framework UI |
| TypeScript | 5.3 | Typage statique |
| Vite | 5.0 | Build tool |
| React Router | 6.20 | Navigation SPA |
| Axios | 1.6 | Client HTTP |
| Tailwind CSS | 3.4 | Styling utilitaire |
| date-fns | 3.0 | Manipulation de dates |
| date-fns-tz | 3.0 | Gestion timezone Ottawa |

**Design System (echo-BT-CTD)**
| Élément | Valeur |
|---------|--------|
| Couleur principale | Navy (#2c3d50) |
| Couleur accent | Sage (#aca868) |
| Couleur succès | Teal (#059669) |
| Police | Inter |
| Border radius | 12px |
| Thème | Clair avec accents colorés |

### Déploiement Production

| Service | Plateforme | URL |
|---------|------------|-----|
| **Frontend** | GitHub Pages | https://snarky1980.github.io/tetrix-plus-prototype/ |
| **Backend** | Render.com | https://tetrix-plus-backend.onrender.com/api |
| **Base de données** | Render PostgreSQL | PostgreSQL managée |

### Structure du Projet

```
tetrix-plus-prototype/
├── frontend/                         # Application React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # 15+ composants réutilisables (Button, Modal, Toast, etc.)
│   │   │   ├── admin/                # Gestion utilisateurs, clients, domaines
│   │   │   ├── layout/               # AppLayout avec navigation adaptative
│   │   │   ├── liaisons/             # Gestion liaisons traducteur-réviseur
│   │   │   ├── notifications/        # Demandes de ressources
│   │   │   ├── planification/        # Composants de planning
│   │   │   ├── taches/               # Création et édition de tâches
│   │   │   ├── tetrixmax/            # Tableaux de bord analytiques
│   │   │   ├── orion/                # Statistiques avancées
│   │   │   ├── historique/           # Traçabilité des modifications
│   │   │   └── jours-feries/         # Gestion des jours fériés
│   │   ├── contexts/                 # AuthContext, ToastContext, NotificationContext
│   │   ├── hooks/                    # usePlanning, useAutoRefresh, useDebounce, etc.
│   │   ├── pages/                    # 11 pages principales
│   │   ├── services/                 # 12+ services API
│   │   ├── types/                    # Types TypeScript partagés
│   │   └── utils/                    # Utilitaires (dates Ottawa, formatters)
│   └── package.json
│
├── backend/                          # API REST Node.js
│   ├── src/
│   │   ├── config/                   # database.ts, env.ts (CORS, JWT)
│   │   ├── middleware/               # auth, validation, error handling
│   │   ├── controllers/              # 12+ controllers
│   │   ├── services/                 # 14 services métier
│   │   │   ├── repartitionService.ts # Algorithmes JAT, PEPS, Équilibré, Manuel
│   │   │   ├── capaciteService.ts    # Calcul de capacité
│   │   │   ├── conflictDetectionService.ts # Détection de conflits
│   │   │   ├── liaisonReviseurService.ts   # Liaisons TR-réviseur
│   │   │   ├── tetrixMaxService.ts   # Analytics
│   │   │   └── orionStatService.ts   # Statistiques avancées
│   │   ├── routes/                   # 18 fichiers de routes
│   │   └── validation/               # Schémas Zod
│   ├── prisma/
│   │   ├── schema.prisma             # 15+ modèles de données
│   │   ├── migrations/               # Historique des migrations
│   │   └── scripts/                  # Scripts utilitaires
│   ├── tests/                        # 236+ tests unitaires
│   └── package.json
│
├── docs/                             # Documentation détaillée
│   ├── guides/                       # Guides utilisateurs
│   ├── deploiement/                  # Instructions de déploiement
│   └── archive/                      # Documentation archivée
│
└── Configuration racine
    ├── package.json                  # Workspace npm
    ├── render.yaml                   # Infrastructure as Code (Render)
    └── Procfile                      # Configuration production
```

---

## 👥 Comptes de test

| Email | Mot de passe | Rôle | Dashboard |
|-------|-------------|------|-----------|
| `admin@tetrix.com` | password123 | Administrateur | /dashboard-admin |
| `gestionnaire@tetrix.com` | password123 | Gestionnaire | /dashboard-gestionnaire |
| `conseiller@tetrix.com` | password123 | Conseiller | /dashboard-conseiller |
| `traducteur@tetrix.com` | password123 | Traducteur | /dashboard-traducteur |

> 💡 **Note** : En plus des comptes génériques ci-dessus, la base de données contient ~120 comptes traducteurs individuels pseudonymisés.

---

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

# Installation complète (frontend + backend)
npm install

# Démarrer les deux serveurs
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

---

## 📊 Fonctionnalités détaillées par rôle

### 👑 Administrateur (ADMIN)

L'administrateur a accès complet au système :

**Gestion des utilisateurs** (`/dashboard-admin` → Utilisateurs)
- Créer/modifier/désactiver des comptes utilisateurs
- Assigner les rôles (Admin, Gestionnaire, Conseiller, Traducteur)
- Gérer les accès aux divisions (lecture/écriture/gestion)
- Associer les utilisateurs aux profils traducteurs

**Gestion des traducteurs** (`/dashboard-admin` → Traducteurs)
- Créer et modifier les profils traducteurs
- Définir la capacité heures/jour (défaut: 7.5h)
- Gérer les paires linguistiques (EN→FR, FR→EN, etc.)
- Configurer les domaines de spécialisation
- Assigner les classifications (AS-01, EC-03, PM-04, etc.)
- Définir la catégorie (TR01/TR02/TR03)

**Gestion des clients et domaines** (`/dashboard-admin` → Clients)
- Créer/modifier des clients
- Organiser les sous-domaines par client
- Configurer les 12 divisions (CISR, Droit, ESB, IMMI, etc.)

**Statistiques globales**
- Métriques de capacité en temps réel
- Visualisation des taux d'occupation
- Rapports d'activité par division

### 📋 Gestionnaire (GESTIONNAIRE)

Le gestionnaire supervise la planification :

**Vue d'ensemble** (`/dashboard-gestionnaire`)
- Statistiques de capacité par division
- Traducteurs disponibles et en surcharge
- Métriques clés (taux d'occupation, heures planifiées)

**Planification globale** (`/planning-global`)
- Vue 7/14/30 jours de tous les traducteurs
- Filtres avancés (division, client, classification, langue)
- Code couleur de capacité (🟢 libre, 🟠 presque plein, 🔴 plein)

**Accès en lecture/écriture aux divisions assignées**

### 📝 Conseiller (CONSEILLER)

Le conseiller gère les tâches au quotidien :

**Tableau de bord** (`/dashboard-conseiller`)
- Vue synthétique des traducteurs actifs
- Tâches en cours et à venir
- Demandes de ressources actives
- Traducteurs disponibles (🟢 cherchent du travail)

**Création de tâches** (`/taches/creation`)

1. **Étape 1 - Configuration**
   - Sélection du traducteur (avec filtres avancés)
   - Numéro de projet
   - Nombre d'heures total et compte de mots
   - Date et heure d'échéance précises
   - Type de tâche (Traduction, Révision, Relecture, Encadrement)
   - Priorité (Régulier, Urgent, Critique)
   - Client et domaine (optionnels)
   - Paire linguistique

2. **Étape 2 - Mode de distribution**
   - **JAT (Just-in-Time)** : Distribution à rebours depuis l'échéance
   - **PEPS (Premier Entré Premier Sorti)** : Remplissage jour par jour
   - **Équilibré** : Distribution uniforme sur la période
   - **Manuel** : Heures personnalisées par jour avec suggestions

3. **Étape 3 - Prévisualisation et validation**
   - Visualisation de la répartition proposée
   - Détection des conflits (surcharges, blocages)
   - Ajustements possibles avant validation

**Gestion des liaisons** (`/liaisons`)
- Associer traducteurs (TR01/TR02) à leurs réviseurs (TR03)
- Définir réviseur principal vs secondaire
- Vérifier disponibilité combinée traducteur + réviseur
- Notes et gestion des liaisons

**Demandes de ressources**
- Créer des annonces de recherche de traducteur
- Filtrer par langue, division, urgence
- Recevoir les disponibilités des traducteurs

**Planification globale**
- Toutes les fonctionnalités de visualisation
- Création de blocages pour les traducteurs
- Modification et suppression de tâches

### 🖊️ Traducteur (TRADUCTEUR)

Le traducteur consulte son planning personnel :

**Tableau de bord personnel** (`/dashboard-traducteur`)
- Vue 7 jours de son planning
- Tâches assignées avec détails (heures, projet, échéance)
- Capacité restante par jour
- Statistiques personnelles

**Gestion de disponibilité**
- Activer/désactiver "Disponible pour du travail" (🟢)
- Ajouter un commentaire de disponibilité
- Voir les demandes de ressources des conseillers correspondant au profil

**Blocages personnels**
- Créer des blocages (congés, réunions, formations)
- Visualiser l'impact sur la capacité
- Supprimer ses propres blocages

---

## 🔄 Modes de Distribution des Heures

Tetrix PLUS offre 4 modes de distribution pour répartir les heures d'une tâche :

### 1. JAT (Just-in-Time) - Par défaut

**Principe** : Distribution à rebours depuis l'échéance, en remplissant la capacité quotidienne au maximum.

```
Tâche : 35h, échéance vendredi 17h, capacité 7.5h/jour

Distribution :
Vendredi : 3.5h (jusqu'à 17h, heure d'échéance)
Jeudi    : 7.5h (capacité max)
Mercredi : 7.5h (capacité max)
Mardi    : 7.5h (capacité max)
Lundi    : 9.0h ❌ Dépassement → Erreur
```

**Avantages** : Maximise la flexibilité jusqu'au dernier moment, respecte les échéances précises.

### 2. PEPS (Premier Entré Premier Sorti)

**Principe** : Remplissage séquentiel jour par jour depuis aujourd'hui.

```
Tâche : 20h, capacité 7.5h/jour

Distribution :
Lundi    : 7.5h (plein)
Mardi    : 7.5h (plein)
Mercredi : 5.0h (reste)
```

**Avantages** : Prévisible, commence immédiatement, libère les jours suivants.

### 3. Équilibré

**Principe** : Distribution uniforme sur tous les jours disponibles.

```
Tâche : 20h sur 5 jours, capacité 7.5h/jour

Distribution :
Lundi    : 4.0h
Mardi    : 4.0h
Mercredi : 4.0h
Jeudi    : 4.0h
Vendredi : 4.0h
```

**Avantages** : Charge de travail constante, prévisibilité maximale.

### 4. Manuel

**Principe** : Choix libre des heures par jour avec suggestions intelligentes.

**Fonctionnalités** :
- Suggestions automatiques (PEPS par défaut)
- Validation en temps réel (respect capacité)
- Heures de début et fin personnalisables
- Ajustement à la volée

---

## 🔗 Système de Liaison Traducteur-Réviseur

### Catégories de traducteurs

| Catégorie | Niveau | Révision requise |
|-----------|--------|------------------|
| **TR01** | Junior | Toujours révisé |
| **TR02** | Intermédiaire | Révision optionnelle (configurable) |
| **TR03** | Senior / Réviseur | Peut réviser les autres |

### Fonctionnalités de liaison

- **Association flexible** : Un traducteur peut avoir plusieurs réviseurs
- **Priorité** : Réviseur principal vs secondaire
- **Modes** : Attitré (permanent) ou Ponctuel (temporaire)
- **Vérification de disponibilité** : Analyse combinée traducteur + réviseur
- **Calcul d'échéance** : Temps traduction + temps révision

### Vérification automatique

Lors de la création d'une tâche pour un TR01/TR02 :
1. Le système identifie les réviseurs associés
2. Vérifie leur disponibilité sur la période
3. Calcule si l'échéance est atteignable (traduction + révision)
4. Suggère des réviseurs alternatifs si besoin
5. Affiche des alertes si risque de dépassement

---

## 🚨 Système de Détection de Conflits

### 5 Types de conflits détectés

| Type | Description | Impact |
|------|-------------|--------|
| `CHEVAUCHEMENT_BLOCAGE` | L'allocation chevauche un blocage existant | Heures non planifiables |
| `DEPASSEMENT_CAPACITE` | Heures totales > capacité journalière | Surcharge |
| `HORS_HORAIRE` | Allocation hors des heures de travail | Non réalisable |
| `EMPIETE_PAUSE` | Allocation chevauche la pause déjeuner (12h-13h) | Erreur de planification |
| `ECHEANCE_IMPOSSIBLE` | Impossible de terminer avant l'échéance | Risque de retard |

### Suggestions de résolution

| Type | Description |
|------|-------------|
| `REPARATION_LOCALE` | Déplacer sur d'autres plages (même traducteur) |
| `REATTRIBUTION` | Réassigner à un autre traducteur (jusqu'à 5 candidats) |
| `IMPOSSIBLE` | Aucune solution automatique disponible |

### Score d'impact (0-100)

- **FAIBLE** (0-30) : Ajustements mineurs
- **MODERE** (31-60) : Réorganisation nécessaire
- **ELEVE** (61-100) : Intervention urgente requise

---

## 📈 Tableaux de Bord Analytiques

### Tetrix MAX

Tableau de bord unifié avec métriques clés :

- **Capacité globale** : Heures disponibles vs planifiées
- **Taux d'occupation** : Par traducteur, division, période
- **Alertes** : Surcharges, sous-utilisation, échéances à risque
- **Tendances** : Évolution de la charge de travail

### Tetrix Orion

Statistiques avancées et analyses prédictives :

- **Résumé exécutif** : État général du planning
- **Indicateurs clés** (KPIs) : Performance de l'équipe
- **Diagnostic complet** : Forces et faiblesses
- **Recommandations** : Actions suggérées
- **Projections** : Prévisions de charge

---

## 📡 API REST - Endpoints principaux

### Authentification
```
POST   /api/auth/login          # Connexion
POST   /api/auth/logout         # Déconnexion
GET    /api/auth/me             # Utilisateur courant
```

### Traducteurs
```
GET    /api/traducteurs                              # Liste avec filtres
POST   /api/traducteurs                              # Créer (Admin)
GET    /api/traducteurs/:id                          # Détails
PUT    /api/traducteurs/:id                          # Modifier
PATCH  /api/traducteurs/:id/disponibilite            # Mettre à jour disponibilité
DELETE /api/traducteurs/:id                          # Désactiver
```

### Tâches
```
GET    /api/taches                                   # Liste avec filtres
POST   /api/taches                                   # Créer
GET    /api/taches/:id                               # Détails
PUT    /api/taches/:id                               # Modifier
DELETE /api/taches/:id                               # Supprimer
GET    /api/taches/:id/historique                    # Historique des modifications
```

### Planning
```
GET    /api/planning/:traducteurId                   # Planning individuel
GET    /api/planning-global                          # Planning multi-traducteurs
POST   /api/blocages                                 # Créer un blocage
DELETE /api/blocages/:id                             # Supprimer un blocage
```

### Répartition
```
POST   /api/repartition/calculer                     # Calculer distribution JAT/PEPS/Équilibré
POST   /api/repartition/suggerer-heures              # Suggestions mode manuel
POST   /api/repartition/valider-manuel               # Valider répartition manuelle
```

### Liaisons
```
GET    /api/liaisons                                 # Liste des liaisons
POST   /api/liaisons                                 # Créer une liaison
PUT    /api/liaisons/:id                             # Modifier
DELETE /api/liaisons/:id                             # Supprimer
POST   /api/liaisons/verifier-disponibilite          # Vérifier disponibilité combinée
```

### Conflits
```
POST   /api/conflicts/detect/allocation/:id          # Détecter conflits d'une allocation
POST   /api/conflicts/suggest                        # Générer suggestions de résolution
GET    /api/conflicts/allocation/:id/full            # Analyse complète
```

### Notifications / Demandes de ressources
```
GET    /api/notifications/demandes-ressources        # Liste des demandes
POST   /api/notifications/demandes-ressources        # Créer une demande
PUT    /api/notifications/demandes-ressources/:id    # Fermer/modifier
GET    /api/notifications/traducteurs-disponibles    # Liste traducteurs disponibles
GET    /api/notifications/compteurs                  # Compteurs pour badges
```

### Statistiques
```
GET    /api/statistiques/productivite                # Stats de productivité
GET    /api/statistiques/tetrix-max                  # Rapport Tetrix MAX
GET    /api/statistiques/orion                       # Rapport Tetrix Orion
```

### Administration
```
GET    /api/utilisateurs                             # Liste utilisateurs
POST   /api/utilisateurs                             # Créer
PUT    /api/utilisateurs/:id                         # Modifier
GET    /api/divisions                                # Liste divisions
POST   /api/division-access                          # Gérer accès divisions
GET    /api/clients                                  # Liste clients
GET    /api/sous-domaines                            # Liste sous-domaines
GET    /api/jours-feries                             # Jours fériés
```

---

## 🔐 Sécurité

### Authentification JWT
- Tokens stateless, validité 24h
- Stockage localStorage (côté client)
- Header `Authorization: Bearer <token>`

### Protection des mots de passe
- Hashage Bcrypt avec salt (10 rounds)
- Validation Zod côté serveur

### Contrôle d'accès (RBAC)
- 4 rôles avec permissions granulaires
- Middleware de vérification par route
- Accès aux divisions configurable par utilisateur

### CORS
- Configuré pour les domaines de production
- Support localhost en mode développement

---

## 🗄️ Modèle de Données (Prisma)

### Entités principales

```
Utilisateur (1:1) ──► Traducteur (1:N) ──► PaireLinguistique
     │                     │
     │                     │ (N:N via LiaisonReviseur)
     │                     │
     │                     ├──► Tache (1:N) ──► AjustementTemps
     │                     │        │
     │                     │        └──► HistoriqueTache
     │                     │
     │                     └──► LiaisonReviseur (reviseur/révisé)
     │
     └──► DivisionAccess ──► Division

Client ◄── Tache ──► SousDomaine
```

### Enums
```prisma
enum Role { ADMIN, GESTIONNAIRE, CONSEILLER, TRADUCTEUR }
enum StatutTache { PLANIFIEE, EN_COURS, TERMINEE }
enum TypeTache { TRADUCTION, REVISION, RELECTURE, ENCADREMENT, AUTRE }
enum ModeDistribution { JAT, PEPS, EQUILIBRE, MANUEL }
enum TypeAjustement { TACHE, BLOCAGE }
enum CategorieTraducteur { TR01, TR02, TR03 }
enum Urgence { FAIBLE, NORMALE, HAUTE, CRITIQUE }
```

---

## 🧪 Tests

### Exécuter les tests
```bash
cd backend
npm test              # Tous les tests
npm run test:watch    # Mode watch
npm run test:coverage # Avec couverture
```

### Couverture actuelle
- **236+ tests unitaires**
- Services métier : >80% couverture
- Controllers : Tests d'intégration
- Algorithmes de distribution : 100% couverture

### Inspecter la base de données
```bash
cd backend
npx prisma studio    # Interface web sur http://localhost:5555
```

---

## 📦 Build et Déploiement

### Build local

```bash
# Frontend
cd frontend
npm run build    # → dist/

# Backend
cd backend
npm run build    # → dist/
```

### Déploiement automatique

**Frontend (GitHub Pages)**
- Déclenché automatiquement à chaque push sur `main`
- Workflow : `.github/workflows/deploy-frontend.yml`
- URL : https://snarky1980.github.io/tetrix-plus-prototype/

**Backend (Render)**
- Connecté au repository GitHub
- Variables d'environnement sur Render Dashboard
- URL : https://tetrix-plus-backend.onrender.com/api

### Variables d'environnement Render

```
DATABASE_URL=postgresql://...
JWT_SECRET=<clé-secrète>
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://snarky1980.github.io
```

---

## 🚧 Dépannage

### Frontend

| Problème | Solution |
|----------|----------|
| Page blanche | Vider le cache (`Ctrl+Shift+Delete`), redémarrer `npm run dev` |
| Token invalide | `localStorage.clear()`, vérifier JWT_SECRET |
| Styles manquants | Hard refresh (`Ctrl+Shift+R`), vérifier `postcss.config.cjs` |

### Backend

| Problème | Solution |
|----------|----------|
| Erreur DB | `npx prisma migrate reset && npm run prisma:seed` |
| Port utilisé | `lsof -i :3001` puis `kill -9 <PID>` |
| Seed échoue | Vérifier DATABASE_URL, PostgreSQL en cours |

### Déploiement

| Problème | Solution |
|----------|----------|
| Frontend pas à jour | Vérifier GitHub Actions, forcer redeploy |
| Backend crashe | Consulter logs Render, vérifier env vars |

---

## 📚 Ressources

### Documentation interne
- [Index Documentation](./DOCUMENTATION-INDEX.md)
- [Guide Démarrage Rapide](./DEMARRAGE-RAPIDE.md)
- [Changelog](./CHANGELOG.md)
- [Architecture](./ARCHITECTURE.txt)
- [Sécurité](./SECURITY-SUMMARY.md)

### Documentation technique (docs/)
- [Modes de Distribution](./docs/MODES-DISTRIBUTION-GUIDE.md)
- [Mode Manuel](./docs/MODE-MANUEL-GUIDE.md)
- [Jours Fériés](./docs/JOURS-FERIES-INTEGRATION.md)
- [Détection Conflits](./docs/guides/DETECTION-CONFLITS-GUIDE.md)

### Technologies de référence
- **React** : https://react.dev
- **Express.js** : https://expressjs.com
- **Prisma** : https://www.prisma.io
- **Tailwind CSS** : https://tailwindcss.com
- **date-fns** : https://date-fns.org

---

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

---

## ✅ État du Projet

| Phase | Statut | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ | Architecture, Backend API, Authentification |
| **Phase 2** | ✅ | Design system, Composants UI, Accessibilité |
| **Phase 3** | ✅ | Algorithmes JAT/PEPS/Équilibré/Manuel |
| **Phase 4** | ✅ | Toast, Validation formulaires, Animations |
| **Phase 5** | ✅ | Détection de conflits, Suggestions résolution |
| **Phase 6** | ✅ | Liaisons traducteur-réviseur |
| **Phase 7** | ✅ | Multi-divisions, Demandes de ressources |
| **Production** | 🟢 | **READY** - Tous les critères validés |

---

**Tetrix PLUS** — Planification intelligente pour les services de traduction gouvernementaux 🚀

*Dernière mise à jour : Décembre 2024*
