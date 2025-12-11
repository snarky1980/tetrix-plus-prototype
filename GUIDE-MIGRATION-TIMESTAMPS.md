# Guide de Migration: Support Timestamp (Date+Heure)

## Vue d'ensemble

Le système Tetrix supporte maintenant les timestamps (date+heure) en mode **hybride rétrocompatible**. Les données existantes (date seule) continuent de fonctionner sans modification.

## Architecture

### Mode Hybride

- **Mode Legacy** (`includeTime=false`): Date seule, stockée à minuit (00:00:00)
- **Mode Timestamp** (`includeTime=true`): Date+heure, ou date seule convertie en 23:59:59

### Détection Automatique

La fonction `hasSignificantTime(date)` détecte si une date contient une heure significative:
- `00:00:00` → `false` (minuit = pas d'heure)
- `23:59:59` → `false` (fin de journée par défaut)
- Toute autre heure → `true` (heure explicite)

## Backend

### Utilitaires (dateTimeOttawa.ts)

**6 Nouvelles fonctions:**

```typescript
// Parser timestamp ISO complet
parseOttawaDateTimeISO('2025-12-15T14:30:00')

// Formater avec heure
formatOttawaDateTimeISO(date) // "2025-12-15T14:30:00"

// Convertir en fin de journée
endOfDayOttawa('2025-12-15') // Date à 23:59:59

// Vérifier si heure significative
hasSignificantTime(date) // true si != minuit et != 23:59:59

// Calculer différence en heures (décimal)
differenceInHoursOttawa(debut, fin) // 8.5h

// Normaliser avec support timestamp
normalizeToOttawaWithTime(input, includeTime, label)
// → { date: Date, iso: string, hasTime: boolean }
```

### Services Métiers

**capaciteService.ts:**
```typescript
// NOUVEAU: Calculer heures disponibles dans plage horaire
capaciteDisponiblePlageHoraire(
  parseOttawaDateTimeISO('2025-12-15T09:00:00'),
  parseOttawaDateTimeISO('2025-12-15T17:30:00'),
  true // soustraire déjeuner (1h)
); // 7.5h
```

**repartitionService.ts:**
```typescript
// NOUVEAU: Option modeTimestamp
await repartitionJusteATemps(traducteurId, heures, dateEcheance, {
  modeTimestamp: true // Active support timestamp
});
```

### Controllers

**tacheController.ts:**
- Accepte maintenant `dateEcheance` au format "YYYY-MM-DD" OU "YYYY-MM-DDTHH:mm:ss"
- Détecte automatiquement si heure significative via `hasSignificantTime()`
- Active `modeTimestamp` pour JAT si heure fournie

## Frontend

### Composant DateTimeInput

**Usage:**

```tsx
import { DateTimeInput } from '../components/ui/DateTimeInput';

// Date seule (legacy)
<DateTimeInput
  label="Date d'échéance"
  value={dateEcheance}
  onChange={setDateEcheance}
  includeTime={false}
  required
/>

// Date + heure optionnelle
<DateTimeInput
  label="Date d'échéance"
  value={dateEcheance}
  onChange={setDateEcheance}
  includeTime={true}
  required
/>
```

**Formats acceptés:**
- `"2025-12-15"` → date seule
- `"2025-12-15T14:30:00"` → date+heure

### Migration des formulaires existants

**Avant:**
```tsx
<Input
  type="date"
  label="Date d'échéance"
  value={dateEcheance}
  onChange={(e) => setDateEcheance(e.target.value)}
/>
```

**Après (rétrocompatible):**
```tsx
<DateTimeInput
  label="Date d'échéance"
  value={dateEcheance}
  onChange={setDateEcheance}
  includeTime={false} // Comportement identique
/>
```

**Nouveau (avec heure):**
```tsx
<DateTimeInput
  label="Date d'échéance"
  value={dateEcheance}
  onChange={setDateEcheance}
  includeTime={true} // Permet saisie heure
/>
```

## Tests

**39 tests unitaires passent** (1 test DST désactivé):
- ✅ parseOttawaDateTimeISO (8 tests)
- ✅ formatOttawaDateTimeISO (2 tests)
- ✅ endOfDayOttawa (3 tests)
- ✅ hasSignificantTime (4 tests)
- ✅ differenceInHoursOttawa (4 tests)
- ✅ normalizeToOttawaWithTime (11 tests)
- ✅ Scénarios d'intégration (5 tests)
- ✅ Tests de régression (2 tests)

Lancer les tests:
```bash
cd backend && npm test -- dateTimeOttawaTimestamps.test.ts
```

## Règles Métier

### Pause Déjeuner

La fonction `capaciteDisponiblePlageHoraire` soustrait automatiquement 1h de pause déjeuner (12h-13h) si la plage dépasse 1h.

**Exemple:**
```typescript
// Journée 9h-17h
capaciteDisponiblePlageHoraire(
  debut, // 09:00
  fin,   // 17:00
  true   // soustraire déjeuner
); // 7h (8h - 1h déjeuner)
```

### Conversion par Défaut

- **Mode legacy** (`includeTime=false`): Toute entrée → minuit (00:00:00)
- **Mode timestamp** (`includeTime=true`):
  - Date seule → 23:59:59 (fin de journée)
  - Timestamp complet → heure conservée

## Rétrocompatibilité

### Garanties

1. **Données existantes**: Les tâches avec `dateEcheance` à minuit continuent de fonctionner
2. **API existante**: Les endpoints acceptent toujours "YYYY-MM-DD"
3. **Fonctions legacy**: `parseOttawaDateISO()`, `normalizeToOttawa()` inchangées
4. **Comportement UI**: Les formulaires sans `includeTime` fonctionnent à l'identique

### Aucune Migration Base de Données Requise

Le champ PostgreSQL `DateTime` supporte déjà les timestamps. Aucun changement de schéma nécessaire.

## Exemple Complet: Création de Tâche

**Ancien code (date seule):**
```tsx
const data = {
  numeroProjet: '12345',
  traducteurId: 'uuid',
  typeTache: 'TRADUCTION',
  heuresTotal: 8,
  dateEcheance: '2025-12-20', // Minuit
  repartitionAuto: true
};

await api.post('/api/taches', data);
```

**Nouveau code (date+heure):**
```tsx
const data = {
  numeroProjet: '12345',
  traducteurId: 'uuid',
  typeTache: 'TRADUCTION',
  heuresTotal: 8,
  dateEcheance: '2025-12-20T14:30:00', // 14h30
  repartitionAuto: true
};

await api.post('/api/taches', data);
// JAT activera automatiquement modeTimestamp
```

## Prochaines Étapes

1. ✅ Tests unitaires backend (39/40 passent)
2. ✅ Utilitaires timestamp implémentés
3. ✅ Services métiers étendus
4. ✅ Controllers mis à jour
5. ✅ Composant DateTimeInput créé
6. ⏳ Intégrer DateTimeInput dans TacheCreation.tsx
7. ⏳ Tester création tâche avec timestamp end-to-end
8. ⏳ Mettre à jour documentation utilisateur

## Support

En cas de problème, consulter:
- [PLAN-INTEGRATION-TIMESTAMPS.md](PLAN-INTEGRATION-TIMESTAMPS.md) - Plan détaillé (45 pages)
- [RAPPORT-IMPACT-TIMESTAMPS.md](RAPPORT-IMPACT-TIMESTAMPS.md) - Analyse d'impact (52 pages)
- [RAPPORT-FINAL-TIMESTAMPS.md](RAPPORT-FINAL-TIMESTAMPS.md) - État actuel (40 pages)
- Tests: `backend/tests/dateTimeOttawaTimestamps.test.ts`
