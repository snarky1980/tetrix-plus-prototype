# 🔗 Système de Liaison Traducteur-Réviseur

## Vue d'ensemble

Le système de liaison traducteur-réviseur permet de gérer efficacement l'attribution des tâches en tenant compte des catégories de traducteurs (TR01, TR02, TR03) et de leurs relations de révision.

## Catégories de traducteurs

### TR01 - Traducteur Junior
- **Nécessite révision systématique** : Toutes les traductions doivent être révisées
- **Capacité** : Variable selon l'expérience
- **Rôle** : Effectue les traductions de base

### TR02 - Traducteur Intermédiaire
- **Nécessite révision partielle** : Certains TR02 en apprentissage nécessitent révision
- **Capacité** : Standard (7h/jour généralement)
- **Rôle** : Traductions standards et complexes

### TR03 - Traducteur Senior / Réviseur
- **Peut réviser** : Autorisé à réviser le travail des TR01 et TR02
- **Ne nécessite pas révision** : Travail autonome
- **Rôle** : Traductions complexes + révision

## Système de liaison

### Concept

Chaque traducteur (TR01/TR02) peut avoir plusieurs réviseurs (TR03) assignés avec un système de priorité :
- **Priorité 1** : Réviseur attitré principal
- **Priorité 2** : Réviseur de secours
- **Priorité 3+** : Réviseurs additionnels

### Fonctionnement

1. **Attribution d'une tâche à un TR01**
   - Le système vérifie la disponibilité du réviseur attitré
   - Si indisponible, propose le réviseur de secours
   - Affiche visuellement les conflits d'horaire

2. **Vérification combinée**
   - Horaires du traducteur
   - Horaires du réviseur
   - Délai de livraison
   - Capacité disponible

## Architecture technique

### Backend

#### Modèle Prisma

```prisma
model Traducteur {
  // ... champs existants
  
  // Nouveaux champs
  categorieTraducteur   String?  // TR01, TR02, TR03
  necessiteRevision     Boolean  @default(false)
  peutReviser          Boolean  @default(false)
  
  // Relations
  liaisonsCommeTraducteur LiaisonTraducteurReviseur[] @relation("TraducteurLiaisons")
  liaisonsCommeReviseur   LiaisonTraducteurReviseur[] @relation("ReviseurLiaisons")
}

model LiaisonTraducteurReviseur {
  id            String   @id @default(cuid())
  traducteurId  String
  reviseurId    String
  priorite      Int      @default(1)
  actif         Boolean  @default(true)
  commentaire   String?
  
  traducteur    Traducteur @relation("TraducteurLiaisons", ...)
  reviseur      Traducteur @relation("ReviseurLiaisons", ...)
}
```

#### Service API

**Fichier** : `backend/src/services/liaisonReviseurService.ts`

**Fonctions principales** :

```typescript
// Créer une liaison
creerLiaison(data: {
  traducteurId: string;
  reviseurId: string;
  priorite?: number;
  actif?: boolean;
  commentaire?: string;
})

// Obtenir les liaisons d'un traducteur
obtenirLiaisons(traducteurId: string)

// Vérifier disponibilité couple
verifierDisponibiliteCouple(
  traducteurId: string,
  reviseurId: string,
  dateDebut: string,
  dateFin: string,
  heuresNecessaires: number
)

// Trouver réviseurs disponibles
obtenirReviseursDisponibles(
  traducteurId: string,
  dateDebut: string,
  dateFin: string,
  heuresNecessaires: number
)

// Supprimer une liaison
supprimerLiaison(id: string)

// Mettre à jour une liaison
mettreAJourLiaison(id: string, data: UpdateData)
```

#### Routes API

**Fichier** : `backend/src/routes/liaison-reviseur.routes.ts`

```
POST   /api/liaisons                    - Créer liaison
GET    /api/liaisons/traducteur/:id     - Obtenir liaisons traducteur
POST   /api/liaisons/verifier           - Vérifier disponibilité
GET    /api/liaisons/reviseurs/:id      - Réviseurs disponibles
DELETE /api/liaisons/:id                - Supprimer liaison
PUT    /api/liaisons/:id                - Mettre à jour liaison
```

