# 📋 Plan d'Intégration - Support des Timestamps (Date + Heure)

> **Objectif**: Ajouter le support complet des timestamps (date + heure) dans Tetrix PLUS sans briser l'existant

---

## 🎯 Analyse de l'État Actuel

### État des Lieux
```
┌─────────────────────────────────────────────────────────────┐
│ SYSTÈME ACTUEL                                               │
├─────────────────────────────────────────────────────────────┤
│ ✓ Dates stockées en DateTime (PostgreSQL)                  │
│ ✓ Interface utilisateur: inputs type="date" (YYYY-MM-DD)   │
│ ✓ Traitement: normalization à minuit Ottawa                │
│ ✓ Calculs: basés sur jours calendaires (differenceInDays)  │
│ ✓ Distribution: par journée complète (00:00 à 23:59)       │
│ ✓ Capacité: heures par jour (7.5h/jour)                    │
└─────────────────────────────────────────────────────────────┘
```

### Champs de Date Concernés
| Modèle | Champ | Type Actuel | Usage |
|--------|-------|-------------|-------|
| **Tache** | `dateEcheance` | DateTime | Date limite de livraison (minuit) |
| **AjustementTemps** | `date` | DateTime @db.Date | Jour de l'allocation/blocage |
| **Utilisateur** | `creeLe`, `modifieLe` | DateTime | Audit (timestamps complets - OK) |
| **Traducteur** | `creeLe`, `modifieLe` | DateTime | Audit (timestamps complets - OK) |

**Conclusion**: Seuls `Tache.dateEcheance` et potentiellement les calculs horaires nécessitent des timestamps précis.

---

## 🏗️ Stratégie d'Intégration

### Principe Fondamental
```
┌──────────────────────────────────────────────────────────────┐
│ RÉTROCOMPATIBILITÉ TOTALE                                    │
├──────────────────────────────────────────────────────────────┤
│ 1. Conserver les dates existantes (minuit = 00:00:00)       │
│ 2. Ajouter un nouveau champ optionnel `heureEcheance`       │
│ 3. Mode hybride: date seule OU date + heure                 │
│ 4. Migration progressive (sans rupture de données)          │
│ 5. Fallback automatique si heure non fournie                │
└──────────────────────────────────────────────────────────────┘
```

### Approche Retenue: **CHAMP UNIQUE avec Timestamp Complet**

Plutôt que d'ajouter un champ séparé, nous utilisons la capacité native de `DateTime` pour stocker l'heure:

```prisma
model Tache {
  // AVANT (actuel)
  dateEcheance DateTime  // Stocké à minuit: 2025-12-15T00:00:00
  
  // APRÈS (nouvelle logique)
  dateEcheance DateTime  // Peut inclure l'heure: 2025-12-15T14:30:00
  // Si heure non fournie par l'utilisateur → 23:59:59 par défaut (fin de journée)
}
```

**Avantages**:
- ✅ Pas de migration de schéma nécessaire
- ✅ Compatibilité totale avec données existantes
- ✅ Un seul champ à gérer partout
- ✅ Logique plus simple à maintenir

---

## 📐 Impact sur les Composants

### 1️⃣ Base de Données (Prisma)

**Fichier**: `backend/prisma/schema.prisma`

```prisma
model Tache {
  // ... autres champs ...
  dateEcheance DateTime  // Pas de changement de type, mais sémantique élargie
  // Interprétation:
  // - Si time = 00:00:00 → tâche legacy (date seule)
  // - Si time = 23:59:59 → date seule fournie par UI nouvelle (fin de journée)
  // - Si time = HH:MM:SS → timestamp précis fourni
}
```

**Action**: Aucune migration nécessaire, juste mise à jour de la documentation.

---

### 2️⃣ Backend - Utilitaires Date/Heure

**Fichier**: `backend/src/utils/dateTimeOttawa.ts`

#### Nouvelles Fonctions à Ajouter

