# 🔍 AUDIT & REFONTE - LOGIQUE DE GESTION DU TEMPS
## Tetrix PLUS - Rapport d'audit RefonteLogiqueTemps

**Date:** 8 décembre 2025  
**Agent:** RefonteLogiqueTemps  
**Version:** 1.0 - Audit initial

---

## 📋 SOMMAIRE EXÉCUTIF

### Objectif de l'audit
Analyser, diagnostiquer et refondre la logique de gestion du temps dans Tetrix PLUS, en se concentrant sur :
- Distribution des heures sur plusieurs jours
- Respect de la capacité quotidienne des traducteurs
- Gestion des blocages de temps
- Cohérence entre les 4 modes de répartition
- Gestion correcte du fuseau horaire Ottawa (America/Toronto)
- Correction des décalages de dates

### État actuel (première analyse)
✅ **Forces identifiées:**
- Architecture modulaire claire (services séparés)
- Tests existants pour les 3 modes de répartition (JAT, Équilibré, PEPS)
- Normalisation des dates déjà implémentée (`normaliserDateInput`)
- Exclusion des weekends déjà en place
- Validation de capacité présente

⚠️ **Problèmes critiques identifiés:**

#### 1. **FUSEAU HORAIRE - CRITIQUE ⚠️**
**Localisation:** `repartitionService.ts`, `capaciteService.ts`, `frontend/PlanificationGlobale.tsx`

**Problème:**
```typescript
// backend/src/services/repartitionService.ts:17
const normalisee = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
normalisee.setHours(0,0,0,0);
```
- ❌ Utilise l'heure locale du serveur, pas le fuseau d'Ottawa
- ❌ Aucune bibliothèque de gestion de fuseau horaire (date-fns-tz, luxon)
- ❌ `toISOString()` retourne en UTC, cause décalages potentiels
- ❌ DST (Daylight Saving Time) non géré explicitement

**Impact:** Décalages de +/- 1 jour possibles selon heure de création

#### 2. **STOCKAGE BASE DE DONNÉES - AMBIGU**
**Localisation:** `schema.prisma:154,156`

```prisma
dateEcheance        DateTime
creeLe              DateTime           @default(now())
```
- ❌ Aucune spécification de timezone dans Prisma
- ❌ PostgreSQL stocke en UTC mais conversion non documentée
- ❌ Comparaisons de dates potentiellement incorrectes

**Impact:** Incohérences lors des requêtes temporelles

#### 3. **MODE JAT - LOGIQUE INCORRECTE**
**Localisation:** `repartitionService.ts:72-162`

**Problèmes détectés:**
```typescript
// Ligne 88-90: Comparaison de dates problématique
const aujourdHui = new Date();
aujourdHui.setHours(0,0,0,0);
if (echeance < aujourdHui) throw new Error('dateEcheance déjà passée');
```
- ⚠️ `aujourdHui` utilise fuseau local serveur, pas Ottawa
- ⚠️ Comparaison peut échouer si serveur dans autre fuseau

```typescript
// Ligne 128-146: Allocation JAT
let courant = echeance;
while (restant > 0 && iterations < MAX_LOOKBACK_DAYS) {
  if (courant < aujourdHui) break;
  // ... allocation ...
  courant = subDays(courant, 1);
}
```
- ✅ Logique de remplissage à rebours correcte
- ⚠️ Mais dépend de dates normalisées correctement
- ⚠️ Aucune option "livraison matinale" (spec v1.2)

**Manque selon Spec V1.2:**
- ❌ Option livraison matinale non implémentée
- ❌ Heure limite configurable (17h par défaut)

#### 4. **MODE ÉQUILIBRÉ - ARRONDIS PROBLÉMATIQUES**
**Localisation:** `repartitionService.ts:164-231`

```typescript
// Ligne 200-214: Répartition initiale
const resultat: RepartitionItem[] = disponibilites.map((d) => ({ date: d.iso, heures: 0 }));
let restant = heuresTotal;

disponibilites.forEach((jour, index) => {
  const joursRestants = disponibilites.length - index;
  const cible = parseFloat((restant / joursRestants).toFixed(4)); // ⚠️ Arrondi à 4 décimales
  const alloue = Math.min(jour.libre, cible);
  resultat[index].heures = alloue;
  jour.libre = parseFloat((jour.libre - alloue).toFixed(4)); // ⚠️ Accumulation erreurs
  restant = parseFloat((restant - alloue).toFixed(4));
});
```

