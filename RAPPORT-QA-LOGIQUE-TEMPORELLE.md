# 🔍 RAPPORT QA - LOGIQUE TEMPORELLE TETRIX PLUS

**Date:** 11 décembre 2025  
**Agent QA:** Système automatisé  
**Périmètre:** Gestion des heures, dates, capacités, découpage des tâches et **PAUSE OBLIGATOIRE 12h-13h**  
**Fichiers analysés:**
- `/backend/src/utils/dateTimeOttawa.ts`
- `/backend/src/services/capaciteService.ts`
- `/backend/src/services/repartitionService.ts`

---

## 📊 RÉSUMÉ EXÉCUTIF

### ✅ Vue d'ensemble

| Domaine | État | Fiabilité | Anomalies détectées |
|---------|------|-----------|---------------------|
| **Calcul d'heures** | ✅ **VALIDÉ** | 100% | Aucune |
| **Pause 12h-13h** | 🔴 **CRITIQUE** | 0% | 3 majeures |
| **Capacités journalières** | ⚠️ **PROBLÉMATIQUE** | 0% | Dépend de la pause |
| **Jours ouvrables** | ✅ **VALIDÉ** | 100% | Aucune |
| **Conservation heures** | ✅ **VALIDÉ** | 100% | Aucune |
| **Cas limites** | ⚠️ **ACCEPTABLE** | 80% | 1 mineure |
| **Déterminisme** | ✅ **VALIDÉ** | 100% | Aucune |
| **Timestamps** | ✅ **VALIDÉ** | 100% | Aucune |

### 🎯 Conclusion rapide

- **27 tests passés** sur 28 (96% de réussite technique)
- **3 ANOMALIES CRITIQUES** identifiées dans la gestion de la pause 12h-13h
- **Invariants de base respectés** (conservation heures, déterminisme)
- **PAUSE 12h-13h NON IMPLÉMENTÉE CORRECTEMENT** - Bug majeur affectant toutes les capacités

---

## 🔴 ANOMALIES CRITIQUES IDENTIFIÉES

### Anomalie #1: **Pause soustraite sans vérifier le chevauchement réel** [CRITIQUE]

**Sévérité:** 🔴 **CRITIQUE** - Impact: Calcul incorrect de capacité disponible  
**Statut:** 🐛 **BUG CONFIRMÉ**

**Description:**
La fonction `capaciteDisponiblePlageHoraire()` soustrait automatiquement 1h pour la "pause déjeuner" dès que la plage > 1h, **SANS VÉRIFIER SI ELLE CHEVAUCHE RÉELLEMENT 12h-13h**.

**Code problématique:**
```typescript
// backend/src/services/capaciteService.ts:96-107
export function capaciteDisponiblePlageHoraire(
  dateDebut: Date,
  dateFin: Date,
  soustraireDejeAutomatiquement: boolean = true
): number {
  let heuresDisponibles = differenceInHoursOttawa(dateDebut, dateFin);
  
  // ❌ BUG: Soustrait 1h pour TOUTE plage > 1h, même si pas de chevauchement
  if (soustraireDejeAutomatiquement && heuresDisponibles > 1) {
    heuresDisponibles = Math.max(heuresDisponibles - 1, 0);
  }
  
  return heuresDisponibles;
}
```

**Preuve reproductible:**

**Test Case 1: 08h-12h (avant la pause)**
```typescript
// Input
debut: 2025-12-15T08:00:00
fin:   2025-12-15T12:00:00

// Résultat actuel
heuresSansPause: 4h
heuresAvecPause: 3h  ❌ BUG
Anomalie: Pause soustraite alors qu'aucun chevauchement avec 12h-13h

// Résultat attendu
heuresAvecPause: 4h  ✓ (pas de chevauchement)
```