```typescript
/**
 * Parse une string ISO complète avec heure
 * Format accepté: YYYY-MM-DDTHH:mm:ss ou YYYY-MM-DD HH:mm:ss
 */
export function parseOttawaDateTimeISO(dateTimeStr: string): Date {
  // Validation format
  // Conversion timezone Ottawa
  // Return Date avec heure précise
}

/**
 * Formate une Date en string ISO avec heure
 * Résultat: "2025-12-15T14:30:00"
 */
export function formatOttawaDateTimeISO(date: Date): string {
  return format(toZonedTime(date, OTTAWA_TIMEZONE), 
    "yyyy-MM-dd'T'HH:mm:ss", 
    { timeZone: OTTAWA_TIMEZONE }
  );
}

/**
 * Obtient l'heure de fin de journée (23:59:59) pour une date
 */
export function endOfDayOttawa(date: Date): Date {
  const iso = formatOttawaISO(date);
  return parseOttawaDateTimeISO(`${iso}T23:59:59`);
}

/**
 * Vérifie si une Date contient une heure significative
 * (différente de minuit ou 23:59:59)
 */
export function hasSignificantTime(date: Date): boolean {
  const ottawa = toZonedTime(date, OTTAWA_TIMEZONE);
  const hours = ottawa.getHours();
  const minutes = ottawa.getMinutes();
  const seconds = ottawa.getSeconds();
  
  // Minuit = pas d'heure fournie (legacy)
  if (hours === 0 && minutes === 0 && seconds === 0) return false;
  // 23:59:59 = fin de journée par défaut
  if (hours === 23 && minutes === 59 && seconds === 59) return false;
  
  return true; // Heure significative présente
}

/**
 * Normalise une entrée utilisateur avec support optionnel de l'heure
 */
export function normalizeToOttawaWithTime(
  input: DateInput | string,
  includeTime: boolean = false
): { date: Date; iso: string; hasTime: boolean } {
  // Si includeTime = false → comportement actuel (minuit)
  // Si includeTime = true → parse l'heure si fournie, sinon 23:59:59
}

/**
 * Calcule la différence en heures entre deux timestamps Ottawa
 */
export function differenceInHoursOttawa(dateFrom: Date, dateTo: Date): number {
  return (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60);
}
```

**Impact**: Extensions uniquement, aucune modification des fonctions existantes.

---

### 3️⃣ Backend - Services

#### A. Service de Répartition (`repartitionService.ts`)

**Modifications**:

```typescript
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheanceInput: DateInput,
  optionsOrDebug?: boolean | RepartitionJATOptions
): Promise<RepartitionItem[]> {
  // AVANT
  const { date: echeance } = normalizeToOttawa(dateEcheanceInput, 'dateEcheance');
  // → echeance = minuit du jour d'échéance
  
  // APRÈS
  const { date: echeance, hasTime } = normalizeToOttawaWithTime(
    dateEcheanceInput, 
    true // Support de l'heure
  );
  
  // Si hasTime = true → calculer la fenêtre en heures plutôt qu'en jours
  // Si hasTime = false → comportement actuel (jours entiers)
}
```

**Nouvelles Logiques**:

1. **Distribution avec heure précise**:
```typescript
if (hasTime) {
  // Calculer heures disponibles jusqu'à l'heure exacte d'échéance
  const maintenant = nowOttawa();
  const heuresDisponiblesAujourdHui = Math.max(
    differenceInHoursOttawa(maintenant, echeance) % 24,
    0
  );
  
  // Respecter la pause de midi (13h = 1h bloquée)
  const heuresDisponiblesAujourdHuiEffectives = 
    ajusterPourPauseMidi(maintenant, echeance, heuresDisponiblesAujourdHui);
}
```

2. **Gestion de la pause de midi**:
```typescript
function ajusterPourPauseMidi(debut: Date, fin: Date, heures: number): number {
  const debutOttawa = toZonedTime(debut, OTTAWA_TIMEZONE);
  const finOttawa = toZonedTime(fin, OTTAWA_TIMEZONE);
  
  const heureMidiDebut = 12; // 12h00
  const heureMidiFin = 13;   // 13h00
  
  // Si la fenêtre chevauche 12h-13h, soustraire 1h
  if (debutOttawa.getHours() < heureMidiFin && 
      finOttawa.getHours() >= heureMidiDebut) {
    return Math.max(heures - 1, 0);
  }
  
  return heures;
}
```

#### B. Service de Capacité (`capaciteService.ts`)

**Modifications**:

```typescript
export async function capaciteDisponiblePlageHoraire(
  traducteurId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<number> {
  // Nouvelle fonction pour calculer capacité entre deux timestamps précis
  const traducteur = await prisma.traducteur.findUnique({ 
    where: { id: traducteurId } 
  });
  
  const heuresTotal = differenceInHoursOttawa(dateDebut, dateFin);
  
  // Calculer nombre de jours complets + heures partielles
  const jours = Math.floor(heuresTotal / 24);
  const heuresPartielles = heuresTotal % 24;
  
  // Capacité = jours * capaciteParJour + proportion du jour partiel
  const capaciteBase = jours * traducteur.capaciteHeuresParJour;
  const capacitePartielle = (heuresPartielles / 24) * traducteur.capaciteHeuresParJour;
  
  // Soustraire pauses de midi (1h par jour)
  const pausesMidi = jours + (heuresPartielles >= 12 ? 1 : 0);
  
  return capaciteBase + capacitePartielle - pausesMidi;
}
```

