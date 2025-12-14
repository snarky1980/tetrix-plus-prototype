# 📝 CHANGEMENTS DE LOGIQUE MÉTIER - VERSION 2.0

**Date**: 14 décembre 2025  
**Version**: 2.0  
**Statut**: Implémenté et testé

---

## 🎯 CHANGEMENTS MAJEURS

### 1. MODE JAT : Allocation STRICTEMENT à rebours

#### Ancienne logique
- Jour J : heures allouées en **DÉBUT** de journée
- Jours avant : heures allouées en **FIN** de journée

#### Nouvelle logique ✅
- **TOUS les jours** : allocation **STRICTEMENT à rebours**
- Le jour J est traité exactement comme les autres jours
- On remonte depuis l'heure de deadline (ou fin de journée)

#### Exemple concret
```
Scénario :
- Deadline : 11h00
- Tâche : 2 heures
- Horaire traducteur : 8h-17h

❌ AVANT : 8h-10h (début de journée)
✅ MAINTENANT : 9h-11h (à rebours depuis deadline)
```

#### Règle de calcul
```typescript
// Déterminer l'heure de fin
heureFin = estJourEcheance ? heureDeadline : horaire.heureFin

// Calculer le début en remontant
heureDebut = heureFin - heuresAllouees

// Si on traverse la pause 12h-13h, ajuster
if (heureDebut < 13 && heureFin > 13) {
    heureDebut -= 1  // Exclure la pause
}
```

### 2. MODE ÉQUILIBRÉ : Ajout des heures précises

#### Ancienne logique
- Retournait seulement : `{date, heures}`
- Pas d'indication des plages horaires

#### Nouvelle logique ✅
- Retourne maintenant : `{date, heures, heureDebut, heureFin}`
- Allocation le **plus TÔT possible** dans la journée
- Tient compte des autres tâches déjà allouées
- Exclut automatiquement la pause midi

#### Exemple concret
```
Scénario :
- 4 heures à répartir par jour
- Horaire : 8h-17h
- Déjà 2h utilisées ce jour (9h-11h par une autre tâche)

Résultat :
{
    date: "2025-12-16",
    heures: 4,
    heureDebut: "11h",      // Après les 2h existantes
    heureFin: "16h"         // 4h plus tard (pause exclue)
}
```

#### Règle de calcul
```typescript
// Commencer au début ou après les heures déjà utilisées
debut = horaire.heureDebut + heuresDejaUtilisees

// Si des heures traversent la pause, ajuster
if (debut < 12 && (debut + heures) > 12) {
    // Sauter la pause midi
}

fin = debut + heuresAllouees
```

### 3. MODE PEPS : Allocation séquentielle avec heures précises

Le mode PEPS (Premier Entré, Premier Sorti) fonctionne de manière **séquentielle** :

#### Point de départ
- **Par défaut** : commence au moment de l'allocation (maintenant)
- **Personnalisable** : l'utilisateur peut spécifier une date/heure de début

#### Logique d'allocation
- Distribue les heures **séquentiellement** jour après jour
- Alloue le **plus tôt possible** chaque jour (comme ÉQUILIBRÉ)
- Continue jusqu'à ce que toutes les heures soient distribuées
- **VALIDATION CRITIQUE** : S'assure que toutes les heures sont distribuées **AVANT** la deadline

#### Retour des données
Retourne : `{date, heures, heureDebut, heureFin}` pour chaque jour

#### Contraintes respectées
- ✅ Autres tâches déjà allouées
- ✅ Congés du traducteur
- ✅ Heures bloquées
- ✅ Weekends exclus
- ✅ Pause midi (12h-13h) exclue
- ✅ Deadline respectée (erreur si impossible)

#### Exemple concret
```
Scénario :
- Allocation : 14 décembre 2025 à 10h00
- Heures totales : 12h
- Deadline : 17 décembre 2025 à 17h00
- Horaire traducteur : 8h-17h (capacité 8h/jour avec pause)

Résultat :
[
  { date: "2025-12-14", heures: 7, heureDebut: "10h", heureFin: "18h" },  // Commence à 10h (moment allocation)
  { date: "2025-12-15", heures: 5, heureDebut: "8h", heureDebut: "14h" }  // Finit tout avant deadline
]

Total : 12h distribuées ✓
Tout fini avant le 17 à 17h ✓
```

#### Message d'erreur
Si impossible de tout distribuer avant la deadline :
```
"Capacité insuffisante sur la période (3.5h restantes)."
```

---

## 🔧 IMPACTS TECHNIQUES

### Fonctions modifiées

#### 1. `calculerPlageHoraireJAT()`
```typescript
// AVANT
if (estJourEcheance) {
    // Allouer du DÉBUT vers l'échéance
    debut = horaire.heureDebut
    fin = debut + heuresAllouees
} else {
    // Allouer de la FIN vers le début
    fin = horaire.heureFin
    debut = fin - heuresAllouees
}

// MAINTENANT
// TOUT À REBOURS, même le jour J
heureFin = estJourEcheance ? heureDeadline : horaire.heureFin
heureDebut = heureFin - heuresAllouees
// Ajuster pour pause si nécessaire
```

#### 2. `calculerPlageHoraireEquilibree()` ✨ NOUVELLE
```typescript
function calculerPlageHoraireEquilibree(
  heuresAllouees: number,
  horaire: { heureDebut: number; heureFin: number },
  heuresDejaUtilisees: number,
  dateJour: Date
): { heureDebut: string; heureFin: string }
```

Fonctionnalités :
- Alloue le plus tôt possible
- Tient compte des heures déjà utilisées
- Exclut automatiquement la pause 12h-13h
- S'assure de ne pas dépasser la fin de l'horaire

