# 🔍 SYSTÈME DE DÉTECTION ET SUGGESTION DE RÉATTRIBUTION

## 📋 Vue d'ensemble

Le système de détection et suggestion analyse automatiquement les **conflits d'allocation** créés par l'ajout ou la modification de **blocages** (absences, réunions, formations) **APRÈS** la planification initiale des tâches.

### Principe fondamental

**AUCUNE MODIFICATION AUTOMATIQUE.** Le système **détecte, analyse et suggère** uniquement. Le conseiller garde le contrôle total et reste le seul acteur des changements.

---

## 🎯 Objectifs

### Avant
- Le planificateur suppose que les conditions initiales restent valides
- Les conflits introduits après coup ne sont pas visibles
- Le conseiller découvre les problèmes manuellement

### Après
- **Détection automatique** de toute invalidité
- **Analyse des options** possibles
- **Suggestions structurées** avec score d'impact
- **Traçabilité** complète sans automatisme

---

## 🔧 Architecture

### Composants

```
conflictDetectionService.ts (Backend)
├── Détection des conflits
│   ├── detecterConflitsBlocage()
│   ├── detecterConflitsAllocation()
│   ├── detecterChevauchementBlocage()
│   ├── detecterDepassementCapacite()
│   ├── detecterHorsHoraire()
│   ├── detecterEmpietePause()
│   └── detecterApresEcheance()
│
├── Analyse et suggestions
│   ├── genererSuggestions()
│   ├── genererSuggestionReparationLocale()
│   ├── genererSuggestionReattribution()
│   ├── genererSuggestionImpossible()
│   ├── rechercherTraducteursAlternatifs()
│   ├── calculerScoreImpact()
│   └── trouverPlagesDisponibles()
│
└── Rapport
    └── genererRapportConflits()

conflicts.routes.ts (API REST)
├── POST /api/conflicts/detect/allocation/:id
├── POST /api/conflicts/detect/blocage/:id
├── POST /api/conflicts/suggest
├── POST /api/conflicts/report/blocage/:id
└── GET  /api/conflicts/allocation/:id/full
```

---

## 📊 Types de Conflits Détectés

| Type | Description | Exemple |
|------|-------------|---------|
| **CHEVAUCHEMENT_BLOCAGE** | Allocation chevauche un blocage | Allocation 10h-12h + Blocage 11h-13h |
| **DEPASSEMENT_CAPACITE** | Total heures > capacité quotidienne | 8h allouées sur capacité de 7.5h |
| **HORS_HORAIRE** | Heures hors horaire de travail | Allocation 7h-9h avec horaire 8h-17h |
| **EMPIETE_PAUSE** | Heures durant pause (12h-13h) | Allocation 11h-13h |
| **APRES_ECHEANCE** | Allocation après deadline | Tâche échue hier, allocation aujourd'hui |

---

## 💡 Types de Suggestions

### 1. Réparation Locale (REPARATION_LOCALE)
**Même traducteur**, déplacement des heures vers plages libres.

**Critères** :
- Plages disponibles suffisantes avant échéance
- Respect horaire, pause, capacité
- Impact généralement faible à modéré

**Exemple** :
```json
{
  "type": "REPARATION_LOCALE",
  "description": "Déplacer 2.0h sur 2 plages disponibles (même traducteur)",
  "plagesProposees": [
    {
      "date": "2025-12-19",
      "heureDebut": "8h",
      "heureFin": "10h",
      "heuresDisponibles": 2.0
    },
    {
      "date": "2025-12-20",
      "heureDebut": "14h",
      "heureFin": "16h",
      "heuresDisponibles": 2.0
    }
  ],
  "impact": {
    "total": 25,
    "niveau": "FAIBLE",
    "justification": "Impact faible : 2.0h déplacées."
  }
}
```

### 2. Réattribution (REATTRIBUTION)
**Changement de traducteur** vers candidat ayant capacité disponible.

