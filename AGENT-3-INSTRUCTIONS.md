# Instructions pour Agent 3 — Business Logic

## 🎯 Mission exclusive

Vous êtes responsable **UNIQUEMENT** de la logique métier. Ne touchez PAS à :
- La structure backend/frontend (routes, controllers, services déjà créés)
- Le design visuel (composants UI créés par Agent 2)
- L'authentification (déjà implémentée)

## ✅ Ce que vous devez faire

### 1. Implémenter l'algorithme "Juste-à-temps" (JAT)

**Fichier** : `backend/src/services/repartitionService.ts` (à créer)

**Logique** :
1. Partir de la date d'échéance
2. Remonter jour par jour (du plus récent au plus ancien)
3. Pour chaque jour :
   - Calculer la capacité restante = capaciteHeuresParJour - heures déjà allouées
   - Remplir autant que possible (jusqu'à capacité max)
4. Arrêter quand toutes les heures sont distribuées
5. Retourner un tableau `{ date: string, heures: float }[]`

**Exemple** :
```typescript
// Tâche : 10h à répartir, échéance 2024-01-05, capacité 7.5h/jour
// Traducteur a déjà :
//   2024-01-03 : 2h
//   2024-01-04 : 5h
//   2024-01-05 : 1h

// Résultat JAT :
[
  { date: '2024-01-05', heures: 6.5 }, // 7.5 - 1 = 6.5 disponibles
  { date: '2024-01-04', heures: 2.5 }, // 7.5 - 5 = 2.5 disponibles
  { date: '2024-01-03', heures: 1.0 }, // 7.5 - 2 = 5.5 mais reste seulement 1h
]
// Total : 6.5 + 2.5 + 1.0 = 10h ✓
```

**Fonction à créer** :
```typescript
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: float,
  dateEcheance: Date
): Promise<{ date: string; heures: number }[]>
```

**Intégrer dans** : `backend/src/controllers/tacheController.ts`
- Modifier `creerTache` pour appeler cette fonction si `repartitionAuto: true`

### 2. Implémenter la répartition manuelle

**Fichier** : `backend/src/services/repartitionService.ts`

**Fonctions** :
```typescript
// Répartir uniformément sur N jours
export function repartitionUniforme(
  heuresTotal: number,
  dateDebut: Date,
  dateFin: Date
): { date: string; heures: number }[]

// Valider qu'une répartition respecte les contraintes
export async function validerRepartition(
  traducteurId: string,
  repartition: { date: string; heures: number }[]
): Promise<{ valide: boolean; erreurs: string[] }>
```

**Validations à implémenter** :
1. La somme des heures = heuresTotal de la tâche
2. Aucun jour ne dépasse la capacité journalière du traducteur
3. Tenir compte des heures déjà allouées (tâches + blocages)

### 3. Implémenter les validations de capacité

**Fichier** : `backend/src/services/capaciteService.ts` (à créer)

**Fonction principale** :
```typescript
export async function verifierCapaciteJournaliere(
  traducteurId: string,
  date: Date,
  heuresSupplementaires: number
): Promise<{
  capacite: number;
  heuresActuelles: number;
  disponible: number;
  depassement: boolean;
}>
```

**Logique** :
1. Récupérer le traducteur et sa `capaciteHeuresParJour`
2. Récupérer tous les `AjustementTemps` pour cette date (TACHE + BLOCAGE)
3. Calculer : `heuresActuelles = somme(ajustements.heures)`
4. Calculer : `disponible = capacite - heuresActuelles`
5. Vérifier : `heuresActuelles + heuresSupplementaires <= capacite`

**Intégrer dans** :
- `backend/src/controllers/planningController.ts` → `creerBlocage`
- `backend/src/controllers/tacheController.ts` → `creerTache` et `mettreAJourTache`

### 4. Implémenter les filtres avancés

**Fichier** : Modifier `backend/src/controllers/traducteurController.ts`

**Améliorer `obtenirTraducteurs`** :
- Filtrer par période (traducteurs disponibles entre dateDebut et dateFin)
- Calculer et retourner la charge actuelle (heures planifiées / heures possibles)
- Trier par disponibilité décroissante (optionnel)

**Exemple de retour enrichi** :
```typescript
{
  id: "abc123",
  nom: "Marie Dupont",
  division: "Juridique",
  charge: {
    heuresPlanifiees: 25.5,
    heuresPossibles: 37.5, // 7.5h * 5 jours
    pourcentage: 68,
    disponible: 12.0
  }
}
```

### 5. Implémenter le calcul de planning avec code couleur

**Fichier** : `backend/src/services/planningService.ts` (à créer)

**Fonction** :
```typescript
export function calculerCouleurDisponibilite(
  heuresUtilisees: number,
  capacite: number
): 'libre' | 'presque-plein' | 'plein'
```

**Règles** :
- `heuresUtilisees >= capacite` → `'plein'` (rouge)
- `heuresUtilisees >= capacite * 0.8` → `'presque-plein'` (orange)
- Sinon → `'libre'` (vert)

**Intégrer dans** :
- `backend/src/controllers/planningController.ts` → `obtenirPlanning` et `obtenirPlanningGlobal`
- Ajouter un champ `couleur` à chaque jour du planning

### 6. Créer les hooks React pour la logique côté frontend

**Fichier** : `frontend/src/hooks/` (à créer)

**Hooks à implémenter** :
- `useRepartition.ts` - Logique de répartition côté frontend (prévisualisation)
- `useValidationCapacite.ts` - Validation en temps réel dans les formulaires
- `useFilterTraducteurs.ts` - Gestion des filtres multi-critères
- `usePlanning.ts` - Récupération et formatage du planning

**Exemple `useValidationCapacite.ts`** :
```typescript
export function useValidationCapacite(
  traducteurId: string,
  date: string,
  heures: number
) {
  const [validation, setValidation] = useState<{
    valide: boolean;
    message?: string;
    disponible?: number;
  }>();

  useEffect(() => {
    // Appeler l'API pour valider
    // Mettre à jour l'état
  }, [traducteurId, date, heures]);

  return validation;
}
```

### 7. Implémenter la logique des modals

**Fichier** : `frontend/src/components/modals/` (créé par Agent 2, vous ajoutez la logique)

**Modal BlocageForm** :
- Valider en temps réel : `useValidationCapacite`
- Si "Journée complète" cochée : `heures = capaciteHeuresParJour`
- Afficher message d'erreur si dépassement
- Désactiver bouton "Enregistrer" si invalide

**Modal CreerTacheForm - Étape 2** :
- Calculer la répartition JAT quand demandé
- Calculer la répartition uniforme quand demandé
- Valider chaque ligne en temps réel
- Afficher la somme et comparer à `heuresTotal`
- Afficher indicateurs de dépassement par jour

### 8. Implémenter les détails de journée

**Fichier** : `frontend/src/components/JourDetail.tsx` (à créer)

**Afficher pour un jour sélectionné** :
- Liste des tâches avec heures allouées
- Liste des blocages avec heures
- Total utilisé / Capacité
- Barre de progression visuelle

### 9. Implémenter les statistiques du dashboard traducteur

**Fichier** : Modifier `frontend/src/pages/DashboardTraducteur.tsx`

**Calculer et afficher** :
- Tâches : X h (somme des heures de toutes les tâches à venir)
- Blocages : Y h (somme des blocages à venir)
- Libre : Z h (capacité disponible sur la période)

**Utiliser** : `usePlanning` hook pour récupérer les données

### 10. Tests de validation métier

**Fichier** : `backend/src/tests/` (à créer, optionnel mais recommandé)

Créer des tests pour :
- Algorithme JAT (différents scénarios)
- Validation capacité (dépassement, OK, limites)
- Répartition uniforme
- Code couleur disponibilité

## 🚫 Ce que vous NE devez PAS faire

- Modifier les styles CSS ou composants visuels
- Modifier la structure des routes API
- Modifier le schéma Prisma
- Modifier l'authentification
- Créer de nouveaux modèles de données

## 📦 Librairies autorisées

Vous POUVEZ installer des librairies pour la logique :
- **date-fns** (déjà installé) pour manipulation de dates
- **lodash** pour utilitaires
- **decimal.js** si besoin de précision décimale extrême (probablement pas nécessaire)

## ✅ Checklist de validation

Avant de marquer votre travail terminé :

- [ ] Algorithme JAT implémenté et testé
- [ ] Répartition uniforme implémentée
- [ ] Répartition manuelle avec validation
- [ ] Validation de capacité journalière (backend + frontend)
- [ ] Filtres avancés avec charge calculée
- [ ] Code couleur disponibilité appliqué
- [ ] Hooks React pour logique frontend
- [ ] Modal blocage avec validation temps réel
- [ ] Modal création tâche avec répartition auto/manuelle
- [ ] Détail de journée fonctionnel
- [ ] Statistiques dashboard traducteur
- [ ] Planning global avec indicateurs de charge
- [ ] Messages d'erreur clairs et en français
- [ ] Aucun arrondi débile (format décimal strict)
- [ ] Documentation dans un README Agent 3

## 📄 Livrable attendu

Un fichier `AGENT-3-README.md` documentant :
- Algorithmes implémentés (JAT, uniforme, validations)
- Services créés et leur usage
- Hooks React créés
- Exemples de calculs
- Cas limites gérés
- Tests effectués (si applicable)

---

**Bonne chance, Agent 3 !** 🧠  
Faites une logique métier impeccable, résistante aux erreurs.