---

### 4️⃣ Backend - Controllers

**Fichier**: `backend/src/controllers/tacheController.ts`

```typescript
export const creerTache = async (req: AuthRequest, res: Response) => {
  const {
    dateEcheance,      // "2025-12-15" ou "2025-12-15T14:30:00"
    heureEcheance,     // Optionnel: "14:30" (si séparé)
    // ...
  } = req.body;
  
  let dateEcheanceComplete: Date;
  
  // Cas 1: Timestamp complet fourni
  if (dateEcheance.includes('T')) {
    dateEcheanceComplete = parseOttawaDateTimeISO(dateEcheance);
  }
  // Cas 2: Date + heure séparées
  else if (heureEcheance) {
    const dateTimeStr = `${dateEcheance}T${heureEcheance}:00`;
    dateEcheanceComplete = parseOttawaDateTimeISO(dateTimeStr);
  }
  // Cas 3: Date seule → utiliser fin de journée par défaut
  else {
    const dateOnly = parseOttawaDateISO(dateEcheance);
    dateEcheanceComplete = endOfDayOttawa(dateOnly);
  }
  
  // Créer tâche avec timestamp complet
  await prisma.tache.create({
    data: {
      // ...
      dateEcheance: dateEcheanceComplete,
    }
  });
};
```

---

### 5️⃣ Backend - Validations

**Fichier**: `backend/src/validation/schemas.ts`

```typescript
// Nouvelle validation pour timestamp complet
const dateTimeISO = (field: string) => 
  z.string().refine(
    v => {
      // Accepter YYYY-MM-DD (date seule)
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return true;
      // Accepter YYYY-MM-DDTHH:mm:ss (timestamp complet)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) return true;
      // Accepter ISO complet avec timezone
      return !isNaN(Date.parse(v));
    },
    `${field} invalide (formats acceptés: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)`
  );

export const creerTacheSchema = z.object({
  body: z.object({
    // ...
    dateEcheance: dateTimeISO('dateEcheance'),
    heureEcheance: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm
  }),
});
```

---

### 6️⃣ Frontend - Types

**Fichier**: `frontend/src/types/index.ts`

```typescript
export interface Tache {
  // ...
  dateEcheance: string; // ISO string (peut inclure l'heure)
  heureEcheance?: string; // Optionnel: "14:30" pour UI séparée
}
```

---

### 7️⃣ Frontend - Composants UI

#### A. Formulaire de Création (`TacheCreation.tsx`)

**Modifications**:

```tsx
const [formData, setFormData] = useState({
  // ...
  dateEcheance: '',
  heureEcheance: '', // NOUVEAU
  includeHeure: false, // NOUVEAU: toggle pour activer l'heure
});

return (
  <>
    <FormField label="Date d'échéance" required>
      <Input
        type="date"
        value={formData.dateEcheance}
        onChange={e => setFormData({ ...formData, dateEcheance: e.target.value })}
        required
      />
    </FormField>
    
    {/* NOUVEAU: Option d'heure */}
    <FormField label="Inclure une heure précise?">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.includeHeure}
          onChange={e => setFormData({ 
            ...formData, 
            includeHeure: e.target.checked,
            heureEcheance: e.target.checked ? '17:00' : ''
          })}
        />
        <span className="text-sm">Spécifier l'heure d'échéance</span>
      </label>
    </FormField>
    
    {formData.includeHeure && (
      <FormField label="Heure d'échéance">
        <Input
          type="time"
          value={formData.heureEcheance}
          onChange={e => setFormData({ ...formData, heureEcheance: e.target.value })}
          placeholder="14:30"
        />
        <p className="text-xs text-muted mt-1">
          ⚠️ Pause de midi: 12h00-13h00 (heure bloquée automatiquement)
        </p>
      </FormField>
    )}
  </>
);
```

#### B. Affichage des Tâches