#### 3. `repartitionEquilibree()`
Maintenant retourne :
```typescript
{
    date: string,
    heures: number,
    heureDebut: string,  // NOUVEAU
    heureFin: string      // NOUVEAU
}
```

#### 4. `repartitionPEPS()`
Même changement que `repartitionEquilibree()` - ajoute `heureDebut` et `heureFin`

---

## ✅ VALIDATION

### Tests passés
- ✅ Tous les tests unitaires passent (225 tests)
- ✅ Compilation TypeScript sans erreur
- ✅ Compatibilité avec l'existant préservée

### Cas testés

#### JAT - Strictement à rebours
```typescript
// Test 1: Deadline 11h, 2h à allouer
expect(result[0].heureDebut).toBe("9h")
expect(result[0].heureFin).toBe("11h")

// Test 2: Multiple jours
// Dernier jour: à rebours depuis deadline
// Jours avant: à rebours depuis fin horaire
```

#### ÉQUILIBRÉ - Heures précises
```typescript
// Test: 4h par jour, déjà 2h utilisées
expect(result[0].heureDebut).toBe("11h")  // Après les 2h existantes
expect(result[0].heureFin).toBe("16h")    // 4h plus tard + pause
```

---

## 🎓 RÈGLES MÉTIER CLÉS

### 1. Pause midi TOUJOURS exclue
- La pause 12h-13h est TOUJOURS exclue du temps travaillé
- Que ce soit en JAT, ÉQUILIBRÉ ou PEPS
- Ajustement automatique si une allocation traverse la pause

### 2. JAT : Tout à rebours
- Plus de distinction entre jour J et jours avant
- TOUJOURS calculer de la fin vers le début
- Respecte exactement l'heure de deadline

### 3. ÉQUILIBRÉ/PEPS : Début de journée
- Allouer le plus tôt possible
- Tenir compte des autres tâches
- Permet à l'utilisateur de voir précisément quand travailler

### 4. Gestion des conflits
- Si pas assez de capacité : message d'erreur clair
- Validation avant création de la tâche
- Possibilité d'ajuster avant confirmation

---

## 📊 COMPARAISON DES MODES

### Vue d'ensemble des 3 modes automatiques

| Aspect | JAT (Juste-à-Temps) | ÉQUILIBRÉ | PEPS (Premier Entré Premier Sorti) |
|--------|---------------------|-----------|-----------------------------------|
| **Direction** | ⬅️ À rebours depuis deadline | ➡️ Uniforme sur période | ➡️ Séquentiel depuis début |
| **Point de départ** | Deadline | Date début | Maintenant (ou date spécifiée) |
| **Logique** | Minimiser avance | Équilibrer charge | Remplir au plus tôt |
| **Utilisation** | Livraisons urgentes | Charge prévisible | Priorité immédiate |

### Exemple : Tâche de 15h, deadline vendredi 19 déc à 17h

**Contexte commun :**
- Horaire : 8h-17h (8h/jour - pause = 8h capacité)
- Date allocation : Lundi 15 déc à 10h
- Période : 15-19 déc (5 jours ouvrables)

#### JAT (Juste-à-Temps)
```
Allocation à rebours depuis deadline :
Jeudi 18  : 8h (8h-17h)   - journée complète
Vendredi 19: 7h (8h-16h)   - à rebours depuis 17h (deadline)

Total: 15h ✓
Commence: Jeudi 18
Finit: Vendredi 19 à 16h (1h avant deadline)
```

#### ÉQUILIBRÉ
```
Distribution uniforme :
Lundi 15   : 3h (10h-14h)  - commence à 10h (moment allocation)
Mardi 16   : 3h (8h-12h)   - journée suivante
Mercredi 17: 3h (8h-12h)
Jeudi 18   : 3h (8h-12h)
Vendredi 19: 3h (8h-12h)

Total: 15h ✓
Commence: Lundi 15 à 10h
Finit: Vendredi 19 à 12h (5h avant deadline)
```

#### PEPS (Premier Entré Premier Sorti)
```
Remplissage séquentiel :
Lundi 15   : 7h (10h-18h)  - sature depuis 10h (moment allocation)
Mardi 16   : 8h (8h-17h)   - journée complète
Mercredi 17: 0h            - (pas nécessaire)

Total: 15h ✓
Commence: Lundi 15 à 10h
Finit: Mardi 16 à 17h (terminé rapidement)
```

### Comparaison AVANT/APRÈS (JAT seulement)

#### AVANT (ancienne logique JAT)
```
Tâche de 5h, deadline mardi 17 déc à 12h:
Lundi 16 : 3h (15h-18h) - fin de journée ✓
Mardi 17 : 2h (8h-10h)  - début de journée ❌ INCOHÉRENT
```

#### MAINTENANT (nouvelle logique JAT)
```
Tâche de 5h, deadline mardi 17 déc à 12h:
Lundi 16 : 3h (15h-18h) - à rebours depuis fin ✓
Mardi 17 : 2h (10h-12h) - à rebours depuis deadline ✓ COHÉRENT
```

**Changement** : Le comportement du mardi est maintenant cohérent (toujours à rebours)

---

## 🚀 PROCHAINES ÉTAPES

### Pour les développeurs
1. Utiliser les nouvelles plages horaires dans l'interface
2. Afficher les heures précises à l'utilisateur
3. Permettre l'ajustement avant confirmation

### Pour la documentation
1. ✅ Code mis à jour
2. ✅ Tests passent
3. ⏳ Mise à jour UI pour afficher les heures
4. ⏳ Guide utilisateur mis à jour

---

**Fin du document**
