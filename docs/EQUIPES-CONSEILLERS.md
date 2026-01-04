# Équipes Conseillers - Documentation

## Vue d'ensemble

Les **Équipes Conseillers** permettent de regrouper des utilisateurs de type CONSEILLER, GESTIONNAIRE ou ADMIN pour faciliter le partage de notes et la collaboration au sein d'équipes spécifiques.

Cette fonctionnalité est distincte des **Équipes Projet** (qui regroupent des traducteurs pour des projets de traduction).

## Cas d'usage principal

- **Partage de notes** entre membres d'une même équipe conseiller
- Organisation des conseillers par spécialisation (ex: Immigration, Droit, Finance)
- Hiérarchie d'équipe avec rôles Chef/Membre

## Architecture

### Modèles Prisma

#### EquipeConseiller
```prisma
model EquipeConseiller {
  id          String   @id @default(uuid())
  nom         String
  code        String   @unique
  description String?
  couleur     String   @default("#8B5CF6")
  actif       Boolean  @default(true)
  
  creePar     String
  modifiePar  String?
  creeLe      DateTime @default(now())
  modifieLe   DateTime @updatedAt
  
  membres     EquipeConseillerMembre[]
}
```

#### EquipeConseillerMembre
```prisma
model EquipeConseillerMembre {
  id                 String               @id @default(uuid())
  equipeConseillerId String
  utilisateurId      String
  role               RoleEquipeConseiller @default(MEMBRE)
  
  dateAjout          DateTime @default(now())
  dateRetrait        DateTime?
  actif              Boolean  @default(true)
  
  equipeConseiller   EquipeConseiller @relation(...)
  utilisateur        Utilisateur @relation(...)
  
  @@unique([equipeConseillerId, utilisateurId])
}
```

#### Enum RoleEquipeConseiller
```prisma
enum RoleEquipeConseiller {
  CHEF
  MEMBRE
}
```

### Visibilité des Notes

Un nouveau niveau de visibilité a été ajouté au modèle `Note`:

```prisma
enum VisibiliteNote {
  PRIVE              // Visible seulement par l'auteur
  EQUIPE_CONSEILLER  // Visible par les membres de l'équipe conseiller ✨ NOUVEAU
  EQUIPE             // Visible par CONSEILLER, GESTIONNAIRE, ADMIN
  TRADUCTEUR         // Visible aussi par les traducteurs concernés
  PUBLIC             // Visible par tous
}
```

Le champ `equipeConseillerId` (nullable) permet d'associer une note à une équipe conseiller spécifique.

## API Backend

### Endpoints

#### Gestion des équipes

- `GET /api/equipes-conseiller` - Liste toutes les équipes (admin/gestionnaire)
- `GET /api/equipes-conseiller/mes-equipes` - Équipes de l'utilisateur connecté
- `GET /api/equipes-conseiller/:id` - Détails d'une équipe
- `POST /api/equipes-conseiller` - Créer une équipe (admin/gestionnaire)
- `PUT /api/equipes-conseiller/:id` - Modifier une équipe (admin/gestionnaire)
- `DELETE /api/equipes-conseiller/:id` - Supprimer une équipe (admin/gestionnaire)

#### Gestion des membres

- `GET /api/equipes-conseiller/:id/membres` - Liste des membres
- `POST /api/equipes-conseiller/:id/membres` - Ajouter un membre
- `DELETE /api/equipes-conseiller/:id/membres/:utilisateurId` - Retirer un membre
- `PATCH /api/equipes-conseiller/:id/membres/:utilisateurId/role` - Changer le rôle

#### Utilitaires

- `GET /api/equipes-conseiller/:id/utilisateurs-disponibles` - Utilisateurs non membres

### Services Backend

#### equipeConseillerService.ts

Fonctions principales:
- `listerEquipesConseiller(toutesLesEquipes?: boolean)` - Liste avec filtrage
- `obtenirEquipeConseiller(equipeId: string)` - Détails avec membres
- `creerEquipeConseiller(dto: CreerEquipeConseillerDTO)` - Création
- `modifierEquipeConseiller(equipeId: string, dto: ModifierEquipeConseillerDTO)` - Modification
- `supprimerEquipeConseiller(equipeId: string)` - Suppression (soft delete)
- `ajouterMembre(...)` - Ajouter un membre
- `retirerMembre(...)` - Retirer un membre
- `modifierRoleMembre(...)` - Changer CHEF ↔ MEMBRE
- `obtenirEquipesUtilisateur(utilisateurId: string)` - Équipes d'un utilisateur
- `estMembreEquipe(equipeId: string, utilisateurId: string)` - Vérification
- `obtenirUtilisateursDisponibles(equipeId: string)` - Utilisateurs ajoutables

