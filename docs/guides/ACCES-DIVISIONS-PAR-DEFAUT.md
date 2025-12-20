# Gestion des Accès aux Divisions - Comportement par Défaut

## 🎯 Principe

**Par défaut, tous les utilisateurs ont accès à toutes les divisions actives.**

Lors de la création d'un nouvel utilisateur, le système lui attribue automatiquement l'accès en **lecture** à toutes les divisions actives du système.

## 🔐 Niveaux d'Accès par Rôle

Les permissions par défaut dépendent du rôle de l'utilisateur :

| Rôle | Lecture | Écriture | Gestion |
|------|---------|----------|---------|
| **TRADUCTEUR** | ✅ | ❌ | ❌ |
| **CONSEILLER** | ✅ | ❌ | ❌ |
| **GESTIONNAIRE** | ✅ | ✅ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ |

## 📝 Comportements

### Création d'un Nouvel Utilisateur

1. **Backend** : Si aucune division n'est spécifiée, le système attribue automatiquement toutes les divisions actives
2. **Frontend** : Le formulaire de création pré-sélectionne toutes les divisions actives
3. Les permissions sont définies selon le rôle de l'utilisateur

### Utilisateurs Existants

Pour les utilisateurs créés avant cette fonctionnalité, vous pouvez exécuter le script de migration :

```bash
cd backend
npm run grant-divisions
```

Ce script :
- Identifie les utilisateurs sans accès configuré
- Leur attribue l'accès à toutes les divisions actives
- Applique les permissions selon leur rôle

## 🛠️ Personnalisation

Les administrateurs peuvent toujours modifier manuellement les accès via :
1. **Console Admin** → **Gestion des Profils** → **Utilisateurs**
2. Cliquer sur **Permissions** pour l'utilisateur concerné
3. Activer/désactiver les divisions et ajuster les permissions

## 📋 Divisions Disponibles

Le système gère actuellement ces divisions :
- **CISR** (Commission de l'immigration et du statut de réfugié)
- **Droit 1** et **Droit 2** (divisions juridiques)
- **Traduction anglaise 1** et **Traduction anglaise 2**
- **Multilingue** (traductions multilingues)

## 💡 Cas d'Usage

### Nouveau Conseiller
```
✅ Accès en lecture à toutes les divisions
❌ Ne peut pas modifier les données
❌ Ne peut pas gérer les utilisateurs
```

### Nouveau Gestionnaire
```
✅ Accès en lecture à toutes les divisions
✅ Peut modifier les données dans toutes les divisions
❌ Ne peut pas gérer les utilisateurs
```

### Nouvel Administrateur
```
✅ Accès en lecture à toutes les divisions
✅ Peut modifier les données dans toutes les divisions
✅ Peut gérer les utilisateurs et les permissions
```

## 🔧 API

### Créer un Utilisateur avec Accès Par Défaut

```typescript
POST /api/utilisateurs
{
  "email": "user@example.com",
  "motDePasse": "password123",
  "role": "CONSEILLER"
  // divisions: [] ou omis = accès à toutes les divisions
}
```

### Créer un Utilisateur avec Accès Personnalisé

```typescript
POST /api/utilisateurs
{
  "email": "user@example.com",
  "motDePasse": "password123",
  "role": "CONSEILLER",
  "divisions": ["division-id-1", "division-id-2"]
}
```

## 📝 Notes Techniques

- Les divisions inactives ne sont pas attribuées par défaut
- Les permissions peuvent être modifiées individuellement après la création
- Le changement de rôle ne modifie pas automatiquement les permissions existantes
- Un utilisateur sans aucun accès verra par défaut toutes les divisions dans l'interface de gestion des permissions
