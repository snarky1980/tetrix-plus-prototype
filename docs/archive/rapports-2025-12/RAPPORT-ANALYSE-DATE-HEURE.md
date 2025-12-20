# 📋 RAPPORT D'ANALYSE - GESTION DATE + HEURE DANS TETRIX PLUS

**Date du rapport** : 18 décembre 2025  
**Analyste** : Ingénieur logiciel senior (back-end)  
**Objectif** : Analyser l'intégration des heures précises dans la répartition des tâches

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Constat Principal
Le système Tetrix Plus a été conçu initialement pour gérer uniquement des **dates** (jours entiers). Une migration partielle vers **date + heure** a été tentée, mais présente **des incohérences critiques** qui compromettent la fiabilité des calculs de répartition.

### Problèmes Identifiés
1. ❌ **Séparation date/heure en base de données** (`dateEcheance` + `heureEcheance`)
2. ✅ **Logique de calcul partiellement adaptée** (mode timestamp activé)
3. ⚠️ **Incohérence entre stockage et utilisation** (`heureEcheance` jamais lu)
4. ⚠️ **Risque de désynchronisation** entre les deux champs

### Recommandation
**✅ Le système FONCTIONNE DÉJÀ CORRECTEMENT** avec les heures précises, à condition que `dateEcheance` contienne le timestamp complet. Le champ `heureEcheance` est **redondant et dangereux**.

---

## 🔍 ANALYSE DÉTAILLÉE

### 1. Architecture Base de Données

#### Schéma Actuel (Prisma)
```prisma
model Tache {
  id                  String             @id @default(uuid())
  // ... autres champs ...
  dateEcheance        DateTime           // ✅ Type DateTime (supporte date+heure)
  heureEcheance       String             @default("17:00")  // ❌ REDONDANT
  // ... autres champs ...
}

model AjustementTemps {
  id           String         @id @default(uuid())
  date         DateTime       @db.Date    // ❌ Type DATE (perte d'information horaire)
  heures       Float
  // ... autres champs ...
}
```

#### Problèmes Identifiés

**🔴 PROBLÈME CRITIQUE N°1 : Séparation date/heure**
- `dateEcheance` : Type `DateTime` (peut stocker date + heure)
- `heureEcheance` : Type `String` (stocke "17:00", "14:30", etc.)
- **Incohérence** : Les deux champs coexistent sans garantie de synchronisation
- **Risque** : Désynchronisation entre date et heure
  - Exemple : `dateEcheance = "2025-02-14T10:30:00"` + `heureEcheance = "17:00"`
  - Quel champ fait foi ?

**🔴 PROBLÈME CRITIQUE N°2 : heureEcheance jamais utilisé**
```typescript
// backend/src/controllers/tacheController.ts:306
heureEcheance: req.body.heureEcheance || '17:00',  // Stocké en DB...

// ❌ MAIS recherche dans tout le code : 0 utilisation !
// grep -r "heureEcheance" src/ → 0 résultats (sauf création)
```

**🟡 PROBLÈME MODÉRÉ N°3 : AjustementTemps.date sans heure**
```prisma
date DateTime @db.Date  // Force PostgreSQL à stocker DATE seul
```
- Conséquence : Impossible de répartir des heures avec précision horaire dans `AjustementTemps`
- Actuellement, le système stocke :
  - `date: "2025-02-14"` (jour entier)
  - `heures: 2.5` (durée)
  - ❌ Mais PAS `heureDebut` ni `heureFin`

---

### 2. Logique Métier Actuelle

#### Flux de Création de Tâche

```typescript
// 1. Parsing de l'échéance (tacheController.ts:170)
const { date: dateEcheanceParsee } = normalizeToOttawaWithTime(
  dateEcheance,  // Reçu du frontend
  true,          // Mode timestamp activé
  'dateEcheance'
);
const echeanceAHeureSignificative = hasSignificantTime(dateEcheanceParsee);

// 2. Génération de la répartition
if (repartitionAuto) {
  repartitionEffective = await repartitionJusteATemps(
    traducteurId,
    heuresTotal,
    dateEcheance,  // ✅ Passe le timestamp complet
    { modeTimestamp: echeanceAHeureSignificative }
  );
}

// 3. Création en DB
await tx.tache.create({
  data: {
    dateEcheance: dateEcheanceParsee,      // ✅ Timestamp complet stocké
    heureEcheance: req.body.heureEcheance || '17:00',  // ❌ Redondant
    // ...
  }
});
```