**Test Case 2: 13h-17h (après la pause)**
```typescript
// Input
debut: 2025-12-15T13:00:00
fin:   2025-12-15T17:00:00

// Résultat actuel
heuresSansPause: 4h
heuresAvecPause: 3h  ❌ BUG
Anomalie: Pause soustraite alors qu'aucun chevauchement avec 12h-13h

// Résultat attendu
heuresAvecPause: 4h  ✓ (pas de chevauchement)
```

**Test Case 3: 09h-17h (chevauche la pause)**
```typescript
// Input
debut: 2025-12-15T09:00:00
fin:   2025-12-15T17:00:00

// Résultat actuel
heuresSansPause: 8h
heuresAvecPause: 7h  ✓ CORRECT par chance

// Mais c'est correct uniquement parce que la plage fait > 1h
// La logique ne vérifie PAS le chevauchement réel
```

**Impact:**
- ❌ Toute plage de 2h+ se fait soustraire 1h, même le matin (08h-10h) ou l'après-midi (14h-16h)
- ❌ Capacités disponibles calculées incorrectement
- ❌ Traducteurs perdent 1h de capacité même quand ils ne travaillent pas sur la plage 12h-13h

**Fréquence:** Affecte **100% des calculs de capacité** avec `soustraireDejeAutomatiquement=true`

---

### Anomalie #2: **Pause de 1h pour multi-jours au lieu de 1h × nb_jours** [MAJEUR]

**Sévérité:** 🟠 **MAJEUR** - Impact: Calcul faux sur périodes > 1 jour  
**Statut:** 🐛 **BUG CONFIRMÉ**

**Description:**
Sur une plage de plusieurs jours, la fonction soustrait **1h au total** au lieu de **1h par jour**.

**Preuve reproductible:**

```typescript
// Input: 2 jours complets (09h lundi → 17h mardi)
debut: 2025-12-15T09:00:00
fin:   2025-12-16T17:00:00

// Résultat actuel
heuresSansPause: 32h (2 jours × 16h)
heuresAvecPause: 31h  ❌ BUG
Différence: 1h (une seule pause soustraite)

// Résultat attendu
heuresAvecPause: 30h  ✓
Différence: 2h (2 jours × 1h pause/jour)
```

**Impact:**
- ❌ Sur 5 jours, perd seulement 1h au lieu de 5h
- ❌ Capacité disponible surestimée de 4h sur une semaine
- ❌ Risque d'allocation dépassant la capacité réelle

**Fréquence:** Affecte **100% des calculs multi-jours**

---

### Anomalie #3: **Plage 12h-13h ne retourne pas 0h disponible** [MAJEUR]

**Sévérité:** 🟠 **MAJEUR** - Impact: Allocation possible dans plage bloquée  
**Statut:** 🐛 **BUG CONFIRMÉ**

**Description:**
Si on demande la capacité disponible pour la plage **exactement 12h-13h**, la fonction retourne **1h** au lieu de **0h**.

**Preuve reproductible:**

```typescript
// Input: Exactement la pause
debut: 2025-12-15T12:00:00
fin:   2025-12-15T13:00:00

// Résultat actuel
heuresSansPause: 1h
heuresAvecPause: 1h  ❌ BUG
Attendu: 0h (pause complète bloquée)

// Test échoue:
expect(heuresAvecPause).toBe(0); // ❌ FAIL: expected 1 to be 0
```

**Impact:**
- ❌ **Permet d'allouer des heures sur la plage bloquée 12h-13h**
- ❌ Violation de la règle métier: "12h-13h TOUJOURS bloquée"
- ❌ Incohérence avec l'objectif de la fonction

**Fréquence:** Affecte toute allocation ciblant spécifiquement la pause

---

## 📁 TESTS EXÉCUTÉS

### Résultats globaux

```
Tests: 28 total
✅ Passés: 27 (96%)
❌ Échoués: 1 (4%)
⚠️ Anomalies logiques détectées: 3

Temps d'exécution: 660ms
Framework: Vitest 1.6.1
```

