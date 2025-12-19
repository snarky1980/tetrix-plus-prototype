# API de Détection et Résolution de Conflits

## Vue d'ensemble

Cette API permet de détecter automatiquement les conflits d'allocation et de générer des suggestions de résolution pour les conseillers.

**Base URL**: `/api/conflicts`

---

## Endpoints

### 1. Détecter les conflits d'une allocation

**POST** `/api/conflicts/detect/allocation/:allocationId`

Détecte tous les conflits pour une allocation de tâche donnée.

#### Paramètres
- `allocationId` (path) - ID de l'ajustement temps (allocation de tâche)

#### Réponse succès (200)
```json
{
  "success": true,
  "data": {
    "allocationId": "uuid",
    "conflits": [
      {
        "type": "CHEVAUCHEMENT_BLOCAGE",
        "allocationId": "uuid",
        "blocageId": "uuid",
        "traducteurId": "uuid",
        "tacheId": "uuid",
        "dateConflict": "2025-12-23T00:00:00.000Z",
        "heureDebut": "09:00",
        "heureFin": "11:00",
        "heuresAllouees": 2,
        "explication": "L'allocation 09:00-11:00 chevauche le blocage 10:00-12:00"
      }
    ],
    "count": 1
  }
}
```

#### Réponse erreur (500)
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

---

### 2. Détecter les conflits d'un blocage

**POST** `/api/conflicts/detect/blocage/:blocageId`

Détecte toutes les allocations en conflit avec un blocage.

#### Paramètres
- `blocageId` (path) - ID de l'ajustement temps (blocage)

#### Réponse succès (200)
```json
{
  "success": true,
  "data": {
    "blocageId": "uuid",
    "conflits": [...],
    "count": 3
  }
}
```

---

### 3. Générer des suggestions de résolution

**POST** `/api/conflicts/suggest`

Génère des suggestions pour résoudre une liste de conflits.

#### Body
```json
{
  "conflits": [
    {
      "type": "CHEVAUCHEMENT_BLOCAGE",
      "allocationId": "uuid",
      "blocageId": "uuid",
      "traducteurId": "uuid",
      "tacheId": "uuid",
      "dateConflict": "2025-12-23T00:00:00.000Z",
      "heureDebut": "09:00",
      "heureFin": "11:00",
      "heuresAllouees": 2,
      "explication": "..."
    }
  ]
}
```

