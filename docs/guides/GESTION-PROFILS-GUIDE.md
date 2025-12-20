# Gestion des Profils et Contrôle d'Accès par Division

## Vue d'ensemble

Ce système permet aux administrateurs de gérer finement les accès des utilisateurs (conseillers et gestionnaires) aux différentes divisions de l'organisation.

## Fonctionnalités

### 1. Gestion des Divisions

- **Créer des divisions** : Définir de nouvelles divisions avec nom, code unique et description
- **Modifier des divisions** : Mettre à jour les informations d'une division
- **Activer/désactiver** : Contrôler la disponibilité d'une division
- **Supprimer** : Retirer une division (si aucun traducteur n'y est attaché)

**Divisions par défaut** :
- `DROIT` : Division spécialisée en traduction juridique
- `SCITECH` : Division Science et Technologie
- `CISR` : Commission de l'immigration et du statut de réfugié

### 2. Gestion des Utilisateurs

#### Création d'utilisateurs
- Email (requis, unique)
- Nom et prénom (optionnels)
- Rôle : ADMIN, GESTIONNAIRE, CONSEILLER, TRADUCTEUR
- Mot de passe (requis à la création)
- Assignation aux divisions

#### Modification d'utilisateurs
- Modifier les informations de base
- Changer le rôle
- Mettre à jour les accès aux divisions
- Réinitialiser le mot de passe (optionnel)
- Activer/désactiver le compte

### 3. Contrôle d'Accès par Division

Trois niveaux de permissions par division :

#### 🔍 **Lecture** (`peutLire`)
- Voir les données de la division
- Consulter les traducteurs et tâches
- Générer des rapports

#### ✏️ **Écriture** (`peutEcrire`)
- Toutes les permissions de lecture
- Créer et modifier des tâches
- Assigner des traducteurs
- Gérer la planification

#### 👑 **Gestion** (`peutGerer`)
- Toutes les permissions d'écriture
- Gérer les traducteurs de la division
- Modifier les paramètres de la division
- Accès complet aux fonctionnalités

### 4. Règles de Permissions par Rôle

#### ADMIN
- Accès complet à toutes les divisions (automatique)
- Bypass des vérifications de permissions
- Gestion des utilisateurs et divisions

#### GESTIONNAIRE
- Par défaut : Lecture + Écriture sur ses divisions assignées
- Peut gérer les opérations quotidiennes
- Restreint aux divisions assignées

#### CONSEILLER
- Par défaut : Lecture seule sur ses divisions assignées
- Consultation et reporting
- Peut être élevé à Écriture selon les besoins

#### TRADUCTEUR
- Accès uniquement à ses propres tâches
- Pas d'accès au système de divisions

## Interface Administrateur

### Accès
1. Se connecter en tant qu'ADMIN
2. Aller au Dashboard Admin
3. Cliquer sur **"Gérer profils & accès"**

### Onglet Utilisateurs

**Filtres disponibles** :
- Par rôle (ADMIN, GESTIONNAIRE, CONSEILLER, TRADUCTEUR)
- Par statut (Actif/Inactif)

**Actions** :
- ➕ **Nouvel Utilisateur** : Créer un compte avec assignation de divisions
- 🔑 **Accès** : Gérer finement les permissions par division
- ✏️ **Modifier** : Éditer les informations de base
- 🗑️ **Supprimer** : Retirer l'utilisateur (ne peut pas se supprimer soi-même)

**Gestion des accès** :
```
Division Droit (DROIT)
  ✅ Lire  ✅ Écrire  ❌ Gérer

Division Science et Technologie (SCITECH)
  ✅ Lire  ❌ Écrire  ❌ Gérer

Division CISR (CISR)
  ❌ Pas d'accès
```

### Onglet Divisions

**Actions** :
- ➕ **Nouvelle Division** : Créer une division
- ✏️ **Modifier** : Éditer nom, code, description
- 🗑️ **Supprimer** : Retirer (si aucun traducteur)

**Visualisation** :
- Nombre d'utilisateurs ayant accès
- Statut (Actif/Inactif)

## API Endpoints

### Utilisateurs
```
GET    /api/utilisateurs              Lister avec filtres (role, actif, divisionId)
GET    /api/utilisateurs/:id          Obtenir un utilisateur
POST   /api/utilisateurs              Créer un utilisateur
PUT    /api/utilisateurs/:id          Modifier un utilisateur
DELETE /api/utilisateurs/:id          Supprimer un utilisateur
PUT    /api/utilisateurs/:id/divisions   Gérer les accès aux divisions
GET    /api/utilisateurs/:id/divisions   Obtenir les divisions accessibles
```

### Divisions
```
GET    /api/divisions                 Lister toutes les divisions
GET    /api/divisions/:id             Obtenir une division
POST   /api/divisions                 Créer (ADMIN seulement)
PUT    /api/divisions/:id             Modifier (ADMIN seulement)
DELETE /api/divisions/:id             Supprimer (ADMIN seulement)
GET    /api/divisions/:id/utilisateurs   Lister les utilisateurs avec accès
```

### Middleware d'Autorisation

```typescript
// Vérifier le rôle
verifierRole('ADMIN', 'GESTIONNAIRE')

// Vérifier l'accès à une division
verifierAccesDivision('lire')  // lecture seule
verifierAccesDivision('ecrire') // lecture + écriture
verifierAccesDivision('gerer')  // permissions complètes
```

## Modèle de Données

### Table `utilisateurs`
```sql
- id: uuid (PK)
- email: string (unique)
- nom: string (nullable)
- prenom: string (nullable)
- motDePasse: string (hashed)
- role: Role (enum)
- actif: boolean
- creeLe: timestamp
- modifieLe: timestamp
```

### Table `divisions`
```sql
- id: uuid (PK)
- nom: string (unique)
- code: string (unique)
- description: string (nullable)
- actif: boolean
- creeLe: timestamp
- modifieLe: timestamp
```

### Table `division_access`
```sql
- id: uuid (PK)
- utilisateurId: uuid (FK → utilisateurs)
- divisionId: uuid (FK → divisions)
- peutLire: boolean
- peutEcrire: boolean
- peutGerer: boolean
- creeLe: timestamp
- modifieLe: timestamp

UNIQUE (utilisateurId, divisionId)
```

## Cas d'Usage

### Scénario 1 : Nouveau Gestionnaire
1. Admin crée un compte gestionnaire
2. Assigne les divisions "Droit" et "CISR"
3. Par défaut : Lecture + Écriture automatiques
4. Le gestionnaire peut maintenant gérer les tâches de ces divisions

### Scénario 2 : Conseiller Spécialisé
1. Admin crée un compte conseiller
2. Assigne uniquement la division "Science et Technologie"
3. Permission : Lecture seule
4. Le conseiller peut consulter et générer des rapports pour cette division

### Scénario 3 : Réorganisation
1. Admin modifie les accès d'un gestionnaire
2. Retire l'accès à "Droit"
3. Ajoute l'accès à "CISR" avec gestion complète
4. Les changements sont immédiats

## Sécurité

### Protection des Routes
- Toutes les routes nécessitent authentification JWT
- Les routes `/api/utilisateurs/*` nécessitent le rôle ADMIN
- Les routes `/api/divisions/*` (lecture) : tous les rôles authentifiés
- Les routes `/api/divisions/*` (écriture) : ADMIN uniquement

### Validation Backend
- Vérification des permissions sur chaque requête
- Les ADMIN peuvent tout faire (bypass)
- Les autres rôles sont vérifiés contre `division_access`

### Cascade de Suppression
- Suppression utilisateur → supprime ses accès
- Suppression division → supprime les accès associés

## Migration

### Application Manuelle
```bash
cd backend
node apply-division-migration.js
```

Cette commande :
1. Ajoute les colonnes `nom` et `prenom` à `utilisateurs`
2. Crée la table `divisions`
3. Crée la table `division_access`
4. Configure les index et contraintes
5. Insère les 3 divisions par défaut

### Vérification Post-Migration
```sql
-- Vérifier les tables
SELECT * FROM divisions;
SELECT * FROM division_access;

-- Vérifier les colonnes
\d utilisateurs
```

## Développement Local

### Backend
```bash
cd backend
npm run dev  # Port 3001
```

### Frontend
```bash
cd frontend
npm run dev  # Port 5173
```

### Variables d'Environnement
```env
# backend/.env
DATABASE_URL="postgresql://..."
JWT_SECRET="votre-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"

# frontend/.env.local
VITE_API_URL="http://localhost:3001/api"
```

## Tests

### Tester la Création d'Utilisateur
```bash
curl -X POST http://localhost:3001/api/utilisateurs \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gestionnaire@test.com",
    "motDePasse": "test123",
    "nom": "Dupont",
    "prenom": "Jean",
    "role": "GESTIONNAIRE",
    "divisions": ["<division-id-1>", "<division-id-2>"]
  }'
```

### Tester la Gestion des Accès
```bash
curl -X PUT http://localhost:3001/api/utilisateurs/<user-id>/divisions \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "acces": [
      {
        "divisionId": "<division-id>",
        "peutLire": true,
        "peutEcrire": true,
        "peutGerer": false
      }
    ]
  }'
```

## Support

Pour toute question ou problème :
1. Vérifier les logs backend (`npm run dev`)
2. Vérifier la console browser (F12)
3. Consulter la documentation API
4. Tester les endpoints avec curl ou Postman
