# Guide d'utilisation - Système de détection de conflits

## Vue d'ensemble

Le système de détection de conflits identifie automatiquement les problèmes de planification et propose des solutions intelligentes basées sur l'IA.

## Types de conflits détectés

### 1. **SURALLOCATION** (Rouge 🔴)
- **Détection** : Un traducteur a plus d'heures assignées que sa capacité quotidienne
- **Impact** : Élevé - Risque de retards et de surcharge
- **Solution** : Répartition sur plusieurs jours ou réattribution

### 2. **CHEVAUCHEMENT_TACHES** (Orange 🟠)
- **Détection** : Deux tâches se chevauchent dans le temps pour le même traducteur
- **Impact** : Élevé - Impossible à exécuter simultanément
- **Solution** : Décalage horaire ou réattribution

### 3. **CONFLIT_BLOCAGE** (Jaune 🟡)
- **Détection** : Une allocation empiète sur un blocage de temps personnel
- **Impact** : Modéré - Disponibilité non respectée
- **Solution** : Décalage ou réattribution

### 4. **HORS_HEURES_TRAVAIL** (Violet 🟣)
- **Détection** : Allocation en dehors des heures de travail (8h-18h)
- **Impact** : Faible à Modéré selon la situation
- **Solution** : Ajustement des plages horaires

### 5. **CAPACITE_DEPASSEE** (Bleu 🔵)
- **Détection** : La capacité hebdomadaire totale est dépassée
- **Impact** : Modéré - Risque de burnout
- **Solution** : Réattribution partielle ou totale

## Utilisation dans l'interface

### Dashboard Conseiller

#### 1. Vue d'ensemble des conflits

Sur le tableau de bord, une carte **"Détection de conflits"** affiche :
- Nombre total de conflits actifs
- Répartition par type
- Bouton d'action rapide pour résoudre

```tsx
<ConflictOverview />
```

#### 2. Navigation vers la résolution

Cliquez sur **"Résoudre les conflits"** pour accéder à la page dédiée :
- `/conflict-resolution`
- Vue détaillée de tous les conflits
- Actions de résolution groupées

### Page de résolution de conflits

#### Fonctionnalités

1. **Vue agrégée**
   - Statistiques globales par type
   - Regroupement par traducteur
   - Filtrage et recherche

2. **Analyse détaillée**
   - Cliquez sur un traducteur pour voir ses conflits
   - Modal avec liste complète des problèmes
   - Suggestions triées par impact

3. **Application des solutions**
   - Prévisualisation de l'impact
   - Validation avant application
   - Notification de succès/échec

### Intégration dans les allocations

#### Badge de conflit

Chaque allocation peut afficher un badge de conflit :

```tsx
<ConflictDetector 
  allocationId="abc-123"
  onResolve={() => refreshData()}
/>
```

**Comportement** :
- Badge orange si conflits détectés
- Clic → Ouverture du modal d'analyse
- Animation de pulse pour attirer l'attention

#### Modal de détection

Le modal affiche :

**En-tête** :
- Titre avec icône
- Description du contexte
- Badge de statut

**Tableau de bord** :
- 3 cartes : Conflits / Solutions / Statut
- Indicateurs visuels avec dégradés
- Hover effects

**Liste des conflits** :
- Icône selon le type
- Badge d'heures impactées
- Date et plage horaire
- Explication détaillée

**Suggestions de résolution** :
- Score d'impact (0-100)
- Niveau : FAIBLE / MODÉRÉ / ÉLEVÉ
- Décomposition sur 5 facteurs :
  - Heures déplacées
  - Nombre de tâches affectées
  - Changement de traducteur
  - Risque échéance
  - Morcellement

**Actions** :
- Bouton "Appliquer la solution"
- Bouton "Voir les détails"
- Bouton "Réanalyser"

## Architecture technique

### Services

#### `conflictService.ts`

```typescript
// Détection pour une allocation
await conflictService.detectAllocationConflicts(allocationId);

// Détection pour un blocage
await conflictService.detectBlocageConflicts(blocageId);

// Génération de suggestions
await conflictService.generateSuggestions(conflits);

// Analyse complète (conflits + suggestions)
await conflictService.analyzeAllocation(allocationId);

// Vérification rapide
const hasConflicts = await conflictService.hasConflicts(allocationId);
```

### Hooks

#### `useConflictDetection.ts`

```typescript
const { 
  analysis,           // Résultat de l'analyse
  isAnalyzing,        // État de chargement
  error,              // Erreur éventuelle
  analyzeAllocation,  // Fonction d'analyse
  checkHasConflicts,  // Vérification rapide
  clearAnalysis       // Réinitialisation
} = useConflictDetection();
```

### Composants

#### `ConflictDetector` (Composant tout-en-un)
- Badge + Modal intégré
- Gestion d'état automatique
- Notifications toast

#### `ConflictDetectionModal` (Modal seul)
- Affichage des conflits et suggestions
- Interactions utilisateur
- Animations fluides

#### `ConflictOverview` (Carte dashboard)
- Statistiques agrégées
- Vue d'ensemble division/traducteur
- Navigation rapide

#### `ConflictBadge` (Badge seul)
- Compteur de conflits
- États : normal / loading / error
- Animations : pulse, wiggle

## Animations et UX

### Animations CSS