**Problèmes:**
- ⚠️ Arrondis multiples créent accumulation d'erreurs
- ⚠️ Boucle de rattrapage (ligne 217) nécessaire à cause de ces erreurs
- ⚠️ Limite de 100 itérations arbitraire

**Impact:** Répartition instable, non déterministe avec certaines valeurs

#### 5. **MODE PEPS - SIMPLICITÉ CORRECTE**
**Localisation:** `repartitionService.ts:233-270`

✅ **Logique correcte:** Remplissage séquentiel depuis le début
✅ Respect de la capacité
⚠️ Même problème de fuseau horaire que les autres modes

#### 6. **VALIDATION CAPACITÉ - INCOMPLET**
**Localisation:** `capaciteService.ts:10-31`

```typescript
const ajustements = await prisma.ajustementTemps.findMany({
  where: {
    traducteurId,
    date: { equals: new Date(date.toISOString().split('T')[0]) }, // ❌ PROBLÈME
    ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
  }
});
```

**Problème critique:**
- ❌ `new Date(date.toISOString().split('T')[0])` crée une date en UTC à minuit
- ❌ Comparaison `equals` peut échouer si dates stockées différemment
- ❌ Pas de gestion explicite des blocages (congés, réunions)

#### 7. **FRONTEND - DOUBLE GESTION DATES**
**Localisation:** `frontend/src/pages/PlanificationGlobale.tsx`

```typescript
// Ligne 22-27: Fonction dateISO
const dateISO = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Ligne 28-33: Fonction parseISODate (ajoutée récemment)
const parseISODate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};
```

✅ **Amélioration récente:** `parseISODate` évite décalages UTC
⚠️ **Mais:** Duplication de logique, devrait être centralisée

---

## 🔍 CARTOGRAPHIE DES FICHIERS CRITIQUES

### Backend - Services
| Fichier | Responsabilité | État | Priorité Refonte |
|---------|---------------|------|------------------|
| `repartitionService.ts` | 4 modes de répartition | ⚠️ Bugs fuseau | 🔴 CRITIQUE |
| `capaciteService.ts` | Vérification capacité | ⚠️ Comparaison dates | 🔴 CRITIQUE |
| `planificationService.ts` | Utilitaires dates | ✅ OK | 🟡 AMÉLIORER |

### Backend - Tests
| Fichier | Couverture | État | Priorité |
|---------|-----------|------|----------|
| `repartitionService.test.ts` | JAT, Équilibré, PEPS | ✅ Basique | 🟡 ÉTENDRE |
| `capaciteService.test.ts` | Validation capacité | ✅ OK | 🟢 MAINTENIR |
| `timeBlocking.test.ts` | Blocages temps | ❌ À VÉRIFIER | 🔴 AUDIT |

### Frontend
| Fichier | Responsabilité | État | Priorité |
|---------|---------------|------|----------|
| `PlanificationGlobale.tsx` | Interface principale | ⚠️ Duplication logique | 🟡 REFACTOR |
| `repartitionService.ts` | Client API | ✅ OK | 🟢 OK |

---

## 📊 ANALYSE DÉTAILLÉE PAR MODE

### Mode 1: JUSTE-À-TEMPS (JAT)

#### Comportement attendu (Spec V1.2)
1. Répartir heures EN REMONTANT depuis fin journée échéance (17h Ottawa)
2. Respecter capacité quotidienne ET heures bloquées
3. Ignorer les weekends
4. Option livraison matinale: limiter heures jour J (ex: 2h max)

#### Comportement actuel
```typescript
// repartitionService.ts:128-146
let courant = echeance;
while (restant > 0 && iterations < MAX_LOOKBACK_DAYS) {
  if (courant < aujourdHui) break;
  if (!estWeekend(courant)) {
    const utilisees = heuresParJour[iso] || 0;
    const libre = Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
    // Allocation...
  }
  courant = subDays(courant, 1);
}
```

✅ **Correct:**
- Remplissage à rebours
- Exclusion weekends
- Respect capacité

❌ **Manquant:**
- Pas de gestion de l'heure limite (17h)
- Pas d'option livraison matinale
- Fuseau horaire non spécifié

