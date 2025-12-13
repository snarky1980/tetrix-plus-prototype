# 🗺️ Cartographie de la Logique de Répartition - Tetrix Plus

## 📋 Vue d'Ensemble

Ce document cartographie **toute** la logique de répartition/allocation des heures avant l'intégration de l'heure du délai (deadline datetime).

---

## 🏗️ Architecture Actuelle

### Fichiers Clés

#### Backend - Services

1. **`backend/src/services/repartitionService.ts`** (408 lignes)
   - `repartitionJusteATemps()` - JAT (Just-in-Time) - Allocation à rebours depuis deadline
   - `repartitionEquilibree()` - Distribution équitable sur période
   - `repartitionPEPS()` - Premier Entré Premier Sorti
   - `repartitionUniforme()` - Distribution uniforme (frontend uniquement)
   - `heuresUtiliseesParJour()` - Helper interne pour calculer heures déjà allouées

2. **`backend/src/services/capaciteService.ts`** (199 lignes)
   - `capaciteDisponibleJour()` - Calcul capacité disponible pour UN jour
   - `verifierCapaciteJournaliere()` - Validation dépassement capacité
   - **`capaciteDisponiblePlageHoraire()`** - **CRITIQUE** - Calcul heures disponibles entre 2 datetime
   - `calculerChevauchementPauseMidi()` - **NOUVEAU** - Calcul chevauchement avec 12h-13h

3. **`backend/src/utils/dateTimeOttawa.ts`**
   - Toutes les opérations de dates/times en timezone Ottawa (America/Toronto)
   - `normalizeToOttawa()` - Parse date-only
   - `normalizeToOttawaWithTime()` - Parse datetime avec heure
   - `differenceInHoursOttawa()` - Calcul différence en heures
   - `hasSignificantTime()` - Détecte si timestamp a une heure significative

#### Backend - Controllers

4. **`backend/src/controllers/repartitionController.ts`**
   - `previewJAT()` - Endpoint pour prévisualiser répartition JAT
   - `previewEquilibre()` - Endpoint pour répartition équilibrée
   - `previewPEPS()` - Endpoint pour répartition PEPS

#### Backend - Models

5. **`backend/prisma/schema.prisma`**
   ```prisma
   model Traducteur {
     capaciteHeuresParJour Float @default(7.5)
     horaire String?  // ⚠️ EXISTE mais NON UTILISÉ dans la logique
   }
   
   model Tache {
     dateEcheance DateTime  // ⚠️ Actuellement traité comme date-only
   }
   
   model AjustementTemps {
     date Date
     heures Float
   }
   ```

---

## 🔄 Flux Actuel de Répartition

### Algorithme JAT (Just-in-Time) - Principal Concerné

```
INPUT:
  - traducteurId: string
  - heuresTotal: number (ex: 10h)
  - dateEcheanceInput: DateInput (ex: "2025-12-16" ou Date object)
  - options?: { livraisonMatinale, heuresMaxJourJ, debug, modeTimestamp }

ÉTAPE 1: Normalisation de la deadline
  - Mode legacy: normalizeToOttawa() → minuit du jour d'échéance
  - Mode timestamp: normalizeToOttawaWithTime() → garde l'heure si présente
  
ÉTAPE 2: Calcul de capacité disponible globale
  FOR chaque jour de [aujourd'hui, deadline]:
    IF weekend: skip
    ELSE:
      capaciteJour = traducteur.capaciteHeuresParJour (ex: 7.5h)
      utilisees = heuresParJour[date] (ajustements existants)
      disponible = capaciteJour - utilisees
      capaciteDisponibleGlobale += disponible
  
  IF heuresTotal > capaciteDisponibleGlobale:
    THROW "Capacité insuffisante"

ÉTAPE 3: Allocation à rebours (JAT core logic)
  restant = heuresTotal
  courant = deadline
  resultat = []
  
  WHILE restant > 0 AND iterations < 90:
    IF courant < aujourdHui: BREAK
    IF weekend: skip
    
    libre = capaciteJour - utilisees
    IF libre > 0:
      alloue = min(libre, restant)
      resultat.push({ date: courant, heures: alloue })
      restant -= alloue
      
    courant = courant - 1 jour
    iterations++
  
  RETURN resultat.sort(asc)

PROBLÈMES IDENTIFIÉS:
  ❌ Deadline toujours traitée comme "fin de journée" (23:59:59)
  ❌ Pas de notion d'heure effective de fin de travail
  ❌ Pause 12h-13h NON exclue de l'allocation quotidienne
  ❌ Horaire du traducteur (07:00-15:00) NON pris en compte
```