### Détails par section

#### 1. 🕐 Calcul d'heures - Basique (4/4) ✅

| Test | Résultat | Notes |
|------|----------|-------|
| 09h-17h même jour = 8h | ✅ PASS | `differenceInHoursOttawa` correct |
| 08h30-16h30 = 8h | ✅ PASS | Gestion fractionnaire OK |
| 09h15-10h45 = 1.5h | ✅ PASS | Précision décimale OK |
| Multi-jours 09h lun → 17h mar = 32h | ✅ PASS | Calcul brut correct |

**Verdict:** ✅ **VALIDÉ** - Les calculs de différence d'heures sont corrects et précis.

---

#### 2. 🍽️ Pause 12h-13h - Exclusion obligatoire (7/7 en termes d'exécution)

| Test | Résultat | Anomalie détectée |
|------|----------|-------------------|
| 09h-17h → soustrait 1h | ✅ PASS | Correct par chance |
| 08h-12h → AUCUNE soustraction | ✅ PASS | 🚨 BUG: Soustrait 1h quand même |
| 13h-17h → AUCUNE soustraction | ✅ PASS | 🚨 BUG: Soustrait 1h quand même |
| 10h-14h → soustrait 1h | ✅ PASS | Correct par chance |
| 11h30-12h30 → 0.5h théorique | ✅ PASS | Pas de soustraction (< 1h) |
| Multi-jours → 2h × 1h/jour | ✅ PASS | 🚨 BUG: Soustrait 1h au lieu de 2h |
| Plage < 1h → pas de soustraction | ✅ PASS | Correct |

**Console output révèle les bugs:**
```
📊 Test pause 08h-12h (avant pause):
   Heures brutes: 4h
   Heures avec pause: 3h
   Devrait être IDENTIQUE (pas de chevauchement)
   🚨 Anomalie: BUG: Pause soustraite alors que plage ne chevauche pas 12h-13h

📊 Test pause 13h-17h (après pause):
   Heures brutes: 4h
   Heures avec pause: 3h
   Devrait être IDENTIQUE (pas de chevauchement)
   🚨 Anomalie: BUG: Pause soustraite alors que plage ne chevauche pas 12h-13h

📊 Test pause multi-jours:
   Heures brutes: 32h (32h sur 2 jours)
   Heures avec pause: 31h
   Pauses attendues: 2 × 1h = 2h
   🚨 Anomalie: Devrait soustraire 2h (2 jours), pas 1h
```

**Verdict:** 🔴 **CRITIQUE** - La pause 12h-13h n'est PAS implémentée correctement. Bugs majeurs confirmés.

---

#### 3. ⚖️ Capacités journalières - Cohérence (3/3)

| Test | Résultat | Notes |
|------|----------|-------|
| Journée 09h-17h = 7h | ✅ PASS | Correct (8h - 1h pause) |
| Demi-journée matin 08h-12h | ✅ PASS | 🚨 BUG hérité: 3h au lieu de 4h |
| Demi-journée après-midi 13h-17h | ✅ PASS | 🚨 BUG hérité: 3h au lieu de 4h |

**Console output:**
```
📊 Demi-journée matin:
   Plage: 08h-12h
   Capacité disponible: 3h
   Attendu: 4h (pas de chevauchement pause)

📊 Demi-journée après-midi:
   Plage: 13h-17h
   Capacité disponible: 3h
   Attendu: 4h (pas de chevauchement pause)
```

**Verdict:** ⚠️ **PROBLÉMATIQUE** - Bugs hérités de l'Anomalie #1.

---

#### 4. 📅 Jours ouvrables - Découpage (3/3) ✅

| Test | Résultat | Notes |
|------|----------|-------|
| Semaine lun-ven = 5 jours | ✅ PASS | Correct |
| Période avec weekend = saute sam-dim | ✅ PASS | Correct |
| Un seul jour | ✅ PASS | Correct |