#### Fonction normalizeToOttawaWithTime

**✅ CONCEPTION ROBUSTE** - Gère intelligemment les timestamps :

```typescript
/**
 * Normalise une entrée utilisateur avec support optionnel de l'heure
 * 
 * COMPORTEMENT:
 * - Si timestamp complet fourni (ex: "2025-02-14T10:30:00")
 *   → Parse et conserve l'heure → hasTime=true
 * 
 * - Si date seule fournie (ex: "2025-02-14")
 *   → Ajoute 17:00:00 par défaut → hasTime=false
 * 
 * - Détection intelligente via hasSignificantTime():
 *   - 00:00:00 → considéré comme "pas d'heure fournie"
 *   - 17:00:00 → considéré comme "défaut système"
 *   - Autres → considéré comme "heure explicite"
 */
export function normalizeToOttawaWithTime(
  input: DateInput,
  includeTime: boolean = false,
  label: string = 'date'
): { date: Date; iso: string; hasTime: boolean }
```

**✅ AVANTAGES:**
- Rétrocompatibilité : Les anciennes tâches avec dates seules continuent de fonctionner
- Forward-compatible : Support complet des timestamps précis
- Détection automatique : Le système sait si l'utilisateur a fourni une heure ou non

---

### 3. Algorithme de Répartition JAT (Juste-À-Temps)

#### Logique Actuelle (repartitionService.ts)

```typescript
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheanceInput: DateInput,
  options?: RepartitionJATOptions
): Promise<RepartitionItem[]> {
  
  // ✅ Parse avec support timestamp
  const { date: echeance, hasTime: echeanceHasTime } = 
    normalizeToOttawaWithTime(dateEcheanceInput, true, 'dateEcheance');
  
  // ✅ Parse l'horaire du traducteur (ex: "7h30-15h30")
  const horaire = parseHoraireTraducteur(traducteur.horaire);
  
  // ✅ Pour chaque jour de la fenêtre
  for (let i = 0; i < totalJours; i++) {
    const d = addDaysOttawa(aujourdHui, i);
    const iso = formatOttawaISO(d);
    
    // ✅ Déterminer si c'est le jour de la deadline
    const estJourEcheance = iso === formatOttawaISO(echeance);
    
    // ✅ Si deadline avec heure précise, la passer à capaciteNetteJour
    const deadlineDateTime = estJourEcheance && echeanceHasTime ? echeance : undefined;
    
    // ✅ Calcul capacité nette (respecte horaire + pause + deadline)
    let capaciteNette = capaciteNetteJour(horaire, d, deadlineDateTime);
    
    // ...
  }
}
```

#### Fonction capaciteNetteJour (dateTimeOttawa.ts)

```typescript
/**
 * Calcule la capacité travaillable nette pour une journée donnée en tenant compte:
 * 1. De l'horaire du traducteur (ex: 07:00-15:00)
 * 2. De la pause midi obligatoire (12:00-13:00)
 * 3. D'une deadline potentielle le même jour
 */
export function capaciteNetteJour(
  horaire: HoraireTraducteur,
  jourConcerne: Date,
  deadlineDateTime?: Date  // ✅ NOUVEAU : Support deadline avec heure
): number {
  const { heureDebut, heureFin } = horaire;
  
  // ✅ Calculer heure fin effective pour ce jour
  let heureFinEffective = heureFin;
  
  if (deadlineDateTime && isSameDayOttawa(deadlineDateTime, jourConcerne)) {
    // ✅ Deadline le même jour → limiter à l'heure de la deadline
    const deadlineZoned = toZonedTime(deadlineDateTime, OTTAWA_TIMEZONE);
    const heureDeadline = deadlineZoned.getHours() + deadlineZoned.getMinutes() / 60;
    heureFinEffective = Math.min(heureFin, heureDeadline);  // ✅ CORRECT
  }
  
  // ✅ Exclure pause 12h-13h si chevauche
  const pauseDebut = 12.0;
  const pauseFin = 13.0;
  
  if (heureFinEffective <= pauseDebut || heureDebut >= pauseFin) {
    return Math.max(heureFinEffective - heureDebut, 0);
  }
  
  // ✅ Calculer heures avant et après pause
  const avantPause = Math.max(Math.min(pauseDebut, heureFinEffective) - heureDebut, 0);
  const apresPause = Math.max(heureFinEffective - Math.max(pauseFin, heureDebut), 0);
  
  return avantPause + apresPause;
}
```

