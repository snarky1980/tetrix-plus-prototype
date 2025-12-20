# Correction Mode ÉQUILIBRÉ - Allocation Tardive

**Date:** 20 décembre 2025  
**Fichier modifié:** `backend/src/services/repartitionService.ts`  
**Fonction modifiée:** `calculerPlageHoraireEquilibree()`

## Contexte

Le mode de répartition ÉQUILIBRÉ allouait précédemment les heures **le plus tôt possible** dans la journée. L'utilisateur a demandé que la logique soit modifiée pour allouer les heures **le plus tard possible**, comme le mode JAT (Juste-à-Temps).

## Changement de Stratégie

### ❌ Ancienne logique (le plus tôt possible)

```typescript
// Stratégie: Allouer le plus tôt possible, en évitant la pause midi

// Commencer au début de l'horaire
let debut = horaire.heureDebut;

// Si des heures sont déjà utilisées, avancer en conséquence
if (heuresDejaUtilisees > 0) {
  debut += heuresDejaUtilisees;
  // ...
}
```

**Exemple:** Sur un horaire 9h-17h avec 2h déjà utilisées (14h-16h)  
→ Allocation de 4h : **9h-12h** puis **13h-14h** ❌ (le plus tôt)

### ✅ Nouvelle logique (le plus tard possible)

```typescript
// NOUVELLE STRATÉGIE: Allouer LE PLUS TARD POSSIBLE (comme JAT)

// Capacité totale et restante
const capaciteTotale = capaciteNetteJour(horaire, dateJour);
const capaciteRestante = capaciteTotale - heuresDejaUtilisees;

// Cas 2: On n'utilise pas toute la capacité - allouer LE PLUS TARD POSSIBLE
heureDebut = heureFin - heuresAllouees;

// Si on traverse la pause 12h-13h en remontant, ajuster
if (heureDebut < 13 && heureFin > 13) {
  heureDebut -= 1; // Remonter d'une heure supplémentaire pour exclure la pause
}
```

**Exemple:** Sur un horaire 9h-17h avec 2h déjà utilisées (14h-16h)  
→ Allocation de 4h : **16h-17h** puis **9h-12h** ✅ (le plus tard possible)

## Règles Métier Respectées

### 1. Ne JAMAIS allouer sur heures bloquées ou tâches existantes

La fonction utilise `heuresDejaUtilisees` pour éviter les conflits :

```typescript
// Vérifier qu'on ne chevauche pas les heures déjà utilisées
if (heuresDejaUtilisees > 0) {
  const finHeuresExistantes = horaire.heureDebut + heuresDejaUtilisees;
  if (heureDebut < finHeuresExistantes) {
    // Conflit détecté - on doit allouer après les heures existantes
    heureDebut = finHeuresExistantes;
    // ...
  }
}
```

### 2. Respecter la pause midi (12h-13h)

La fonction exclut automatiquement la pause :

```typescript
// Si on traverse la pause 12h-13h en remontant, ajuster
if (heureDebut < 13 && heureFin > 13) {
  heureDebut -= 1; // Remonter d'une heure supplémentaire pour exclure la pause
}
```

### 3. Respecter l'horaire du traducteur

```typescript
// S'assurer qu'on ne commence pas avant l'heure de début
heureDebut = Math.max(heureDebut, horaire.heureDebut);

// S'assurer qu'on ne dépasse pas la fin de l'horaire
heureFin = Math.min(heureFin, horaire.heureFin);
```

## Scénarios de Test

### Scénario 1: Allocation simple (pas d'heures existantes)

**Données:**
- Horaire: 9h-17h (7h nettes avec pause)
- Heures déjà utilisées: 0h
- Heures à allouer: 3h

**Résultat attendu:**
- Plage: **14h-17h** ✅ (le plus tard possible)

### Scénario 2: Avec heures existantes en fin de journée

**Données:**
- Horaire: 9h-17h
- Heures déjà utilisées: 2h (supposons 15h-17h)
- Heures à allouer: 3h

**Résultat attendu:**
- Plage: **12h-15h** ✅ (juste avant les heures existantes, après pause)

### Scénario 3: Capacité complète utilisée

**Données:**
- Horaire: 9h-17h (7h nettes)
- Heures déjà utilisées: 4h
- Heures à allouer: 3h (= capacité restante)

**Résultat attendu:**
- Plage: **13h-17h** ✅ (après les 4h existantes + pause)

### Scénario 4: Traversée de la pause midi

**Données:**
- Horaire: 9h-17h
- Heures déjà utilisées: 0h
- Heures à allouer: 6h

**Résultat attendu:**
- Plage: **11h-12h** puis **13h-17h** ✅ (6h nettes, pause exclue)

## Impact Utilisateur

### ✅ Avantages

1. **Cohérence avec JAT**: Les deux modes (JAT et ÉQUILIBRÉ) suivent maintenant la même philosophie d'allocation tardive
2. **Meilleure gestion du temps**: Les traducteurs conservent plus de flexibilité en début de journée
3. **Respect strict des contraintes**: Heures bloquées, pauses, horaires, tâches existantes

### 🔍 Points de Vigilance

- **Tester avec différentes configurations d'horaires**
- **Vérifier les cas avec plusieurs tâches sur la même journée**
- **Valider les cas limites (capacité exacte, heures fractionnaires)**

## Fichiers Connexes

- `backend/src/services/repartitionService.ts` - Fonction modifiée
- `backend/src/utils/dateTimeOttawa.ts` - Utilitaires de calcul (capaciteNetteJour)
- `AMELIORATION-MODE-EQUILIBRE-2025-12-20.md` - Auto-calcul des dates

## Validation

✅ Compilation TypeScript réussie  
⏳ Tests manuels à effectuer  
⏳ Redémarrage serveur requis

---

**Prochaine étape:** Redémarrer le serveur backend pour appliquer les changements.