```tsx
// Utilitaire d'affichage
export function formatEcheance(tache: Tache): string {
  const date = new Date(tache.dateEcheance);
  
  // Vérifier si heure significative
  if (hasSignificantTime(date)) {
    return formatDateTimeDisplay(date); // "15 déc. 2025 à 14h30"
  }
  
  return formatDateDisplay(date); // "15 déc. 2025"
}

// Badge avec indicateur
<Badge variant={getBadgeVariant(tache.dateEcheance)}>
  {formatEcheance(tache)}
  {hasSignificantTime(new Date(tache.dateEcheance)) && (
    <span className="ml-1">🕐</span> // Icône horloge
  )}
</Badge>
```

---

## 🧪 Tests à Implémenter

### Tests Unitaires Backend

```typescript
describe('dateTimeOttawa - Timestamps', () => {
  it('parse timestamp complet correctement', () => {
    const dt = parseOttawaDateTimeISO('2025-12-15T14:30:00');
    expect(formatOttawaDateTimeISO(dt)).toBe('2025-12-15T14:30:00');
  });
  
  it('détecte heure significative', () => {
    const minuit = parseOttawaDateISO('2025-12-15');
    const finJour = endOfDayOttawa(minuit);
    const midi = parseOttawaDateTimeISO('2025-12-15T12:00:00');
    
    expect(hasSignificantTime(minuit)).toBe(false);
    expect(hasSignificantTime(finJour)).toBe(false);
    expect(hasSignificantTime(midi)).toBe(true);
  });
  
  it('calcule différence en heures correctement', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    expect(differenceInHoursOttawa(debut, fin)).toBe(8);
  });
});

describe('repartitionService - JAT avec timestamps', () => {
  it('répartit correctement avec échéance à 14h30', async () => {
    const echeance = '2025-12-15T14:30:00';
    const repartition = await repartitionJusteATemps(
      traducteurId,
      10,
      echeance
    );
    
    // Vérifier que le dernier jour ne dépasse pas 14h30
    // ...
  });
  
  it('respecte la pause de midi dans calculs horaires', async () => {
    const debut = '2025-12-15T08:00:00';
    const fin = '2025-12-15T17:00:00';
    
    const capacite = await capaciteDisponiblePlageHoraire(
      traducteurId,
      new Date(debut),
      new Date(fin)
    );
    
    // 9h - 1h pause = 8h disponibles (si capacité 9h/jour)
    expect(capacite).toBeLessThanOrEqual(8);
  });
});
```

### Tests d'Intégration

```typescript
describe('Tâche avec timestamp complet - E2E', () => {
  it('crée tâche avec date+heure et répartit correctement', async () => {
    const response = await request(app)
      .post('/api/taches')
      .send({
        traducteurId: 'test-id',
        heuresTotal: 12,
        dateEcheance: '2025-12-18T15:00:00',
        repartitionAuto: true,
      });
    
    expect(response.status).toBe(201);
    expect(response.body.ajustementsTemps).toBeDefined();
    
    // Vérifier que dernier ajustement respecte l'heure limite
  });
  
  it('fallback gracieux si heure non fournie', async () => {
    const response = await request(app)
      .post('/api/taches')
      .send({
        traducteurId: 'test-id',
        heuresTotal: 12,
        dateEcheance: '2025-12-18', // Date seule
        repartitionAuto: true,
      });
    
    expect(response.status).toBe(201);
    // Devrait utiliser 23:59:59 comme heure par défaut
  });
});
```

---

## 📊 Migration des Données

### Étape 1: Analyse des Données Existantes

```sql
-- Vérifier les tâches existantes
SELECT 
  id,
  dateEcheance,
  EXTRACT(HOUR FROM dateEcheance) as heure,
  EXTRACT(MINUTE FROM dateEcheance) as minute
FROM taches
WHERE EXTRACT(HOUR FROM dateEcheance) != 0
   OR EXTRACT(MINUTE FROM dateEcheance) != 0;

-- Résultat attendu: Aucune ligne (toutes à minuit actuellement)
```

### Étape 2: Migration Optionnelle (si souhaité)

```sql
-- Convertir toutes les échéances à minuit en fin de journée (23:59:59)
-- OPTIONNEL: seulement si on veut distinguer "legacy" de "nouveau défaut"

UPDATE taches
SET dateEcheance = dateEcheance + INTERVAL '23 hours 59 minutes 59 seconds'
WHERE EXTRACT(HOUR FROM dateEcheance) = 0
  AND EXTRACT(MINUTE FROM dateEcheance) = 0
  AND EXTRACT(SECOND FROM dateEcheance) = 0;
```

**Note**: Cette migration n'est PAS nécessaire pour la compatibilité. Elle est optionnelle pour uniformiser la sémantique.