**✅ VERDICT : La logique est CORRECTE et COMPLÈTE**

---

### 4. Validation des Cas d'Usage

#### Cas 1 – Échéance avec heure précise (10:30)

**Scénario:**
- Échéance : `2025-02-14T10:30:00`
- Horaire traducteur : `07:15-15:15`
- Pause : `12:00-13:00`

**Calcul capaciteNetteJour pour le 2025-02-14:**
```typescript
heureDebut = 7.25  // 07:15
heureFin = 15.25   // 15:15
heureDeadline = 10.5  // 10:30

heureFinEffective = Math.min(15.25, 10.5) = 10.5  // ✅ Limite à deadline

// Pas de chevauchement avec pause (10:30 < 12:00)
capaciteNette = 10.5 - 7.25 = 3.25h  // ✅ CORRECT

// Heures utilisables : 07:15–10:30 uniquement
```

**✅ RÉSULTAT : Le système calcule correctement 3.25h disponibles**

---

#### Cas 2 – Débordement de capacité

**Scénario:**
- Tâche : 6h
- Heures disponibles avant échéance : 4h

**Code (repartitionService.ts:305):**
```typescript
if (heuresTotal - 1e-6 > capaciteDisponibleGlobale) {
  throw new Error(
    `Capacité insuffisante dans la plage pour heuresTotal demandées ` +
    `(demandé: ${heuresTotal}h, disponible: ${capaciteDisponibleGlobale.toFixed(2)}h)`
  );
}
```

**✅ RÉSULTAT : Le système rejette la répartition avec message explicite**

---

#### Cas 3 – Répartition multi-jours

**Scénario:**
- Tâche : 10h
- Début possible : `2025-02-13T13:00:00`
- Échéance : `2025-02-14T10:00:00`

**Calcul (algorithme JAT):**

Jour 1 (2025-02-13):
```typescript
horaire = { heureDebut: 7.25, heureFin: 15.25 }
deadlineDateTime = undefined  // Pas le jour J
capaciteNette = capaciteNetteJour(horaire, jour1, undefined)

// 07:15-12:00 = 4.75h
// 13:00-15:15 = 2.25h
// Total = 7h

// Mais tâche commence à 13:00 → seulement 2.25h utilisables ce jour
```

Jour 2 (2025-02-14):
```typescript
horaire = { heureDebut: 7.25, heureFin: 15.25 }
deadlineDateTime = parseOttawaDateTimeISO('2025-02-14T10:00:00')
capaciteNette = capaciteNetteJour(horaire, jour2, deadlineDateTime)

heureFinEffective = Math.min(15.25, 10.0) = 10.0
// 07:15-10:00 = 2.75h
```

**Total disponible : 2.25h + 2.75h = 5h < 10h demandé**

**✅ RÉSULTAT : Le système détecte l'insuffisance de capacité**

---

## ⚠️ PROBLÈMES ET LIMITATIONS IDENTIFIÉS

### 1. Champ `heureEcheance` Redondant

**Impact : ÉLEVÉ**

**Problème:**
- Stocké en DB mais jamais utilisé dans les calculs
- Risque de désynchronisation avec `dateEcheance`
- Confusion pour les développeurs futurs

**Preuve:**
```bash
$ grep -r "heureEcheance" backend/src/ --include="*.ts"
backend/src/controllers/tacheController.ts:306:  heureEcheance: req.body.heureEcheance || '17:00',

# Aucune autre occurrence ! Le champ n'est jamais lu.
```

**Recommandation : 🔴 URGENT**
- **Option A (Recommandée)** : Supprimer `heureEcheance` de la DB
  - Migration Prisma pour supprimer la colonne
  - Stocker uniquement l'heure dans `dateEcheance`
- **Option B (Alternative)** : Fusionner `dateEcheance` + `heureEcheance` à la lecture
  - Ajouter logique pour combiner les deux champs
  - Garantir synchronisation à l'écriture
  - Plus complexe et source d'erreurs

---

### 2. AjustementTemps sans Plages Horaires

**Impact : MOYEN**

**Problème:**
```prisma
model AjustementTemps {
  date         DateTime       @db.Date    // ❌ Jour entier seulement
  heures       Float                      // Durée (ex: 2.5h)
  // ❌ Manque: heureDebut, heureFin
}
```

