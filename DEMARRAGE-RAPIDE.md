# 🚀 Démarrage rapide Tetrix PLUS

## Installation en 5 minutes

### 1. Prérequis
- Node.js 20+ : https://nodejs.org/
- PostgreSQL 14+ : https://www.postgresql.org/
- Git

### 2. Cloner et installer
```bash
git clone <url-du-repo>
cd tetrix-plus
npm install
```

### 3. Configurer la base de données

**Créer la base de données PostgreSQL** :
```sql
CREATE DATABASE tetrix_plus;
```

**Éditer `backend/.env`** :
```bash
cd backend
cp .env.example .env
```

Modifier :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tetrix_plus?schema=public"
JWT_SECRET="changez-moi-par-une-cle-secrete-unique"
```

**Exécuter les migrations** :
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Créer un utilisateur admin

**Option A : Prisma Studio (recommandé)**
```bash
npx prisma studio
```
- Ouvrir http://localhost:5555
- Aller dans la table `utilisateurs`
- Créer un enregistrement :
  - email: `admin@tetrix.com`
  - motDePasse: Générer un hash bcrypt (voir ci-dessous)
  - role: `ADMIN`
  - actif: `true`

**Générer un hash bcrypt** :
```bash
node -e "console.log(require('bcrypt').hashSync('VotreMotDePasse123', 10))"
```

**Option B : SQL direct**
```sql
-- Remplacer le hash par celui généré ci-dessus
INSERT INTO utilisateurs (id, email, "motDePasse", role, actif, "creeLe", "modifieLe")
VALUES (
  gen_random_uuid(),
  'admin@tetrix.com',
  '$2b$10$...',  -- Votre hash bcrypt ici
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

### 5. Démarrer l'application

**En mode développement** :
```bash
npm run dev
```

Cela démarre :
- ✅ Backend API sur http://localhost:3001
- ✅ Frontend React sur http://localhost:5173

**Ou séparément** :
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

### 6. Se connecter

Ouvrir http://localhost:5173 et se connecter avec :
- Email : `admin@tetrix.com`
- Mot de passe : celui que vous avez utilisé pour générer le hash

---

## Commandes utiles

### Backend

```bash
cd backend

# Démarrer en mode dev
npm run dev

# Build pour production
npm run build
npm start

# Prisma Studio (interface DB)
npx prisma studio

# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Générer le client après modif schema
npx prisma generate
```

### Frontend

```bash
cd frontend

# Démarrer en mode dev
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

### Workspace (racine)

```bash
# Démarrer backend + frontend
npm run dev

# Build tout
npm run build
```

---

## Tester l'API

### Connexion
```bash
curl -X POST http://localhost:3001/api/auth/connexion \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tetrix.com",
    "motDePasse": "VotreMotDePasse123"
  }'
```

Retourne un token JWT. Copiez-le.

### Récupérer les traducteurs
```bash
curl http://localhost:3001/api/traducteurs \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

### Vérifier la santé du serveur
```bash
curl http://localhost:3001/health
```

---

## Résolution de problèmes

### Erreur "Cannot find module 'express'"
```bash
npm install
```

### Erreur Prisma "Cannot find Prisma Client"
```bash
cd backend
npx prisma generate
```

### Erreur "DATABASE_URL not found"
Vérifiez que `backend/.env` existe et contient `DATABASE_URL`.

### Port 3001 déjà utilisé
Changez `PORT=3001` dans `backend/.env` à un autre port.

### Port 5173 déjà utilisé
Modifiez `server.port` dans `frontend/vite.config.ts`.

---

## Structure du projet

```
tetrix-plus/
├── backend/           # API Node.js + Express + Prisma
├── frontend/          # React + TypeScript + Vite
├── README.md          # Documentation complète
├── AGENT-1-RAPPORT.md # Rapport Agent 1
├── AGENT-2-INSTRUCTIONS.md  # Pour UI Integrator
└── AGENT-3-INSTRUCTIONS.md  # Pour Business Logic
```

---

## Prochaines étapes

1. **Agent 2 (UI Integrator)** : Créer le design visuel complet
2. **Agent 3 (Business Logic)** : Implémenter répartition JAT et validations
3. **Tests** : Ajouter tests unitaires et e2e
4. **Déploiement** : Préparer pour production

---

## Support

- 📖 Documentation complète : `README.md`
- 🏗️ Rapport Agent 1 : `AGENT-1-RAPPORT.md`
- 🔧 Code commenté inline

**Tout est prêt pour les agents suivants !** ✅