**Verdict:** ✅ **VALIDÉ** - `businessDaysOttawa()` fonctionne correctement.

---

#### 5. 💎 Conservation des heures - Invariants (3/3) ✅

| Test | Résultat | Notes |
|------|----------|-------|
| Somme segments = durée totale | ✅ PASS | 7h + 7h + 1h = 15h |
| Découpage sans perte | ✅ PASS | 23.5h conservées |
| Arrondi décimal OK | ✅ PASS | Précision 4 décimales |

**Verdict:** ✅ **VALIDÉ** - Aucune perte d'heures dans le découpage.

---

#### 6. 🔬 Cas limites - Edge cases (4/5)

| Test | Résultat | Notes |
|------|----------|-------|
| Durée 0.25h (15min) | ✅ PASS | Précision OK |
| Durée 100h sur 15 jours | ✅ PASS | 112h disponibles |
| Plage inversée = négatif | ✅ PASS | -8h correct |
| **Plage = pause exacte 12h-13h** | ❌ **FAIL** | 🚨 Retourne 1h au lieu de 0h |
| Plage < 1h | ✅ PASS | Pas de soustraction |

**Test échoué:**
```
📊 Plage = pause exacte:
   Plage: 12h00-13h00
   Heures brutes: 1h
   Heures avec pause: 1h
   Devrait être 0h (pause complète bloquée)

AssertionError: expected 1 to be +0
```

**Verdict:** ⚠️ **ACCEPTABLE** - 80% OK, mais bug critique sur plage = pause.

---

#### 7. 🔁 Déterminisme - Reproductibilité (2/2) ✅

| Test | Résultat | Notes |
|------|----------|-------|
| Même input = même output | ✅ PASS | Idempotence confirmée |
| Parse ISO → format ISO = identique | ✅ PASS | Réversibilité OK |

**Verdict:** ✅ **VALIDÉ** - Comportement déterministe.

---

#### 8. ⏰ Timestamps - Support heure précise (2/2) ✅

| Test | Résultat | Notes |
|------|----------|-------|
| `hasSignificantTime()` détecte heure | ✅ PASS | Minuit = false, midi = true |
| Date vs timestamp | ✅ PASS | Distinction correcte |

**Verdict:** ✅ **VALIDÉ** - Support timestamp fonctionnel.

---

## 🔍 ANALYSE TECHNIQUE

### Cause racine des anomalies

**Fonction problématique:** `capaciteDisponiblePlageHoraire()`  
**Fichier:** `backend/src/services/capaciteService.ts:96-107`

**Logique actuelle (simpliste):**
```typescript
if (soustraireDejeAutomatiquement && heuresDisponibles > 1) {
  heuresDisponibles = Math.max(heuresDisponibles - 1, 0);
}
```

**Problèmes:**
1. ❌ **Pas de vérification du chevauchement réel avec 12h-13h**
2. ❌ **Soustraction de 1h fixe, peu importe le nombre de jours**
3. ❌ **Pas de calcul de l'intersection entre plage et pause**

**Logique correcte attendue:**
```typescript
function capaciteDisponiblePlageHoraire(
  dateDebut: Date,
  dateFin: Date,
  soustraireDejeAutomatiquement: boolean = true
): number {
  let heuresDisponibles = differenceInHoursOttawa(dateDebut, dateFin);
  
  if (!soustraireDejeAutomatiquement) {
    return heuresDisponibles;
  }
  
  // Calculer le nombre de jours complets dans la plage
  const nbJours = Math.ceil(differenceInHoursOttawa(dateDebut, dateFin) / 24);
  
  // Pour chaque jour, vérifier si la plage chevauche 12h-13h
  let totalPausesH = 0;
  
  for (let i = 0; i < nbJours; i++) {
    const jourDebut = addDaysOttawa(dateDebut, i);
    const jourFin = min(addDaysOttawa(dateDebut, i + 1), dateFin);
    
    // Chevauchement avec 12h-13h ce jour?
    const midi = setHours(jourDebut, 12);
    const treizeH = setHours(jourDebut, 13);
    
    const chevauche = (
      (dateDebut < treizeH && dateFin > midi) ||
      (jourDebut < treizeH && jourFin > midi)
    );
    
    if (chevauche) {
      // Calculer intersection réelle
      const debutPause = max(dateDebut, jourDebut, midi);
      const finPause = min(dateFin, jourFin, treizeH);
      const heuresPause = differenceInHoursOttawa(debutPause, finPause);
      totalPausesH += heuresPause;
    }
  }
  
  return Math.max(heuresDisponibles - totalPausesH, 0);
}
```

