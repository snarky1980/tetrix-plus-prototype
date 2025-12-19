# Guide d'intégration des jours fériés

## Vue d'ensemble

Le système Tetrix+ intègre automatiquement les **jours fériés canadiens** (2026-2027) dans tous les planificateurs. Ces dates sont automatiquement exclues lors de la répartition des tâches, garantissant qu'aucun traducteur ne reçoit d'assignation durant ces périodes.

---

## Calendrier des jours fériés

### 2026 (11 jours)

| Date | Jour férié |
|------|-----------|
| 1er janvier | Jour de l'An |
| 2 janvier | Observé |
| 3 avril | Vendredi saint |
| 18 mai | Fête de la Reine |
| 1er juillet | Fête du Canada |
| 7 septembre | Fête du Travail |
| 30 septembre | Jour national de la vérité et de la réconciliation |
| 12 octobre | Action de grâces |
| 11 novembre | Jour du Souvenir |
| 25 décembre | Noël |
| 28 décembre | Boxing Day (observé) |

### 2027 (11 jours)

| Date | Jour férié |
|------|-----------|
| 1er janvier | Jour de l'An |
| 26 mars | Vendredi saint |
| 29 mars | Lundi de Pâques |
| 24 mai | Fête de la Reine |
| 1er juillet | Fête du Canada |
| 6 septembre | Fête du Travail |
| 30 septembre | Jour national de la vérité et de la réconciliation |
| 11 octobre | Action de grâces |
| 11 novembre | Jour du Souvenir |
| 27 décembre | Noël (observé) |
| 28 décembre | Boxing Day (observé) |

**Source**: PSAC/AFPC - Calendrier de la fonction publique fédérale canadienne

---

## Architecture technique

### Backend

#### 1. JoursFeriesService (`backend/src/services/joursFeriesService.ts`)

Service centralisé gérant les jours fériés:

```typescript
export class JoursFeriesService {
  // Données hardcodées (2026-2027)
  private static readonly JOURS_FERIES_2026: JourFerie[]
  private static readonly JOURS_FERIES_2027: JourFerie[]

  // Vérification
  static estJourFerie(date: Date): boolean
  static obtenirNomJourFerie(date: Date): string | null

  // Récupération
  static obtenirJoursFeries(annee: number): JourFerie[]
  static obtenirJoursFeriesEntreDates(dateDebut: Date, dateFin: Date): JourFerie[]

  // Calculs
  static compterJoursOuvrables(dateDebut: Date, dateFin: Date): number
  static prochainJourOuvrable(date: Date): Date
  static filtrerJoursFeries(dates: Date[]): Date[]
}
```

**Méthode clé**: `estJourFerie(date)` retourne `true` si la date correspond à un jour férié configuré.

#### 2. API REST (`backend/src/routes/jours-feries.routes.ts`)

Endpoints disponibles:

```
GET  /api/jours-feries           → Liste complète (2026-2027)
GET  /api/jours-feries/:annee    → Jours fériés d'une année (2026 ou 2027)
POST /api/jours-feries/verifier  → Vérifie si une date est fériée
POST /api/jours-feries/jours-ouvrables → Compte les jours ouvrables entre 2 dates
```

**Exemple de requête**:
```bash
curl -X POST https://tetrix-plus-backend.onrender.com/api/jours-feries/verifier \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-12-25"}'

# Réponse
{
  "date": "2026-12-25",
  "estFerie": true,
  "nom": "Noël"
}
```

#### 3. Intégration dans repartitionService

Le service de répartition (`backend/src/services/repartitionService.ts`) exclut automatiquement les jours fériés dans **tous les modes de distribution**:

##### Mode JAT (Juste-à-temps)

**Calcul de capacité** (ligne ~278):
```typescript
// Exclut week-ends ET jours fériés
if (isWeekendOttawa(d) || JoursFeriesService.estJourFerie(d)) continue;
totalJours++;
```

**Boucle d'allocation** (ligne ~320):
```typescript
// N'alloue que sur jours ouvrables (non-week-end, non-férié)
if (!isWeekendOttawa(courant) && !JoursFeriesService.estJourFerie(courant)) {
  // Allocation des heures
}
```

##### Mode ÉQUILIBRE (ligne ~395)

```typescript
// Filtre les disponibilités avant équilibrage
disponibilites = disponibilites.filter((jour) => !JoursFeriesService.estJourFerie(jour));
```

##### Mode PEPS (ligne ~547)

```typescript
// Continue l'itération si jour férié
if (JoursFeriesService.estJourFerie(jour)) continue;
```

**Comportement uniforme**: Aucune heure n'est attribuée sur les jours fériés, quel que soit le mode de distribution.

---

### Frontend

#### 1. Service API (`frontend/src/services/joursFeriesService.ts`)

Client TypeScript pour interroger l'API:

```typescript
class JoursFeriesService {
  async obtenirTous(): Promise<JourFerie[]>
  async obtenirParAnnee(annee: number): Promise<JourFerie[]>
  async verifierDate(date: string): Promise<VerificationJourFerie>
  async compterJoursOuvrables(dateDebut: string, dateFin: string): Promise<JoursOuvrablesResponse>
  
  // Utilitaires côté client
  estJourFerieLocal(date: Date, joursFeries: JourFerie[]): boolean
  filtrerJoursFeries(dates: string[], joursFeries: JourFerie[]): string[]
}
```

#### 2. Composant de visualisation (`frontend/src/components/jours-feries/CalendrierFeries.tsx`)

Interface React pour afficher les jours fériés:

- **Sélecteur d'année**: Bascule entre 2026 et 2027
- **Affichage par mois**: Organisé en grille (3 colonnes)
- **Indicateurs visuels**: Points rouges pour chaque jour férié
- **Alerte informative**: Explique le blocage automatique dans les planificateurs
- **Métadonnées**: Total des jours fériés + source (PSAC/AFPC)