**Conséquence:**
- Le système sait QUE 2.5h sont utilisées le 2025-02-14
- Mais PAS QUAND (07:00-09:30 ? 14:00-16:30 ?)
- Impossible de détecter les conflits horaires intra-journée

**Exemple de conflit non détecté:**
```typescript
// Traducteur : horaire 07:00-15:00

// Tâche 1 : 4h le 2025-02-14
// Répartition JAT → 11:00-15:00 (fin de journée)

// Tâche 2 : 3h le 2025-02-14
// Système vérifie : 4h + 3h = 7h < capacité 8h ✅
// Mais en réalité : CONFLIT car même plage horaire 11:00-15:00 !

// ❌ Le système autorise le double booking intra-journée
```

**Recommandation : 🟡 IMPORTANT**
- **Option A** : Ajouter `heureDebut` et `heureFin` à `AjustementTemps`
  ```prisma
  model AjustementTemps {
    date         DateTime       @db.Date
    heures       Float
    heureDebut   String?        // Format "10h30"
    heureFin     String?        // Format "15h30"
  }
  ```
- **Option B** : Créer table `PlageHoraire` séparée
  ```prisma
  model PlageHoraire {
    id                String   @id
    ajustementTempsId String
    dateTimeDebut     DateTime
    dateTimeFin       DateTime
    ajustement        AjustementTemps @relation
  }
  ```

**Note:** Ce problème existe MAIS n'est pas critique car:
- Le système vérifie la capacité journalière globale (prévient sur-allocation totale)
- Les traducteurs gèrent eux-mêmes leurs plages horaires
- Risque de conflit faible en pratique (nécessite 2 tâches le même jour)

---

### 3. Validation Horaire Manquante

**Impact : FAIBLE**

**Problème:**
Le système ne valide PAS si une `heureEcheance` est cohérente avec l'horaire du traducteur.

**Exemple problématique:**
```typescript
// Traducteur : horaire 07:00-15:00
// Frontend envoie : dateEcheance = "2025-02-14T18:00:00"

// ❌ Le système accepte une échéance à 18:00
// Alors que le traducteur termine à 15:00
```

**Recommandation : 🟢 AMÉLIORATION**
Ajouter validation dans `tacheController.ts` :
```typescript
if (echeanceAHeureSignificative) {
  const horaire = parseHoraireTraducteur(traducteur.horaire);
  const heureEcheance = dateEcheanceParsee.getHours() + 
                        dateEcheanceParsee.getMinutes() / 60;
  
  if (heureEcheance > horaire.heureFin) {
    throw new Error(
      `Échéance ${heureEcheance}h impossible : ` +
      `${traducteur.nom} termine à ${horaire.heureFin}h`
    );
  }
}
```

---

## 📊 SYNTHÈSE DES CORRECTIONS NÉCESSAIRES

### 🔴 PRIORITÉ CRITIQUE

#### 1. Supprimer le champ `heureEcheance` redondant

**Justification:**
- Champ jamais utilisé dans les calculs
- Source de confusion et de bugs potentiels
- `dateEcheance` de type `DateTime` suffit amplement

**Migration Prisma:**
```prisma
// schema.prisma
model Tache {
  // ... autres champs ...
  dateEcheance        DateTime  // ✅ Garde uniquement celui-ci
  - heureEcheance     String    // ❌ SUPPRIMER
}
```

**Migration SQL:**
```sql
-- Migration: remove_heure_echeance
ALTER TABLE taches DROP COLUMN "heureEcheance";
```

**Impact:**
- ✅ Aucun impact sur la logique métier (champ non utilisé)
- ✅ Simplifie le modèle de données
- ⚠️ Nécessite mise à jour du frontend (retirer champ `heureEcheance` du formulaire)

---

### 🟡 PRIORITÉ IMPORTANTE

#### 2. Ajouter plages horaires à AjustementTemps

**Justification:**
- Permet de détecter les conflits intra-journée
- Fournit traçabilité complète des allocations
- Facilite debugging et audit

**Migration Prisma:**
```prisma
model AjustementTemps {
  id           String         @id @default(uuid())
  date         DateTime       @db.Date
  heures       Float
  heureDebut   String?        // NOUVEAU: Format "10h" ou "10h30"
  heureFin     String?        // NOUVEAU: Format "17h" ou "17h30"
  type         TypeAjustement
  traducteurId String
  tacheId      String?
  creePar      String
  creeLe       DateTime       @default(now())
  tache        Tache?         @relation
  traducteur   Traducteur     @relation
}
```

