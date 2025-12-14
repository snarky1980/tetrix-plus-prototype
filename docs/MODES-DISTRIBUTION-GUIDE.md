# 🎯 Guide des Modes de Distribution

**Date**: 14 décembre 2025  
**Version**: 2.0  
**Public**: Développeurs et utilisateurs

---

## Vue d'ensemble

Le système propose **4 modes de distribution** des heures de traduction :

1. **JAT (Juste-à-Temps)** - Allocation à rebours depuis la deadline
2. **ÉQUILIBRÉ** - Distribution uniforme sur la période
3. **PEPS (Premier Entré, Premier Sorti)** - Remplissage séquentiel dès maintenant
4. **MANUEL** - L'utilisateur spécifie exactement les heures par jour

---

## 📋 Tableau comparatif

| Critère | JAT | ÉQUILIBRÉ | PEPS | MANUEL |
|---------|-----|-----------|------|--------|
| **Automatique** | ✅ Oui | ✅ Oui | ✅ Oui | ❌ Non |
| **Direction** | ⬅️ Arrière → Avant | ↔️ Uniforme | ➡️ Avant → Arrière | 🎨 Personnalisé |
| **Début travail** | Le plus tard possible | Étalé uniformément | Le plus tôt possible | Selon spécification |
| **Heures précises** | ✅ Oui | ✅ Oui | ✅ Oui | ⚠️ Optionnel |
| **Cas d'usage** | Urgence, deadline serrée | Charge prévisible | Priorité immédiate | Besoins spécifiques |

---

## 1️⃣ MODE JAT (Juste-à-Temps)

### Principe
**Allouer les heures le plus TARD possible, strictement à rebours depuis la deadline.**

### Algorithme
1. Partir de la date/heure de deadline
2. Remonter jour par jour (en excluant weekends)
3. Allouer les heures en **fin de journée** (ou avant deadline le jour J)
4. **TOUS les jours** : allocation à rebours

### Comportement détaillé

#### Jour de deadline
- Si deadline à 11h → heures allouées **AVANT** 11h (ex: 9h-11h pour 2h)
- Si deadline à 17h → heures allouées **AVANT** 17h (ex: 15h-17h pour 2h)