```css
/* Entrée modale */
animate-fadeIn        /* 0.2s opacity fade */
animate-slideUp       /* 0.3s translateY avec opacity */

/* Listes */
animate-slideInLeft   /* 0.4s pour les conflits */
animate-slideInRight  /* 0.4s pour les suggestions */

/* Sections collapsibles */
animate-slideDown     /* 0.3s max-height expansion */

/* Feedback */
animate-shake         /* 0.5s oscillation (erreurs) */
animate-wiggle        /* 1s rotation infinie (icônes) */
animate-pulse-slow    /* 3s opacity pulse (badges) */
```

### Délais d'animation

- **Conflits** : 50ms entre chaque carte
- **Suggestions** : 100ms entre chaque carte
- Animation backwards fill pour éviter le flash

### Couleurs

- **Conflits** : Gradient amber-50 → orange-50
- **Solutions locales** : Bleu
- **Réattributions** : Violet
- **Impossible** : Rouge (border + background)

## API Backend

### Endpoints

```
POST /api/conflicts/detect/allocation/:allocationId
POST /api/conflicts/detect/blocage/:blocageId
POST /api/conflicts/suggest
POST /api/conflicts/report/blocage/:blocageId
GET  /api/conflicts/allocation/:allocationId/full
```

### Types TypeScript

```typescript
interface Conflict {
  type: string;
  allocationId: string;
  traducteurId: string;
  dateConflict: string;
  heureDebut: string;
  heureFin: string;
  heuresAllouees: number;
  explication: string;
}

interface Suggestion {
  id: string;
  type: 'REPARATION_LOCALE' | 'REATTRIBUTION' | 'IMPOSSIBLE';
  conflitsResolus: string[];
  plagesProposees: PlageDisponible[];
  candidatsAlternatifs?: CandidatReattribution[];
  scoreImpact: ScoreImpact;
  description: string;
}

interface ScoreImpact {
  total: number;  // 0-100
  niveau: 'FAIBLE' | 'MODERE' | 'ELEVE';
  decomposition: {
    heuresDeplacees: number;
    nombreTachesAffectees: number;
    changementTraducteur: number;
    risqueEcheance: number;
    morcellement: number;
  };
}
```

## Exemples d'utilisation

### Exemple 1 : Badge simple

```tsx
import { ConflictDetector } from '@/components/ConflictDetector';

function AllocationCard({ allocation }) {
  return (
    <div className="allocation-card">
      <h3>{allocation.tache.description}</h3>
      <ConflictDetector 
        allocationId={allocation.id}
        onResolve={() => {
          // Rafraîchir les données après résolution
          refreshAllocations();
        }}
      />
    </div>
  );
}
```

### Exemple 2 : Modal contrôlé

```tsx
import { useState } from 'react';
import { ConflictDetectionModal } from '@/components/ConflictDetection';
import { useConflictDetection } from '@/hooks/useConflictDetection';

function CustomDetector({ allocationId }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { analysis, analyzeAllocation } = useConflictDetection();
  
  const handleAnalyze = async () => {
    await analyzeAllocation(allocationId);
    setModalOpen(true);
  };
  
  return (
    <>
      <button onClick={handleAnalyze}>Analyser</button>
      {analysis && (
        <ConflictDetectionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          conflits={analysis.conflits}
          suggestions={analysis.suggestions}
          onApply={() => { /* ... */ }}
          onRefresh={() => analyzeAllocation(allocationId)}
        />
      )}
    </>
  );
}
```

### Exemple 3 : Dashboard personnalisé

```tsx
import { ConflictOverview } from '@/components/ConflictOverview';

function DivisionDashboard({ divisionId }) {
  return (
    <div className="dashboard">
      <h1>Dashboard Division</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Tâches" value={42} />
        <StatCard title="Traducteurs" value={12} />
        
        {/* Vue des conflits */}
        <ConflictOverview divisionId={divisionId} />
      </div>
    </div>
  );
}
```

## Bonnes pratiques

### Performance

1. **Détection à la demande** : Ne pas analyser automatiquement toutes les allocations
2. **Cache** : Stocker les résultats d'analyse pour éviter les appels répétés
3. **Lazy loading** : Charger le modal seulement quand nécessaire

### UX

1. **Feedback immédiat** : Loading states sur tous les boutons
2. **Animations fluides** : Timing optimal (200-400ms)
3. **Toast notifications** : Confirmer les actions importantes
4. **Progressive disclosure** : Sections collapsibles pour les détails

### Accessibilité

1. **Titres** : Tooltips sur les badges et icônes
2. **Aria labels** : Sur les boutons et sections interactives
3. **Focus visible** : États de focus clairement visibles
4. **Clavier** : Navigation complète au clavier

## Évolutions futures

- [ ] Résolution automatique selon des règles métier
- [ ] Historique des résolutions de conflits
- [ ] Notifications proactives (email/push)
- [ ] Machine learning pour améliorer les suggestions
- [ ] Batch resolution (résoudre plusieurs conflits en une fois)
- [ ] Export des rapports de conflits (PDF/Excel)
- [ ] API REST complète pour intégrations tierces

## Support

Pour toute question ou problème :
1. Consulter ce guide
2. Vérifier les logs console (mode développement)
3. Contacter l'équipe technique Tetrix PLUS

---

**Version** : 1.0  
**Date** : 2025-01-19  
**Auteur** : Équipe Tetrix PLUS