### Frontend

#### Composants

##### 1. **LiaisonManager** (`frontend/src/components/liaison/LiaisonManager.tsx`)

Composant principal de gestion des liaisons.

**Fonctionnalités** :
- Liste des traducteurs par catégorie
- Gestion des liaisons (ajout/suppression)
- Système de priorité visuel
- Drag & drop pour réorganiser les priorités

**Utilisation** :
```tsx
<LiaisonManager divisionId={currentDivisionId} />
```

##### 2. **DisponibiliteChecker** (`frontend/src/components/liaison/DisponibiliteChecker.tsx`)

Vérification visuelle de disponibilité combinée.

**Fonctionnalités** :
- Timeline visuelle traducteur + réviseur
- Indicateurs de conflit
- Suggestions alternatives
- Calcul automatique délais

**Utilisation** :
```tsx
<DisponibiliteChecker
  traducteurId={selectedTraducteur}
  reviseurId={selectedReviseur}
  dateDebut={startDate}
  dateFin={endDate}
  heuresNecessaires={5}
/>
```

##### 3. **VerificationModal** (`frontend/src/components/liaison/VerificationModal.tsx`)

Modal de vérification dans le formulaire de création de tâche.

**Fonctionnalités** :
- Intégré dans TacheCreation
- Vérification avant validation
- Liste des réviseurs disponibles
- Bouton d'action rapide

**Utilisation** :
```tsx
<VerificationModal
  traducteurId={formData.traducteurId}
  dateDebut={formData.dateDebut}
  dateFin={formData.dateFin}
  heuresTotal={formData.heuresTotal}
/>
```

#### Pages

##### Page Liaisons (`/liaisons-reviseurs`)

Page dédiée à la gestion des liaisons.

**Sections** :
1. **En-tête** : Statistiques globales
2. **Filtres** : Par catégorie, division, statut
3. **Liste principale** : LiaisonManager
4. **Actions** : Création/édition en masse

**Accès** : Dashboard Conseiller → "⚙️ Gérer liaisons réviseurs"

#### Intégrations

##### Dashboard Conseiller

Ajout d'un bouton d'accès rapide :

```tsx
<Button 
  variant="outline" 
  onClick={() => navigate('/liaisons-reviseurs')}
>
  ⚙️ Gérer liaisons réviseurs
</Button>
```

##### Création de tâche

Intégration du modal de vérification :

```tsx
{formData.traducteurId && (
  <VerificationModal
    traducteurId={formData.traducteurId}
    dateDebut={formData.dateDebut}
    dateFin={formData.dateFin}
    heuresTotal={formData.heuresTotal}
  />
)}
```

## Flux utilisateur

### Scénario 1 : Configuration des liaisons

1. **Conseiller** accède à "Gérer liaisons réviseurs"
2. Sélectionne un **traducteur TR01**
3. Assigne un **réviseur TR03 principal** (priorité 1)
4. Ajoute un **réviseur de secours** (priorité 2)
5. Sauvegarde les liaisons

### Scénario 2 : Création de tâche avec vérification

1. **Conseiller** crée une nouvelle tâche
2. Sélectionne un **traducteur TR01**
3. Définit les **dates et heures**
4. Clique sur **"Vérifier disponibilité réviseur"**
5. Le système affiche :
   - ✅ Réviseur principal disponible
   - ⚠️ Conflit d'horaire détecté
   - 🔄 Réviseurs alternatifs disponibles
6. Conseiller **valide** ou **ajuste** l'attribution

### Scénario 3 : Réviseur indisponible

1. Système détecte **indisponibilité du réviseur principal**
2. Propose automatiquement **réviseur de secours**
3. Affiche **timeline comparative** :
   - Traducteur : 09:00-12:00 ✅
   - Réviseur principal : 09:00-12:00 ❌ (occupé)
   - Réviseur secours : 09:00-12:00 ✅
4. Conseiller sélectionne **réviseur de secours**
5. Tâche attribuée avec **garantie de révision**

## Design UI/UX

### Codes couleur