### Fonction Critique: `capaciteDisponiblePlageHoraire()`

**Rôle**: Calculer heures disponibles entre 2 datetime en excluant pause midi

```typescript
// backend/src/services/capaciteService.ts:102-119

export function capaciteDisponiblePlageHoraire(
  dateDebut: Date,
  dateFin: Date,
  soustraireDejeAutomatiquement: boolean = true
): number {
  const heuresDisponibles = differenceInHoursOttawa(dateDebut, dateFin);
  
  if (!soustraireDejeAutomatiquement || heuresDisponibles <= 0) {
    return Math.max(heuresDisponibles, 0);
  }
  
  // ✅ Calcul du chevauchement RÉEL avec 12h-13h
  const heuresPause = calculerChevauchementPauseMidi(dateDebut, dateFin);
  
  return Math.max(heuresDisponibles - heuresPause, 0);
}
```

**Tests Existants** (backend/tests/qa-logic-temporale.test.ts):
- ✅ 09h-17h → 8h brut, 7h avec pause (OK)
- ⚠️ 08h-12h → devrait être 4h, mais soustrait pause (BUG attendu documenté)
- ⚠️ 13h-17h → devrait être 4h, mais soustrait pause (BUG attendu documenté)
- ✅ 10h-14h → 4h brut, 3h avec pause (OK)
- ⚠️ Multi-jours → soustrait 1h au lieu de 1h par jour (BUG documenté)

**État**: La fonction `calculerChevauchementPauseMidi()` existe et est correcte, mais **pas utilisée** dans `repartitionJusteATemps()`!

---

## 🐛 Bugs Identifiés

### BUG #1: Deadline = Date-Only (Critique)

**Localisation**: `repartitionService.ts:58-81`

```typescript
// Mode legacy (par défaut)
const { date: echeance } = normalizeToOttawa(dateEcheanceInput, 'dateEcheance');
// → echeance = 2025-12-16T00:00:00 (minuit)
// → Mais utilisée comme "fin de journée" dans l'allocation
```

**Impact**: 
- Deadline à 14h00 traitée comme 23:59:59
- Allocation peut déborder au-delà de l'heure réelle du délai
- Perte de précision pour livraisons matinales

**Solution**: Activer `modeTimestamp: true` et utiliser l'heure effective

---

### BUG #2: Pause 12h-13h Non Exclue de l'Allocation Quotidienne (Majeur)

**Localisation**: `repartitionService.ts:140-163`

```typescript
// Allocation JAT
const libre = Math.max(capaciteJour - utilisees, 0);
if (libre > 0) {
  const alloue = Math.min(libre, restant);
  resultat.push({ date: iso, heures: alloue });
  // ❌ PROBLÈME: 'alloue' peut être 7.5h alors que jour a pause 12h-13h
  // ❌ Résultat: Allocation couvre implicitement 12h-13h
}
```

**Exemple Concret**:
- Traducteur: 7.5h/jour (assume 09h-17h avec pause)
- Allocation: `{ date: "2025-12-15", heures: 7.5 }`
- Réalité: Impossible car 12h-13h bloqué → max 7h travaillables

**Impact**:
- Allocations irréalistes
- Audit fails car temps bloqué utilisé
- Tests QA documentent ce bug comme "attendu"

**Solution**: 
1. Calculer heures travaillables réelles = capaciteJour - 1h (pause)
2. Ou utiliser `capaciteDisponiblePlageHoraire()` pour chaque jour

---

### BUG #3: Horaire Traducteur Ignoré (Majeur)

**Localisation**: `prisma/schema.prisma:69` + Tous les services