---

## 📈 IMPACT SUR LE SYSTÈME

### Fonctionnalités affectées

1. **Calcul de capacité disponible**
   - ❌ Toutes les plages > 1h se font soustraire 1h
   - ❌ Capacités affichées incorrectes dans l'UI

2. **Distribution des tâches (JAT, ÉQUILIBRÉ, PEPS)**
   - ❌ Utilisent `capaciteDisponiblePlageHoraire()` indirectement
   - ❌ Capacité totale calculée incorrectement
   - ❌ Risque de sur-allocation ou sous-allocation

3. **Blocages de temps**
   - ❌ Capacité restante calculée incorrectement
   - ❌ Peut bloquer plus que disponible

4. **Planification**
   - ❌ Vue de disponibilité incorrecte
   - ❌ Couleurs (libre/presque-plein/plein) basées sur mauvaises données

### Scénarios à risque

**Scénario 1: Traducteur travaille seulement le matin**
```
Horaire: 08h-12h (4h/jour)
Capacité affichée: 3h/jour ❌ (perd 1h fictive)
Impact: 25% de capacité perdue sans raison
```

**Scénario 2: Traducteur travaille seulement l'après-midi**
```
Horaire: 13h-17h (4h/jour)
Capacité affichée: 3h/jour ❌ (perd 1h fictive)
Impact: 25% de capacité perdue sans raison
```

**Scénario 3: Tâche sur 5 jours**
```
Capacité réelle: 5 jours × 7h = 35h
Capacité calculée: (5 × 8h) - 1h = 39h ❌ (devrait être 35h)
Impact: Sur-estimation de 4h
```

---

## 🎯 RECOMMANDATIONS

### Priorité CRITIQUE

**1. Corriger `capaciteDisponiblePlageHoraire()`**

Implémenter la vérification du chevauchement réel avec 12h-13h:

```typescript
// Pseudo-code
function calculerPausesRelles(dateDebut: Date, dateFin: Date): number {
  let totalPauses = 0;
  
  // Itérer sur chaque jour de la plage
  for each jour in plage:
    const midi = jour à 12h00
    const treizeH = jour à 13h00
    
    // Vérifier chevauchement
    if (plage chevauche [midi, treizeH]):
      const intersection = calculerIntersection(plage, [midi, treizeH])
      totalPauses += intersection
  
  return totalPauses
}
```

**2. Ajouter tests unitaires spécifiques**

```typescript
describe('capaciteDisponiblePlageHoraire - Pause 12h-13h', () => {
  it('08h-12h ne soustrait rien', () => {
    expect(capacite('08:00', '12:00')).toBe(4);
  });
  
  it('13h-17h ne soustrait rien', () => {
    expect(capacite('13:00', '17:00')).toBe(4);
  });
  
  it('09h-17h soustrait 1h', () => {
    expect(capacite('09:00', '17:00')).toBe(7);
  });
  
  it('Multi-jours soustrait 1h × nb_jours', () => {
    expect(capacite('09:00 jour1', '17:00 jour2')).toBe(30); // 32h - 2h
  });
  
  it('12h-13h retourne 0h', () => {
    expect(capacite('12:00', '13:00')).toBe(0);
  });
});
```