**Utilisation**:
```tsx
import { CalendrierFeries } from '@/components/jours-feries/CalendrierFeries';

function MaPage() {
  return <CalendrierFeries className="my-custom-class" />;
}
```

---

## Impact sur la répartition des heures

### Avant l'intégration des jours fériés

Le système excluait uniquement les **week-ends** (samedi/dimanche, fuseau Ottawa):

```typescript
// Ancien comportement
if (isWeekendOttawa(date)) continue; // ❌ Manquait les jours fériés
```

### Après l'intégration

Le système exclut maintenant **week-ends ET jours fériés**:

```typescript
// Nouveau comportement
if (isWeekendOttawa(date) || JoursFeriesService.estJourFerie(date)) continue; // ✅ Complet
```

### Exemple concret

**Tâche**: 40 heures à répartir du 22 décembre 2026 au 6 janvier 2027  
**Mode**: JAT (capacité 8h/jour)

**Calcul de capacité**:
```
Période: 16 jours calendaires
- Week-ends: 22-23/12, 29-30/12, 5-6/01 = 6 jours
- Jours fériés: 25/12 (Noël), 28/12 (Boxing Day), 1/01 (Jour de l'An), 2/01 (Observé) = 4 jours
= Jours disponibles: 16 - 6 - 4 = 6 jours
= Capacité totale: 6 × 8h = 48 heures ✅ (suffisant pour 40h)
```

**Répartition**:
- 24 décembre: 8h
- 29 décembre: ❌ Dimanche (exclu)
- 30 décembre: 8h
- 31 décembre: 8h
- 3 janvier: 8h
- 4 janvier: 8h
- **Total alloué**: 40h sur 5 jours ouvrables

**Dates exclues automatiquement**:
- 25 décembre 2026 (Noël) ❌
- 28 décembre 2026 (Boxing Day) ❌
- 1er janvier 2027 (Jour de l'An) ❌
- 2 janvier 2027 (Observé) ❌

---

## Tests et validation

### Tests manuels suggérés

1. **Création de tâche sur jour férié**:
   - Créer une tâche avec date de début = 25 décembre 2026
   - ✅ Vérifier que le système saute automatiquement au 29 décembre 2026

2. **Distribution JAT traversant Noël**:
   - Tâche 40h du 23/12/2026 au 30/12/2026
   - ✅ Vérifier aucune heure allouée le 25 (Noël) et 28 (Boxing Day)

3. **Distribution ÉQUILIRE avec fériés**:
   - Tâche avec deadline 2/01/2027
   - ✅ Vérifier que 1er et 2 janvier sont exclus des calculs

4. **Requête API**:
   ```bash
   curl -X GET https://tetrix-plus-backend.onrender.com/api/jours-feries/2026
   ```
   - ✅ Retourne exactement 11 jours fériés

### Tests automatisés (à implémenter)

```typescript
describe('JoursFeriesService', () => {
  it('devrait identifier Noël 2026 comme jour férié', () => {
    const noel = new Date('2026-12-25T12:00:00Z');
    expect(JoursFeriesService.estJourFerie(noel)).toBe(true);
  });

  it('ne devrait pas compter les jours fériés dans la capacité JAT', async () => {
    const tache = {
      dateDebut: new Date('2026-12-23T08:00:00-05:00'),
      dateFin: new Date('2027-01-05T17:00:00-05:00'),
      heuresEstimees: 40,
    };
    
    const result = await repartitionService.repartir(tache, 'JAT');
    
    // Vérifie qu'aucune heure n'est allouée sur 25/12, 28/12, 01/01, 02/01
    expect(result.find(r => r.date === '2026-12-25')).toBeUndefined();
    expect(result.find(r => r.date === '2026-12-28')).toBeUndefined();
    expect(result.find(r => r.date === '2027-01-01')).toBeUndefined();
    expect(result.find(r => r.date === '2027-01-02')).toBeUndefined();
  });
});
```

---

## Évolutions futures

### Années supplémentaires (2028+)

Ajouter de nouvelles années dans `JoursFeriesService.ts`:

```typescript
private static readonly JOURS_FERIES_2028: JourFerie[] = [
  { date: '2028-01-01', nom: 'Jour de l\'An', description: 'Nouvel An' },
  // ... autres dates
];

static obtenirJoursFeries(annee: number): JourFerie[] {
  switch (annee) {
    case 2026: return this.JOURS_FERIES_2026;
    case 2027: return this.JOURS_FERIES_2027;
    case 2028: return this.JOURS_FERIES_2028; // ← Nouvelle année
    default: throw new Error(`Aucun jour férié configuré pour ${annee}`);
  }
}
```

### Configuration dynamique

Remplacer les constantes hardcodées par une table Prisma:

```prisma
model JourFerie {
  id          String   @id @default(cuid())
  date        DateTime
  nom         String
  description String?
  annee       Int
  actif       Boolean  @default(true)
  creeLe      DateTime @default(now())
}
```

### Jours fériés provinciaux

Ajouter un champ `province` pour gérer les fériés locaux (Québec, Ontario, etc.).

---

## Références

- **Calendrier source**: PSAC/AFPC (Alliance de la Fonction publique du Canada)
- **Code backend**: `backend/src/services/joursFeriesService.ts`
- **Code frontend**: `frontend/src/components/jours-feries/CalendrierFeries.tsx`
- **Documentation logique**: `docs/LOGIQUE-REPARTITION-HEURES.md`

---

**Dernière mise à jour**: 18 décembre 2024  
**Version**: 1.0 (2026-2027)