---

## 🔒 Règles Métier Actualisées

### Nouvelle Règle: Pause de Midi Obligatoire

```
┌───────────────────────────────────────────────────────────────┐
│ RÈGLE: PAUSE_MIDI                                             │
├───────────────────────────────────────────────────────────────┤
│ - Horaire bloqué: 12h00 - 13h00 (heure Ottawa)               │
│ - Application: Distribution horaire uniquement                │
│ - Exemption: Distribution par jour entier (comportement actuel)│
│ - Implémentation: Soustraire 1h de la capacité si fenêtre    │
│   chevauche 12h-13h                                           │
└───────────────────────────────────────────────────────────────┘
```

### Règles Existantes Préservées

✅ **Toutes les règles métier actuelles restent inchangées**:
- TR1/TR2/TR3 classifications
- Capacité journalière (7.5h/jour)
- Validation weekend
- JAT backward allocation
- Blocages de temps
- Répartition équilibrée

---

## 🚦 Plan de Déploiement Progressive

### Phase 1: Backend Timestamp-Ready (Semaine 1)
- ✅ Ajouter fonctions `parseOttawaDateTimeISO`, `formatOttawaDateTimeISO`
- ✅ Ajouter `hasSignificantTime`, `differenceInHoursOttawa`
- ✅ Mettre à jour validations pour accepter timestamps
- ✅ Tests unitaires complets
- ✅ Déploiement backend (rétrocompatible à 100%)

### Phase 2: UI Date+Heure Optionnelle (Semaine 2)
- ✅ Ajouter toggle "Inclure heure" dans formulaires
- ✅ Input type="time" conditionnel
- ✅ Affichage heure dans badges si présente
- ✅ Tests E2E
- ✅ Déploiement frontend

### Phase 3: Calculs Horaires JAT (Semaine 3)
- ✅ Implémenter `capaciteDisponiblePlageHoraire`
- ✅ Mettre à jour `repartitionJusteATemps` pour mode horaire
- ✅ Ajouter gestion pause midi
- ✅ Tests de régression complets
- ✅ Déploiement avec monitoring

### Phase 4: Optimisations (Semaine 4)
- ✅ Améliorer précision distributions
- ✅ Ajuster UI selon retours
- ✅ Documentation utilisateur
- ✅ Formation équipes

---

## 🎯 Checklist Finale

### Avant Déploiement
- [ ] Tous les tests passent (unitaires + intégration)
- [ ] Aucune régression détectée
- [ ] Documentation API à jour
- [ ] Migration testée en staging
- [ ] Backup base de données effectué

### Après Déploiement
- [ ] Monitoring erreurs activé
- [ ] Logs timestamps vérifiés
- [ ] Performance mesurée (pas de dégradation)
- [ ] Tests utilisateurs (créer tâche avec/sans heure)
- [ ] Rollback plan ready

---

## 📈 Métriques de Succès

| Métrique | Cible | Validation |
|----------|-------|------------|
| **Rétrocompatibilité** | 100% | Aucune tâche existante cassée |
| **Tests** | ≥95% coverage | Jest + E2E |
| **Performance** | ±5% | Temps réponse API |
| **Adoption** | 30% en 1 mois | Usage du champ heure |
| **Erreurs** | <1% | Logs monitoring |

---

## 🔗 Fichiers à Modifier

### Backend
1. `backend/src/utils/dateTimeOttawa.ts` - Fonctions timestamp
2. `backend/src/services/repartitionService.ts` - JAT horaire
3. `backend/src/services/capaciteService.ts` - Calcul plage horaire
4. `backend/src/controllers/tacheController.ts` - Parse date+heure
5. `backend/src/validation/schemas.ts` - Validation timestamp

### Frontend
6. `frontend/src/types/index.ts` - Type Tache
7. `frontend/src/pages/TacheCreation.tsx` - Input heure
8. `frontend/src/utils/dateTimeOttawa.ts` - Helpers affichage
9. `frontend/src/components/ui/Badge.tsx` - Icône horloge

### Tests
10. `backend/tests/dateTimeOttawa.test.ts` - NOUVEAU
11. `backend/tests/repartitionTimestamp.test.ts` - NOUVEAU
12. `frontend/src/__tests__/TacheCreation.test.tsx` - MAJ

---

**Total estimé**: ~800 lignes de code nouveau + ~200 lignes modifiées
**Complexité**: Moyenne (bien encadrée par architecture existante)
**Risque**: Faible (rétrocompatibilité garantie)