Validations:
- Seuls CONSEILLER, GESTIONNAIRE, ADMIN peuvent être membres
- Code d'équipe unique
- Permissions vérifiées avant modification

#### Modifications noteService.ts

Nouvelle fonction asynchrone pour vérifier les permissions :

```typescript
async function peutVoirNoteAsync(note, utilisateur): Promise<boolean> {
  if (note.visibilite === 'EQUIPE_CONSEILLER' && note.equipeConseillerId) {
    const estMembre = await equipeConseillerService.estMembreEquipe(
      note.equipeConseillerId,
      utilisateur.id
    );
    return note.creeParId === utilisateur.id || estMembre;
  }
  // ... autres visibilités
}
```

Les fonctions `obtenirNotesEntite` et `rechercherNotes` utilisent maintenant `peutVoirNoteAsync` pour filtrer les notes avec visibilité `EQUIPE_CONSEILLER`.

## Frontend

### Service API (frontend/src/services/equipeConseillerService.ts)

Interfaces TypeScript:
- `EquipeConseiller`
- `EquipeConseillerMembre`
- `CreerEquipeConseillerDTO`
- `ModifierEquipeConseillerDTO`
- `AjouterMembreDTO`

Fonctions:
- `listerEquipesConseiller(toutesLesEquipes?: boolean)`
- `mesEquipesConseiller()`
- `obtenirEquipeConseiller(id: string)`
- `creerEquipeConseiller(dto: CreerEquipeConseillerDTO)`
- `modifierEquipeConseiller(id: string, dto: ModifierEquipeConseillerDTO)`
- `supprimerEquipeConseiller(id: string)`
- `listerMembresEquipe(id: string)`
- `ajouterMembreEquipe(id: string, dto: AjouterMembreDTO)`
- `retirerMembreEquipe(id: string, utilisateurId: string)`
- `modifierRoleMembre(id: string, utilisateurId: string, role: 'CHEF' | 'MEMBRE')`
- `utilisateursDisponibles(id: string)`

### Composant React (frontend/src/components/admin/EquipesConseillerPage.tsx)

Fonctionnalités:
- ✅ Liste des équipes avec code couleur
- ✅ Expansion/collapse pour voir les membres
- ✅ Formulaire création/édition (modal)
- ✅ Ajout de membres avec sélection du rôle
- ✅ Gestion des rôles CHEF/MEMBRE
- ✅ Retrait de membres
- ✅ Suppression d'équipes
- ✅ États de chargement et erreurs

Intégration:
- Accessible via `DashboardAdmin` → onglet "Équipes Conseillers" (👥 icon)
- Permissions: Seuls ADMIN et GESTIONNAIRE peuvent gérer les équipes

## Utilisation

### 1. Créer une équipe conseiller

**Dans l'interface Admin:**

1. Naviguer vers **Administration** → **Équipes Conseillers**
2. Cliquer sur "Nouvelle équipe"
3. Remplir le formulaire:
   - Nom: ex. "Équipe Immigration"
   - Code: ex. "EQ-IMM"
   - Description (optionnel)
   - Couleur (sélecteur de couleur)
4. Cliquer "Créer"

**Via API:**

```bash
POST /api/equipes-conseiller
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Équipe Immigration",
  "code": "EQ-IMM",
  "description": "Équipe spécialisée en immigration",
  "couleur": "#8B5CF6"
}
```

### 2. Ajouter des membres

1. Cliquer sur une équipe pour l'ouvrir
2. Cliquer "Ajouter" dans la section membres
3. Sélectionner un utilisateur disponible
4. Choisir le rôle (Chef ou Membre)
5. Valider

**Note importante** : Un conseiller peut appartenir à **plusieurs équipes** simultanément. Pour ajouter un conseiller à une autre équipe :
1. Ouvrir l'équipe cible
2. Le conseiller apparaîtra dans la liste des utilisateurs disponibles même s'il est déjà membre d'une autre équipe
3. L'ajouter avec le rôle approprié

### 3. Partager une note avec l'équipe

Lors de la création d'une note:
1. Sélectionner **Visibilité**: "Équipe Conseiller"
2. Choisir l'équipe cible dans le sélecteur
3. Seuls les membres de cette équipe pourront voir la note