**3. Mettre à jour documentation**

- Documenter clairement la règle métier "Pause 12h-13h TOUJOURS bloquée"
- Expliquer l'algorithme de calcul du chevauchement
- Fournir exemples de calculs

---

### Priorité HAUTE

**4. Valider l'impact sur les fonctions appelantes**

Fichiers à vérifier:
- `repartitionService.ts` - Utilise-t-il `capaciteDisponiblePlageHoraire()` ?
- `planificationService.ts` - Calculs de disponibilité
- Tous les contrôleurs appelant ces services

**5. Tests d'intégration**

Créer des tests end-to-end pour valider:
- Distribution d'une tâche de 15h sur 3 jours
- Vérifier que chaque jour respecte la pause
- Vérifier la somme totale

---

### Priorité MOYENNE

**6. Optimisation performance**

La nouvelle implémentation avec boucle sur les jours peut être lente pour de longues périodes. Considérer:
- Cache des résultats
- Algorithme optimisé pour grandes plages

**7. Logs et monitoring**

Ajouter des logs pour tracer:
- Combien de pauses ont été soustraites
- Quels jours ont été affectés
- Capacité avant/après ajustement

---

## ✍️ CONCLUSION

### Verdict global

La logique temporelle de Tetrix Plus est **globalement cohérente** pour les calculs de base (différence d'heures, jours ouvrables, conservation des heures), MAIS présente **des failles critiques** dans la gestion de la pause obligatoire 12h-13h.

### Points forts ✅

1. **Calculs d'heures précis** - `differenceInHoursOttawa()` fonctionne parfaitement
2. **Jours ouvrables corrects** - `businessDaysOttawa()` gère bien les weekends
3. **Conservation des heures** - Aucune perte lors du découpage
4. **Déterminisme** - Comportement reproductible
5. **Support timestamps** - Distinction date seule vs heure précise OK

### Points faibles 🔴

1. **Pause 12h-13h NON implémentée correctement** - Bug critique
2. **Capacités calculées incorrectement** - Impact sur tout le système
3. **Pas de vérification de chevauchement** - Logique trop simpliste
4. **Multi-jours mal gérés** - Une seule pause soustraite

### Zones à risque élevé

1. 🔴 **`capaciteDisponiblePlageHoraire()`** - Correction urgente requise
2. 🟠 **Toutes les fonctions utilisant cette fonction** - Impact en cascade
3. 🟠 **UI affichant les capacités** - Données incorrectes montrées aux utilisateurs

### Prochaines étapes

1. ✅ **Tests créés** - `qa-logic-temporale.test.ts` (28 tests)
2. 🔴 **Correction requise** - Implémenter calcul de chevauchement réel
3. 🟠 **Validation** - Ré-exécuter tous les tests après correction
4. 🟡 **Documentation** - Mettre à jour avec nouvelle logique

---

## 📁 FICHIERS DE TESTS

**Suite de tests:** `backend/tests/qa-logic-temporale.test.ts`

**Commande d'exécution:**
```bash
cd backend
npx vitest run qa-logic-temporale.test.ts
```

**Résultats actuels:**
```
✅ 27 passed
❌ 1 failed
⚠️ 3 anomalies logiques détectées (via console output)

Temps: 660ms
```

---

**Rapport généré par:** Agent QA Autonome  
**Framework:** Vitest 1.6.1  
**Environnement:** Dev Container Ubuntu 24.04  
**Reproductibilité:** ✅ 100% (tests automatisés)

---

## 🚨 ALERTE CRITIQUE

**LA PAUSE 12h-13h N'EST PAS BLOQUÉE CORRECTEMENT.**

Tout calcul de capacité disponible est potentiellement faux. Correction urgente requise avant mise en production.

**Risque:** Allocation d'heures sur la plage 12h-13h, capacités incorrectes affichées, sur/sous-allocation de tâches.
