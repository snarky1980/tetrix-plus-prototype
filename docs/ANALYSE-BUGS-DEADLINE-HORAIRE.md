# 🐛 Analyse Détaillée des Bugs - Intégration Heure du Délai

## 📋 Inventaire Complet des Bugs

### 🔴 BUG CRITIQUE #1: Deadline Traitée comme Date-Only

**Fichier**: `backend/src/services/repartitionService.ts`  
**Lignes**: 58-81  
**Sévérité**: CRITIQUE  

#### Code Actuel Problématique

```typescript
// Ligne 74-77
const { date: echeance, iso: dateEcheanceISO, hasTime: echeanceHasTime } = modeTimestamp
  ? normalizeToOttawaWithTime(dateEcheanceInput, true, 'dateEcheance')
  : { ...normalizeToOttawa(dateEcheanceInput, 'dateEcheance'), hasTime: false };
```

#### Problème

1. **Mode Legacy (par défaut)**: `modeTimestamp = false`
   - Utilise `normalizeToOttawa()` qui parse uniquement la date
   - Résultat: `echeance = 2025-12-16T00:00:00` (minuit)
   - Mais le code alloue comme si deadline = fin de journée

2. **Mode Timestamp**: `modeTimestamp = true`
   - Parse correctement l'heure MAIS aucune utilisation dans l'allocation!
   - Lignes 140-163: Allocation quotidienne ignore `echeanceHasTime`
   - Pas de calcul d'heure effective de fin

#### Symptômes

- Deadline à `14:00` alloue jusqu'à `23:59` implicitement
- Impossible de livrer "matin" vs "après-midi"
- Tests avec `livraisonMatinale` = hack workaround

#### Exemple Concret

```typescript
// Demande utilisateur
const deadline = "2025-12-16T14:00:00";
const heures = 8;

// Comportement ACTUEL
// → Alloue 7.5h le 16 déc (toute la journée)
// → Impossible! Deadline à 14h!

// Comportement ATTENDU
// → Alloue max jusqu'à 14:00 le jour J
// → Calcul: 09:00-12:00 (3h) + 13:00-14:00 (1h) = 4h jour J
// → Reste 4h → alloue jour précédent
```

#### Impact Business

- **Audits échouent**: Temps alloué après deadline réelle
- **Planification incorrecte**: Traducteurs voient tâches à des heures impossibles
- **Perte de confiance**: Système donne dates fantaisistes

#### Solution

1. Activer `modeTimestamp: true` par défaut
2. Créer `getEffectiveEndDateTime()` pour calculer heure limite jour J
3. Intégrer calcul horaire dans boucle d'allocation (lignes 140-163)

---

### 🔴 BUG MAJEUR #2: Pause 12h-13h Non Exclue de l'Allocation

**Fichier**: `backend/src/services/repartitionService.ts`  
**Lignes**: 140-163  
**Sévérité**: MAJEUR  

#### Code Actuel Problématique

```typescript
// Ligne 154-160
const libre = Math.max(capaciteJour - utilisees, 0);
if (libre > 0) {
  const alloue = Math.min(libre, restant);
  resultat.push({ date: iso, heures: alloue });
  restant -= alloue;
  heuresParJour[iso] = utilisees + alloue;
}
```

#### Problème

1. **Capacité brute utilisée**: 
   - `capaciteJour = 7.5h` (du modèle Traducteur)
   - Représente théoriquement 09:00-17:00 AVEC pause
   - Code alloue 7.5h comme si pause n'existait pas

2. **Résultat irréaliste**:
   ```
   Allocation: { date: "2025-12-15", heures: 7.5 }
   
   Interprétation implicite:
   - 09:00-10:00 = 1h
   - 10:00-11:00 = 1h
   - 11:00-12:00 = 1h
   - 12:00-13:00 = 1h ⚠️ PAUSE UTILISÉE!
   - 13:00-14:00 = 1h
   - 14:00-15:00 = 1h
   - 15:00-16:00 = 1h
   - 16:00-16:30 = 0.5h
   Total: 7.5h
   ```

3. **Tests QA documentent le bug**:
   - `qa-logic-temporale.test.ts` marque tests comme "BUG attendu"
   - Commentaires: "La fonction actuelle soustrait 1h même si pas de chevauchement"