## Sécurité et Permissions

### Rôles autorisés

- **Créer/Modifier/Supprimer une équipe**: ADMIN, GESTIONNAIRE
- **Être membre d'une équipe**: CONSEILLER, GESTIONNAIRE, ADMIN
- **Voir les équipes**: Tous les rôles peuvent voir leurs propres équipes

### Validation des permissions

- Vérification du rôle lors de l'ajout de membres
- Middleware d'authentification JWT
- Validation Zod sur tous les endpoints
- Filtrage des notes selon l'appartenance à l'équipe

## Tests API

### Créer une équipe de test

```bash
curl -X POST http://localhost:3001/api/equipes-conseiller \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Équipe Immigration",
    "code": "EQ-IMM",
    "description": "Équipe spécialisée en immigration",
    "couleur": "#8B5CF6"
  }'
```

### Lister toutes les équipes

```bash
curl http://localhost:3001/api/equipes-conseiller \
  -H "Authorization: Bearer $TOKEN"
```

### Ajouter un membre

```bash
curl -X POST http://localhost:3001/api/equipes-conseiller/{{equipeId}}/membres \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "utilisateurId": "{{userId}}",
    "role": "MEMBRE"
  }'
```

## Différences: Équipes Conseillers vs Équipes Projet

| Caractéristique | Équipes Conseillers | Équipes Projet |
|-----------------|---------------------|----------------|
| **Membres** | CONSEILLER, GESTIONNAIRE, ADMIN | TRADUCTEUR |
| **Objectif** | Partage de notes, collaboration | Gestion de projets de traduction |
| **Rôles** | CHEF, MEMBRE | COORDINATEUR, TRADUCTEUR, REVISEUR |
| **Visibilité notes** | EQUIPE_CONSEILLER | EQUIPE_PROJET |
| **Gestion** | Admin/Gestionnaire | Gestionnaire |
| **Modèle** | EquipeConseiller | EquipeProjet |

## Migration des données

### Initialisation des équipes par défaut

Le système inclut 6 équipes conseillers de base :
- **Équipe A** (EQ-A) - Bleu
- **Équipe B** (EQ-B) - Vert
- **Équipe C** (EQ-C) - Ambre
- **Équipe D** (EQ-D) - Rouge
- **Équipe G** (EQ-G) - Violet
- **Équipe Anglo** (EQ-ANGLO) - Rose

Pour créer ces équipes initiales :

```bash
cd backend
npm run seed:equipes-conseiller
```

### Migration du schéma

Les tables sont créées automatiquement via `prisma db push`.

Si vous devez appliquer des migrations propres:

```bash
cd backend
npx prisma migrate dev --name add-equipes-conseiller
```

## TODO / Améliorations futures

- [ ] Ajouter une page dédiée "Mes équipes" pour les conseillers
- [ ] Notifications lors de l'ajout à une équipe
- [ ] Statistiques d'activité par équipe
- [ ] Export des membres d'une équipe (CSV)
- [ ] Historique des modifications d'équipe
- [ ] Intégration avec le système de notifications

## Résumé technique

**Fichiers modifiés/créés:**

Backend:
- `backend/prisma/schema.prisma` - Modèles EquipeConseiller, EquipeConseillerMembre
- `backend/src/services/equipeConseillerService.ts` - CRUD équipes
- `backend/src/controllers/equipeConseillerController.ts` - Endpoints REST
- `backend/src/routes/equipeConseillerRoutes.ts` - Routes
- `backend/src/services/noteService.ts` - Support EQUIPE_CONSEILLER
- `backend/src/server.ts` - Enregistrement des routes

Frontend:
- `frontend/src/services/equipeConseillerService.ts` - Client API
- `frontend/src/components/admin/EquipesConseillerPage.tsx` - UI gestion
- `frontend/src/pages/DashboardAdmin.tsx` - Intégration navigation

**Base de données:**
- Table: `equipes_conseiller`
- Table: `equipes_conseiller_membres`
- Enum: `RoleEquipeConseiller` (CHEF, MEMBRE)
- Enum modifié: `TypeEntiteNote` (ajout EQUIPE_CONSEILLER)
- Enum modifié: `VisibiliteNote` (ajout EQUIPE_CONSEILLER)

---

**Date de création**: 4 janvier 2026  
**Version**: 1.0.0  
**Auteur**: GitHub Copilot