```prisma
model Traducteur {
  horaire String?  // Ex: "07:00-15:00" ou "9h-17h"
  // ⚠️ Champ existe, parsé depuis CISR, mais JAMAIS utilisé
}
```

**Impact**:
- Traducteur avec horaire 07:00-15:00 peut recevoir allocation jusqu'à 17h
- Deadline à 18:00 pas capée à 15:00 (fin horaire)
- Impossible de respecter contrainte métier réelle

**Solution**: Parser `horaire`, extraire heureDebut/heureFin, intégrer dans calculs

---

### BUG #4: Calcul Capacité Globale Simplifié (Mineur)

**Localisation**: `repartitionService.ts:110-128`

```typescript
for (let i = 0; i < totalJours; i++) {
  const d = addDaysOttawa(aujourdHui, i);
  const capaciteJour = traducteur.capaciteHeuresParJour; // Ex: 7.5h
  capaciteDisponibleGlobale += Math.max(capaciteJour - utilisees, 0);
}
```

**Problème**: 
- Utilise `capaciteHeuresParJour` brute (7.5h)
- Ne soustrait pas pause midi
- Sur 5 jours: calcule 37.5h au lieu de 35h (7h × 5)

**Impact**: Accepte des tâches impossibles à répartir sans empiéter sur pause

---

## 🎯 Règles Métier à Implémenter

### Règle #1: Horaire de Travail par Ressource

```
Chaque traducteur a un horaire stocké dans Traducteur.horaire
Format: "07:00-15:00" ou "9h-17h" ou null (défaut 09:00-17:00)

Parser l'horaire:
  - heureDebut: 07:00 → 7.0
  - heureFin: 15:00 → 15.0

Validation:
  - Allocation ne peut JAMAIS sortir de [heureDebut, heureFin]
  - Deadline à 18:00 avec horaire 07:00-15:00 → capée à 15:00
```

### Règle #2: Pause Midi Obligatoire

```
12:00-13:00 est TOUJOURS bloquée (1h non-travaillable)

Application:
  - Capacité quotidienne effective = horaire_total - 1h
  - Ex: 09h-17h (8h) → 7h travaillables
  - Ex: 07h-15h (8h) → 7h travaillables
  
Allocation:
  - Interdiction absolue d'allouer dans [12:00, 13:00]
  - Si allocation "tombe dedans", sauter et continuer avant 12:00
```

### Règle #3: Deadline avec Heure Précise

```
Le délai est un datetime: YYYY-MM-DDTHH:MM:SS

Le travail doit finir AU PLUS TARD à deadline

Pour une journée J avec deadline:
  plageMax = min(heureFin_horaire, deadline_time)
  
Exemples:
  - Horaire 07:00-15:00, Deadline 14:00 → plageMax = 14:00
  - Horaire 07:00-15:00, Deadline 18:00 → plageMax = 15:00 (horaire prime)
  - Horaire 07:00-15:00, Deadline 06:00 → bascule jour précédent
```

### Règle #4: Allocation à Rebours (JAT)

```
Principe: Remplir en remontant depuis deadline

Algorithme:
  1. Partir de deadline (date+heure)
  2. Pour jour J (deadline):
       fin_effective = min(deadline_time, heureFin_horaire)
       debut = max(heureDebut_horaire, fin_effective - heures_restantes)
       
       IF debut < 13:00 AND fin_effective > 12:00:
         // Chevauchement pause midi
         bloc_apres_pause = [13:00, fin_effective]
         bloc_avant_pause = [debut, 12:00]
         
  3. Remonter jour par jour si heures restantes
  4. Exclure weekends
  5. Respecter horaires et pause pour chaque jour
```

---

## 📦 Données Existantes

### Horaires Traducteurs (Exemple réel)

Extrait de `backend/src/controllers/importController.ts:42`:

```typescript
{ nom: 'Mean, Sun-Kiri', classification: 'TR-02', horaire: '9h-17h' }
{ nom: 'Michaud, Marie-Ève', classification: 'TR-03', horaire: '7h30-15h30' }
{ nom: 'Michel, Natacha', classification: 'TR-03', horaire: '7h30-16h05' }
{ nom: 'Milliard, Sophie', classification: 'TR-02', horaire: '8h30-16h30' }
{ nom: 'Ouellet, Diane', classification: 'TR-02', horaire: '8h-16h' }
```