**Adaptation repartitionService:**
```typescript
// Dans repartitionJusteATemps(), lors de la création d'ajustements
resultat.push({ 
  date: iso, 
  heures: alloue,
  heureDebut: plages.heureDebut,  // ✅ Ajouté
  heureFin: plages.heureFin        // ✅ Ajouté
});
```

**Impact:**
- ✅ Traçabilité complète des allocations horaires
- ✅ Possibilité de détecter conflits intra-journée (futur)
- ⚠️ Nécessite rétro-remplissage des données existantes (peut être NULL)

---

### 🟢 PRIORITÉ AMÉLIORATION

#### 3. Valider cohérence échéance/horaire

**Code à ajouter dans tacheController.ts:**
```typescript
// Après parsing de dateEcheance
if (echeanceAHeureSignificative) {
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
    select: { horaire: true, nom: true }
  });
  
  if (traducteur) {
    const horaire = parseHoraireTraducteur(traducteur.horaire);
    const ottawaDate = toZonedTime(dateEcheanceParsee, OTTAWA_TIMEZONE);
    const heureEcheance = ottawaDate.getHours() + ottawaDate.getMinutes() / 60;
    
    if (heureEcheance < horaire.heureDebut) {
      res.status(400).json({
        erreur: `Échéance ${formatHeure(heureEcheance)} impossible : ` +
                `${traducteur.nom} commence à ${formatHeure(horaire.heureDebut)}`
      });
      return;
    }
    
    if (heureEcheance > horaire.heureFin) {
      res.status(400).json({
        erreur: `Échéance ${formatHeure(heureEcheance)} impossible : ` +
                `${traducteur.nom} termine à ${formatHeure(horaire.heureFin)}`
      });
      return;
    }
  }
}
```

---

## ✅ CE QUI FONCTIONNE DÉJÀ CORRECTEMENT

### 1. Support Complet des Timestamps
- ✅ `normalizeToOttawaWithTime()` parse correctement les timestamps
- ✅ Détection automatique heure significative via `hasSignificantTime()`
- ✅ Rétrocompatibilité avec dates seules (défaut 17:00:00)

### 2. Calculs de Capacité Nette
- ✅ `capaciteNetteJour()` respecte horaire + pause + deadline
- ✅ Exclusion correcte de la pause 12h-13h
- ✅ Limitation automatique à l'heure de deadline

### 3. Algorithmes de Répartition
- ✅ JAT alloue à rebours en respectant les contraintes horaires
- ✅ PEPS et EQUILIBRE utilisent aussi `capaciteNetteJour()`
- ✅ Vérification capacité disponible avant allocation

### 4. Protection Contre Double Booking
- ✅ Transaction atomique pour créer tâche + ajustements
- ✅ Vérification capacité journalière dans transaction
- ✅ Message d'erreur explicite en cas de conflit

### 5. Gestion Timezone
- ✅ Tous les calculs en timezone America/Toronto
- ✅ Conversions UTC ↔ Ottawa cohérentes
- ✅ Support transitions DST automatique

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1 : Correction Critique (Sprint actuel)

**Tâche 1.1 : Supprimer `heureEcheance` de la DB**
- [ ] Créer migration Prisma `remove_heure_echeance`
- [ ] Mettre à jour types TypeScript générés
- [ ] Supprimer champ dans `tacheController.ts`
- [ ] Mettre à jour frontend (retirer input `heureEcheance`)
- [ ] Tester création/modification de tâches

**Tâche 1.2 : Documenter l'utilisation de dateEcheance**
- [ ] Ajouter commentaires dans schema.prisma
- [ ] Mettre à jour README avec format attendu
- [ ] Créer guide développeur "Gestion des échéances"

**Tests de validation:**
```typescript
// Test 1: Échéance avec heure précise
const tache1 = await creerTache({
  dateEcheance: '2025-02-14T10:30:00',  // ✅ Format complet
  heuresTotal: 2
});
// Vérifie : capacité calculée = 3.25h (07:15-10:30 avec pause)

// Test 2: Échéance date seule (legacy)
const tache2 = await creerTache({
  dateEcheance: '2025-02-14',  // ✅ Format date seule
  heuresTotal: 6
});
// Vérifie : échéance convertie en 2025-02-14T17:00:00 par défaut
```