| Catégorie | Couleur | Usage |
|-----------|---------|-------|
| TR01 | 🟢 Vert | Traducteur junior |
| TR02 | 🔵 Bleu | Traducteur intermédiaire |
| TR03 | 🟣 Violet | Réviseur senior |
| Disponible | 🟢 Vert clair | Plage horaire libre |
| Occupé | 🔴 Rouge | Conflit détecté |
| Partiel | 🟡 Jaune | Capacité limitée |

### Animations

- **Drag & drop** : Réorganisation priorités (smooth 300ms)
- **Fade in** : Apparition suggestions (200ms)
- **Pulse** : Indicateurs de conflit (2s infinite)
- **Slide** : Timeline horizontale (scroll fluide)

### Responsive

- **Mobile** : Liste verticale, boutons empilés
- **Tablet** : Grid 2 colonnes
- **Desktop** : Grid 3 colonnes + timeline pleine largeur

## Tests

### Backend (7 tests)

**Fichier** : `backend/tests/liaison-reviseur.test.ts`

✅ Tests couverts :
1. Création d'une liaison
2. Récupération des liaisons d'un traducteur
3. Vérification disponibilité couple
4. Recherche réviseurs disponibles
5. Suppression d'une liaison
6. Mise à jour d'une liaison
7. Détection conflit d'horaire

**Exécution** :
```bash
cd backend
npm test liaison-reviseur.test.ts
```

### Frontend (à venir)

Tests E2E recommandés :
- Navigation vers page liaisons
- Création d'une liaison
- Vérification disponibilité dans formulaire
- Drag & drop priorités
- Responsive design

## Exemples d'utilisation

### Exemple 1 : API - Créer une liaison

```typescript
POST /api/liaisons
{
  "traducteurId": "clx123...",
  "reviseurId": "clx456...",
  "priorite": 1,
  "actif": true,
  "commentaire": "Réviseur attitré pour traductions juridiques"
}
```

### Exemple 2 : API - Vérifier disponibilité

```typescript
POST /api/liaisons/verifier
{
  "traducteurId": "clx123...",
  "reviseurId": "clx456...",
  "dateDebut": "2025-01-20T09:00:00Z",
  "dateFin": "2025-01-20T12:00:00Z",
  "heuresNecessaires": 3
}

// Réponse
{
  "traducteurDisponible": true,
  "reviseurDisponible": true,
  "liaisonActive": true,
  "compatible": true,
  "traducteur": { /* détails */ },
  "reviseur": { /* détails */ },
  "conflits": []
}
```

### Exemple 3 : React - Utilisation du composant

```tsx
import { LiaisonManager } from '@/components/liaison';

function GestionLiaisons() {
  const { divisionId } = useAuth();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Gestion des liaisons traducteur-réviseur
      </h1>
      
      <LiaisonManager divisionId={divisionId} />
    </div>
  );
}
```

## Bonnes pratiques

### Pour les conseillers

1. **Toujours assigner 2 réviseurs** : Principal + secours
2. **Vérifier avant d'attribuer** : Utiliser le modal de vérification
3. **Respecter les spécialisations** : Matcher traducteur-réviseur
4. **Anticiper les absences** : Configurer plusieurs réviseurs de secours

### Pour les développeurs

1. **Validation côté serveur** : Toujours vérifier les liaisons en backend
2. **Cache intelligent** : Mettre en cache les disponibilités (5 min)
3. **Feedback immédiat** : Afficher les conflits en temps réel
4. **Performance** : Optimiser les requêtes de disponibilité

## Améliorations futures

- [ ] **Gestion des absences** : Intégration calendrier
- [ ] **Notifications** : Alertes réviseur indisponible
- [ ] **Statistiques** : Charge de travail par réviseur
- [ ] **ML/IA** : Suggestion automatique du meilleur couple
- [ ] **Export** : Rapport PDF des liaisons
- [ ] **Historique** : Tracking des changements de liaison
- [ ] **Bulk operations** : Création/modification en masse

## Support

Pour toute question ou problème :
1. Consulter cette documentation
2. Vérifier les logs backend (`/api/liaisons`)
3. Tester avec les données de test
4. Contacter l'équipe technique

---

**Version** : 1.0  
**Date** : 2025-01-19  
**Auteur** : Équipe Tetrix PLUS