**Critères** :
- Aucune plage viable chez traducteur actuel
- Candidats admissibles identifiés
- Peut compléter avant échéance
- Impact généralement modéré à élevé

**Exemple** :
```json
{
  "type": "REATTRIBUTION",
  "description": "Réattribuer à Tremblay, Marie (3.5h disponibles avant échéance)",
  "traducteurActuel": "uuid-traducteur-1",
  "traducteurPropose": "uuid-traducteur-2",
  "plagesProposees": [...],
  "impact": {
    "total": 50,
    "niveau": "MODERE",
    "decomposition": {
      "changementTraducteur": 15,
      "heuresDeplacees": 8,
      ...
    }
  }
}
```

### 3. Impossible (IMPOSSIBLE)
Aucun scénario viable avec contraintes actuelles.

**Indications** :
- Heures manquantes totales
- Contraintes bloquantes détaillées
- Suggestions d'ajustements possibles (prolonger échéance, augmenter capacité)

**Exemple** :
```json
{
  "type": "IMPOSSIBLE",
  "heuresManquantes": 5.5,
  "contraintesBloquantes": [
    "Échéance dans 1 jour (2025-12-19 10:30)",
    "Capacité disponible: 2.0h",
    "Heures requises: 7.5h",
    "Aucun traducteur alternatif disponible"
  ],
  "impact": {
    "total": 95,
    "niveau": "ELEVE",
    "justification": "Impact élevé : tâche non planifiable, marge nulle avant échéance."
  }
}
```

---

## 📈 Score d'Impact

Chaque suggestion inclut un **score d'impact** (0-100) pour aider le conseiller à évaluer les conséquences.

### Formule

```typescript
Impact Total = 
  + heuresDeplacees (max 20)
  + nombreTachesAffectees × 5
  + changementTraducteur (15 si réattribution)
  + risqueEcheance (5 à 30 selon marge)
  + morcellement × 5
```

### Niveaux

| Niveau | Score | Interprétation |
|--------|-------|----------------|
| **FAIBLE** | 0-30 | Ajustement local simple, peu d'heures déplacées |
| **MODERE** | 31-60 | Déplacement notable ou réattribution simple |
| **ELEVE** | 61-100 | Réattribution complexe, plusieurs tâches, marge faible |

### Décomposition

Chaque score détaille ses composantes :

```json
{
  "decomposition": {
    "heuresDeplacees": 8,        // 4h × 2 = 8
    "nombreTachesAffectees": 0,  // 1 seule tâche = 0
    "changementTraducteur": 0,   // Pas de réattribution
    "risqueEcheance": 15,        // Marge < 24h
    "morcellement": 5            // 2 plages = 5
  },
  "total": 28,
  "niveau": "FAIBLE"
}
```

---

## 🔄 Flux d'utilisation

### 1. Ajout/Modification d'un blocage

```typescript
// Backend: contrôleur de blocages
router.post('/blocages', async (req, res) => {
  // 1. Créer/modifier le blocage
  const blocage = await prisma.ajustementTemps.create({
    data: { ...blocageData, type: 'BLOCAGE' }
  });

  // 2. Détecter conflits automatiquement
  const rapport = await genererRapportConflits(blocage.id);

  // 3. Retourner blocage + rapport
  res.json({
    blocage,
    conflits: rapport.conflitsDetectes,
    suggestions: rapport.suggestions
  });
});
```

### 2. Consultation par le conseiller

```typescript
// Frontend: affichage du rapport
if (response.conflits.length > 0) {
  // Afficher alerte
  showAlert(`⚠️ ${response.conflits.length} conflit(s) détecté(s)`);

  // Afficher suggestions triées par impact
  response.suggestions
    .sort((a, b) => a.impact.total - b.impact.total)
    .forEach(displaySuggestion);
}
```

### 3. Application manuelle

```typescript
// Frontend: bouton "Appliquer suggestion"
async function appliquerSuggestion(suggestionId) {
  // Le conseiller décide explicitement d'appliquer
  await api.post('/suggestions/appliquer', { suggestionId });
  
  // Rafraîchir vue
  reloadAllocations();
}
```