#### Tests actuels
```typescript
// repartitionService.test.ts:29-50
it('alloue à rebours puis retourne trié asc', async () => {
  const echeance = new Date();
  echeance.setDate(echeance.getDate() + 3);
  const rep = await repartitionJusteATemps(traducteur.id, 10, echeance);
  // Vérifie tri et somme
});
```

✅ Test de base OK
❌ Manque tests:
- Livraison matinale
- Fuseau horaire différent
- DST transition
- Heures bloquées

### Mode 2: PREMIER ENTRÉ PREMIER SORTI (PEPS)

#### Comportement attendu
1. Répartir EN AVANCANT depuis date création
2. Respecter capacité ET blocages
3. S'adapter si plusieurs tâches se chevauchent

#### Comportement actuel
```typescript
// repartitionService.ts:252-268
for (const jour of jours) {
  if (restant <= 0) break;
  const libre = Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
  if (libre <= 0) continue;
  const alloue = Math.min(libre, restant);
  resultat.push({ date: iso, heures: parseFloat(alloue.toFixed(4)) });
  restant -= alloue;
}
```

✅ **Logique simple et correcte**
✅ Respect capacité
⚠️ Dépend de `joursOuvrablesEntre` (OK)
⚠️ Même problème de fuseau horaire

### Mode 3: ÉQUILIBRÉ

#### Comportement attendu
1. Répartir uniformément entre dates début et fin
2. Gérer fractions proprement
3. Tenir compte blocages partiels

#### Comportement actuel - PROBLÈME D'ARRONDIS
```typescript
// Ligne 200-214
disponibilites.forEach((jour, index) => {
  const joursRestants = disponibilites.length - index;
  const cible = parseFloat((restant / joursRestants).toFixed(4)); // ⚠️
  // ...
});

// Ligne 217-227: Boucle de rattrapage nécessaire
while (restant > 1e-4 && guard < 100) {
  // Répartir les restes...
}
```

❌ **Problèmes:**
- Arrondis multiples créent imprécisions
- Boucle de rattrapage = indicateur de mauvaise conception
- Pas de garantie sur uniformité exacte

#### Solution proposée
Utiliser algorithme de répartition équitable:
```typescript
// Pseudocode
const base = Math.floor(heures * 1000) / disponibilites.length / 1000;
const reste = heures - (base * disponibilites.length);
// Distribuer reste sur premiers jours
```

### Mode 4: MANUEL

#### Comportement attendu
1. Utilisateur saisit répartition
2. Système valide somme = total
3. Valide capacité par jour
4. Messages clairs en français

#### Comportement actuel
```typescript
// repartitionService.ts:305-344: validerRepartition
export async function validerRepartition(...) {
  // Vérifie somme
  // Vérifie capacité par jour
  // Retourne erreurs
}
```

✅ Logique validation présente
✅ Messages en français
⚠️ Même problème requête dates (ligne 332)

---

## 🌍 PROBLÈME CENTRAL: FUSEAU HORAIRE

### Situation actuelle
```
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│  Frontend   │         │   Backend    │         │  PostgreSQL   │
│  (Browser)  │────────▶│  (Server)    │────────▶│   (UTC?)      │
│  Local TZ   │         │  Local TZ?   │         │               │
└─────────────┘         └──────────────┘         └───────────────┘
      ↓                        ↓                         ↓
   Ambiguë               Ambiguë                    Ambiguë
```

### Problème identifié

1. **Aucune bibliothèque de timezone:**
   - ❌ Pas de `date-fns-tz`
   - ❌ Pas de `luxon`
   - ❌ Pas de `moment-timezone`

2. **Conversions implicites dangereuses:**
```typescript
// ACTUEL (PROBLÉMATIQUE)
new Date('2025-12-08') // Minuit UTC → peut devenir 19h la veille en Ottawa

// Ce qu'on veut:
createDateInOttawa('2025-12-08') // Minuit à Ottawa
```

3. **Comparaisons de dates incohérentes:**
```typescript
// capaciteService.ts:21
date: { equals: new Date(date.toISOString().split('T')[0]) }
// ❌ Crée Date UTC, mais DB pourrait stocker autrement
```

### Impact sur les anomalies connues

**"Les indicateurs de journée ne tombent pas sur la bonne date"**
→ Causé par conversion UTC → Local non contrôlée

**"Décalages d'un jour"**
→ Causé par:
```typescript
// Serveur à 23h Ottawa crée tâche
new Date() // 4h UTC lendemain
dateISO() // Retourne jour suivant!
```