#### Symptômes

- Allocations quotidiennes de 7.5h impossibles physiquement
- Traducteurs reçoivent tâches dépassant temps réel
- Calcul capacité globale surestimé (37.5h au lieu de 35h sur 5 jours)

#### Exemple Concret

```typescript
// Scénario
const traducteur = { capaciteHeuresParJour: 7.5 }; // 09:00-17:00
const heures = 15; // 2 jours théoriques
const deadline = "2025-12-17";

// Comportement ACTUEL
const resultat = await repartitionJusteATemps(...);
// → [
//   { date: "2025-12-17", heures: 7.5 },  ⚠️ Inclut 12-13h!
//   { date: "2025-12-16", heures: 7.5 }   ⚠️ Inclut 12-13h!
// ]

// Comportement ATTENDU
// → [
//   { date: "2025-12-17", heures: 7.0 },  // 09-12 + 13-17
//   { date: "2025-12-16", heures: 7.0 },
//   { date: "2025-12-15", heures: 1.0 }   // Reste
// ]
```

#### Impact Business

- **Surcharge cachée**: Système accepte tâches irréalisables
- **Burn-out traducteurs**: Planification ne considère pas pause obligatoire
- **Audit fails**: Inspections révèlent temps bloqué utilisé

#### Solution

1. Option A: Soustraire 1h systématiquement
   ```typescript
   const capaciteNette = capaciteJour - 1; // Pause midi
   const libre = Math.max(capaciteNette - utilisees, 0);
   ```

2. Option B (PRÉFÉRÉE): Utiliser `capaciteDisponiblePlageHoraire()`
   ```typescript
   const debutJour = setHoursOttawa(courant, 9, 0, 0);
   const finJour = setHoursOttawa(courant, 17, 0, 0);
   const capaciteNette = capaciteDisponiblePlageHoraire(debutJour, finJour, true);
   // → 7h (8h - 1h pause)
   ```

---

### 🟠 BUG MAJEUR #3: Horaire Traducteur Jamais Utilisé

**Fichier**: `backend/prisma/schema.prisma` + Tous services  
**Sévérité**: MAJEUR  

#### Situation Actuelle

```prisma
// schema.prisma:69
model Traducteur {
  horaire String?  // Ex: "07:00-15:00", "9h-17h"
  // ⚠️ Champ existe depuis import CISR, mais...
}
```

```typescript
// repartitionService.ts - AUCUNE utilisation
const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
// traducteur.horaire → IGNORÉ PARTOUT
```

#### Problème

1. **Données riches inutilisées**:
   - CISR a des horaires variés: `"7h30-15h30"`, `"8h-16h"`, `"9h-17h"`
   - Import les stocke correctement
   - Mais ZÉRO logique métier ne les consulte

2. **Allocation hors horaires**:
   ```
   Traducteur: "Michaud, Marie-Ève" - horaire: "7h30-15h30"
   Deadline: 2025-12-16T18:00:00
   
   Comportement ACTUEL:
   → Alloue jusqu'à 18:00 (deadline)
   → Traducteur travaille jusqu'à 18h ⚠️ Hors horaire!
   
   Comportement ATTENDU:
   → Capé à 15:30 (fin horaire)
   → Reste alloué jour précédent
   ```

3. **Hardcodé implicite**:
   - Code assume 09:00-17:00 partout
   - Aucune flexibilité horaire

#### Symptômes

- Allocations ignorent fin de poste
- Traducteurs matin (07:00-15:00) reçoivent tâches PM
- Tests n'ont pas de couverture horaires multiples

#### Exemple Concret

```typescript
// Données réelles CISR
const traducteurs = [
  { nom: "Michaud", horaire: "7h30-15h30" },   // Finish à 15h30
  { nom: "Ouellet", horaire: "8h-16h" },        // Finish à 16h00
  { nom: "Mean", horaire: "9h-17h" }            // Finish à 17h00
];

// Deadline commune: 16:30

// Comportement ACTUEL
// → Tous 3 reçoivent allocation jusqu'à 16:30

// Comportement ATTENDU
// → Michaud: capé à 15:30 ✓
// → Ouellet: capé à 16:00 ✓
// → Mean: capé à 16:30 ✓
```

