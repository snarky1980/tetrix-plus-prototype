# Tetrix PLUS

Système de gestion de planification pour services de traduction gouvernementaux.

**Production** : [tetrix-plus-prototype](https://snarky1980.github.io/tetrix-plus-prototype/)

---

## Fonctionnalités

- **Distribution intelligente** : JAT (just-in-time), PEPS, Équilibré, Manuel
- **Liaisons traducteur-réviseur** : Catégories TR01/TR02/TR03, vérification de disponibilité combinée
- **Détection de conflits** : Surcharges, chevauchements, échéances impossibles
- **Multi-divisions** : 12 divisions, accès granulaires
- **Notifications temps réel** : Demandes de ressources, traducteurs disponibles

---

## Stack technique

| Couche | Technologies |
|--------|--------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js 20, Express, TypeScript, Prisma |
| Base de données | PostgreSQL 14+ |
| Auth | JWT, Bcrypt |

---

## Démarrage rapide

```bash
# Installation
git clone https://github.com/snarky1980/tetrix-plus-prototype.git
cd tetrix-plus-prototype
npm install

# Configuration backend
cp backend/.env.example backend/.env
# Éditer backend/.env avec DATABASE_URL et JWT_SECRET

# Base de données
cd backend
npx prisma migrate dev
npm run prisma:seed

# Démarrage
cd ..
npm run dev
```

**Frontend** : http://localhost:5173  
**Backend** : http://localhost:3001

---

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@tetrix.com | password123 |
| Gestionnaire | gestionnaire@tetrix.com | password123 |
| Conseiller | conseiller@tetrix.com | password123 |
| Traducteur | traducteur@tetrix.com | password123 |

---

## Structure

```
tetrix-plus-prototype/
├── frontend/          # React SPA
│   └── src/
│       ├── components/   # UI, layouts, fonctionnalités
│       ├── hooks/        # Logique réutilisable
│       ├── services/     # Appels API
│       └── pages/        # Routes principales
├── backend/           # API REST
│   └── src/
│       ├── controllers/  # Handlers HTTP
│       ├── services/     # Logique métier
│       └── routes/       # Définition des routes
└── docs/              # Documentation technique
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [DEMARRAGE-RAPIDE.md](DEMARRAGE-RAPIDE.md) | Guide d'installation complet |
| [ARCHITECTURE.txt](ARCHITECTURE.txt) | Vue technique détaillée |
| [CHANGELOG.md](CHANGELOG.md) | Historique des versions |
| [docs/MODES-DISTRIBUTION-GUIDE.md](docs/MODES-DISTRIBUTION-GUIDE.md) | Algorithmes JAT, PEPS, Équilibré, Manuel |

---

## API (extraits)

```
POST   /api/auth/login                    # Authentification
GET    /api/traducteurs                   # Liste des traducteurs
POST   /api/taches                        # Créer une tâche
GET    /api/planning-global               # Planning multi-traducteurs
POST   /api/repartition/calculer          # Distribution des heures
POST   /api/conflicts/detect/allocation/:id   # Détection de conflits
```

Documentation complète : [backend/docs/README.md](backend/docs/README.md)

---

## Déploiement

| Service | Plateforme | URL |
|---------|------------|-----|
| Frontend | GitHub Pages | [Production](https://snarky1980.github.io/tetrix-plus-prototype/) |
| Backend | Render | https://tetrix-plus-backend.onrender.com/api |
| BDD | Render PostgreSQL | Managée |

---

## Tests

```bash
cd backend
npm test              # Exécuter les tests
npm run test:coverage # Avec couverture
npx prisma studio     # Explorer la BDD
```

---

## Licence

MIT