---

### Phase 2 : Amélioration Importante (Sprint suivant)

**Tâche 2.1 : Ajouter plages horaires à AjustementTemps**
- [ ] Créer migration Prisma `add_plage_horaire_ajustements`
- [ ] Adapter `repartitionJusteATemps()` pour sauvegarder plages
- [ ] Adapter `repartitionPEPS()` et `repartitionEquilibree()`
- [ ] Adapter `validerRepartition()` pour mode manuel
- [ ] Créer fonction `detecterConflitsIntraJour()` (futur)

**Tâche 2.2 : Tests de validation**
```typescript
// Test 3: Vérifier plages horaires stockées
const ajustements = await prisma.ajustementTemps.findMany({
  where: { tacheId: tache.id }
});
expect(ajustements[0]).toMatchObject({
  date: '2025-02-14',
  heures: 2.5,
  heureDebut: '9h',      // ✅ NOUVEAU
  heureFin: '11h30'      // ✅ NOUVEAU
});
```

---

### Phase 3 : Améliorations Qualité (Backlog)

**Tâche 3.1 : Validation échéance/horaire**
- [ ] Implémenter validation dans `tacheController.ts`
- [ ] Ajouter messages d'erreur clairs
- [ ] Tests unitaires validation

**Tâche 3.2 : Détection conflits intra-journée**
- [ ] Créer fonction `detecterConflitsPlagesHoraires()`
- [ ] Intégrer dans vérification capacité
- [ ] UI pour visualiser conflits

**Tâche 3.3 : Audit et nettoyage**
- [ ] Vérifier cohérence données existantes
- [ ] Ajouter monitoring performances calculs
- [ ] Optimiser requêtes DB

---

## 📈 MÉTRIQUES DE SUCCÈS

### Critères d'Acceptation Phase 1
- ✅ Toutes les tâches créées stockent échéance dans `dateEcheance` uniquement
- ✅ Calculs de répartition utilisent date + heure correctement
- ✅ Tests couvrent cas avec heure précise ET date seule
- ✅ Aucune régression sur fonctionnalités existantes

### Critères d'Acceptation Phase 2
- ✅ Tous les `AjustementTemps` ont `heureDebut` et `heureFin` renseignés
- ✅ UI affiche plages horaires précises dans planification
- ✅ Logs détaillés permettent audit complet

### Critères d'Acceptation Phase 3
- ✅ Validation empêche échéances incohérentes
- ✅ Conflits intra-journée détectés et signalés
- ✅ Documentation complète pour développeurs et utilisateurs

---

## 🏁 CONCLUSION

### État Actuel du Système

**✅ BONNE NOUVELLE :** Le système gère déjà correctement les heures précises !
- La logique de calcul (`capaciteNetteJour`, `repartitionJAT`, etc.) est **robuste et complète**
- Les algorithmes respectent horaires, pauses et deadlines avec précision
- La gestion timezone (America/Toronto) est **irréprochable**

**⚠️ PROBLÈME PRINCIPAL :** Architecture de stockage incohérente
- Champ `heureEcheance` redondant et jamais utilisé
- Risque de confusion et bugs futurs
- Manque de traçabilité des plages horaires dans `AjustementTemps`

### Recommandation Finale

**🎯 PRIORITÉ : Nettoyer l'architecture de données**
1. Supprimer `heureEcheance` (redondant)
2. Stocker plages horaires dans `AjustementTemps`
3. Ajouter validations échéance/horaire

**💡 POINT CLÉ :** La logique métier est **DÉJÀ CORRECTE**. Il ne s'agit pas de réécrire les algorithmes, mais de **corriger la persistance** pour éviter les incohérences futures.

### Risques Identifiés

**🔴 RISQUE ÉLEVÉ si non corrigé:**
- Désynchronisation `dateEcheance` ↔ `heureEcheance`
- Confusion développeurs futurs
- Bugs silencieux (heure ignorée)

**🟢 RISQUE FAIBLE avec corrections:**
- Migrations DB simples et sans perte de données
- Impact frontend minimal (retirer 1 champ)
- Rétrocompatibilité préservée

---

**Rapport généré le** : 18 décembre 2025  
**Prochaine étape** : Revue avec l'équipe et planification Sprint