**Formats à supporter**:
- `"7h30-15h30"` → 7.5 - 15.5
- `"07:00-15:00"` → 7.0 - 15.0
- `"9h-17h"` → 9.0 - 17.0
- `null` → défaut 9.0 - 17.0

---

## 🧪 Tests Existants

### Tests Pause Midi (qa-logic-temporale.test.ts)

```typescript
// SECTION 2: Tests critiques pause 12h-13h
describe('🍽️ PAUSE 12h-13h - Exclusion obligatoire', () => {
  
  ✅ Test 1: "09h-17h doit soustraire 1h pour pause"
     Attendu: 8h → 7h ✓
     
  ⚠️ Test 2: "08h-12h ne chevauche PAS → aucune soustraction"
     Attendu: 4h → 4h
     Obtenu: 4h → 3h (BUG documenté)
     
  ⚠️ Test 3: "13h-17h ne chevauche PAS → aucune soustraction"
     Attendu: 4h → 4h
     Obtenu: 4h → 3h (BUG documenté)
     
  ✅ Test 4: "10h-14h chevauche → 1h soustraction"
     Attendu: 4h → 3h ✓
     
  ⚠️ Test 5: "Multi-jours 2 pauses"
     Attendu: 32h → 30h (2h pause)
     Obtenu: 32h → 31h (1h pause - BUG)
});
```

**Constat**: La fonction `calculerChevauchementPauseMidi()` est correcte mais:
- ✅ Tests unitaires sur `capaciteDisponiblePlageHoraire()` PASSENT
- ❌ Fonction PAS appelée dans `repartitionJusteATemps()`
- ❌ Résultat: Allocations quotidiennes incluent implicitement 12h-13h

---

## 🛠️ Plan d'Intervention

### Phase 1: Parser Horaire Traducteur

**Nouveau helper** (`utils/dateTimeOttawa.ts`):

```typescript
export interface HoraireTraducteur {
  heureDebut: number;  // 7.0 pour 07:00
  heureFin: number;    // 15.0 pour 15:00
}

export function parseHoraireTraducteur(horaire: string | null): HoraireTraducteur {
  if (!horaire) {
    return { heureDebut: 9.0, heureFin: 17.0 }; // Défaut
  }
  
  // Regex: "7h30-15h30" ou "07:00-15:00"
  const match = horaire.match(/(\d+)h?:?(\d*)\s*-\s*(\d+)h?:?(\d*)/);
  if (!match) {
    return { heureDebut: 9.0, heureFin: 17.0 };
  }
  
  const [_, hDebut, mDebut, hFin, mFin] = match;
  const heureDebut = parseInt(hDebut) + (mDebut ? parseInt(mDebut) / 60 : 0);
  const heureFin = parseInt(hFin) + (mFin ? parseInt(mFin) / 60 : 0);
  
  return { heureDebut, heureFin };
}
```

### Phase 2: Fonction `getEffectiveEndDateTime()`

**Nouveau** (`services/capaciteService.ts`):

```typescript
export function getEffectiveEndDateTime(
  traducteur: { horaire: string | null },
  deadlineDateTime: Date,
  jourConcerne: Date
): Date {
  const { heureFin } = parseHoraireTraducteur(traducteur.horaire);
  
  // Créer datetime pour heureFin du jour concerné
  const finJournee = setHoursOttawa(jourConcerne, heureFin, 0, 0);
  
  // Si deadline est le même jour ET avant finJournee, utiliser deadline
  if (isSameDayOttawa(deadlineDateTime, jourConcerne)) {
    return deadlineDateTime < finJournee ? deadlineDateTime : finJournee;
  }
  
  // Sinon, fin de journée normale
  return finJournee;
}
```

### Phase 3: Intégrer dans `repartitionJusteATemps()`

**Modifications** (`services/repartitionService.ts`):