#### Jours avant deadline
- Toujours en **fin de journée** (à rebours depuis fin d'horaire)
- Exemple : horaire 8h-17h → allocation 15h-17h pour 2h

### Exemple concret

```
Configuration :
- Tâche : 10 heures
- Deadline : Vendredi 19 déc à 14h
- Horaire traducteur : 8h-17h (8h net/jour avec pause)
- Date allocation : Lundi 15 déc

Résultat JAT :
Jeudi 18 déc  : 5h (13h-18h)   ← Fin de journée
Vendredi 19   : 5h (8h-14h)    ← À rebours depuis deadline 14h

Total : 10h ✓
Commence : Jeudi 18 à 13h (dernier moment possible)
```

### Avantages
- ✅ Minimise le "temps mort" avant livraison
- ✅ Libère le traducteur pour autres tâches urgentes
- ✅ Optimal pour deadlines très serrées

### Inconvénients
- ⚠️ Risqué si imprévu (pas de marge)
- ⚠️ Stress potentiel (travail concentré en fin)

---

## 2️⃣ MODE ÉQUILIBRÉ

### Principe
**Répartir uniformément les heures sur toute la période disponible.**

### Algorithme
1. Calculer jours ouvrables entre début et deadline
2. Diviser heures totales / nombre de jours
3. Allouer le **plus tôt possible** chaque jour
4. Tenir compte des heures déjà allouées

### Comportement détaillé

#### Début d'allocation
- Par défaut : commence à 8h (début d'horaire)
- Si heures déjà utilisées : commence après

#### Gestion des obstacles
- Évite automatiquement pause 12h-13h
- Tient compte d'autres tâches
- Respecte congés et heures bloquées

### Exemple concret

```
Configuration :
- Tâche : 20 heures
- Deadline : Vendredi 19 déc à 17h
- Période : 15-19 déc (5 jours)
- Horaire : 8h-17h

Résultat ÉQUILIBRÉ :
Lundi 15     : 4h (8h-13h)     ← 8h-12h + 13h-14h
Mardi 16     : 4h (8h-13h)
Mercredi 17  : 4h (8h-13h)
Jeudi 18     : 4h (8h-13h)
Vendredi 19  : 4h (8h-13h)

Total : 20h ✓
Distribution : 4h/jour uniformément
```

### Exemple avec obstacles

```
Configuration :
- Tâche : 12 heures
- Période : 15-17 déc (3 jours)
- Autre tâche le 15 : déjà 3h (9h-13h)

Résultat ÉQUILIBRÉ :
Lundi 15     : 4h (13h-18h)    ← Commence après autres heures
Mardi 16     : 4h (8h-13h)     ← Début normal
Mercredi 17  : 4h (8h-13h)

Total : 12h ✓
```

### Avantages
- ✅ Charge de travail prévisible et constante
- ✅ Bonne marge de sécurité
- ✅ Moins de stress pour le traducteur

### Inconvénients
- ⚠️ Peut bloquer du temps inutilement en début de période
- ⚠️ Moins flexible pour tâches urgentes intercalées

---

## 3️⃣ MODE PEPS (Premier Entré, Premier Sorti)

### Principe
**Allouer toutes les heures le plus TÔT possible, séquentiellement jour par jour.**

### Algorithme
1. Commencer **maintenant** (ou date spécifiée par utilisateur)
2. Saturer chaque jour au maximum de sa capacité
3. Passer au jour suivant quand jour plein
4. S'arrêter quand toutes heures allouées
5. **Valider** que tout est fini avant deadline

### Comportement détaillé

#### Point de départ
- **Par défaut** : moment de l'allocation (now)
- **Personnalisable** : utilisateur peut spécifier date/heure début
- Exemple : allocation à 10h → commence à 10h

#### Saturation séquentielle
- Jour 1 : maximum possible depuis heure début
- Jour 2 : maximum possible (journée complète)
- Jour N : reste à allouer (peut être partiel)

#### Validation critique
Si impossible de tout finir avant deadline → **ERREUR**
```
"Capacité insuffisante sur la période (3.5h restantes)."
```

### Exemple concret

```
Configuration :
- Tâche : 15 heures
- Deadline : Vendredi 19 déc à 17h
- Date allocation : Mardi 16 déc à 10h
- Horaire : 8h-17h (8h net/jour)

Résultat PEPS :
Mardi 16     : 7h (10h-18h)    ← Sature depuis 10h (moment allocation)
Mercredi 17  : 8h (8h-17h)     ← Journée complète
Jeudi 18     : 0h              ← Pas nécessaire

Total : 15h ✓
Commence : Mardi 16 à 10h
Finit : Mercredi 17 à 17h (2 jours avant deadline ✓)
```

### Exemple avec date début personnalisée

```
Configuration :
- Tâche : 10 heures
- Deadline : Vendredi 19 déc à 17h
- Date DEBUT SPÉCIFIÉE : Mercredi 17 déc à 14h
- Horaire : 8h-17h

Résultat PEPS :
Mercredi 17  : 3h (14h-18h)    ← Commence à 14h (spécifié)
Jeudi 18     : 7h (8h-16h)     ← Reste à allouer

Total : 10h ✓
Commence : Mercredi 17 à 14h (selon spécification)
Finit : Jeudi 18 à 16h
```

### Exemple d'ERREUR (impossible)

```
Configuration :
- Tâche : 20 heures
- Deadline : Mercredi 17 déc à 17h
- Date allocation : Mardi 16 déc à 14h
- Horaire : 8h-17h (8h net/jour)

Tentative PEPS :
Mardi 16     : 3h (14h-18h)    ← Maximum possible aujourd'hui
Mercredi 17  : 8h (8h-17h)     ← Journée complète

Résultat : 11h allouées, reste 9h → ❌ ERREUR
Message : "Capacité insuffisante sur la période (9h restantes)."
```

### Avantages
- ✅ Travail terminé le plus rapidement possible
- ✅ Libère du temps en fin de période
- ✅ Idéal pour tâches très prioritaires
- ✅ Minimise risque d'oubli (commence tout de suite)

### Inconvénients
- ⚠️ Peut surcharger le traducteur en début de période
- ⚠️ Moins de flexibilité pour ajuster en cours de route

---

## 4️⃣ MODE MANUEL

### Principe
**L'utilisateur spécifie exactement les heures pour chaque jour, avec suggestions intelligentes.**

### Fonctionnement en 2 étapes

#### Étape 1: Saisie initiale
L'utilisateur spécifie :
- Quels jours travailler
- Combien d'heures chaque jour

```json
[
  { "date": "2025-12-15", "heures": 3 },
  { "date": "2025-12-16", "heures": 5 },
  { "date": "2025-12-19", "heures": 2 }
]
```

#### Étape 2: Suggestions automatiques
Le système **propose automatiquement** des heures précises :
- ✅ Le **plus tôt possible** dans la journée
- ✅ Tient compte des **autres tâches** déjà allouées
- ✅ Évite la **pause midi** (12h-13h)
- ✅ Respecte les **congés et heures bloquées**

```json
[
  { "date": "2025-12-15", "heures": 3, "heureDebut": "8h", "heureFin": "11h" },
  { "date": "2025-12-16", "heures": 5, "heureDebut": "8h", "heureFin": "14h" },
  { "date": "2025-12-19", "heures": 2, "heureDebut": "8h", "heureFin": "10h" }
]
```

#### Étape 3: Ajustements (optionnel)
L'utilisateur peut **modifier** les suggestions selon ses préférences :

```json
[
  { "date": "2025-12-15", "heures": 3, "heureDebut": "8h", "heureFin": "11h" },   // OK
  { "date": "2025-12-16", "heures": 5, "heureDebut": "13h", "heureFin": "19h" }, // Ajusté (après-midi)
  { "date": "2025-12-19", "heures": 2, "heureDebut": "15h", "heureFin": "17h" }  // Ajusté (fin journée)
]
```

### Endpoint API

#### Obtenir des suggestions
```http
POST /api/repartition/suggerer-heures
Content-Type: application/json

{
  "traducteurId": "uuid-traducteur",
  "repartition": [
    { "date": "2025-12-15", "heures": 3 },
    { "date": "2025-12-16", "heures": 5 }
  ],
  "ignorerTacheId": "uuid-tache" // Optionnel, pour édition
}
```

**Réponse:**
```json
{
  "repartition": [
    { "date": "2025-12-15", "heures": 3, "heureDebut": "8h", "heureFin": "11h" },
    { "date": "2025-12-16", "heures": 5, "heureDebut": "8h", "heureFin": "14h" }
  ]
}
```

### Validation automatique

Le système valide :
1. ✅ **Somme des heures** = heures totales de la tâche
2. ✅ **Heures cohérentes** : heureDebut < heureFin
3. ✅ **Dans l'horaire** : respecte l'horaire du traducteur
4. ✅ **Durée correcte** : plage horaire correspond aux heures spécifiées
5. ✅ **Pause exclue** : compte correctement la pause 12h-13h
6. ✅ **Capacité respectée** : pas de dépassement

### Exemples de validation

#### ✅ Valide
```json
{ "date": "2025-12-15", "heures": 4, "heureDebut": "8h", "heureFin": "12h" }
// 8h → 12h = 4h ✓
```

#### ✅ Valide avec pause
```json
{ "date": "2025-12-15", "heures": 4, "heureDebut": "10h", "heureFin": "15h" }
// 10h → 12h = 2h, 13h → 15h = 2h, total = 4h ✓
```

#### ❌ Invalide - durée incohérente
```json
{ "date": "2025-12-15", "heures": 5, "heureDebut": "8h", "heureFin": "11h" }
// 8h → 11h = 3h, mais 5h spécifiées ✗
```

#### ❌ Invalide - hors horaire
```json
{ "date": "2025-12-15", "heures": 2, "heureDebut": "6h", "heureFin": "8h" }
// Commence avant l'horaire du traducteur (8h) ✗
```

### Workflow complet

```
1. Utilisateur crée tâche en mode MANUEL
   └─> Spécifie dates et heures par jour
   
2. Frontend appelle /api/repartition/suggerer-heures
   └─> Reçoit suggestions avec heures précises
   
3. Interface affiche suggestions
   └─> Utilisateur peut les accepter ou modifier
   
4. Soumission finale
   └─> Validation automatique
   └─> Création de la tâche si valide
```

### Cas d'usage typiques

#### Cas 1: Réunions et contraintes
```
Situation : Réunions lundi matin et mercredi après-midi
Solution : Mode MANUEL
  - Lundi: 4h l'après-midi (14h-19h)
  - Mardi: 6h toute la journée (8h-15h)
  - Jeudi: 3h le matin (8h-11h)
```

#### Cas 2: Équilibrer avec autres projets
```
Situation : Plusieurs projets en parallèle
Solution : Mode MANUEL pour contrôle fin
  - Projet A: matins (8h-12h)
  - Projet B: après-midis (13h-17h)
```

#### Cas 3: Préférences personnelles
```
Situation : Traducteur plus productif l'après-midi
Solution : Mode MANUEL
  - Concentrer heures entre 13h-18h
  - Suggestions ajustées selon préférence
```

### Avantages
- ✅ **Contrôle total** sur la planification
- ✅ **Suggestions intelligentes** pour gagner du temps
- ✅ **Flexibilité maximale** pour contraintes spécifiques
- ✅ **Validation automatique** évite les erreurs
- ✅ **Tient compte du contexte** (autres tâches, congés)

### Inconvénients
- ⚠️ Plus long que modes automatiques (si beaucoup de jours)
- ⚠️ Nécessite réflexion et planification
- ⚠️ Risque d'oublier des contraintes si pas attentif

---

## 🎓 Règles métier communes

### Contraintes respectées par TOUS les modes

#### 1. Pause midi TOUJOURS exclue
```
Horaire : 8h-17h
Capacité nette : 8h (17h - 8h - 1h pause)
Pause : 12h-13h automatiquement exclue
```

#### 2. Weekends exclus
- Samedi et dimanche ne sont JAMAIS utilisés
- Algorithmes sautent automatiquement

#### 3. Congés et heures bloquées
- Système vérifie `ajustementTemps` (type CONGE, BLOCAGE)
- Réduit capacité disponible en conséquence

#### 4. Autres tâches
- Tient compte des heures déjà allouées à d'autres tâches
- Évite les doubles allocations

#### 5. Horaire du traducteur
- Respecte strictement l'horaire configuré
- Ex : si horaire 9h-15h → ne peut pas allouer en dehors

---

## 🚀 Quel mode choisir ?

### Scénarios d'utilisation

#### Utilisez JAT si...
- 🔥 **Deadline très serrée** (peu de jours disponibles)
- ⚡ **Besoin de flexibilité** en début de période
- 🎯 **Livraison urgente** qui prime sur tout

#### Utilisez ÉQUILIBRÉ si...
- 📅 **Charge prévisible** sur période normale
- 😌 **Confort du traducteur** prioritaire
- 🛡️ **Marge de sécurité** souhaitée

#### Utilisez PEPS si...
- 🏃 **Priorité absolue** - doit commencer MAINTENANT
- ✅ **Finir rapidement** plus important que étaler
- 🔓 **Libérer du temps** en fin de période

#### Utilisez MANUEL si...
- 🎨 **Contraintes très spécifiques** (rendez-vous, réunions)
- 🔧 **Ajustement fin** nécessaire
- 📊 **Optimisation personnalisée** requise

---

## 📊 Exemple comparatif complet

### Configuration commune
```
Tâche : 24 heures à traduire
Deadline : Vendredi 19 déc à 17h
Date allocation : Lundi 15 déc à 9h
Horaire : 8h-17h (8h net/jour avec pause)
Période : 15-19 déc (5 jours ouvrables)
```

### Résultat JAT (À rebours)
```
Lundi 15    : 0h               ← Pas nécessaire
Mardi 16    : 0h               ← Pas nécessaire
Mercredi 17 : 8h (8h-17h)     ← Journée complète
Jeudi 18    : 8h (8h-17h)     ← Journée complète
Vendredi 19 : 8h (8h-17h)     ← Journée complète (deadline à 17h)

Commence : Mercredi 17 (dernier moment)
Charge : 3 jours complets consécutifs
```

### Résultat ÉQUILIBRÉ (Uniforme)
```
Lundi 15    : 4.8h (9h-15h)   ← Commence à 9h (moment allocation)
Mardi 16    : 4.8h (8h-14h)   ← Distribution uniforme
Mercredi 17 : 4.8h (8h-14h)
Jeudi 18    : 4.8h (8h-14h)
Vendredi 19 : 4.8h (8h-14h)

Commence : Lundi 15 à 9h
Charge : ~5h par jour étalé
```

### Résultat PEPS (Séquentiel)
```
Lundi 15    : 8h (9h-18h)     ← Sature depuis 9h
Mardi 16    : 8h (8h-17h)     ← Journée complète
Mercredi 17 : 8h (8h-17h)     ← Journée complète
Jeudi 18    : 0h              ← Terminé !
Vendredi 19 : 0h

Commence : Lundi 15 à 9h
Charge : 3 jours complets, fini mercredi
```

---

## 🔍 Débogage et validation

### Vérifications automatiques

Tous les modes effectuent ces vérifications :

1. **Capacité totale** ≥ heures demandées
2. **Somme allouée** = heures totales (à 0.01h près)
3. **Aucun jour** > capacité nette
4. **Pas de weekend** dans résultat
5. **Pause midi** bien exclue
6. **Heures précises** cohérentes (début < fin)

### Messages d'erreur

```typescript
// Capacité insuffisante
"Capacité insuffisante sur la période (3.5h restantes)."

// Période invalide (deadline passée)
"dateEcheance doit être >= dateDebut"

// Weekend uniquement
"Aucun jour ouvrable dans l'intervalle (uniquement des weekends)"

// Dépassement horaire
"Horaire invalide: heures dépassent la capacité du jour"
```

---

## 📚 Ressources

- **Code source** : `/backend/src/services/repartitionService.ts`
- **Tests** : `/backend/tests/qa-distribution-modes.test.ts`
- **Documentation détaillée** : `/docs/CHANGEMENTS-LOGIQUE-V2.md`
- **Architecture** : `/docs/LOGIQUE-REPARTITION-HEURES.md`

---

**Fin du guide**