#### Réponse succès (200)
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "sugg-123-locale",
        "type": "REPARATION_LOCALE",
        "conflitsResolus": ["uuid1", "uuid2"],
        "tacheId": "uuid",
        "traducteurActuel": "uuid",
        "plagesProposees": [
          {
            "date": "2025-12-23T00:00:00.000Z",
            "heureDebut": "14:00",
            "heureFin": "16:00",
            "heuresDisponibles": 2
          }
        ],
        "scoreImpact": {
          "total": 25,
          "niveau": "FAIBLE",
          "decomposition": {
            "heuresDeplacees": 5,
            "nombreTachesAffectees": 5,
            "changementTraducteur": 0,
            "risqueEcheance": 10,
            "morcellement": 5
          },
          "justification": "Impact faible: déplacement de 2.0h sur 1 plage, marge de 48h avant échéance"
        },
        "creeA": "2025-12-19T12:00:00.000Z",
        "description": "Déplacer 2.0h sur 1 plages disponibles (même traducteur)"
      },
      {
        "id": "sugg-123-reattr",
        "type": "REATTRIBUTION",
        "conflitsResolus": ["uuid1", "uuid2"],
        "tacheId": "uuid",
        "traducteurActuel": "uuid",
        "traducteurPropose": "uuid-autre",
        "plagesProposees": [...],
        "candidatsAlternatifs": [
          {
            "traducteurId": "uuid",
            "traducteurNom": "Dupont, Marie",
            "heuresDisponiblesTotal": 35,
            "plagesDisponibles": [...],
            "peutCompleterAvantEcheance": true,
            "score": 87
          }
        ],
        "scoreImpact": {
          "total": 40,
          "niveau": "MODERE",
          "decomposition": {...},
          "justification": "Impact modéré: réattribution à un autre traducteur"
        },
        "creeA": "2025-12-19T12:00:00.000Z",
        "description": "Réattribuer 2.0h à Dupont, Marie (35.0h disponibles)"
      }
    ],
    "count": 2
  }
}
```

#### Réponse erreur (400)
```json
{
  "success": false,
  "error": "Le champ \"conflits\" est requis et doit être un tableau"
}
```

---

### 4. Générer un rapport complet pour un blocage

**POST** `/api/conflicts/report/blocage/:blocageId`

Génère un rapport complet avec conflits détectés et suggestions de résolution.

#### Paramètres
- `blocageId` (path) - ID du blocage

#### Réponse succès (200)
```json
{
  "success": true,
  "data": {
    "blocageId": "uuid",
    "traducteurId": "uuid",
    "dateDebut": "2025-12-23T00:00:00.000Z",
    "dateFin": "2025-12-23T00:00:00.000Z",
    "conflits": [...],
    "suggestions": [...],
    "nbConflits": 3,
    "nbSuggestions": 2,
    "genereA": "2025-12-19T12:00:00.000Z"
  }
}
```

---

### 5. Analyse complète d'une allocation

**GET** `/api/conflicts/allocation/:allocationId/full`

Détecte les conflits ET génère les suggestions en une seule requête (optimisé pour le frontend).

#### Paramètres
- `allocationId` (path) - ID de l'allocation

#### Réponse succès (200)
```json
{
  "success": true,
  "data": {
    "allocationId": "uuid",
    "conflits": [...],
    "suggestions": [...],
    "hasConflicts": true,
    "conflictCount": 2,
    "suggestionCount": 3
  }
}
```

---

## Types de Conflits

| Type | Description |
|------|-------------|
| `CHEVAUCHEMENT_BLOCAGE` | L'allocation chevauche un blocage du traducteur |
| `DEPASSEMENT_CAPACITE` | Les heures totales dépassent la capacité journalière |
| `HORS_HORAIRE` | L'allocation est hors des heures de travail du traducteur |
| `EMPIETE_PAUSE` | L'allocation chevauche la pause déjeuner |
| `ECHEANCE_IMPOSSIBLE` | Impossible de terminer avant l'échéance |

---

## Types de Suggestions

| Type | Description | Cas d'usage |
|------|-------------|-------------|
| `REPARATION_LOCALE` | Déplacer les heures sur d'autres plages (même traducteur) | Le traducteur a des plages disponibles |
| `REATTRIBUTION` | Réassigner la tâche à un autre traducteur | Un autre traducteur est disponible |
| `IMPOSSIBLE` | Aucune solution automatique possible | Aucune capacité disponible avant l'échéance |

---

## Score d'Impact

Chaque suggestion inclut un score d'impact détaillé:

- **total**: 0-100 (score global)
- **niveau**: FAIBLE (0-33), MODERE (34-66), ELEVE (67-100)
- **decomposition**: Détail des 5 facteurs
  - `heuresDeplacees`: +1 à +20 selon le volume
  - `nombreTachesAffectees`: +5 par tâche supplémentaire
  - `changementTraducteur`: +15 si réattribution
  - `risqueEcheance`: +10 à +30 selon la marge
  - `morcellement`: +5 par plage additionnelle
- **justification**: Explication textuelle

---

## Exemples d'utilisation

### Détecter les conflits lors de la création d'un blocage

```javascript
// Quand un conseiller crée un blocage
const response = await fetch('/api/conflicts/detect/blocage/' + blocageId, {
  method: 'POST'
});
const { data } = await response.json();

if (data.count > 0) {
  // Afficher alerte: "⚠️ Ce blocage entre en conflit avec 3 allocations"
  showConflictAlert(data.conflits);
}
```

### Obtenir des suggestions pour un conflit

```javascript
// Après détection, demander des suggestions
const response = await fetch('/api/conflicts/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ conflits: data.conflits })
});
const { data: suggestions } = await response.json();

// Afficher les suggestions avec leur score d'impact
suggestions.suggestions.forEach(sugg => {
  console.log(`${sugg.type}: ${sugg.description}`);
  console.log(`Impact: ${sugg.scoreImpact.niveau} (${sugg.scoreImpact.total}/100)`);
});
```

### Analyse complète en une requête

```javascript
// Vérifier une allocation avant de la sauvegarder
const response = await fetch('/api/conflicts/allocation/' + allocationId + '/full');
const { data } = await response.json();

if (data.hasConflicts) {
  // Afficher modal avec conflits et suggestions
  showConflictModal(data.conflits, data.suggestions);
}
```

---

## Notes d'implémentation

### Performance
- Les recherches de traducteurs alternatifs sont limitées à 5 candidats
- Les plages disponibles sont calculées jusqu'à l'échéance de la tâche
- Timeout de détection: 15 secondes maximum

### Sécurité
- Toutes les routes nécessitent une authentification (ajoutez middleware auth si besoin)
- Les IDs sont validés par Prisma (UUID)
- Les erreurs sont loggées côté serveur

### Intégration Frontend
1. Appeler `/full` après création/modification d'allocation
2. Afficher badge de notification si `hasConflicts === true`
3. Présenter les suggestions triées par `scoreImpact.total` (croissant)
4. Permettre au conseiller d'accepter/refuser chaque suggestion
5. Marquer la suggestion comme appliquée après validation

---

## Prochaines étapes

- [ ] Ajouter middleware d'authentification
- [ ] Implémenter endpoint pour appliquer une suggestion
- [ ] Ajouter webhook pour notification temps réel
- [ ] Créer dashboard de conflits en attente
- [ ] Historique des conflits résolus