---

## 🧪 Tests et Validation

### Cas de test couverts

#### Cas 1 - Blocage simple
```typescript
// Allocation: 09:00-11:00
// Blocage: 10:00-12:00
// Attendu: Conflit de chevauchement détecté
// Suggestion: Déplacement vers 07:15-09:15 (si disponible)
```

#### Cas 2 - Échéance impossible
```typescript
// Échéance: 10:30 aujourd'hui
// Blocage supprime dernière plage libre
// Attendu: Type IMPOSSIBLE
// Contraintes: "Aucune plage disponible avant 10:30"
```

#### Cas 3 - Réattribution suggérée
```typescript
// Traducteur 1: Aucune plage libre
// Traducteur 2: 5h disponibles
// Attendu: Type REATTRIBUTION
// Candidat: Traducteur 2 avec plages proposées
```

#### Cas 4 - Aucun conflit
```typescript
// Allocation: 09:00-11:00
// Blocage: 14:00-15:00 (pas de chevauchement)
// Attendu: Aucun conflit, aucune suggestion
```

### Exécution des tests

```bash
cd backend
npm test -- conflictDetectionService.test.ts
```

---

## 📁 Structure des données

### Interface `Conflict`

```typescript
interface Conflict {
  type: TypeConflict;
  allocationId: string;
  tacheId: string;
  traducteurId: string;
  date: string;                  // YYYY-MM-DD
  heuresAllouees: number;
  heureDebut?: string;           // "10h30"
  heureFin?: string;             // "14h"
  blocageId?: string;
  explication: string;
  contexte: {
    capaciteJour?: number;
    heuresUtilisees?: number;
    horaire?: { heureDebut: number; heureFin: number };
    echeance?: Date;
  };
}
```

### Interface `Suggestion`

```typescript
interface Suggestion {
  id: string;
  type: TypeSuggestion;
  conflitsResolus: string[];
  tacheId: string;
  traducteurActuel: string;
  traducteurPropose?: string;
  plagesProposees: PlageDisponible[];
  heuresManquantes?: number;
  contraintesBloquantes?: string[];
  impact: ScoreImpact;
  creeA: Date;
  description: string;
}
```

### Interface `RapportConflits`

```typescript
interface RapportConflits {
  declencheur: {
    type: 'BLOCAGE' | 'MODIFICATION_HORAIRE';
    blocageId?: string;
    traducteurId: string;
    dateDebut: Date;
    dateFin: Date;
  };
  conflitsDetectes: Conflict[];
  suggestions: Suggestion[];
  genereLe: Date;
}
```

---

## ⚖️ Invariants et Contraintes

### Invariants absolus (JAMAIS violés)

1. **Aucune modification automatique** des allocations existantes
2. **Le conseiller reste seul décideur** des changements
3. **Les suggestions sont présentées**, jamais appliquées
4. **La logique métier existante** (JAT, PEPS, etc.) n'est pas modifiée
5. **Déterminisme complet** : même situation = mêmes suggestions

### Contraintes métier respectées

- ✅ Jamais d'heures hors horaire de travail
- ✅ Jamais d'heures dans les blocages
- ✅ Jamais d'heures dans la pause (12h-13h)
- ✅ Jamais de dépassement de capacité quotidienne
- ✅ Jamais d'allocation après échéance

---

## 🚀 Intégration Backend

### Endpoint de détection