#### Impact Business

- **Violation contrats**: Traducteurs contactés hors horaire
- **Syndicat/RH**: Plaintes pour non-respect plages travail
- **Efficacité**: Tâches assignées quand ressource absente

#### Solution

1. Parser `horaire` string → `{ heureDebut, heureFin }`
2. Fonction `parseHoraireTraducteur(horaire: string): HoraireTraducteur`
3. Intégrer dans calculs:
   ```typescript
   const { heureDebut, heureFin } = parseHoraireTraducteur(traducteur.horaire);
   const effectiveEnd = min(deadline, setHours(jourJ, heureFin));
   ```

---

### 🟡 BUG MINEUR #4: Calcul Capacité Globale Sans Pause

**Fichier**: `backend/src/services/repartitionService.ts`  
**Lignes**: 110-128  
**Sévérité**: MINEUR (dérivé de Bug #2)  

#### Code Actuel

```typescript
// Ligne 110-128
let capaciteDisponibleGlobale = 0;
for (let i = 0; i < totalJours; i++) {
  const d = addDaysOttawa(aujourdHui, i);
  if (isWeekendOttawa(d)) continue;
  const utilisees = heuresParJour[iso] || 0;
  const capaciteJour = traducteur.capaciteHeuresParJour; // 7.5h
  capaciteDisponibleGlobale += Math.max(capaciteJour - utilisees, 0);
}
```

#### Problème

Utilise `capaciteHeuresParJour` brut (7.5h) au lieu de capacité nette (7h après pause).

#### Exemple

```
Période: 11-15 déc (5 jours ouvrables)
Capacité par jour: 7.5h
Calcul ACTUEL: 5 × 7.5 = 37.5h disponibles

Réalité:
- Chaque jour a 1h pause
- Capacité nette: 5 × 7 = 35h

Impact:
→ Accepte tâche de 36h
→ ERREUR: "Capacité insuffisante" à l'allocation (correct)
→ Mais message confus: "disponible: 37.5h" (faux)
```

#### Impact

Confusion utilisateur: erreur dit "37.5h disponibles" mais refuse 36h.

#### Solution

```typescript
const capaciteJourNette = capaciteJour - 1; // Pause midi
capaciteDisponibleGlobale += Math.max(capaciteJourNette - utilisees, 0);
```

---

### 🟡 BUG MINEUR #5: Tests Documentent Bugs Comme "Attendus"

**Fichier**: `backend/tests/qa-logic-temporale.test.ts`  
**Lignes**: 95-115, 118-138  
**Sévérité**: MINEUR (test quality)  

#### Extrait

```typescript
// Ligne 112-115
it('08h-12h ne chevauche PAS la pause → aucune soustraction', () => {
  // ...
  // BUG ATTENDU: La fonction actuelle soustrait 1h même si pas de chevauchement!
  // Ce test devrait ÉCHOUER avec l'implémentation actuelle
  // expect(heuresAvecPause).toBe(4); // Ce qu'on VEUT
  // expect(heuresAvecPause).toBe(3); // Ce qu'on OBTIENT (BUG)
  
  const anomalie = heuresAvecPause < heuresSansPause 
    ? 'BUG: Pause soustraite alors que plage ne chevauche pas 12h-13h' 
    : 'OK';
});
```

#### Problème

Tests **documentent** bugs au lieu de les **capturer** (fail).

#### Solution

1. Corriger `capaciteDisponiblePlageHoraire()` (déjà fait ✓)
2. Activer assertions réelles
3. Supprimer commentaires "BUG ATTENDU"

**NOTE**: La fonction `calculerChevauchementPauseMidi()` est DÉJÀ correcte! 
Le bug est que `repartitionJusteATemps()` ne l'utilise pas.

---

## 📊 Résumé Priorisation

| Bug | Sévérité | Impact Audit | Impact Planification | Effort Correction |
|-----|----------|-------------|---------------------|------------------|
| #1 Deadline Date-Only | 🔴 CRITIQUE | ❌ Fail | ❌ Dates fausses | 🔧🔧🔧 Moyen |
| #2 Pause Non Exclue | 🔴 MAJEUR | ❌ Fail | ❌ Surcharge | 🔧 Facile |
| #3 Horaire Ignoré | 🟠 MAJEUR | ⚠️ Partiel | ❌ Hors horaire | 🔧🔧 Moyen |
| #4 Capacité Globale | 🟡 MINEUR | ✅ OK | ⚠️ Message confus | 🔧 Trivial |
| #5 Tests Passifs | 🟡 MINEUR | N/A | N/A | 🔧 Trivial |

---

## 🎯 Ordre de Correction Recommandé

### Phase 1: Quick Wins (1-2h)
1. **Bug #2**: Soustraire pause dans allocation
2. **Bug #4**: Corriger calcul capacité globale
3. **Bug #5**: Activer assertions tests

### Phase 2: Horaire Traducteur (2-3h)
4. **Bug #3**: Parser + intégrer horaire
5. Tests horaires multiples

### Phase 3: Deadline avec Heure (3-4h)
6. **Bug #1**: Implémenter `getEffectiveEndDateTime()`
7. Refactor allocation JAT avec granularité horaire
8. Tests deadline précise

### Phase 4: Validation Globale (1h)
9. Exécuter tous tests
10. Audit complet scénarios réels

**Total Estimé**: 7-10 heures développement

---

## 🧪 Scénarios de Test Obligatoires

### Test Canonique (Règle Métier Centrale)

```typescript
describe('Cas canonique - Deadline 14h, horaire 07-15, pause 12-13', () => {
  it('Alloue 2h sans toucher pause ni dépasser horaire', async () => {
    // Setup
    const traducteur = {
      id: 'test-1',
      nom: 'Test Traducteur',
      capaciteHeuresParJour: 7.5,
      horaire: '07:00-15:00'
    };
    
    const deadline = '2025-12-16T14:00:00';
    const heures = 2;
    
    // Execute
    const resultat = await repartitionJusteATemps(
      traducteur.id, 
      heures, 
      deadline,
      { modeTimestamp: true, debug: true }
    );
    
    // Assertions
    expect(resultat).toHaveLength(2); // 2 blocs
    
    // Bloc 1: 13:00-14:00 (1h)
    expect(resultat[0]).toMatchObject({
      date: '2025-12-16',
      heures: 1,
      plageHoraire: '13:00-14:00' // NOUVEAU champ
    });
    
    // Bloc 2: 11:00-12:00 (1h)
    expect(resultat[1]).toMatchObject({
      date: '2025-12-16',
      heures: 1,
      plageHoraire: '11:00-12:00'
    });
    
    // Validations métier
    expect(resultat).not.toIncludePlage('12:00-13:00'); // Pas de pause
    expect(resultat).not.toIncludeAfter('14:00'); // Pas après deadline
    expect(resultat).not.toIncludeAfter('15:00'); // Pas après horaire
  });
});
```

### Autres Tests Critiques

```typescript
// Test: Deadline avant horaire
it('Deadline 06:00, horaire 07-15 → bascule jour précédent', async () => {
  const deadline = '2025-12-16T06:00:00';
  const resultat = await repartitionJusteATemps(...);
  
  expect(resultat[0].date).toBe('2025-12-15'); // Jour précédent
});

// Test: Deadline après horaire
it('Deadline 18:00, horaire 07-15 → capé à 15:00', async () => {
  const deadline = '2025-12-16T18:00:00';
  const resultat = await repartitionJusteATemps(...);
  
  // Ne doit pas allouer après 15:00
  expect(resultat).not.toIncludeAfter('15:00');
});

// Test: Multi-jours avec pause chaque jour
it('10h sur 2 jours → 7h + 3h (2 pauses exclues)', async () => {
  const heures = 10;
  const resultat = await repartitionJusteATemps(...);
  
  const jour1 = resultat.filter(r => r.date === '2025-12-16');
  const jour2 = resultat.filter(r => r.date === '2025-12-15');
  
  expect(somme(jour1)).toBeLessThanOrEqual(7); // Max 7h (avec pause)
  expect(somme(jour2)).toBeLessThanOrEqual(7);
  expect(resultat).not.toIncludePlage('12:00-13:00'); // Aucun jour
});
```

---

**Date**: 2025-12-13  
**Auteur**: Agent Senior - Analyse Bugs  
**Status**: Inventaire Complet ✓