**"Dates inversées dans formulaires"**
→ Frontend crée date locale, backend interprète UTC

---

## 🎯 PLAN DE REFONTE PROPOSÉ

### Phase 1: FONDATIONS - Gestion fuseau horaire (PRIORITÉ CRITIQUE)

#### 1.1 Installer bibliothèque timezone
```bash
npm install --workspace=backend date-fns-tz
npm install --workspace=frontend date-fns-tz
```

#### 1.2 Créer module central de gestion dates
**Fichier:** `backend/src/utils/dateTimeOttawa.ts`

```typescript
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

const OTTAWA_TZ = 'America/Toronto';

// Créer date à minuit Ottawa
export function createOttawaDate(year: number, month: number, day: number): Date {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  return zonedTimeToUtc(dateStr, OTTAWA_TZ);
}

// Parser string YYYY-MM-DD en date Ottawa
export function parseOttawaDateISO(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return createOttawaDate(y, m, d);
}

// Obtenir date actuelle à Ottawa
export function nowOttawa(): Date {
  return utcToZonedTime(new Date(), OTTAWA_TZ);
}

// Formater date en YYYY-MM-DD (timezone Ottawa)
export function formatOttawaISO(date: Date): string {
  return format(utcToZonedTime(date, OTTAWA_TZ), 'yyyy-MM-dd', { timeZone: OTTAWA_TZ });
}

// Comparer si même jour à Ottawa
export function isSameDayOttawa(date1: Date, date2: Date): boolean {
  return formatOttawaISO(date1) === formatOttawaISO(date2);
}

// Obtenir début de journée Ottawa
export function startOfDayOttawa(date: Date): Date {
  const formatted = formatOttawaISO(date);
  return parseOttawaDateISO(formatted);
}
```

#### 1.3 Remplacer toutes les conversions
```typescript
// AVANT (INCORRECT)
const aujourd'hui = new Date();
aujourd'hui.setHours(0, 0, 0, 0);

// APRÈS (CORRECT)
const aujourd'hui = startOfDayOttawa(nowOttawa());
```

### Phase 2: REFONTE MODES DE RÉPARTITION

#### 2.1 Mode JAT - Ajouter livraison matinale
```typescript
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheanceInput: DateInput,
  options: {
    livraisonMatinale?: boolean;
    heuresMaxJourJ?: number;
    debug?: boolean;
  } = {}
): Promise<RepartitionItem[]> {
  // Normaliser avec fuseau Ottawa
  const echeance = startOfDayOttawa(parseOttawaDateISO(dateEcheanceInput));
  
  // Si livraison matinale, limiter heures dernier jour
  const capaciteJourJ = options.livraisonMatinale 
    ? Math.min(options.heuresMaxJourJ ?? 2, traducteur.capaciteHeuresParJour)
    : traducteur.capaciteHeuresParJour;
    
  // Reste de l'algorithme...
}
```

#### 2.2 Mode Équilibré - Éliminer boucle de rattrapage
```typescript
export async function repartitionEquilibree(...): Promise<RepartitionItem[]> {
  // Calculer parts entières et reste
  const heuresCentimes = Math.round(heuresTotal * 100);
  const parJour = Math.floor(heuresCentimes / disponibilites.length);
  let reste = heuresCentimes - (parJour * disponibilites.length);
  
  return disponibilites.map((jour, index) => {
    let heures = parJour / 100;
    if (reste > 0) {
      heures += 0.01;
      reste--;
    }
    return { date: jour.iso, heures };
  });
}
```

#### 2.3 Centraliser logique capacité
```typescript
// Nouvelle fonction dans capaciteService.ts
export async function capaciteDisponibleJour(
  traducteurId: string,
  date: Date,
  ignorerTacheId?: string
): Promise<number> {
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  
  const dateOttawa = startOfDayOttawa(date);
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: dateOttawa,
      ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
    }
  });
  
  const utilisees = ajustements.reduce((s, a) => s + a.heures, 0);
  return Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
}
```

### Phase 3: TESTS COMPLETS