```typescript
// backend/src/routes/conflitsRoutes.ts
import { genererRapportConflits } from '../services/conflictDetectionService';

router.post('/blocages/:id/detecter-conflits', async (req, res) => {
  try {
    const rapport = await genererRapportConflits(req.params.id);
    res.json(rapport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Hook automatique

```typescript
// backend/src/controllers/ajustementTempsController.ts
export const creerBlocage = async (req: Request, res: Response) => {
  const blocage = await prisma.ajustementTemps.create({
    data: { ...req.body, type: 'BLOCAGE' }
  });

  // Détection automatique en background
  const rapport = await genererRapportConflits(blocage.id);

  res.status(201).json({
    blocage,
    conflits: rapport.conflitsDetectes.length,
    suggestions: rapport.suggestions.length,
    rapportComplet: rapport
  });
};
```

---

## 📊 Métriques et Monitoring

### Indicateurs clés

- **Taux de détection** : % de blocages générant des conflits
- **Types de conflits** : Répartition CHEVAUCHEMENT/CAPACITE/HORAIRE/etc.
- **Distribution des impacts** : % FAIBLE/MODERE/ELEVE
- **Taux d'acceptation** : % de suggestions appliquées par conseillers

### Logging

```typescript
// Exemple de log structuré
logger.info('Conflit détecté', {
  blocageId,
  traducteurId,
  nombreConflits: conflits.length,
  typesConflits: conflits.map(c => c.type),
  nombreSuggestions: suggestions.length,
  impactMoyen: moyenne(suggestions.map(s => s.impact.total))
});
```

---

## 🔮 Évolutions futures

### Phase 2 - Réattribution complète

- [ ] Algorithme de recherche de candidats admissibles
- [ ] Score de pertinence des traducteurs (compétences, historique)
- [ ] Simulation d'impact en cascade
- [ ] Priorisation multi-critères

### Phase 3 - Intelligence

- [ ] Apprentissage des préférences du conseiller
- [ ] Suggestions proactives (avant création du blocage)
- [ ] Optimisation automatique des suggestions
- [ ] Analyse prédictive des risques

### Phase 4 - Intégration

- [ ] API publique pour outils externes
- [ ] Webhooks pour notifications
- [ ] Tableau de bord de suivi
- [ ] Rapports d'audit

---

## 📚 Références

### Code Backend
- **Service principal** : `backend/src/services/conflictDetectionService.ts` (967 lignes)
- **Routes API** : `backend/src/routes/conflicts.routes.ts`
- **Tests unitaires** : `backend/tests/conflict-detection.test.ts` (7 tests ✅)
- **Tests API** : `backend/tests/conflicts-api.integration.test.ts`

### Documentation
- **API REST** : `backend/docs/API-CONFLICTS.md`
- **Ce guide** : `DETECTION-CONFLITS-GUIDE.md`

### Services connexes
- **Logique métier** : `backend/src/services/repartitionService.ts`
- **Calcul capacité** : `backend/src/utils/dateTimeOttawa.ts`

---

## ✅ Checklist d'implémentation

### Backend ✅ COMPLET
- [x] Structure des types et interfaces
- [x] Détection des 5 types de conflits
- [x] Suggestions de réparation locale
- [x] Suggestions de réattribution (3 candidats)
- [x] Suggestions impossibilité
- [x] Calcul du score d'impact détaillé
- [x] Génération de rapports structurés
- [x] Suite de tests complète (7 tests passent)
- [x] Endpoints API REST (5 routes)
- [x] Documentation API complète

### Frontend 🚧 À FAIRE
- [ ] Hook automatique sur création de blocage
- [ ] Badge de notification de conflits
- [ ] Modal d'affichage des conflits et suggestions
- [ ] Cartes de suggestions avec score d'impact
- [ ] Bouton d'application/rejet de suggestion
- [ ] Historique des conflits résolus

### Monitoring 🚧 À FAIRE
- [ ] Logging structuré
- [ ] Métriques de performance
- [ ] Dashboard de conflits en attente
- [ ] Suggestions de réattribution (Phase 2)
- [ ] Détection d'impossibilité (Phase 2)

---

**✨ Statut : Système de base implémenté et testé**

Le système détecte les conflits, calcule des scores d'impact et génère des suggestions de réparation locale. Les invariants sont garantis : aucune modification automatique n'est effectuée.

Prochaine étape : Intégration API et interface frontend.