1. Récupérer horaire traducteur
2. Pour chaque jour d'allocation:
   - Calculer `effectiveEnd = getEffectiveEndDateTime()`
   - Calculer heures travaillables RÉELLES (excluant pause)
   - Générer time blocks respectant horaire + pause
3. Allocation à rebours en tenant compte des blocs réels

### Phase 4: Tests Obligatoires

**Nouveau fichier** (`tests/deadline-horaire.test.ts`):

```typescript
describe('🕐 Deadline avec Heure + Horaire Traducteur', () => {
  
  it('Deadline 14:00, horaire 07:00-15:00, 2h → [13:00-14:00, 11:00-12:00]', async () => {
    // ...
  });
  
  it('Deadline 12:30 → ignore midi, place avant 12:00', async () => {
    // ...
  });
  
  it('Deadline 18:00, horaire 07:00-15:00 → capé à 15:00', async () => {
    // ...
  });
  
  it('Deadline 06:00 avant horaire → bascule jour précédent', async () => {
    // ...
  });
  
  it('Multi-jours 10h → distribution sans toucher 12-13h', async () => {
    // ...
  });
});
```

---

## 📊 Résumé État Actuel

| Composant | État | Utilise Horaire | Utilise Heure Deadline | Exclut Pause 12-13 |
|-----------|------|----------------|----------------------|-------------------|
| `repartitionJusteATemps()` | ⚠️ Legacy | ❌ Non | ❌ Non (mode legacy) | ❌ Non |
| `repartitionEquilibree()` | ⚠️ Legacy | ❌ Non | N/A | ❌ Non |
| `repartitionPEPS()` | ⚠️ Legacy | ❌ Non | N/A | ❌ Non |
| `capaciteDisponiblePlageHoraire()` | ✅ Correct | ❌ Non | ✅ Oui | ✅ Oui |
| `calculerChevauchementPauseMidi()` | ✅ Correct | N/A | N/A | ✅ Oui |
| `parseHoraireTraducteur()` | ❌ À créer | - | - | - |
| `getEffectiveEndDateTime()` | ❌ À créer | - | - | - |

---

## 🎯 Objectif Final

Après correction, pour le cas canonique:

```
INPUT:
  Traducteur: { horaire: "07:00-15:00", capaciteHeuresParJour: 7.5 }
  Deadline: "2025-12-16T14:00:00"
  Heures: 2h

ÉTAPE 1: Parse horaire
  heureDebut = 7.0
  heureFin = 15.0

ÉTAPE 2: Deadline jour J (16 déc)
  effectiveEnd = min(14:00, 15:00) = 14:00
  
ÉTAPE 3: Calcul plages travaillables jour J
  Plage brute: [07:00, 14:00] = 7h
  Pause: [12:00, 13:00]
  Plages nettes:
    - [07:00, 12:00] = 5h
    - [13:00, 14:00] = 1h
  Total: 6h disponibles

ÉTAPE 4: Allocation 2h à rebours
  Bloc 1: [13:00, 14:00] = 1h
  Reste: 1h
  Bloc 2: [11:00, 12:00] = 1h
  Reste: 0h

RÉSULTAT:
  [
    { date: "2025-12-16", heures: 1, plage: "13:00-14:00" },
    { date: "2025-12-16", heures: 1, plage: "11:00-12:00" }
  ]

✅ Pas d'allocation 12h-13h
✅ Deadline 14:00 respectée
✅ Horaire 07:00-15:00 respecté
```

---

## 📝 Notes Importantes

1. **Compatibilité Ascendante**: 
   - Mode legacy (date-only) doit rester fonctionnel
   - Nouveau comportement activé via `modeTimestamp: true`

2. **Performance**:
   - Parser horaire UNE fois par traducteur
   - Cacher résultats `parseHoraireTraducteur()`

3. **Validation**:
   - Tous tests existants doivent rester verts
   - Nouveaux tests valident comportement avec heure

4. **UI Impact**:
   - Aucun changement UI requis (backend only)
   - API payloads inchangés (compatibilité)

---

**Date de Création**: 2025-12-13  
**Auteur**: Agent Senior - Révision Logique Métier  
**Version**: 1.0