#### 3.1 Tests fuseau horaire
```typescript
describe('dateTimeOttawa', () => {
  it('crée date minuit Ottawa correctement', () => {
    const date = createOttawaDate(2025, 12, 8);
    expect(formatOttawaISO(date)).toBe('2025-12-08');
  });
  
  it('gère DST correctement (printemps/automne)', () => {
    const avantDST = createOttawaDate(2025, 3, 8);  // Avant changement
    const apresDST = createOttawaDate(2025, 3, 10); // Après changement
    // Vérifier que les deux dates sont correctes
  });
  
  it('compare dates indépendamment du fuseau', () => {
    const d1 = parseOttawaDateISO('2025-12-08');
    const d2 = new Date('2025-12-08T05:00:00Z'); // 00h Ottawa en UTC
    expect(isSameDayOttawa(d1, d2)).toBe(true);
  });
});
```

#### 3.2 Tests modes répartition
```typescript
describe('JAT avec fuseau Ottawa', () => {
  it('respecte décalage horaire Ottawa', async () => {
    // Simuler appel depuis fuseau différent
    const echeance = '2025-12-15';
    const rep = await repartitionJusteATemps(traducteurId, 10, echeance);
    expect(rep[rep.length - 1].date).toBe('2025-12-15'); // Pas 14 ou 16!
  });
  
  it('gère livraison matinale', async () => {
    const rep = await repartitionJusteATemps(traducteurId, 10, echeance, {
      livraisonMatinale: true,
      heuresMaxJourJ: 2
    });
    expect(rep[rep.length - 1].heures).toBeLessThanOrEqual(2);
  });
});
```

### Phase 4: DOCUMENTATION

#### 4.1 Stratégie timezone documentée
**Fichier:** `docs/TIMEZONE-STRATEGY.md`

```markdown
# Stratégie de gestion des fuseaux horaires

## Principes

1. **Fuseau de référence: America/Toronto (Ottawa)**
   - Toutes les journées sont calculées en heure d'Ottawa
   - Une "journée" = minuit à 23:59:59 heure Ottawa

2. **Stockage:**
   - PostgreSQL stocke en UTC (standard)
   - Conversions explicites à chaque lecture/écriture

3. **Calculs:**
   - Utiliser module `dateTimeOttawa.ts`
   - Jamais de `new Date()` sans contexte timezone

4. **Frontend:**
   - Affichage en heure locale utilisateur OK
   - Mais calculs planification en Ottawa
```

---

## 📝 CHECKLIST DE VALIDATION

### Avant refonte
- [x] Audit code complet
- [x] Identification problèmes critiques
- [x] Cartographie fichiers
- [ ] Validation avec USER des problèmes identifiés
- [ ] Récupération Spec V1.2 complète

### Pendant refonte
- [ ] Installer date-fns-tz
- [ ] Créer module dateTimeOttawa
- [ ] Refactorer repartitionService
- [ ] Refactorer capaciteService
- [ ] Ajouter option livraison matinale
- [ ] Éliminer boucle rattrapage mode Équilibré
- [ ] Centraliser validation capacité

### Tests
- [ ] Tests fuseau horaire complets
- [ ] Tests DST (printemps/automne)
- [ ] Tests 4 modes répartition
- [ ] Tests capacité avec blocages
- [ ] Tests frontend/backend intégration
- [ ] Tests cas limites (fin mois, année bissextile)

### Documentation
- [ ] TIMEZONE-STRATEGY.md
- [ ] Mise à jour README
- [ ] Exemples d'utilisation
- [ ] Guide migration pour développeurs

---

## 🚀 PROCHAINES ÉTAPES IMMÉDIATES

1. **Valider audit avec USER**
   - Confirmer problèmes identifiés
   - Obtenir Spec V1.2 complète
   - Prioriser corrections

2. **Installer dépendances**
   ```bash
   npm install --workspace=backend date-fns-tz
   npm install --workspace=frontend date-fns-tz
   ```

3. **Créer module dateTimeOttawa**
   - Implémenter fonctions de base
   - Tests unitaires complets

4. **Refonte progressive**
   - Commencer par repartitionService
   - Puis capaciteService
   - Enfin frontend

---

## 📊 MÉTRIQUES DE SUCCÈS

- ✅ Aucun décalage de date (0 bugs)
- ✅ Tests timezone passent à 100%
- ✅ Répartition déterministe (mêmes inputs = mêmes outputs)
- ✅ Performance maintenue (< 500ms par répartition)
- ✅ Couverture tests > 90% sur modules temps

---

**Statut:** 🟡 AUDIT TERMINÉ - EN ATTENTE VALIDATION USER

**Prêt pour:** Phase 1 (Fondations timezone)

**Auteur:** RefonteLogiqueTemps  
**Révision:** 1.0
