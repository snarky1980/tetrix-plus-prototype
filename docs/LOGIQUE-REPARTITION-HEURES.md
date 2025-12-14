# 📘 LOGIQUE MÉTIER DE RÉPARTITION DES HEURES - TETRIX PLUS

**Date de documentation**: 14 décembre 2025  
**Version**: 1.0  
**Statut**: Documentation complète de l'implémentation actuelle

---

## 📑 Table des matières

1. [Mode JAT (Juste-à-Temps)](#-1-mode-jat-juste-à-temps)
2. [Mode ÉQUILIBRÉ](#-2-mode-équilibré)
3. [Mode PEPS (Premier Entré, Premier Sorti)](#-3-mode-peps-premier-entré-premier-sorti)
4. [Mode MANUEL](#-4-mode-manuel)
5. [Règles Transversales](#-règles-transversales-appliquées-à-tous-les-modes)
6. [Calcul de Capacité Nette](#-calcul-de-capacité-nette---fonction-clé)

---

## 🎯 **1. MODE JAT (JUSTE-À-TEMPS)**

### Principe Fondamental
Le mode JAT distribue les heures **à rebours depuis la date d'échéance**, en priorisant les jours les plus proches de la deadline pour maximiser la flexibilité.

### Paramètres
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures à répartir (ex: 10h)
- `dateEcheance`: Date et heure limite de livraison
- `options`: 
  - `livraisonMatinale`: Limite les heures du jour J (défaut: false)
  - `heuresMaxJourJ`: Maximum d'heures le jour J si livraison matinale (défaut: 2h)
  - `modeTimestamp`: Active le support des deadlines avec heure précise (défaut: true)
  - `debug`: Mode debug verbeux

### Algorithme Détaillé

#### **Étape 1: Normalisation de la deadline**
```
SI dateEcheance contient une heure précise (ex: "2025-12-17T12:00:00")
  → Conserver l'heure exacte
  → Marquer hasTime = true
SINON (ex: "2025-12-17")
# 📘 LOGIQUE MÉTIER DE RÉPARTITION DES HEURES - TETRIX PLUS

**Date de documentation**: 14 décembre 2025  
**Version**: 1.0  
**Statut**: Documentation complète de l'implémentation actuelle

---

## 📑 Table des matières

1. [Mode JAT (Juste-à-Temps)](#-1-mode-jat-juste-à-temps)
2. [Mode ÉQUILIBRÉ](#-2-mode-équilibré)
3. [Mode PEPS (Premier Entré, Premier Sorti)](#-3-mode-peps-premier-entré-premier-sorti)
4. [Mode MANUEL](#-4-mode-manuel)
5. [Règles Transversales](#-règles-transversales-appliquées-à-tous-les-modes)
6. [Calcul de Capacité Nette](#-calcul-de-capacité-nette---fonction-clé)

---

## 🎯 **1. MODE JAT (JUSTE-À-TEMPS)**

### Principe Fondamental
Le mode JAT distribue les heures **à rebours depuis la date d'échéance**, en priorisant les jours les plus proches de la deadline pour maximiser la flexibilité.

### Paramètres
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures à répartir (ex: 10h)
- `dateEcheance`: Date et heure limite de livraison
- `options`: 
    - `livraisonMatinale`: Limite les heures du jour J (défaut: false)
    - `heuresMaxJourJ`: Maximum d'heures le jour J si livraison matinale (défaut: 2h)
    - `modeTimestamp`: Active le support des deadlines avec heure précise (défaut: true)
    - `debug`: Mode debug verbeux

### Algorithme Détaillé

#### **Étape 1: Normalisation de la deadline**
```
SI dateEcheance contient une heure précise (ex: "2025-12-17T12:00:00")
    → Conserver l'heure exacte
    → Marquer hasTime = true
SINON (ex: "2025-12-17")
    → Utiliser 17:00:00 comme heure par défaut
    → Marquer hasTime = false
```

**Exemple:**
- Input: `"2025-12-17T12:00:00"` → Deadline à 12h00 le 17 décembre
- Input: `"2025-12-17"` → Deadline à 17h00 le 17 décembre (fin de journée standard)

#### **Étape 2: Calcul de la capacité disponible globale**
Pour chaque jour entre aujourd'hui et la deadline:
```
# 📘 LOGIQUE MÉTIER DE RÉPARTITION DES HEURES - TETRIX PLUS

**Date de documentation**: 14 décembre 2025  
**Version**: 1.0  
**Statut**: Documentation complète de l'implémentation actuelle

---

## 📑 Table des matières

1. [Mode JAT (Juste-à-Temps)](#-1-mode-jat-juste-à-temps)
2. [Mode ÉQUILIBRÉ](#-2-mode-équilibré)
3. [Mode PEPS (Premier Entré, Premier Sorti)](#-3-mode-peps-premier-entré-premier-sorti)
4. [Mode MANUEL](#-4-mode-manuel)
5. [Règles Transversales](#-règles-transversales-appliquées-à-tous-les-modes)
6. [Calcul de Capacité Nette](#-calcul-de-capacité-nette---fonction-clé)
7. [Gestion des Jours Fériés](#-gestion-des-jours-fériés)

---

## 🎯 **1. MODE JAT (JUSTE-À-TEMPS)**

### Principe Fondamental
Le mode JAT distribue les heures **à rebours depuis la date d'échéance**, en priorisant les jours les plus proches de la deadline pour maximiser la flexibilité.

### Paramètres
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures à répartir (ex: 10h)
- `dateEcheance`: Date et heure limite de livraison
- `options`: 
    - `livraisonMatinale`: Limite les heures du jour J (défaut: false)
    - `heuresMaxJourJ`: Maximum d'heures le jour J si livraison matinale (défaut: 2h)
    - `modeTimestamp`: Active le support des deadlines avec heure précise (défaut: true)
    - `debug`: Mode debug verbeux

### Algorithme Détaillé

#### **Étape 1: Normalisation de la deadline**
```
SI dateEcheance contient une heure précise (ex: "2025-12-17T12:00:00")
    → Conserver l'heure exacte
    → Marquer hasTime = true
SINON (ex: "2025-12-17")
    → Utiliser 17:00:00 comme heure par défaut
    → Marquer hasTime = false
```

**Exemple:**
- Input: `"2025-12-17T12:00:00"` → Deadline à 12h00 le 17 décembre
- Input: `"2025-12-17"` → Deadline à 17h00 le 17 décembre (fin de journée standard)

#### **Étape 2: Calcul de la capacité disponible globale**
Pour chaque jour entre aujourd'hui et la deadline:
```
SI c'est un weekend (samedi/dimanche) OU un jour férié configuré
    → IGNORER (pas de travail)
SINON
    1. Récupérer l'horaire du traducteur (ex: "7h30-15h30")
    2. Parser en heures décimales (7.5h à 15.5h)
    3. Calculer capacité nette en tenant compte de:
         a) Horaire de début/fin
         b) Pause midi OBLIGATOIRE 12h-13h (toujours exclue)
         c) Deadline si c'est le jour J avec heure précise
    4. Soustraire les heures déjà utilisées (ajustements existants)
    5. Ajouter à la capacité disponible globale
```

**Exemple de calcul de capacité nette:**
```
Horaire traducteur: 7h30-15h30 (8h brutes)
Jour normal:
    - 7h30 à 12h00 = 4.5h
    - 13h00 à 15h30 = 2.5h
    - Total = 7h nettes (8h - 1h pause)

Jour J avec deadline 14h00:
    - 7h30 à 12h00 = 4.5h
    - 13h00 à 14h00 = 1h
    - Total = 5.5h nettes (pause exclue, limite à deadline)

Jour J avec deadline 11h30:
    - 7h30 à 11h30 = 4h
    - Pas d'heures après midi (deadline avant pause)
    - Total = 4h nettes

Jour férié (ex: 25 décembre):
    - Total = 0h (jour exclu, pas de travail)
```

#### **Étape 3: Validation de la capacité**
```
SI heuresTotal > capacité disponible globale
    → ERREUR: "Capacité insuffisante"
    → Aucune allocation n'est faite
```

#### **Étape 4: Allocation à rebours (cœur du JAT)**
```
restant = heuresTotal
courant = date échéance
résultat = []

TANT QUE restant > 0 ET iterations < 90:
    SI courant < aujourd'hui:
        → ARRÊTER (remontée trop loin)
    
    SI weekend OU jour férié:
        → IGNORER ce jour
        → courant = courant - 1 jour
        → CONTINUER
    
    // Calculer capacité libre ce jour
    utilisées = heures déjà allouées à ce jour (ajustements existants)
    capaciteNette = calculCapaciteNette(horaire, courant, deadline si jour J)
    libre = max(capaciteNette - utilisées, 0)
    
    SI libre > 0:
        alloue = min(libre, restant)
        
        // RÈGLE MÉTIER CRUCIALE: Plages horaires
        SI c'est le jour J (jour d'échéance):
            → Allouer en DÉBUT DE JOURNÉE
            → heureDebut = horaire.heureDebut (ex: 7h30)
            → heureFin = heureDebut + alloue (en tenant compte de la pause)
            → Si traverse pause: ajouter 1h
            → Limiter à l'heure de deadline si précise
        SINON (jours avant):
            → Allouer en FIN DE JOURNÉE (à rebours)
            → heureFin = horaire.heureFin (ex: 15h30)
            → heureDebut = heureFin - alloue (en remontant, pause comprise)
            → Si traverse pause en remontant: soustraire 1h
        
        résultat.push({ date, heures: alloue, heureDebut, heureFin })
        restant -= alloue
    
    courant = courant - 1 jour
    iterations++

SI restant > 0:
    → ERREUR: "Impossible de répartir toutes les heures"

// Trier résultat par ordre chronologique croissant
résultat.sort((a, b) => a.date comparé à b.date)
```

### Exemple Complet JAT

**Scénario:**
- Traducteur: Julie-Marie Bissonnette
- Horaire: 10h-18h (capacité 7h nettes après pause)
- Tâche: 10 heures
- Deadline: Mardi 17 décembre 2025 à 12h00
- Aujourd'hui: Vendredi 13 décembre 2025
- Jours fériés: Aucun dans cette période

**Exécution:**

1. **Calcul capacités disponibles:**
     - Lundi 16 déc (jour avant): 10h-12h (2h) + 13h-18h (5h) = **7h nettes**
     - Mardi 17 déc (jour J, deadline 12h): 10h-12h (2h) = **2h nettes**
     - **Total disponible: 9h** → ERREUR! Capacité insuffisante

**Ajustons avec 9h:**

1. **Calcul capacités:**
     - Lundi 16: 7h nettes
     - Mardi 17: 2h nettes
     - Total: 9h ✓

2. **Allocation (à rebours):**

     **Jour courant: Mardi 17 (jour J)**
     - Libre: 2h
     - Alloue: min(2h, 9h) = 2h
     - **DÉBUT DE JOURNÉE:** 10h-12h
     - Restant: 7h

     **Jour courant: Lundi 16 (jour avant)**
     - Libre: 7h
     - Alloue: min(7h, 7h) = 7h
     - **FIN DE JOURNÉE (à rebours):**
         - heureFin = 18h
         - heureDebut = 18h - 7h = 11h (mais traverse pause!)
         - Ajustement pause: 11h - 1h = 10h
         - Donc: 10h-12h (2h) + 13h-18h (5h) = 7h ✓
     - Restant: 0h

3. **Résultat final (trié chronologiquement):**
```javascript
[
    { date: "2025-12-16", heures: 7, heureDebut: "10h", heureFin: "18h" },
    { date: "2025-12-17", heures: 2, heureDebut: "10h", heureFin: "12h" }
]
```

### Caractéristiques JAT

✅ **Avantages:**
- Maximise la flexibilité en laissant les premiers jours libres
- Respecte précisément les deadlines avec heure
- Alloue les heures au plus près de l'échéance
- Gère automatiquement les plages horaires (début/fin journée)

⚠️ **Particularités:**
- Distribution non uniforme (charge variable selon les jours)
- Peut concentrer beaucoup d'heures sur les derniers jours
- Nécessite une capacité suffisante proche de la deadline

---

## ⚖️ **2. MODE ÉQUILIBRÉ**

### Principe Fondamental
Distribue les heures **uniformément** sur tous les jours ouvrables de la période, en maximisant l'équité de charge.

### Paramètres
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures (ex: 35h)
- `dateDebut`: Date de début de période
- `dateFin`: Date de fin de période

### Algorithme Détaillé

#### **Étape 1: Collecte des jours disponibles**
```
jours = businessDaysOttawa(dateDebut, dateFin)
// Retourne tous les jours ouvrables (lun-ven, exclut weekends et jours fériés)

POUR chaque jour:
    SI jour férié:
        → IGNORER ce jour
        → CONTINUER
    
    utilisées = heures déjà allouées (ajustements existants)
    capaciteNette = calculCapaciteNette(horaire, jour, deadline si applicable)
    libre = max(capaciteNette - utilisées, 0)
    
    SI libre > 0:
        disponibilites.push({ date: jour, libre })
```

#### **Étape 2: Distribution uniforme initiale (en centimes)**
Pour une précision maximale, on travaille en centimes (1h = 100 centimes):

```
heuresCentimes = round(heuresTotal × 100)
nbJours = nombre de jours disponibles
baseParJour = floor(heuresCentimes / nbJours)
reste = heuresCentimes - (baseParJour × nbJours)

// Créer allocation initiale
POUR chaque jour (index 0 à nbJours-1):
    centimes = baseParJour
    SI reste > 0:
        centimes += 1  // Distribuer 1 centime supplémentaire
        reste -= 1
    
    allocations[index] = {
        date: jour,
        capaciteLibre: capacité disponible,
        heuresAllouees: centimes / 100,
        estContraint: false
    }
```

**Exemple:**
```
35h sur 6 jours:
    - 35h = 3500 centimes
    - Base: floor(3500 / 6) = 583 centimes = 5.83h
    - Reste: 3500 - (583 × 6) = 2 centimes
    
    Résultat initial:
        Jour 1: 583 + 1 = 584 centimes = 5.84h
        Jour 2: 583 + 1 = 584 centimes = 5.84h
        Jour 3: 583 centimes = 5.83h
        Jour 4: 583 centimes = 5.83h
        Jour 5: 583 centimes = 5.83h
        Jour 6: 583 centimes = 5.83h
        Total: 35.00h ✓
```

#### **Étape 3: Gestion des jours contraints**
```
heuresARedistribu = 0
joursContraints = []
joursLibres = []

POUR chaque allocation:
    SI heuresAllouees > capaciteLibre + 0.0001:
        // Jour contraint: ne peut pas accepter toute l'allocation
        heuresARedistribu += (heuresAllouees - capaciteLibre)
        heuresAllouees = capaciteLibre
        estContraint = true
        joursContraints.push(index)
    SINON:
        joursLibres.push(index)
```

#### **Étape 4: Redistribution sur jours non contraints**
```
SI heuresARedistribu > 0 ET joursLibres.length > 0:
    // Trier jours libres par capacité restante décroissante
    joursLibres.sort((a, b) => (capaciteB - allocB) - (capaciteA - allocA))
    
    centimesARedistribu = round(heuresARedistribu × 100)
    
    POUR chaque jour libre (dans l'ordre trié):
        SI centimesARedistribu <= 0:
            → ARRÊTER
        
        capaciteResteCentimes = round((capaciteLibre - heuresAllouees) × 100)
        
        SI capaciteResteCentimes > 0:
            aAjouter = min(capaciteResteCentimes, centimesARedistribu)
            heuresAllouees += aAjouter / 100
            centimesARedistribu -= aAjouter
```

#### **Étape 5: Construction du résultat**
```
résultat = []
POUR chaque allocation:
    résultat.push({
        date: allocation.date,
        heures: round(allocation.heuresAllouees, 4)
    })

// Validation finale
somme = sum(résultat.heures)
SI abs(somme - heuresTotal) > 0.01:
    → ERREUR: "Erreur de répartition: somme incorrecte"

RETOURNER résultat.sort((a, b) => a.date comparé à b.date)
```

### Exemple Complet MODE ÉQUILIBRÉ

**Scénario:**
- Traducteur: capacité 7.5h/jour
- Période: Lundi 11 au Vendredi 15 décembre (5 jours)
- Heures: 35h
- Contrainte: Mercredi déjà 3h utilisées
- Jours fériés: Aucun

**Exécution:**

1. **Jours disponibles:**
     ```
     Lundi 11:    7.5h libre
     Mardi 12:    7.5h libre
     Mercredi 13: 7.5h - 3h = 4.5h libre
     Jeudi 14:    7.5h libre
     Vendredi 15: 7.5h libre
     Total: 34.5h disponible
     ```

2. **Distribution initiale (35h sur 5 jours):**
     ```
     Base = 35 / 5 = 7h par jour
     
     Lundi:    7h ✓ (< 7.5h)
     Mardi:    7h ✓
     Mercredi: 7h ✗ (> 4.5h libre) → CONTRAINT!
     Jeudi:    7h ✓
     Vendredi: 7h ✓
     ```

3. **Identification contraintes:**
     ```
     Mercredi: 
         - Alloué initial: 7h
         - Capacité libre: 4.5h
         - Excédent: 7h - 4.5h = 2.5h
     → Ramener à 4.5h
     → Redistribuer 2.5h sur les autres jours
     ```

4. **Redistribution (2.5h = 250 centimes):**
     ```
     Capacités restantes après allocation initiale:
     - Lundi: 7.5h - 7h = 0.5h (50 centimes)
     - Mardi: 7.5h - 7h = 0.5h (50 centimes)
     - Jeudi: 7.5h - 7h = 0.5h (50 centimes)
     - Vendredi: 7.5h - 7h = 0.5h (50 centimes)
     
     Distribution des 250 centimes:
     - Lundi: +50 centimes = 7.50h
     - Mardi: +50 centimes = 7.50h
     - Jeudi: +50 centimes = 7.50h
     - Vendredi: +50 centimes = 7.50h
     - Reste: 250 - 200 = 50 centimes
     
     Impossible! Capacité totale insuffisante (34.5h < 35h)
     → ERREUR: "Capacité insuffisante sur la période"
     ```

**Scénario corrigé avec 34.5h:**

```
Résultat final:
    Lundi:    7.50h
    Mardi:    7.50h
    Mercredi: 4.50h (contraint)
    Jeudi:    7.50h
    Vendredi: 7.50h
    Total:    34.50h ✓
```

### Caractéristiques MODE ÉQUILIBRÉ

✅ **Avantages:**
- Distribution la plus uniforme possible
- Charge de travail équitable sur toute la période
- Utilise tous les jours disponibles
- Précision maximale (calculs en centimes)

⚠️ **Particularités:**
- Peut nécessiter des ajustements si jours contraints
- Moins flexible que JAT (remplit tous les jours)
- Écart-type minimal entre les allocations journalières

---

## 📥 **3. MODE PEPS (PREMIER ENTRÉ, PREMIER SORTI)**

### Principe Fondamental
Remplit les jours **séquentiellement** depuis le début de la période jusqu'à épuisement des heures.

### Paramètres
Identiques au mode ÉQUILIBRÉ:
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures
- `dateDebut`: Date de début de période
- `dateFin`: Date de fin de période

### Algorithme Détaillé

```
jours = businessDaysOttawa(dateDebut, dateFin)
restant = heuresTotal
résultat = []

POUR chaque jour dans jours (ordre chronologique):
    SI restant <= 0:
        → ARRÊTER (toutes les heures allouées)
    
    SI jour férié:
        → IGNORER ce jour
        → CONTINUER
    
    utilisées = heures déjà allouées ce jour
    capaciteNette = calculCapaciteNette(horaire, jour, deadline si applicable)
    libre = max(capaciteNette - utilisées, 0)
    
    SI libre <= 0:
        → CONTINUER au jour suivant
    
    alloue = min(libre, restant)
    résultat.push({ date: jour, heures: alloue })
    restant -= alloue

SI restant > 0:
    → ERREUR: "Capacité insuffisante sur la période"

RETOURNER résultat
```

### Exemple Complet MODE PEPS

**Scénario:**
- Période: Lundi 11 au Vendredi 15 décembre (5 jours)
- Capacité: 7.5h/jour
- Heures: 20h
- Jours fériés: Aucun

**Exécution:**

```
Jour courant: Lundi 11
    - Libre: 7.5h
    - Restant: 20h
    - Alloue: min(7.5h, 20h) = 7.5h
    - Restant: 20h - 7.5h = 12.5h

Jour courant: Mardi 12
    - Libre: 7.5h
    - Restant: 12.5h
    - Alloue: min(7.5h, 12.5h) = 7.5h
    - Restant: 12.5h - 7.5h = 5h

Jour courant: Mercredi 13
    - Libre: 7.5h
    - Restant: 5h
    - Alloue: min(7.5h, 5h) = 5h
    - Restant: 5h - 5h = 0h → TERMINÉ

Résultat:
    Lundi 11:    7.5h
    Mardi 12:    7.5h
    Mercredi 13: 5.0h
    Total:       20.0h ✓
```

**Comparaison avec ÉQUILIBRÉ pour le même scénario:**
```
MODE PEPS:
    Lun: 7.5h | Mar: 7.5h | Mer: 5.0h | Jeu: 0h | Ven: 0h
    → Concentré sur les premiers jours
    
MODE ÉQUILIBRÉ:
    Lun: 4.0h | Mar: 4.0h | Mer: 4.0h | Jeu: 4.0h | Ven: 4.0h
    → Distribution uniforme sur tous les jours
```

### Caractéristiques MODE PEPS

✅ **Avantages:**
- Simple et prévisible (ordre chronologique strict)
- Maximise les jours libres en fin de période
- Utile pour planification séquentielle des tâches
- Rapide à calculer (un seul passage)

⚠️ **Particularités:**
- Concentre la charge en début de période
- Peut saturer les premiers jours disponibles
- Laisse les derniers jours vides si possible
- Distribution non équilibrée

---

## ✍️ **4. MODE MANUEL**

### Principe Fondamental
L'utilisateur spécifie **manuellement** les heures pour chaque jour. Le système valide uniquement la cohérence.

### Processus de Validation

#### **Étape 1: Validation de la somme**
```
sommeTotale = sum(repartition.heures)
SI abs(sommeTotale - heuresTotalAttendu) > 0.0001:
    → ERREUR: "Somme des heures différente des heures totales"
```

#### **Étape 2: Validation par jour**
```
POUR chaque allocation dans repartition:
    // 1. Vérifier heures positives
    SI allocation.heures < 0:
        → ERREUR: "Heures négatives interdites"
    
    // 2. Vérifier si jour férié
    SI allocation.date est un jour férié:
        → ERREUR: "Allocation impossible sur jour férié"
    
    // 3. Récupérer ajustements existants
    ajustements = interrogerBaseDeDonnees(
        traducteurId,
        date = allocation.date,
        EXCLURE tacheId si édition en cours
    )
    utilisées = sum(ajustements.heures)
    
    // 4. Calculer total avec nouvelle allocation
    totalJour = utilisées + allocation.heures
    
    // 5. Calculer capacité nette du jour
    capaciteNette = calculCapaciteNette(
        horaire,
        allocation.date,
        deadline si applicable
    )
    
    // 6. Vérifier non-dépassement
    SI totalJour > capaciteNette + 0.000001:
        → ERREUR: "Dépassement capacité le [date]"
```

### Exemple de Validation

**Scénario:**
- Traducteur: capacité 7.5h/jour, horaire 9h-17h
- Heures totales attendues: 15h
- Mercredi déjà 2h utilisées (autre tâche)
- Jours fériés: 25 décembre

**Allocation manuelle proposée:**
```javascript
[
    { date: "2025-12-11", heures: 5 },   // Lundi
    { date: "2025-12-12", heures: 4 },   // Mardi
    { date: "2025-12-13", heures: 6 }    // Mercredi
]
```

**Validation:**

1. **Somme:** 5 + 4 + 6 = 15h ✓

2. **Lundi 11:**
     - Jour férié? Non ✓
     - Utilisées: 0h
     - Nouvelles: 5h
     - Total: 5h
     - Capacité nette: 7.5h (9h-17h moins pause = 7h, mais capacité config 7.5h)
     - 5h ≤ 7.5h ✓

3. **Mardi 12:**
     - Jour férié? Non ✓
     - Utilisées: 0h
     - Nouvelles: 4h
     - Total: 4h
     - Capacité nette: 7.5h
     - 4h ≤ 7.5h ✓

4. **Mercredi 13:**
     - Jour férié? Non ✓
     - Utilisées: 2h (autre tâche)
     - Nouvelles: 6h
     - Total: 8h
     - Capacité nette: 7.5h
     - 8h > 7.5h ✗
     - **ERREUR: "Dépassement capacité le 2025-12-13 (8.00h / 7.50h disponibles)"**

**Allocation corrigée:**
```javascript
[
    { date: "2025-12-11", heures: 6 },   // Lundi
    { date: "2025-12-12", heures: 4 },   // Mardi
    { date: "2025-12-13", heures: 5 }    // Mercredi (2h existantes + 5h = 7h)
]
```
→ Validation réussie ✓

### Caractéristiques MODE MANUEL

✅ **Avantages:**
- Contrôle total de la distribution
- Peut s'adapter à des contraintes spécifiques
- Permet des distributions non standard
- Utile pour ajustements fins

⚠️ **Contraintes:**
- Nécessite connaissance des capacités
- Risque d'erreurs humaines
- Validation stricte obligatoire
- Plus long à saisir pour grandes périodes

---

## 🔧 **RÈGLES TRANSVERSALES** (appliquées à TOUS les modes)

### 1. **Exclusion automatique de la pause midi**

```
RÈGLE: La pause 12h-13h est TOUJOURS exclue de la capacité travaillable

Exception: Si l'horaire ne chevauche pas 12h-13h
    Exemple: Horaire 15h-23h → pas de pause dans cette plage
```

**Exemples:**
```
Horaire 9h-17h:
    - Avant pause: 9h à 12h = 3h
    - Après pause: 13h à 17h = 4h
    - Total: 7h (8h brutes - 1h pause)

Horaire 7h30-15h30:
    - Avant pause: 7h30 à 12h = 4.5h
    - Après pause: 13h à 15h30 = 2.5h
    - Total: 7h

Horaire 8h-11h (matinal):
    - Pas de chevauchement pause
    - Total: 3h

Horaire 14h-18h (après-midi):
    - Pas de chevauchement pause
    - Total: 4h
```

### 2. **Gestion des weekends et jours fériés**

```
RÈGLE: Les weekends (samedi/dimanche) et jours fériés configurés sont TOUJOURS exclus

- Aucune allocation possible sur ces jours
- businessDaysOttawa() retourne uniquement jours ouvrables (lun-ven, hors fériés)
- Calcul de capacité: weekends et fériés ignorés automatiquement
- Configuration des jours fériés via portail admin
```

**Jours fériés gérés:**
```
Source: Table `joursFeries` en base de données
    - date: Date du jour férié (format YYYY-MM-DD)
    - nom: Libellé du jour férié (ex: "Noël")
    - recurrent: Booléen (true si répété chaque année)
    - actif: Booléen (permet désactivation temporaire)

Exemples de jours fériés canadiens:
    - 1er janvier: Jour de l'an
    - Vendredi saint: Variable (mars/avril)
    - 1er juillet: Fête du Canada
    - 1er lundi de septembre: Fête du travail
    - 25 décembre: Noël
    - 26 décembre: Lendemain de Noël (Boxing Day)
```

### 3. **Respect de l'horaire traducteur**

```
RÈGLE: Les allocations doivent respecter l'horaire individuel du traducteur

Si horaire = "7h30-15h30":
    - Heures travaillables: UNIQUEMENT 7h30 à 15h30
    - Capacité brute: 8h
    - Capacité nette (après pause): 7h
    - Heures avant 7h30 ou après 15h30: IMPOSSIBLES

Si horaire = "9h-17h":
    - Heures travaillables: 9h à 17h
    - Capacité nette: 7h
```

**Formats d'horaire supportés:**
```
"7h30-15h30"  → 7.5h à 15.5h
"07:00-15:00" → 7.0h à 15.0h
"9h-17h"      → 9.0h à 17.0h
null/vide     → 9h-17h (défaut)
```

### 4. **Deadline avec heure précise**

```
RÈGLE: Si une deadline contient une heure précise, elle limite la capacité du jour J
             Sinon, l'heure par défaut est 17h00

Application pour TOUS les modes (JAT, ÉQUILIBRÉ, PEPS, MANUEL)

SI deadline = "2025-12-17T12:00:00"
ET jour allocation = 2025-12-17
ALORS:
    heureFinEffective = min(horaire.heureFin, 12h)

SI deadline = "2025-12-17" (pas d'heure précise)
ET jour allocation = 2025-12-17
ALORS:
    heureFinEffective = min(horaire.heureFin, 17h)
```

**Exemples:**
```
Horaire 10h-18h, deadline 14h:
    - Avant pause: 10h-12h = 2h
    - Après pause: 13h-14h = 1h
    - Total jour J: 3h (au lieu de 7h normal)

Horaire 7h30-15h30, deadline 12h:
    - Avant pause: 7h30-12h = 4.5h
    - Après pause: 0h (deadline avant 13h)
    - Total jour J: 4.5h

Horaire 9h-17h, deadline 11h:
    - Avant pause: 9h-11h = 2h
    - Après pause: 0h
    - Total jour J: 2h

Horaire 9h-18h, deadline sans heure (défaut 17h):
    - Avant pause: 9h-12h = 3h
    - Après pause: 13h-17h = 4h
    - Total jour J: 7h
```

### 5. **Ajustements existants (heures déjà allouées)**

```
RÈGLE: Avant toute allocation, les heures déjà utilisées sont soustraites

Source: Table ajustementTemps (base de données)
    - Contient toutes les allocations existantes
    - Liées à d'autres tâches déjà planifiées
    - À soustraire de la capacité disponible

Processus:
    1. Interroger ajustementTemps pour le traducteur
    2. Grouper par date
    3. Sommer les heures par jour
    4. Soustraire de la capacité nette
    5. libre = max(capaciteNette - utilisées, 0)
```

**Exemple:**
```
Jour: Mercredi 13 décembre
Horaire traducteur: 9h-17h
Capacité nette: 7h

Ajustements existants:
    - Tâche A: 3h
    - Tâche B: 2h
    - Total utilisé: 5h

Capacité libre: 7h - 5h = 2h
→ Seulement 2h peuvent être allouées pour une nouvelle tâche
```

### 6. **Précision des calculs**

```
RÈGLE: Gestion rigoureuse des arrondis pour éviter les erreurs d'accumulation

MODE ÉQUILIBRÉ:
    - Calculs en centimes (0.01h)
    - 1h = 100 centimes
    - Distribution puis reconversion en heures
    - Précision: ±0.0001h

TOUS MODES:
    - Tolérance: ±0.01h pour comparaisons flottantes
    - Validation somme: abs(somme - attendu) < 0.01h
    - Stockage: 4 décimales maximum (ex: 5.8333)
```

**Exemples de gestion de précision:**
```
35h sur 6 jours (mode ÉQUILIBRÉ):
    - 35h = 3500 centimes
    - 3500 / 6 = 583.333...
    - Base: 583 centimes
    - Reste: 3500 - (583 × 6) = 2 centimes
    
    Distribution:
        J1: 583 + 1 = 584 = 5.84h
        J2: 583 + 1 = 584 = 5.84h
        J3: 583 = 5.83h
        J4: 583 = 5.83h
        J5: 583 = 5.83h
        J6: 583 = 5.83h
        Somme: 35.00h (exact!)
```

### 7. **Ordre chronologique des résultats**

```
RÈGLE: Tous les modes retournent les résultats triés par date croissante

- MODE JAT: Calcul à rebours MAIS résultat trié chronologiquement
- MODE ÉQUILIBRÉ: Naturellement chronologique
- MODE PEPS: Naturellement chronologique
- MODE MANUEL: Trié avant retour

Raison: Cohérence pour l'affichage frontend
```

### 8. **Validation de timezone (America/Toronto)**

```
RÈGLE: Toutes les dates/heures utilisent le fuseau America/Toronto (Ottawa)

- Gestion automatique DST (Daylight Saving Time)
- EST (UTC-5) en hiver
- EDT (UTC-4) en été
- PostgreSQL stocke en UTC → conversions explicites

Fonctions utilisées:
    - normalizeToOttawa(): Dates simples
    - normalizeToOttawaWithTime(): Dates + heures
    - formatOttawaISO(): Formatage sortie
    - todayOttawa(): Date du jour
```

---

## 🧮 **CALCUL DE CAPACITÉ NETTE - Fonction clé**

Cette fonction est appelée par **TOUS** les modes pour déterminer les heures travaillables d'un jour donné.

### Signature

```typescript
function capaciteNetteJour(
    horaire: { heureDebut: number, heureFin: number },
    jourConcerne: Date,
    deadlineDateTime?: Date
): number
```

### Algorithme Complet

```
ENTRÉE:
    - horaire: { heureDebut, heureFin } en heures décimales
    - jourConcerne: Date du jour à analyser
    - deadlineDateTime: (optionnel) Deadline si le même jour

ÉTAPE 0: Vérifier si jour férié
    SI jourConcerne est un jour férié configuré:
        RETOURNER 0 (pas de capacité sur jour férié)

ÉTAPE 1: Déterminer l'heure de fin effective
    heureFinEffective = horaire.heureFin
    
    SI deadlineDateTime existe ET même jour que jourConcerne:
        heureDeadline = extraire_heure(deadlineDateTime)
        heureFinEffective = min(horaire.heureFin, heureDeadline)
    SINON SI pas d'heure dans deadline (date seule):
        heureFinEffective = min(horaire.heureFin, 17.0)

ÉTAPE 2: Vérifier chevauchement avec pause 12h-13h
    pauseDebut = 12.0
    pauseFin = 13.0
    
    SI heureFinEffective ≤ pauseDebut OU horaire.heureDebut ≥ pauseFin:
        // Pas de chevauchement avec la pause
        capaciteNette = max(heureFinEffective - horaire.heureDebut, 0)
        RETOURNER capaciteNette

ÉTAPE 3: Chevauchement détecté → Calculer avant et après pause
    avantPause = max(
        min(pauseDebut, heureFinEffective) - horaire.heureDebut,
        0
    )
    
    apresPause = max(
        heureFinEffective - max(pauseFin, horaire.heureDebut),
        0
    )
    
    capaciteNette = avantPause + apresPause
    RETOURNER capaciteNette
```

### Exemples Détaillés

#### **Exemple 1: Horaire standard, jour normal**
```
Horaire: 7h30-15h30 (7.5h à 15.5h)
Jour: Normal (pas de deadline, pas férié)
Deadline: Aucune

Calcul:
    Jour férié? Non
    heureFinEffective = 15.5h
    Chevauchement pause? 7.5 < 13 ET 15.5 > 12 → OUI
    
    avantPause = min(12, 15.5) - 7.5 = 12 - 7.5 = 4.5h
    apresPause = 15.5 - max(13, 7.5) = 15.5 - 13 = 2.5h
    
    capaciteNette = 4.5h + 2.5h = 7h ✓
```

#### **Exemple 2: Jour avec deadline 14h**
```
Horaire: 7h30-15h30
Jour: Mardi 17 décembre
Deadline: Mardi 17 décembre 14h00

Calcul:
    Jour férié? Non
    heureFinEffective = min(15.5, 14.0) = 14.0h
    Chevauchement pause? 7.5 < 13 ET 14.0 > 12 → OUI
    
    avantPause = min(12, 14.0) - 7.5 = 12 - 7.5 = 4.5h
    apresPause = 14.0 - max(13, 7.5) = 14.0 - 13 = 1h
    
    capaciteNette = 4.5h + 1h = 5.5h ✓
```

#### **Exemple 3: Jour férié (ex: Noël)**
```
Horaire: 7h30-15h30
Jour: 25 décembre (Noël - jour férié)
Deadline: Aucune

Calcul:
    Jour férié? Oui → RETOURNER 0h
    
    capaciteNette = 0h (aucun travail sur jour férié)
```

#### **Exemple 4: Deadline avant pause**
```
Horaire: 7h30-15h30
Deadline: 11h30

Calcul:
    Jour férié? Non
    heureFinEffective = min(15.5, 11.5) = 11.5h
    Chevauchement pause? 11.5 ≤ 12 → NON (fin avant pause)
    
    capaciteNette = 11.5 - 7.5 = 4h ✓
```

#### **Exemple 5: Horaire matinal (pas de pause)**
```
Horaire: 7h-11h
Jour: Normal

Calcul:
    Jour férié? Non
    heureFinEffective = 11h
    Chevauchement pause? 11 ≤ 12 → NON (fin avant pause)
    
    capaciteNette = 11 - 7 = 4h ✓
```

#### **Exemple 6: Horaire après-midi (pas de pause)**
```
Horaire: 13h-18h
Jour: Normal

Calcul:
    Jour férié? Non
    heureFinEffective = 18h
    Chevauchement pause? 13 ≥ 13 → NON (début après pause)
    
    capaciteNette = 18 - 13 = 5h ✓
```

#### **Exemple 7: Deadline très tôt le matin**
```
Horaire: 7h30-15h30
Deadline: 9h00

Calcul:
    Jour férié? Non
    heureFinEffective = min(15.5, 9.0) = 9.0h
    Chevauchement pause? 9.0 ≤ 12 → NON
    
    capaciteNette = 9.0 - 7.5 = 1.5h ✓
```

#### **Exemple 8: Horaire englobant toute la pause**
```
Horaire: 10h-18h
Jour: Normal

Calcul:
    Jour férié? Non
    heureFinEffective = 18h
    Chevauchement pause? 10 < 13 ET 18 > 12 → OUI
    
    avantPause = min(12, 18) - 10 = 12 - 10 = 2h
    apresPause = 18 - max(13, 10) = 18 - 13 = 5h
    
    capaciteNette = 2h + 5h = 7h ✓
```

#### **Exemple 9: Deadline sans heure (défaut 17h)**
```
Horaire: 9h-18h
Jour: Jour J
Deadline: "2025-12-17" (pas d'heure)

Calcul:
    Jour férié? Non
    heureFinEffective = min(18, 17.0) = 17.0h (heure par défaut)
    Chevauchement pause? 9 < 13 ET 17 > 12 → OUI
    
    avantPause = min(12, 17) - 9 = 12 - 9 = 3h
    apresPause = 17 - max(13, 9) = 17 - 13 = 4h
    
    capaciteNette = 3h + 4h = 7h ✓
```

### Cas Limites

```
1. Deadline = heure de fin exacte:
     Horaire 9h-17h, deadline 17h
     → capaciteNette = 7h (normal, pas de limitation)

2. Deadline = début horaire:
     Horaire 9h-17h, deadline 9h
     → capaciteNette = 0h (rien à faire ce jour)

3. Horaire commence à 12h pile:
     Horaire 12h-18h
     → avantPause = 0h, apresPause = 5h
     → capaciteNette = 5h

4. Horaire finit à 13h pile:
     Horaire 8h-13h
     → avantPause = 4h, apresPause = 0h
     → capaciteNette = 4h

5. Horaire très court (< 1h):
     Horaire 11h30-12h
     → Pas de chevauchement pause
     → capaciteNette = 0.5h

6. Deadline sans heure après horaire:
     Horaire 9h-15h, deadline date seule
     → heureFinEffective = min(15, 17) = 15h
     → Pas de limitation (horaire finit avant 17h)

7. Jour férié avec horaire normal:
     Horaire 9h-17h, 25 décembre
     → capaciteNette = 0h (jour férié prime sur tout)
```

---

## 🎉 **GESTION DES JOURS FÉRIÉS**

### Structure Base de Données

#### Table `joursFeries`

```sql
CREATE TABLE joursFeries (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    nom VARCHAR(255) NOT NULL,
    recurrent BOOLEAN DEFAULT false,
    actif BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance
CREATE INDEX idx_joursferies_date ON joursFeries(date);
CREATE INDEX idx_joursferies_actif ON joursFeries(actif);
```

**Colonnes:**
- `date`: Date du jour férié (YYYY-MM-DD)
- `nom`: Libellé du jour férié (ex: "Noël", "Jour de l'an")
- `recurrent`: Si true, le jour férié se répète chaque année automatiquement
- `actif`: Permet de désactiver temporairement un jour férié sans le supprimer

### API Endpoints (Portail Admin)

#### **GET /api/admin/jours-feries**
Récupère la liste de tous les jours fériés configurés.

```typescript
// Réponse
{
    jours: [
        {
            id: 1,
            date: "2025-01-01",
            nom: "Jour de l'an",
            recurrent: true,
            actif: true
        },
        {
            id: 2,
            date: "2025-12-25",
            nom: "Noël",
            recurrent: true,
            actif: true
        }
        // ...
    ]
}
```

#### **POST /api/admin/jours-feries**
Ajoute un nouveau jour férié.

```typescript
// Requête
{
    date: "2025-07-01",
    nom: "Fête du Canada",
    recurrent: true,
    actif: true
}

// Réponse
{
    id: 3,
    date: "2025-07-01",
    nom: "Fête du Canada",
    recurrent: true,
    actif: true,
    message: "Jour férié créé avec succès"
}
```

#### **PUT /api/admin/jours-feries/:id**
Modifie un jour férié existant.

```typescript
// Requête
{
    nom: "Fête du Canada (mise à jour)",
    actif: true
}

// Réponse
{
    id: 3,
    date: "2025-07-01",
    nom: "Fête du Canada (mise à jour)",
    recurrent: true,
    actif: true,
    message: "Jour férié mis à jour avec succès"
}
```

#### **DELETE /api/admin/jours-feries/:id**
Supprime un jour férié.

```typescript
// Réponse
{
    message: "Jour férié supprimé avec succès",
    id: 3
}
```

### Fonctions Utilitaires

#### **isJourFerie(date: Date): Promise<boolean>**
Vérifie si une date donnée est un jour férié actif.

```typescript
async function isJourFerie(date: Date): Promise<boolean> {
    const dateStr = formatDate(date); // "YYYY-MM-DD"
    
    const result = await db.query(
        'SELECT id FROM joursFeries WHERE date = $1 AND actif = true',
        [dateStr]
    );
    
    return result.rows.length > 0;
}
```

#### **getJoursFeries(annee: number): Promise<JourFerie[]>**
Récupère tous les jours fériés pour une année donnée.

```typescript
async function getJoursFeries(annee: number): Promise<JourFerie[]> {
    const result = await db.query(
        `SELECT * FROM joursFeries 
         WHERE EXTRACT(YEAR FROM date) = $1 
         AND actif = true
         ORDER BY date`,
        [annee]
    );
    
    return result.rows;
}
```

#### **synchroniserJoursFeriesRecurrents(annee: number): Promise<void>**
Crée automatiquement les jours fériés récurrents pour une année future.

```typescript
async function synchroniserJoursFeriesRecurrents(annee: number): Promise<void> {
    // Récupérer tous les jours fériés récurrents
    const recurrents = await db.query(
        'SELECT * FROM joursFeries WHERE recurrent = true'
    );
    
    for (const ferie of recurrents.rows) {
        const nouvelleDate = new Date(ferie.date);
        nouvelleDate.setFullYear(annee);
        
        // Vérifier si n'existe pas déjà
        const existe = await db.query(
            'SELECT id FROM joursFeries WHERE date = $1',
            [formatDate(nouvelleDate)]
        );
        
        if (existe.rows.length === 0) {
            await db.query(
                `INSERT INTO joursFeries (date, nom, recurrent, actif)
                 VALUES ($1, $2, $3, $4)`,
                [formatDate(nouvelleDate), ferie.nom, true, true]
            );
        }
    }
}
```

### Interface Portail Admin

#### Écran de Gestion des Jours Fériés

**Fonctionnalités:**
1. **Liste des jours fériés:** Tableau avec colonnes (Date, Nom, Récurrent, Actif, Actions)
2. **Filtres:** Par année, par statut actif/inactif
3. **Bouton "Ajouter un jour férié":** Ouvre modal de création
4. **Actions par ligne:**
     - Éditer (icône crayon)
     - Activer/Désactiver (toggle switch)
     - Supprimer (icône poubelle avec confirmation)
5. **Bouton "Synchroniser année suivante":** Crée automatiquement les jours récurrents

**Modal d'Ajout/Édition:**
```
┌─────────────────────────────────────┐
│ Ajouter un jour férié               │
├─────────────────────────────────────┤
│ Date: [____________________]        │
│ Nom:  [____________________]        │
│ □ Récurrent chaque année            │
│ ☑ Actif                             │
│                                     │
│ [Annuler]          [Enregistrer]    │
└─────────────────────────────────────┘
```

### Impact sur les Calculs de Distribution

Tous les modes de distribution (JAT, ÉQUILIBRÉ, PEPS, MANUEL) vérifient automatiquement les jours fériés:

```typescript
// Exemple d'intégration dans businessDaysOttawa
async function businessDaysOttawa(dateFrom: Date, dateTo: Date): Promise<Date[]> {
    const jours: Date[] = [];
    let current = new Date(dateFrom);
    
    while (current <= dateTo) {
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isFerie = await isJourFerie(current);
        
        if (!isWeekend && !isFerie) {
            jours.push(new Date(current));
        }
        
        current.setDate(current.getDate() + 1);
    }
    
    return jours;
}
```

### Jours Fériés Canadiens Standards

Liste des jours fériés fédéraux canadiens recommandés pour configuration initiale:

```typescript
const joursFeriesCanada = [
    { nom: "Jour de l'an", date: "01-01", recurrent: true },
    { nom: "Vendredi saint", date: "variable", recurrent: true }, // Calculé
    { nom: "Lundi de Pâques", date: "variable", recurrent: true }, // Calculé
    { nom: "Fête de la Reine", date: "variable", recurrent: true }, // 3e lundi de mai
    { nom: "Fête du Canada", date: "07-01", recurrent: true },
    { nom: "Fête du travail", date: "variable", recurrent: true }, // 1er lundi de septembre
    { nom: "Jour de l'Action de grâce", date: "variable", recurrent: true }, // 2e lundi d'octobre
    { nom: "Jour du Souvenir", date: "11-11", recurrent: true },
    { nom: "Noël", date: "12-25", recurrent: true },
    { nom: "Boxing Day", date: "12-26", recurrent: true }
];
```

**Note:** Les jours fériés "variables" (Pâques, Fête de la Reine, etc.) nécessitent un calcul algorithmique ou une saisie manuelle annuelle.

### Messages d'Erreur Liés aux Jours Fériés

```
- "Allocation impossible sur jour férié (25 décembre - Noël)"
- "La période contient X jours fériés, capacité réduite de Y heures"
- "Jour férié déjà configuré pour cette date"
- "Impossible de supprimer un jour férié avec des allocations existantes"
```

---

## 📊 **COMPARAISON DES MODES**

### Tableau Récapitulatif

| Critère | JAT | ÉQUILIBRÉ | PEPS | MANUEL |
|---------|-----|-----------|------|--------|
| **Ordre d'allocation** | À rebours (deadline vers début) | Uniforme sur tous jours | Chronologique (début vers fin) | Spécifié par utilisateur |
| **Distribution** | Variable (concentré fin) | Uniforme | Variable (concentré début) | Personnalisée |
| **Jours utilisés** | Minimum nécessaire | Tous disponibles | Minimum nécessaire | Selon saisie |
| **Flexibilité planification** | Maximale (jours début libres) | Minimale (tous occupés) | Minimale (jours fin libres) | Contrôle total |
| **Écart-type distribution** | Moyen à élevé | Minimal (quasi-nul) | Moyen à élevé | Variable |
| **Complexité calcul** | Moyenne | Élevée (centimes) | Faible | Faible (validation) |
| **Use case principal** | Deadlines serrées | Charge équitable | Tâches séquentielles | Cas spéciaux |
| **Gestion jours fériés** | Automatique | Automatique | Automatique | Validation stricte |

### Exemple Comparatif: 20h sur 5 jours (capacité 7.5h/jour)

**Données:**
- Période: Lundi à Vendredi
- Heures: 20h
- Capacité: 7.5h/jour
- Jours fériés: Aucun

**Résultats par mode:**

```
MODE JAT (échéance vendredi):
    Lundi:    0h
    Mardi:    0h
    Mercredi: 5h
    Jeudi:    7.5h
    Vendredi: 7.5h
    → Concentré sur derniers jours
    
MODE ÉQUILIBRÉ:
    Lundi:    4h
    Mardi:    4h
    Mercredi: 4h
    Jeudi:    4h
    Vendredi: 4h
    → Parfaitement uniforme
    
MODE PEPS:
    Lundi:    7.5h
    Mardi:    7.5h
    Mercredi: 5h
    Jeudi:    0h
    Vendredi: 0h
    → Concentré sur premiers jours
    
MODE MANUEL (exemple):
    Lundi:    3h
    Mardi:    5h
    Mercredi: 2h
    Jeudi:    6h
    Vendredi: 4h
    → Distribution personnalisée
```

**Avec jour férié (mercredi):**

```
MODE JAT:
    Lundi:    0h
    Mardi:    5h
    Mercredi: 0h (férié)
    Jeudi:    7.5h
    Vendredi: 7.5h
    
MODE ÉQUILIBRÉ:
    Lundi:    5h
    Mardi:    5h
    Mercredi: 0h (férié)
    Jeudi:    5h
    Vendredi: 5h
    
MODE PEPS:
    Lundi:    7.5h
    Mardi:    7.5h
    Mercredi: 0h (férié)
    Jeudi:    5h
    Vendredi: 0h
```

---

## 🎓 **CONCEPTS CLÉS**

### Capacité Nette vs Capacité Brute

```
Capacité BRUTE = heureFin - heureDebut
    Exemple: 17h - 9h = 8h

Capacité NETTE = capacité brute - pause - limitations
    Exemple: 8h - 1h (pause) = 7h
    Avec deadline: peut être < 7h
    Sur jour férié: 0h
```

### Heures Utilisées vs Heures Libres

```
Heures UTILISÉES = sum(ajustements existants pour ce jour)
    Source: table ajustementTemps
    Représente les allocations déjà faites

Heures LIBRES = capacité nette - heures utilisées
    C'est ce qui peut encore être alloué
```

### Plages Horaires JAT

```
JOUR J (échéance):
    Allocation en DÉBUT de journée
    Heures: 10h-12h (premières heures disponibles)
    Raison: Travail menant directement à la livraison

JOURS AVANT:
    Allocation en FIN de journée  
    Heures: 15h-18h (dernières heures disponibles)
    Raison: Maximiser flexibilité en gardant débuts libres
```

### Gestion Centimes (Mode ÉQUILIBRÉ)

```
Pourquoi des centimes?
    - Éviter accumulation erreurs arrondis
    - Précision maximale distribution
    - Garantir somme exacte

Comment:
    1. Convertir heures en centimes (×100)
    2. Distribuer en nombres entiers
    3. Reconvertir en heures (÷100)
```

---

## 🔍 **DIAGNOSTICS ET ERREURS**

### Erreurs Communes

#### 1. "Capacité insuffisante"
```
Cause: heures
    → IGNORER (pas de travail)
SINON
    1. Récupérer l'horaire du traducteur (ex: "7h30-15h30")
    2. Parser en heures décimales (7.5h à 15.5h)
    3. Calculer capacité nette en tenant compte de:
         a) Horaire de début/fin
         b) Pause midi OBLIGATOIRE 12h-13h (toujours exclue)
         c) Deadline si c'est le jour J avec heure précise
    4. Soustraire les heures déjà utilisées (ajustements existants)
    5. Ajouter à la capacité disponible globale
```

**Exemple de calcul de capacité nette:**
```
Horaire traducteur: 7h30-15h30 (8h brutes)
Jour normal:
    - 7h30 à 12h00 = 4.5h
    - 13h00 à 15h30 = 2.5h
    - Total = 7h nettes (8h - 1h pause)

Jour J avec deadline 14h00:
    - 7h30 à 12h00 = 4.5h
    - 13h00 à 14h00 = 1h
    - Total = 5.5h nettes (pause exclue, limite à deadline)

Jour J avec deadline 11h30:
    - 7h30 à 11h30 = 4h
    - Pas d'heures après midi (deadline avant pause)
    - Total = 4h nettes
```

#### **Étape 3: Validation de la capacité**
```
SI heuresTotal > capacité disponible globale
    → ERREUR: "Capacité insuffisante"
    → Aucune allocation n'est faite
```

#### **Étape 4: Allocation à rebours (cœur du JAT)**
```
restant = heuresTotal
courant = date échéance
résultat = []

TANT QUE restant > 0 ET iterations < 90:
    SI courant < aujourd'hui:
        → ARRÊTER (remontée trop loin)
    
    SI weekend:
        → IGNORER ce jour
        → courant = courant - 1 jour
        → CONTINUER
    
    // Calculer capacité libre ce jour
    utilisées = heures déjà allouées à ce jour (ajustements existants)
    capaciteNette = calculCapaciteNette(horaire, courant, deadline si jour J)
    libre = max(capaciteNette - utilisées, 0)
    
    SI libre > 0:
        alloue = min(libre, restant)
        
        // RÈGLE MÉTIER CRUCIALE: Plages horaires
        SI c'est le jour J (jour d'échéance):
            → Allouer en DÉBUT DE JOURNÉE
            → heureDebut = horaire.heureDebut (ex: 7h30)
            → heureFin = heureDebut + alloue (en tenant compte de la pause)
            → Si traverse pause: ajouter 1h
            → Limiter à l'heure de deadline si précise
        SINON (jours avant):
            → Allouer en FIN DE JOURNÉE (à rebours)
            → heureFin = horaire.heureFin (ex: 15h30)
            → heureDebut = heureFin - alloue (en remontant, pause comprise)
            → Si traverse pause en remontant: soustraire 1h
        
        résultat.push({ date, heures: alloue, heureDebut, heureFin })
        restant -= alloue
    
    courant = courant - 1 jour
    iterations++

SI restant > 0:
    → ERREUR: "Impossible de répartir toutes les heures"

// Trier résultat par ordre chronologique croissant
résultat.sort((a, b) => a.date comparé à b.date)
```

### Exemple Complet JAT

**Scénario:**
- Traducteur: Julie-Marie Bissonnette
- Horaire: 10h-18h (capacité 7h nettes après pause)
- Tâche: 10 heures
- Deadline: Mardi 17 décembre 2025 à 12h00
- Aujourd'hui: Vendredi 13 décembre 2025

**Exécution:**

1. **Calcul capacités disponibles:**
     - Lundi 16 déc (jour avant): 10h-12h (2h) + 13h-18h (5h) = **7h nettes**
     - Mardi 17 déc (jour J, deadline 12h): 10h-12h (2h) = **2h nettes**
     - **Total disponible: 9h** → ERREUR! Capacité insuffisante

**Ajustons avec 9h:**

1. **Calcul capacités:**
     - Lundi 16: 7h nettes
     - Mardi 17: 2h nettes
     - Total: 9h ✓

2. **Allocation (à rebours):**

     **Jour courant: Mardi 17 (jour J)**
     - Libre: 2h
     - Alloue: min(2h, 9h) = 2h
     - **DÉBUT DE JOURNÉE:** 10h-12h
     - Restant: 7h

     **Jour courant: Lundi 16 (jour avant)**
     - Libre: 7h
     - Alloue: min(7h, 7h) = 7h
     - **FIN DE JOURNÉE (à rebours):**
         - heureFin = 18h
         - heureDebut = 18h - 7h = 11h (mais traverse pause!)
         - Ajustement pause: 11h - 1h = 10h
         - Donc: 10h-12h (2h) + 13h-18h (5h) = 7h ✓
     - Restant: 0h

3. **Résultat final (trié chronologiquement):**
```javascript
[
    { date: "2025-12-16", heures: 7, heureDebut: "10h", heureFin: "18h" },
    { date: "2025-12-17", heures: 2, heureDebut: "10h", heureFin: "12h" }
]
```

### Caractéristiques JAT

✅ **Avantages:**
- Maximise la flexibilité en laissant les premiers jours libres
- Respecte précisément les deadlines avec heure
- Alloue les heures au plus près de l'échéance
- Gère automatiquement les plages horaires (début/fin journée)

⚠️ **Particularités:**
- Distribution non uniforme (charge variable selon les jours)
- Peut concentrer beaucoup d'heures sur les derniers jours
- Nécessite une capacité suffisante proche de la deadline

---

## ⚖️ **2. MODE ÉQUILIBRÉ**

### Principe Fondamental
Distribue les heures **uniformément** sur tous les jours ouvrables de la période, en maximisant l'équité de charge.

### Paramètres
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures (ex: 35h)
- `dateDebut`: Date de début de période
- `dateFin`: Date de fin de période

### Algorithme Détaillé

#### **Étape 1: Collecte des jours disponibles**
```
jours = businessDaysOttawa(dateDebut, dateFin)
// Retourne tous les jours ouvrables (lun-ven, exclut weekends)

POUR chaque jour:
    utilisées = heures déjà allouées (ajustements existants)
    capaciteNette = calculCapaciteNette(horaire, jour, deadline si applicable)
    libre = max(capaciteNette - utilisées, 0)
    
    SI libre > 0:
        disponibilites.push({ date: jour, libre })
```

#### **Étape 2: Distribution uniforme initiale (en centimes)**
Pour une précision maximale, on travaille en centimes (1h = 100 centimes):

```
heuresCentimes = round(heuresTotal × 100)
nbJours = nombre de jours disponibles
baseParJour = floor(heuresCentimes / nbJours)
reste = heuresCentimes - (baseParJour × nbJours)

// Créer allocation initiale
POUR chaque jour (index 0 à nbJours-1):
    centimes = baseParJour
    SI reste > 0:
        centimes += 1  // Distribuer 1 centime supplémentaire
        reste -= 1
    
    allocations[index] = {
        date: jour,
        capaciteLibre: capacité disponible,
        heuresAllouees: centimes / 100,
        estContraint: false
    }
```

**Exemple:**
```
35h sur 6 jours:
    - 35h = 3500 centimes
    - Base: floor(3500 / 6) = 583 centimes = 5.83h
    - Reste: 3500 - (583 × 6) = 2 centimes
    
    Résultat initial:
        Jour 1: 583 + 1 = 584 centimes = 5.84h
        Jour 2: 583 + 1 = 584 centimes = 5.84h
        Jour 3: 583 centimes = 5.83h
        Jour 4: 583 centimes = 5.83h
        Jour 5: 583 centimes = 5.83h
        Jour 6: 583 centimes = 5.83h
        Total: 35.00h ✓
```

#### **Étape 3: Gestion des jours contraints**
```
heuresARedistribu = 0
joursContraints = []
joursLibres = []

POUR chaque allocation:
    SI heuresAllouees > capaciteLibre + 0.0001:
        // Jour contraint: ne peut pas accepter toute l'allocation
        heuresARedistribu += (heuresAllouees - capaciteLibre)
        heuresAllouees = capaciteLibre
        estContraint = true
        joursContraints.push(index)
    SINON:
        joursLibres.push(index)
```

#### **Étape 4: Redistribution sur jours non contraints**
```
SI heuresARedistribu > 0 ET joursLibres.length > 0:
    // Trier jours libres par capacité restante décroissante
    joursLibres.sort((a, b) => (capaciteB - allocB) - (capaciteA - allocA))
    
    centimesARedistribu = round(heuresARedistribu × 100)
    
    POUR chaque jour libre (dans l'ordre trié):
        SI centimesARedistribu <= 0:
            → ARRÊTER
        
        capaciteResteCentimes = round((capaciteLibre - heuresAllouees) × 100)
        
        SI capaciteResteCentimes > 0:
            aAjouter = min(capaciteResteCentimes, centimesARedistribu)
            heuresAllouees += aAjouter / 100
            centimesARedistribu -= aAjouter
```

#### **Étape 5: Construction du résultat**
```
résultat = []
POUR chaque allocation:
    résultat.push({
        date: allocation.date,
        heures: round(allocation.heuresAllouees, 4)
    })

// Validation finale
somme = sum(résultat.heures)
SI abs(somme - heuresTotal) > 0.01:
    → ERREUR: "Erreur de répartition: somme incorrecte"

RETOURNER résultat.sort((a, b) => a.date comparé à b.date)
```

### Exemple Complet MODE ÉQUILIBRÉ

**Scénario:**
- Traducteur: capacité 7.5h/jour
- Période: Lundi 11 au Vendredi 15 décembre (5 jours)
- Heures: 35h
- Contrainte: Mercredi déjà 3h utilisées

**Exécution:**

1. **Jours disponibles:**
     ```
     Lundi 11:    7.5h libre
     Mardi 12:    7.5h libre
     Mercredi 13: 7.5h - 3h = 4.5h libre
     Jeudi 14:    7.5h libre
     Vendredi 15: 7.5h libre
     Total: 34.5h disponible
     ```

2. **Distribution initiale (35h sur 5 jours):**
     ```
     Base = 35 / 5 = 7h par jour
     
     Lundi:    7h ✓ (< 7.5h)
     Mardi:    7h ✓
     Mercredi: 7h ✗ (> 4.5h libre) → CONTRAINT!
     Jeudi:    7h ✓
     Vendredi: 7h ✓
     ```

3. **Identification contraintes:**
     ```
     Mercredi: 
         - Alloué initial: 7h
         - Capacité libre: 4.5h
         - Excédent: 7h - 4.5h = 2.5h
     → Ramener à 4.5h
     → Redistribuer 2.5h sur les autres jours
     ```

4. **Redistribution (2.5h = 250 centimes):**
     ```
     Capacités restantes après allocation initiale:
     - Lundi: 7.5h - 7h = 0.5h (50 centimes)
     - Mardi: 7.5h - 7h = 0.5h (50 centimes)
     - Jeudi: 7.5h - 7h = 0.5h (50 centimes)
     - Vendredi: 7.5h - 7h = 0.5h (50 centimes)
     
     Distribution des 250 centimes:
     - Lundi: +50 centimes = 7.50h
     - Mardi: +50 centimes = 7.50h
     - Jeudi: +50 centimes = 7.50h
     - Vendredi: +50 centimes = 7.50h
     - Reste: 250 - 200 = 50 centimes
     
     Impossible! Capacité totale insuffisante (34.5h < 35h)
     → ERREUR: "Capacité insuffisante sur la période"
     ```

**Scénario corrigé avec 34.5h:**

```
Résultat final:
    Lundi:    7.50h
    Mardi:    7.50h
    Mercredi: 4.50h (contraint)
    Jeudi:    7.50h
    Vendredi: 7.50h
    Total:    34.50h ✓
```

### Caractéristiques MODE ÉQUILIBRÉ

✅ **Avantages:**
- Distribution la plus uniforme possible
- Charge de travail équitable sur toute la période
- Utilise tous les jours disponibles
- Précision maximale (calculs en centimes)

⚠️ **Particularités:**
- Peut nécessiter des ajustements si jours contraints
- Moins flexible que JAT (remplit tous les jours)
- Écart-type minimal entre les allocations journalières

---

## 📥 **3. MODE PEPS (PREMIER ENTRÉ, PREMIER SORTI)**

### Principe Fondamental
Remplit les jours **séquentiellement** depuis le début de la période jusqu'à épuisement des heures.

### Paramètres
Identiques au mode ÉQUILIBRÉ:
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures
- `dateDebut`: Date de début de période
- `dateFin`: Date de fin de période

### Algorithme Détaillé

```
jours = businessDaysOttawa(dateDebut, dateFin)
restant = heuresTotal
résultat = []

POUR chaque jour dans jours (ordre chronologique):
    SI restant <= 0:
        → ARRÊTER (toutes les heures allouées)
    
    utilisées = heures déjà allouées ce jour
    capaciteNette = calculCapaciteNette(horaire, jour, deadline si applicable)
    libre = max(capaciteNette - utilisées, 0)
    
    SI libre <= 0:
        → CONTINUER au jour suivant
    
    alloue = min(libre, restant)
    résultat.push({ date: jour, heures: alloue })
    restant -= alloue

SI restant > 0:
    → ERREUR: "Capacité insuffisante sur la période"

RETOURNER résultat
```

### Exemple Complet MODE PEPS

**Scénario:**
- Période: Lundi 11 au Vendredi 15 décembre (5 jours)
- Capacité: 7.5h/jour
- Heures: 20h

**Exécution:**

```
Jour courant: Lundi 11
    - Libre: 7.5h
    - Restant: 20h
    - Alloue: min(7.5h, 20h) = 7.5h
    - Restant: 20h - 7.5h = 12.5h

Jour courant: Mardi 12
    - Libre: 7.5h
    - Restant: 12.5h
    - Alloue: min(7.5h, 12.5h) = 7.5h
    - Restant: 12.5h - 7.5h = 5h

Jour courant: Mercredi 13
    - Libre: 7.5h
    - Restant: 5h
    - Alloue: min(7.5h, 5h) = 5h
    - Restant: 5h - 5h = 0h → TERMINÉ

Résultat:
    Lundi 11:    7.5h
    Mardi 12:    7.5h
    Mercredi 13: 5.0h
    Total:       20.0h ✓
```

**Comparaison avec ÉQUILIBRÉ pour le même scénario:**
```
MODE PEPS:
    Lun: 7.5h | Mar: 7.5h | Mer: 5.0h | Jeu: 0h | Ven: 0h
    → Concentré sur les premiers jours
    
MODE ÉQUILIBRÉ:
    Lun: 4.0h | Mar: 4.0h | Mer: 4.0h | Jeu: 4.0h | Ven: 4.0h
    → Distribution uniforme sur tous les jours
```

### Caractéristiques MODE PEPS

✅ **Avantages:**
- Simple et prévisible (ordre chronologique strict)
- Maximise les jours libres en fin de période
- Utile pour planification séquentielle des tâches
- Rapide à calculer (un seul passage)

⚠️ **Particularités:**
- Concentre la charge en début de période
- Peut saturer les premiers jours disponibles
- Laisse les derniers jours vides si possible
- Distribution non équilibrée

---

## ✍️ **4. MODE MANUEL**

### Principe Fondamental
L'utilisateur spécifie **manuellement** les heures pour chaque jour. Le système valide uniquement la cohérence.

### Processus de Validation

#### **Étape 1: Validation de la somme**
```
sommeTotale = sum(repartition.heures)
SI abs(sommeTotale - heuresTotalAttendu) > 0.0001:
    → ERREUR: "Somme des heures différente des heures totales"
```

#### **Étape 2: Validation par jour**
```
POUR chaque allocation dans repartition:
    // 1. Vérifier heures positives
    SI allocation.heures < 0:
        → ERREUR: "Heures négatives interdites"
    
    // 2. Récupérer ajustements existants
    ajustements = interrogerBaseDeDonnees(
        traducteurId,
        date = allocation.date,
        EXCLURE tacheId si édition en cours
    )
    utilisées = sum(ajustements.heures)
    
    // 3. Calculer total avec nouvelle allocation
    totalJour = utilisées + allocation.heures
    
    // 4. Calculer capacité nette du jour
    capaciteNette = calculCapaciteNette(
        horaire,
        allocation.date,
        deadline si applicable
    )
    
    // 5. Vérifier non-dépassement
    SI totalJour > capaciteNette + 0.000001:
        → ERREUR: "Dépassement capacité le [date]"
```

### Exemple de Validation

**Scénario:**
- Traducteur: capacité 7.5h/jour, horaire 9h-17h
- Heures totales attendues: 15h
- Mercredi déjà 2h utilisées (autre tâche)

**Allocation manuelle proposée:**
```javascript
[
    { date: "2025-12-11", heures: 5 },   // Lundi
    { date: "2025-12-12", heures: 4 },   // Mardi
    { date: "2025-12-13", heures: 6 }    // Mercredi
]
```

**Validation:**

1. **Somme:** 5 + 4 + 6 = 15h ✓

2. **Lundi 11:**
     - Utilisées: 0h
     - Nouvelles: 5h
     - Total: 5h
     - Capacité nette: 7.5h (9h-17h moins pause = 7h, mais capacité config 7.5h)
     - 5h ≤ 7.5h ✓

3. **Mardi 12:**
     - Utilisées: 0h
     - Nouvelles: 4h
     - Total: 4h
     - Capacité nette: 7.5h
     - 4h ≤ 7.5h ✓

4. **Mercredi 13:**
     - Utilisées: 2h (autre tâche)
     - Nouvelles: 6h
     - Total: 8h
     - Capacité nette: 7.5h
     - 8h > 7.5h ✗
     - **ERREUR: "Dépassement capacité le 2025-12-13 (8.00h / 7.50h disponibles)"**

**Allocation corrigée:**
```javascript
[
    { date: "2025-12-11", heures: 6 },   // Lundi
    { date: "2025-12-12", heures: 4 },   // Mardi
    { date: "2025-12-13", heures: 5 }    // Mercredi (2h existantes + 5h = 7h)
]
```
→ Validation réussie ✓

### Caractéristiques MODE MANUEL

✅ **Avantages:**
- Contrôle total de la distribution
- Peut s'adapter à des contraintes spécifiques
- Permet des distributions non standard
- Utile pour ajustements fins

⚠️ **Contraintes:**
- Nécessite connaissance des capacités
- Risque d'erreurs humaines
- Validation stricte obligatoire
- Plus long à saisir pour grandes périodes

---

## 🔧 **RÈGLES TRANSVERSALES** (appliquées à TOUS les modes)

### 1. **Exclusion automatique de la pause midi**

```
RÈGLE: La pause 12h-13h est TOUJOURS exclue de la capacité travaillable

Exception: Si l'horaire ne chevauche pas 12h-13h
    Exemple: Horaire 15h-23h → pas de pause dans cette plage
```

**Exemples:**
```
Horaire 9h-17h:
    - Avant pause: 9h à 12h = 3h
    - Après pause: 13h à 17h = 4h
    - Total: 7h (8h brutes - 1h pause)

Horaire 7h30-15h30:
    - Avant pause: 7h30 à 12h = 4.5h
    - Après pause: 13h à 15h30 = 2.5h
    - Total: 7h

Horaire 8h-11h (matinal):
    - Pas de chevauchement pause
    - Total: 3h

Horaire 14h-18h (après-midi):
    - Pas de chevauchement pause
    - Total: 4h
```

### 2. **Gestion des weekends**

```
RÈGLE: Les weekends (samedi/dimanche) sont TOUJOURS exclus

- Aucune allocation possible sur ces jours
- businessDaysOttawa() retourne uniquement lun-ven
- Calcul de capacité: weekends ignorés automatiquement
```

### 3. **Respect de l'horaire traducteur**

```
RÈGLE: Les allocations doivent respecter l'horaire individuel du traducteur

Si horaire = "7h30-15h30":
    - Heures travaillables: UNIQUEMENT 7h30 à 15h30
    - Capacité brute: 8h
    - Capacité nette (après pause): 7h
    - Heures avant 7h30 ou après 15h30: IMPOSSIBLES

Si horaire = "9h-17h":
    - Heures travaillables: 9h à 17h
    - Capacité nette: 7h
```

**Formats d'horaire supportés:**
```
"7h30-15h30"  → 7.5h à 15.5h
"07:00-15:00" → 7.0h à 15.0h
"9h-17h"      → 9.0h à 17.0h
null/vide     → 9h-17h (défaut)
```

### 4. **Deadline avec heure précise**

```
RÈGLE: Si une deadline contient une heure précise, elle limite la capacité du jour J
             Sinon, l'heure par défaut est 17h00

Application pour TOUS les modes (JAT, ÉQUILIBRÉ, PEPS, MANUEL)

SI deadline = "2025-12-17T12:00:00"
ET jour allocation = 2025-12-17
ALORS:
    heureFinEffective = min(horaire.heureFin, 12h)

SI deadline = "2025-12-17" (pas d'heure précise)
ET jour allocation = 2025-12-17
ALORS:
    heureFinEffective = min(horaire.heureFin, 17h)
```

**Exemples:**
```
Horaire 10h-18h, deadline 14h:
    - Avant pause: 10h-12h = 2h
    - Après pause: 13h-14h = 1h
    - Total jour J: 3h (au lieu de 7h normal)

Horaire 7h30-15h30, deadline 12h:
    - Avant pause: 7h30-12h = 4.5h
    - Après pause: 0h (deadline avant 13h)
    - Total jour J: 4.5h

Horaire 9h-17h, deadline 11h:
    - Avant pause: 9h-11h = 2h
    - Après pause: 0h
    - Total jour J: 2h

Horaire 9h-18h, deadline sans heure (défaut 17h):
    - Avant pause: 9h-12h = 3h
    - Après pause: 13h-17h = 4h
    - Total jour J: 7h
```

### 5. **Ajustements existants (heures déjà allouées)**

```
RÈGLE: Avant toute allocation, les heures déjà utilisées sont soustraites

Source: Table ajustementTemps (base de données)
    - Contient toutes les allocations existantes
    - Liées à d'autres tâches déjà planifiées
    - À soustraire de la capacité disponible

Processus:
    1. Interroger ajustementTemps pour le traducteur
    2. Grouper par date
    3. Sommer les heures par jour
    4. Soustraire de la capacité nette
    5. libre = max(capaciteNette - utilisées, 0)
```

**Exemple:**
```
Jour: Mercredi 13 décembre
Horaire traducteur: 9h-17h
Capacité nette: 7h

Ajustements existants:
    - Tâche A: 3h
    - Tâche B: 2h
    - Total utilisé: 5h

Capacité libre: 7h - 5h = 2h
→ Seulement 2h peuvent être allouées pour une nouvelle tâche
```

### 6. **Précision des calculs**

```
RÈGLE: Gestion rigoureuse des arrondis pour éviter les erreurs d'accumulation

MODE ÉQUILIBRÉ:
    - Calculs en centimes (0.01h)
    - 1h = 100 centimes
    - Distribution puis reconversion en heures
    - Précision: ±0.0001h

TOUS MODES:
    - Tolérance: ±0.01h pour comparaisons flottantes
    - Validation somme: abs(somme - attendu) < 0.01h
    - Stockage: 4 décimales maximum (ex: 5.8333)
```

**Exemples de gestion de précision:**
```
35h sur 6 jours (mode ÉQUILIBRÉ):
    - 35h = 3500 centimes
    - 3500 / 6 = 583.333...
    - Base: 583 centimes
    - Reste: 3500 - (583 × 6) = 2 centimes
    
    Distribution:
        J1: 583 + 1 = 584 = 5.84h
        J2: 583 + 1 = 584 = 5.84h
        J3: 583 = 5.83h
        J4: 583 = 5.83h
        J5: 583 = 5.83h
        J6: 583 = 5.83h
        Somme: 35.00h (exact!)
```

### 7. **Ordre chronologique des résultats**

```
RÈGLE: Tous les modes retournent les résultats triés par date croissante

- MODE JAT: Calcul à rebours MAIS résultat trié chronologiquement
- MODE ÉQUILIBRÉ: Naturellement chronologique
- MODE PEPS: Naturellement chronologique
- MODE MANUEL: Trié avant retour

Raison: Cohérence pour l'affichage frontend
```

### 8. **Validation de timezone (America/Toronto)**

```
RÈGLE: Toutes les dates/heures utilisent le fuseau America/Toronto (Ottawa)

- Gestion automatique DST (Daylight Saving Time)
- EST (UTC-5) en hiver
- EDT (UTC-4) en été
- PostgreSQL stocke en UTC → conversions explicites

Fonctions utilisées:
    - normalizeToOttawa(): Dates simples
    - normalizeToOttawaWithTime(): Dates + heures
    - formatOttawaISO(): Formatage sortie
    - todayOttawa(): Date du jour
```

---

## 🧮 **CALCUL DE CAPACITÉ NETTE - Fonction clé**

Cette fonction est appelée par **TOUS** les modes pour déterminer les heures travaillables d'un jour donné.

### Signature

```typescript
function capaciteNetteJour(
    horaire: { heureDebut: number, heureFin: number },
    jourConcerne: Date,
    deadlineDateTime?: Date
): number
```

### Algorithme Complet

```
ENTRÉE:
    - horaire: { heureDebut, heureFin } en heures décimales
    - jourConcerne: Date du jour à analyser
    - deadlineDateTime: (optionnel) Deadline si le même jour

ÉTAPE 1: Déterminer l'heure de fin effective
    heureFinEffective = horaire.heureFin
    
    SI deadlineDateTime existe ET même jour que jourConcerne:
        heureDeadline = extraire_heure(deadlineDateTime)
        heureFinEffective = min(horaire.heureFin, heureDeadline)
    SINON SI pas d'heure dans deadline (date seule):
        heureFinEffective = min(horaire.heureFin, 17.0)

ÉTAPE 2: Vérifier chevauchement avec pause 12h-13h
    pauseDebut = 12.0
    pauseFin = 13.0
    
    SI heureFinEffective ≤ pauseDebut OU horaire.heureDebut ≥ pauseFin:
        // Pas de chevauchement avec la pause
        capaciteNette = max(heureFinEffective - horaire.heureDebut, 0)
        RETOURNER capaciteNette

ÉTAPE 3: Chevauchement détecté → Calculer avant et après pause
    avantPause = max(
        min(pauseDebut, heureFinEffective) - horaire.heureDebut,
        0
    )
    
    apresPause = max(
        heureFinEffective - max(pauseFin, horaire.heureDebut),
        0
    )
    
    capaciteNette = avantPause + apresPause
    RETOURNER capaciteNette
```

### Exemples Détaillés

#### **Exemple 1: Horaire standard, jour normal**
```
Horaire: 7h30-15h30 (7.5h à 15.5h)
Jour: Normal (pas de deadline)
Deadline: Aucune

Calcul:
    heureFinEffective = 15.5h
    Chevauchement pause? 7.5 < 13 ET 15.5 > 12 → OUI
    
    avantPause = min(12, 15.5) - 7.5 = 12 - 7.5 = 4.5h
    apresPause = 15.5 - max(13, 7.5) = 15.5 - 13 = 2.5h
    
    capaciteNette = 4.5h + 2.5h = 7h ✓
```

#### **Exemple 2: Jour avec deadline 14h**
```
Horaire: 7h30-15h30
Jour: Mardi 17 décembre
Deadline: Mardi 17 décembre 14h00

Calcul:
    heureFinEffective = min(15.5, 14.0) = 14.0h
    Chevauchement pause? 7.5 < 13 ET 14.0 > 12 → OUI
    
    avantPause = min(12, 14.0) - 7.5 = 12 - 7.5 = 4.5h
    apresPause = 14.0 - max(13, 7.5) = 14.0 - 13 = 1h
    
    capaciteNette = 4.5h + 1h = 5.5h ✓
```

#### **Exemple 3: Deadline avant pause**
```
Horaire: 7h30-15h30
Deadline: 11h30

Calcul:
    heureFinEffective = min(15.5, 11.5) = 11.5h
    Chevauchement pause? 11.5 ≤ 12 → NON (fin avant pause)
    
    capaciteNette = 11.5 - 7.5 = 4h ✓
```

#### **Exemple 4: Horaire matinal (pas de pause)**
```
Horaire: 7h-11h
Jour: Normal

Calcul:
    heureFinEffective = 11h
    Chevauchement pause? 11 ≤ 12 → NON (fin avant pause)
    
    capaciteNette = 11 - 7 = 4h ✓
```

#### **Exemple 5: Horaire après-midi (pas de pause)**
```
Horaire: 13h-18h
Jour: Normal

Calcul:
    heureFinEffective = 18h
    Chevauchement pause? 13 ≥ 13 → NON (début après pause)
    
    capaciteNette = 18 - 13 = 5h ✓
```

#### **Exemple 6: Deadline très tôt le matin**
```
Horaire: 7h30-15h30
Deadline: 9h00

Calcul:
    heureFinEffective = min(15.5, 9.0) = 9.0h
    Chevauchement pause? 9.0 ≤ 12 → NON
    
    capaciteNette = 9.0 - 7.5 = 1.5h ✓
```

#### **Exemple 7: Horaire englobant toute la pause**
```
Horaire: 10h-18h
Jour: Normal

Calcul:
    heureFinEffective = 18h
    Chevauchement pause? 10 < 13 ET 18 > 12 → OUI
    
    avantPause = min(12, 18) - 10 = 12 - 10 = 2h
    apresPause = 18 - max(13, 10) = 18 - 13 = 5h
    
    capaciteNette = 2h + 5h = 7h ✓
```

#### **Exemple 8: Deadline sans heure (défaut 17h)**
```
Horaire: 9h-18h
Jour: Jour J
Deadline: "2025-12-17" (pas d'heure)

Calcul:
    heureFinEffective = min(18, 17.0) = 17.0h (heure par défaut)
    Chevauchement pause? 9 < 13 ET 17 > 12 → OUI
    
    avantPause = min(12, 17) - 9 = 12 - 9 = 3h
    apresPause = 17 - max(13, 9) = 17 - 13 = 4h
    
    capaciteNette = 3h + 4h = 7h ✓
```

### Cas Limites

```
1. Deadline = heure de fin exacte:
     Horaire 9h-17h, deadline 17h
     → capaciteNette = 7h (normal, pas de limitation)

2. Deadline = début horaire:
     Horaire 9h-17h, deadline 9h
     → capaciteNette = 0h (rien à faire ce jour)

3. Horaire commence à 12h pile:
     Horaire 12h-18h
     → avantPause = 0h, apresPause = 5h
     → capaciteNette = 5h

4. Horaire finit à 13h pile:
     Horaire 8h-13h
     → avantPause = 4h, apresPause = 0h
     → capaciteNette = 4h

5. Horaire très court (< 1h):
     Horaire 11h30-12h
     → Pas de chevauchement pause
     → capaciteNette = 0.5h

6. Deadline sans heure après horaire:
     Horaire 9h-15h, deadline date seule
     → heureFinEffective = min(15, 17) = 15h
     → Pas de limitation (horaire finit avant 17h)
```

---

## 📊 **COMPARAISON DES MODES**

### Tableau Récapitulatif

| Critère | JAT | ÉQUILIBRÉ | PEPS | MANUEL |
|---------|-----|-----------|------|--------|
| **Ordre d'allocation** | À rebours (deadline vers début) | Uniforme sur tous jours | Chronologique (début vers fin) | Spécifié par utilisateur |
| **Distribution** | Variable (concentré fin) | Uniforme | Variable (concentré début) | Personnalisée |
| **Jours utilisés** | Minimum nécessaire | Tous disponibles | Minimum nécessaire | Selon saisie |
| **Flexibilité planification** | Maximale (jours début libres) | Minimale (tous occupés) | Minimale (jours fin libres) | Contrôle total |
| **Écart-type distribution** | Moyen à élevé | Minimal (quasi-nul) | Moyen à élevé | Variable |
| **Complexité calcul** | Moyenne | Élevée (centimes) | Faible | Faible (validation) |
| **Use case principal** | Deadlines serrées | Charge équitable | Tâches séquentielles | Cas spéciaux |

### Exemple Comparatif: 20h sur 5 jours (capacité 7.5h/jour)

**Données:**
- Période: Lundi à Vendredi
- Heures: 20h
- Capacité: 7.5h/jour

**Résultats par mode:**

```
MODE JAT (échéance vendredi):
    Lundi:    0h
    Mardi:    0h
    Mercredi: 5h
    Jeudi:    7.5h
    Vendredi: 7.5h
    → Concentré sur derniers jours
    
MODE ÉQUILIBRÉ:
    Lundi:    4h
    Mardi:    4h
    Mercredi: 4h
    Jeudi:    4h
    Vendredi: 4h
    → Parfaitement uniforme
    
MODE PEPS:
    Lundi:    7.5h
    Mardi:    7.5h
    Mercredi: 5h
    Jeudi:    0h
    Vendredi: 0h
    → Concentré sur premiers jours
    
MODE MANUEL (exemple):
    Lundi:    3h
    Mardi:    5h
    Mercredi: 2h
    Jeudi:    6h
    Vendredi: 4h
    → Distribution personnalisée
```

---

## 🎓 **CONCEPTS CLÉS**

### Capacité Nette vs Capacité Brute

```
Capacité BRUTE = heureFin - heureDebut
    Exemple: 17h - 9h = 8h

Capacité NETTE = capacité brute - pause - limitations
    Exemple: 8h - 1h (pause) = 7h
    Avec deadline: peut être < 7h
```

### Heures Utilisées vs Heures Libres

```
Heures UTILISÉES = sum(ajustements existants pour ce jour)
    Source: table ajustementTemps
    Représente les allocations déjà faites

Heures LIBRES = capacité nette - heures utilisées
    C'est ce qui peut encore être alloué
```

### Plages Horaires JAT

```
JOUR J (échéance):
    Allocation en DÉBUT de journée
    Heures: 10h-12h (premières heures disponibles)
    Raison: Travail menant directement à la livraison

JOURS AVANT:
    Allocation en FIN de journée  
    Heures: 15h-18h (dernières heures disponibles)
    Raison: Maximiser flexibilité en gardant débuts libres
```

### Gestion Centimes (Mode ÉQUILIBRÉ)

```
Pourquoi des centimes?
    - Éviter accumulation erreurs arrondis
    - Précision maximale distribution
    - Garantir somme exacte

Comment:
    1. Convertir heures en centimes (×100)
    2. Distribuer en nombres entiers
    3. Reconvertir en heures (÷100)
```

---

## 🔍 **DIAGNOSTICS ET ERREURS**

### Erreurs Communes

#### 1. "Capacité insuffisante"
```
Cause: heuresTotal > capacité disponible globale

Solutions:
    - Réduire heuresTotal
    - Étendre la période
    - Choisir traducteur avec plus grande capacité
    - Vérifier ajustements existants (peut-être libérer des heures)
```

#### 2. "Dépassement capacité le [date]"
```
Cause (mode MANUEL): Allocation excède capacité nette du jour

Solutions:
    - Réduire heures ce jour
    - Répartir sur d'autres jours
    - Vérifier si d'autres tâches occupent ce jour
```

#### 3. "Somme des heures différente des heures totales"
```
Cause (mode MANUEL): Total saisi ≠ heuresTotal attendu

Solution:
    - Ajuster allocations pour correspondre au total
    - Vérifier calculs manuels
```

#### 4. "Date dans le passé"
```
Cause: Tentative d'allocation sur date antérieure à aujourd'hui

Solution:
    - Utiliser dates futures uniquement
    - Vérifier timezone (America/Toronto)
```

### Debug Mode

Activer le mode debug pour diagnostiquer les problèmes:

```typescript
// Mode JAT
await repartitionJusteATemps(traducteurId, heuresTotal, dateEcheance, {
    debug: true
});

// Sortie console:
[JAT] Début: traducteurId=xxx, heuresTotal=10, dateEcheance=2025-12-17
[JAT] Traducteur: Julie-Marie, capacité=7.5h/jour
[JAT] Horaire: 10h-18h
[JAT] Fenêtre: 3 jours (2025-12-15 à 2025-12-17)
[JAT] Capacité disponible totale: 21.00h
[JAT] 2025-12-17: 7.00h allouées (10h-17h) [JOUR J - début journée]
[JAT] 2025-12-16: 3.00h allouées (15h-18h) [à rebours - fin journée]
[JAT] Répartition finale (2 jours):
    2025-12-16: 3.00h (15h-18h)
    2025-12-17: 7.00h (10h-17h)
[JAT] Total alloué: 10.00h (demandé: 10h)
```

---

## 📚 **RÉFÉRENCES TECHNIQUES**

### Fichiers Sources
- **Backend:** `/backend/src/services/repartitionService.ts`
- **Utilitaires dates:** `/backend/src/utils/dateTimeOttawa.ts`
- **Capacité:** `/backend/src/services/capaciteService.ts`
- **Tests:** `/backend/tests/qa-distribution-modes.test.ts`

### Fonctions Principales
```typescript
// Modes de distribution
repartitionJusteATemps(traducteurId, heuresTotal, dateEcheance, options?)
repartitionEquilibree(traducteurId, heuresTotal, dateDebut, dateFin)
repartitionPEPS(traducteurId, heuresTotal, dateDebut, dateFin)
validerRepartition(traducteurId, repartition, heuresTotalAttendu, ...)

// Calculs de capacité
capaciteNetteJour(horaire, jourConcerne, deadlineDateTime?)
heuresUtiliseesParJour(traducteurId, dateDebut, dateFin)
parseHoraireTraducteur(horaire)

// Gestion dates
normalizeToOttawa(input, label)
normalizeToOttawaWithTime(input, includeTime, label)
businessDaysOttawa(dateFrom, dateTo)
isWeekendOttawa(date)
```

---

## ✅ **CHECKLIST DE VALIDATION**

Lors de l'implémentation ou modification de la logique:

- [ ] Pause 12h-13h exclue systématiquement
- [ ] Weekends exclus automatiquement
- [ ] Horaire traducteur respecté
- [ ] Deadline avec heure gérée correctement (défaut 17h)
- [ ] Ajustements existants soustraits
- [ ] Calculs avec précision centimes (mode ÉQUILIBRÉ)
- [ ] Tolérance ±0.01h pour comparaisons
- [ ] Résultats triés chronologiquement
- [ ] Timezone America/Toronto partout
- [ ] Validation somme totale
- [ ] Gestion erreurs explicites
- [ ] Messages d'erreur clairs
- [ ] Tests unitaires passent
- [ ] Mode debug fonctionnel

---

**Fin de la documentation**

*Pour toute question ou clarification, consulter le code source ou les tests.*

  → Marquer hasTime = false
```

**Exemple:**
- Input: `"2025-12-17T12:00:00"` → Deadline à 12h00 le 17 décembre
- Input: `"2025-12-17"` → Deadline à 23h59 le 17 décembre (fin de journée)

#### **Étape 2: Calcul de la capacité disponible globale**
Pour chaque jour entre aujourd'hui et la deadline:
```
SI c'est un weekend (samedi/dimanche)
  → IGNORER (pas de travail)
SINON
  1. Récupérer l'horaire du traducteur (ex: "7h30-15h30")
  2. Parser en heures décimales (7.5h à 15.5h)
  3. Calculer capacité nette en tenant compte de:
     a) Horaire de début/fin
     b) Pause midi OBLIGATOIRE 12h-13h (toujours exclue)
     c) Deadline si c'est le jour J avec heure précise
  4. Soustraire les heures déjà utilisées (ajustements existants)
  5. Ajouter à la capacité disponible globale
```

**Exemple de calcul de capacité nette:**
```
Horaire traducteur: 7h30-15h30 (8h brutes)
Jour normal:
  - 7h30 à 12h00 = 4.5h
  - 13h00 à 15h30 = 2.5h
  - Total = 7h nettes (8h - 1h pause)

Jour J avec deadline 14h00:
  - 7h30 à 12h00 = 4.5h
  - 13h00 à 14h00 = 1h
  - Total = 5.5h nettes (pause exclue, limite à deadline)

Jour J avec deadline 11h30:
  - 7h30 à 11h30 = 4h
  - Pas d'heures après midi (deadline avant pause)
  - Total = 4h nettes
```

#### **Étape 3: Validation de la capacité**
```
SI heuresTotal > capacité disponible globale
  → ERREUR: "Capacité insuffisante"
  → Aucune allocation n'est faite
```

#### **Étape 4: Allocation à rebours (cœur du JAT)**
```
restant = heuresTotal
courant = date échéance
résultat = []

TANT QUE restant > 0 ET iterations < 90:
  SI courant < aujourd'hui:
    → ARRÊTER (remontée trop loin)
  
  SI weekend:
    → IGNORER ce jour
    → courant = courant - 1 jour
    → CONTINUER
  
  // Calculer capacité libre ce jour
  utilisées = heures déjà allouées à ce jour (ajustements existants)
  capaciteNette = calculCapaciteNette(horaire, courant, deadline si jour J)
  libre = max(capaciteNette - utilisées, 0)
  
  SI libre > 0:
    alloue = min(libre, restant)
    
    // RÈGLE MÉTIER CRUCIALE: Plages horaires
    SI c'est le jour J (jour d'échéance):
      → Allouer en DÉBUT DE JOURNÉE
      → heureDebut = horaire.heureDebut (ex: 7h30)
      → heureFin = heureDebut + alloue (en tenant compte de la pause)
      → Si traverse pause: ajouter 1h
      → Limiter à l'heure de deadline si précise
    SINON (jours avant):
      → Allouer en FIN DE JOURNÉE (à rebours)
      → heureFin = horaire.heureFin (ex: 15h30)
      → heureDebut = heureFin - alloue (en remontant, pause comprise)
      → Si traverse pause en remontant: soustraire 1h
    
    résultat.push({ date, heures: alloue, heureDebut, heureFin })
    restant -= alloue
  
  courant = courant - 1 jour
  iterations++

SI restant > 0:
  → ERREUR: "Impossible de répartir toutes les heures"

// Trier résultat par ordre chronologique croissant
résultat.sort((a, b) => a.date comparé à b.date)
```

### Exemple Complet JAT

**Scénario:**
- Traducteur: Julie-Marie Bissonnette
- Horaire: 10h-18h (capacité 7h nettes après pause)
- Tâche: 10 heures
- Deadline: Mardi 17 décembre 2025 à 12h00
- Aujourd'hui: Vendredi 13 décembre 2025

**Exécution:**

1. **Calcul capacités disponibles:**
   - Lundi 16 déc (jour avant): 10h-12h (2h) + 13h-18h (5h) = **7h nettes**
   - Mardi 17 déc (jour J, deadline 12h): 10h-12h (2h) = **2h nettes**
   - **Total disponible: 9h** → ERREUR! Capacité insuffisante

**Ajustons avec 9h:**

1. **Calcul capacités:**
   - Lundi 16: 7h nettes
   - Mardi 17: 2h nettes
   - Total: 9h ✓

2. **Allocation (à rebours):**

   **Jour courant: Mardi 17 (jour J)**
   - Libre: 2h
   - Alloue: min(2h, 9h) = 2h
   - **DÉBUT DE JOURNÉE:** 10h-12h
   - Restant: 7h

   **Jour courant: Lundi 16 (jour avant)**
   - Libre: 7h
   - Alloue: min(7h, 7h) = 7h
   - **FIN DE JOURNÉE (à rebours):**
     - heureFin = 18h
     - heureDebut = 18h - 7h = 11h (mais traverse pause!)
     - Ajustement pause: 11h - 1h = 10h
     - Donc: 10h-12h (2h) + 13h-18h (5h) = 7h ✓
   - Restant: 0h

3. **Résultat final (trié chronologiquement):**
```javascript
[
  { date: "2025-12-16", heures: 7, heureDebut: "10h", heureFin: "18h" },
  { date: "2025-12-17", heures: 2, heureDebut: "10h", heureFin: "12h" }
]
```

### Caractéristiques JAT

✅ **Avantages:**
- Maximise la flexibilité en laissant les premiers jours libres
- Respecte précisément les deadlines avec heure
- Alloue les heures au plus près de l'échéance
- Gère automatiquement les plages horaires (début/fin journée)

⚠️ **Particularités:**
- Distribution non uniforme (charge variable selon les jours)
- Peut concentrer beaucoup d'heures sur les derniers jours
- Nécessite une capacité suffisante proche de la deadline

---

## ⚖️ **2. MODE ÉQUILIBRÉ**

### Principe Fondamental
Distribue les heures **uniformément** sur tous les jours ouvrables de la période, en maximisant l'équité de charge.

### Paramètres
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures (ex: 35h)
- `dateDebut`: Date de début de période
- `dateFin`: Date de fin de période

### Algorithme Détaillé

#### **Étape 1: Collecte des jours disponibles**
```
jours = businessDaysOttawa(dateDebut, dateFin)
// Retourne tous les jours ouvrables (lun-ven, exclut weekends)

POUR chaque jour:
  utilisées = heures déjà allouées (ajustements existants)
  capaciteNette = calculCapaciteNette(horaire, jour, deadline si applicable)
  libre = max(capaciteNette - utilisées, 0)
  
  SI libre > 0:
    disponibilites.push({ date: jour, libre })
```

#### **Étape 2: Distribution uniforme initiale (en centimes)**
Pour une précision maximale, on travaille en centimes (1h = 100 centimes):

```
heuresCentimes = round(heuresTotal × 100)
nbJours = nombre de jours disponibles
baseParJour = floor(heuresCentimes / nbJours)
reste = heuresCentimes - (baseParJour × nbJours)

// Créer allocation initiale
POUR chaque jour (index 0 à nbJours-1):
  centimes = baseParJour
  SI reste > 0:
    centimes += 1  // Distribuer 1 centime supplémentaire
    reste -= 1
  
  allocations[index] = {
    date: jour,
    capaciteLibre: capacité disponible,
    heuresAllouees: centimes / 100,
    estContraint: false
  }
```

**Exemple:**
```
35h sur 6 jours:
  - 35h = 3500 centimes
  - Base: floor(3500 / 6) = 583 centimes = 5.83h
  - Reste: 3500 - (583 × 6) = 2 centimes
  
  Résultat initial:
    Jour 1: 583 + 1 = 584 centimes = 5.84h
    Jour 2: 583 + 1 = 584 centimes = 5.84h
    Jour 3: 583 centimes = 5.83h
    Jour 4: 583 centimes = 5.83h
    Jour 5: 583 centimes = 5.83h
    Jour 6: 583 centimes = 5.83h
    Total: 35.00h ✓
```

#### **Étape 3: Gestion des jours contraints**
```
heuresARedistribu = 0
joursContraints = []
joursLibres = []

POUR chaque allocation:
  SI heuresAllouees > capaciteLibre + 0.0001:
    // Jour contraint: ne peut pas accepter toute l'allocation
    heuresARedistribu += (heuresAllouees - capaciteLibre)
    heuresAllouees = capaciteLibre
    estContraint = true
    joursContraints.push(index)
  SINON:
    joursLibres.push(index)
```

#### **Étape 4: Redistribution sur jours non contraints**
```
SI heuresARedistribu > 0 ET joursLibres.length > 0:
  // Trier jours libres par capacité restante décroissante
  joursLibres.sort((a, b) => (capaciteB - allocB) - (capaciteA - allocA))
  
  centimesARedistribu = round(heuresARedistribu × 100)
  
  POUR chaque jour libre (dans l'ordre trié):
    SI centimesARedistribu <= 0:
      → ARRÊTER
    
    capaciteResteCentimes = round((capaciteLibre - heuresAllouees) × 100)
    
    SI capaciteResteCentimes > 0:
      aAjouter = min(capaciteResteCentimes, centimesARedistribu)
      heuresAllouees += aAjouter / 100
      centimesARedistribu -= aAjouter
```

#### **Étape 5: Construction du résultat**
```
résultat = []
POUR chaque allocation:
  résultat.push({
    date: allocation.date,
    heures: round(allocation.heuresAllouees, 4)
  })

// Validation finale
somme = sum(résultat.heures)
SI abs(somme - heuresTotal) > 0.01:
  → ERREUR: "Erreur de répartition: somme incorrecte"

RETOURNER résultat.sort((a, b) => a.date comparé à b.date)
```

### Exemple Complet MODE ÉQUILIBRÉ

**Scénario:**
- Traducteur: capacité 7.5h/jour
- Période: Lundi 11 au Vendredi 15 décembre (5 jours)
- Heures: 35h
- Contrainte: Mercredi déjà 3h utilisées

**Exécution:**

1. **Jours disponibles:**
   ```
   Lundi 11:    7.5h libre
   Mardi 12:    7.5h libre
   Mercredi 13: 7.5h - 3h = 4.5h libre
   Jeudi 14:    7.5h libre
   Vendredi 15: 7.5h libre
   Total: 34.5h disponible
   ```

2. **Distribution initiale (35h sur 5 jours):**
   ```
   Base = 35 / 5 = 7h par jour
   
   Lundi:    7h ✓ (< 7.5h)
   Mardi:    7h ✓
   Mercredi: 7h ✗ (> 4.5h libre) → CONTRAINT!
   Jeudi:    7h ✓
   Vendredi: 7h ✓
   ```

3. **Identification contraintes:**
   ```
   Mercredi: 
     - Alloué initial: 7h
     - Capacité libre: 4.5h
     - Excédent: 7h - 4.5h = 2.5h
   → Ramener à 4.5h
   → Redistribuer 2.5h sur les autres jours
   ```

4. **Redistribution (2.5h = 250 centimes):**
   ```
   Capacités restantes après allocation initiale:
   - Lundi: 7.5h - 7h = 0.5h (50 centimes)
   - Mardi: 7.5h - 7h = 0.5h (50 centimes)
   - Jeudi: 7.5h - 7h = 0.5h (50 centimes)
   - Vendredi: 7.5h - 7h = 0.5h (50 centimes)
   
   Distribution des 250 centimes:
   - Lundi: +50 centimes = 7.50h
   - Mardi: +50 centimes = 7.50h
   - Jeudi: +50 centimes = 7.50h
   - Vendredi: +50 centimes = 7.50h
   - Reste: 250 - 200 = 50 centimes
   
   Impossible! Capacité totale insuffisante (34.5h < 35h)
   → ERREUR: "Capacité insuffisante sur la période"
   ```

**Scénario corrigé avec 34.5h:**

```
Résultat final:
  Lundi:    7.50h
  Mardi:    7.50h
  Mercredi: 4.50h (contraint)
  Jeudi:    7.50h
  Vendredi: 7.50h
  Total:    34.50h ✓
```

### Caractéristiques MODE ÉQUILIBRÉ

✅ **Avantages:**
- Distribution la plus uniforme possible
- Charge de travail équitable sur toute la période
- Utilise tous les jours disponibles
- Précision maximale (calculs en centimes)

⚠️ **Particularités:**
- Peut nécessiter des ajustements si jours contraints
- Moins flexible que JAT (remplit tous les jours)
- Écart-type minimal entre les allocations journalières

---

## 📥 **3. MODE PEPS (PREMIER ENTRÉ, PREMIER SORTI)**

### Principe Fondamental
Remplit les jours **séquentiellement** depuis le début de la période jusqu'à épuisement des heures.

### Paramètres
Identiques au mode ÉQUILIBRÉ:
- `traducteurId`: Identifiant du traducteur
- `heuresTotal`: Nombre total d'heures
- `dateDebut`: Date de début de période
- `dateFin`: Date de fin de période

### Algorithme Détaillé

```
jours = businessDaysOttawa(dateDebut, dateFin)
restant = heuresTotal
résultat = []

POUR chaque jour dans jours (ordre chronologique):
  SI restant <= 0:
    → ARRÊTER (toutes les heures allouées)
  
  utilisées = heures déjà allouées ce jour
  capaciteNette = calculCapaciteNette(horaire, jour, deadline si applicable)
  libre = max(capaciteNette - utilisées, 0)
  
  SI libre <= 0:
    → CONTINUER au jour suivant
  
  alloue = min(libre, restant)
  résultat.push({ date: jour, heures: alloue })
  restant -= alloue

SI restant > 0:
  → ERREUR: "Capacité insuffisante sur la période"

RETOURNER résultat
```

### Exemple Complet MODE PEPS

**Scénario:**
- Période: Lundi 11 au Vendredi 15 décembre (5 jours)
- Capacité: 7.5h/jour
- Heures: 20h

**Exécution:**

```
Jour courant: Lundi 11
  - Libre: 7.5h
  - Restant: 20h
  - Alloue: min(7.5h, 20h) = 7.5h
  - Restant: 20h - 7.5h = 12.5h

Jour courant: Mardi 12
  - Libre: 7.5h
  - Restant: 12.5h
  - Alloue: min(7.5h, 12.5h) = 7.5h
  - Restant: 12.5h - 7.5h = 5h

Jour courant: Mercredi 13
  - Libre: 7.5h
  - Restant: 5h
  - Alloue: min(7.5h, 5h) = 5h
  - Restant: 5h - 5h = 0h → TERMINÉ

Résultat:
  Lundi 11:    7.5h
  Mardi 12:    7.5h
  Mercredi 13: 5.0h
  Total:       20.0h ✓
```

**Comparaison avec ÉQUILIBRÉ pour le même scénario:**
```
MODE PEPS:
  Lun: 7.5h | Mar: 7.5h | Mer: 5.0h | Jeu: 0h | Ven: 0h
  → Concentré sur les premiers jours
  
MODE ÉQUILIBRÉ:
  Lun: 4.0h | Mar: 4.0h | Mer: 4.0h | Jeu: 4.0h | Ven: 4.0h
  → Distribution uniforme sur tous les jours
```

### Caractéristiques MODE PEPS

✅ **Avantages:**
- Simple et prévisible (ordre chronologique strict)
- Maximise les jours libres en fin de période
- Utile pour planification séquentielle des tâches
- Rapide à calculer (un seul passage)

⚠️ **Particularités:**
- Concentre la charge en début de période
- Peut saturer les premiers jours disponibles
- Laisse les derniers jours vides si possible
- Distribution non équilibrée

---

## ✍️ **4. MODE MANUEL**

### Principe Fondamental
L'utilisateur spécifie **manuellement** les heures pour chaque jour. Le système valide uniquement la cohérence.

### Processus de Validation

#### **Étape 1: Validation de la somme**
```
sommeTotale = sum(repartition.heures)
SI abs(sommeTotale - heuresTotalAttendu) > 0.0001:
  → ERREUR: "Somme des heures différente des heures totales"
```

#### **Étape 2: Validation par jour**
```
POUR chaque allocation dans repartition:
  // 1. Vérifier heures positives
  SI allocation.heures < 0:
    → ERREUR: "Heures négatives interdites"
  
  // 2. Récupérer ajustements existants
  ajustements = interrogerBaseDeDonnees(
    traducteurId,
    date = allocation.date,
    EXCLURE tacheId si édition en cours
  )
  utilisées = sum(ajustements.heures)
  
  // 3. Calculer total avec nouvelle allocation
  totalJour = utilisées + allocation.heures
  
  // 4. Calculer capacité nette du jour
  capaciteNette = calculCapaciteNette(
    horaire,
    allocation.date,
    deadline si applicable
  )
  
  // 5. Vérifier non-dépassement
  SI totalJour > capaciteNette + 0.000001:
    → ERREUR: "Dépassement capacité le [date]"
```

### Exemple de Validation

**Scénario:**
- Traducteur: capacité 7.5h/jour, horaire 9h-17h
- Heures totales attendues: 15h
- Mercredi déjà 2h utilisées (autre tâche)

**Allocation manuelle proposée:**
```javascript
[
  { date: "2025-12-11", heures: 5 },   // Lundi
  { date: "2025-12-12", heures: 4 },   // Mardi
  { date: "2025-12-13", heures: 6 }    // Mercredi
]
```

**Validation:**

1. **Somme:** 5 + 4 + 6 = 15h ✓

2. **Lundi 11:**
   - Utilisées: 0h
   - Nouvelles: 5h
   - Total: 5h
   - Capacité nette: 7.5h (9h-17h moins pause = 7h, mais capacité config 7.5h)
   - 5h ≤ 7.5h ✓

3. **Mardi 12:**
   - Utilisées: 0h
   - Nouvelles: 4h
   - Total: 4h
   - Capacité nette: 7.5h
   - 4h ≤ 7.5h ✓

4. **Mercredi 13:**
   - Utilisées: 2h (autre tâche)
   - Nouvelles: 6h
   - Total: 8h
   - Capacité nette: 7.5h
   - 8h > 7.5h ✗
   - **ERREUR: "Dépassement capacité le 2025-12-13 (8.00h / 7.50h disponibles)"**

**Allocation corrigée:**
```javascript
[
  { date: "2025-12-11", heures: 6 },   // Lundi
  { date: "2025-12-12", heures: 4 },   // Mardi
  { date: "2025-12-13", heures: 5 }    // Mercredi (2h existantes + 5h = 7h)
]
```
→ Validation réussie ✓

### Caractéristiques MODE MANUEL

✅ **Avantages:**
- Contrôle total de la distribution
- Peut s'adapter à des contraintes spécifiques
- Permet des distributions non standard
- Utile pour ajustements fins

⚠️ **Contraintes:**
- Nécessite connaissance des capacités
- Risque d'erreurs humaines
- Validation stricte obligatoire
- Plus long à saisir pour grandes périodes

---

## 🔧 **RÈGLES TRANSVERSALES** (appliquées à TOUS les modes)

### 1. **Exclusion automatique de la pause midi**

```
RÈGLE: La pause 12h-13h est TOUJOURS exclue de la capacité travaillable

Exception: Si l'horaire ne chevauche pas 12h-13h
  Exemple: Horaire 15h-23h → pas de pause dans cette plage
```

**Exemples:**
```
Horaire 9h-17h:
  - Avant pause: 9h à 12h = 3h
  - Après pause: 13h à 17h = 4h
  - Total: 7h (8h brutes - 1h pause)

Horaire 7h30-15h30:
  - Avant pause: 7h30 à 12h = 4.5h
  - Après pause: 13h à 15h30 = 2.5h
  - Total: 7h

Horaire 8h-11h (matinal):
  - Pas de chevauchement pause
  - Total: 3h

Horaire 14h-18h (après-midi):
  - Pas de chevauchement pause
  - Total: 4h
```

### 2. **Gestion des weekends**

```
RÈGLE: Les weekends (samedi/dimanche) sont TOUJOURS exclus

- Aucune allocation possible sur ces jours
- businessDaysOttawa() retourne uniquement lun-ven
- Calcul de capacité: weekends ignorés automatiquement
```

### 3. **Respect de l'horaire traducteur**

```
RÈGLE: Les allocations doivent respecter l'horaire individuel du traducteur

Si horaire = "7h30-15h30":
  - Heures travaillables: UNIQUEMENT 7h30 à 15h30
  - Capacité brute: 8h
  - Capacité nette (après pause): 7h
  - Heures avant 7h30 ou après 15h30: IMPOSSIBLES

Si horaire = "9h-17h":
  - Heures travaillables: 9h à 17h
  - Capacité nette: 7h
```

**Formats d'horaire supportés:**
```
"7h30-15h30"  → 7.5h à 15.5h
"07:00-15:00" → 7.0h à 15.0h
"9h-17h"      → 9.0h à 17.0h
null/vide     → 9h-17h (défaut)
```

### 4. **Deadline avec heure précise**

```
RÈGLE: Si une deadline contient une heure précise, elle limite la capacité du jour J

Application pour TOUS les modes (JAT, ÉQUILIBRÉ, PEPS, MANUEL)

SI deadline = "2025-12-17T12:00:00"
ET jour allocation = 2025-12-17
ALORS:
  heureFinEffective = min(horaire.heureFin, 12h)
  
  Capacité jour J limitée jusqu'à l'heure de deadline
```

**Exemples:**
```
Horaire 10h-18h, deadline 14h:
  - Avant pause: 10h-12h = 2h
  - Après pause: 13h-14h = 1h
  - Total jour J: 3h (au lieu de 7h normal)

Horaire 7h30-15h30, deadline 12h:
  - Avant pause: 7h30-12h = 4.5h
  - Après pause: 0h (deadline avant 13h)
  - Total jour J: 4.5h

Horaire 9h-17h, deadline 11h:
  - Avant pause: 9h-11h = 2h
  - Après pause: 0h
  - Total jour J: 2h
```

### 5. **Ajustements existants (heures déjà allouées)**

```
RÈGLE: Avant toute allocation, les heures déjà utilisées sont soustraites

Source: Table ajustementTemps (base de données)
  - Contient toutes les allocations existantes
  - Liées à d'autres tâches déjà planifiées
  - À soustraire de la capacité disponible

Processus:
  1. Interroger ajustementTemps pour le traducteur
  2. Grouper par date
  3. Sommer les heures par jour
  4. Soustraire de la capacité nette
  5. libre = max(capaciteNette - utilisées, 0)
```

**Exemple:**
```
Jour: Mercredi 13 décembre
Horaire traducteur: 9h-17h
Capacité nette: 7h

Ajustements existants:
  - Tâche A: 3h
  - Tâche B: 2h
  - Total utilisé: 5h

Capacité libre: 7h - 5h = 2h
→ Seulement 2h peuvent être allouées pour une nouvelle tâche
```

### 6. **Précision des calculs**

```
RÈGLE: Gestion rigoureuse des arrondis pour éviter les erreurs d'accumulation

MODE ÉQUILIBRÉ:
  - Calculs en centimes (0.01h)
  - 1h = 100 centimes
  - Distribution puis reconversion en heures
  - Précision: ±0.0001h

TOUS MODES:
  - Tolérance: ±0.01h pour comparaisons flottantes
  - Validation somme: abs(somme - attendu) < 0.01h
  - Stockage: 4 décimales maximum (ex: 5.8333)
```

**Exemples de gestion de précision:**
```
35h sur 6 jours (mode ÉQUILIBRÉ):
  - 35h = 3500 centimes
  - 3500 / 6 = 583.333...
  - Base: 583 centimes
  - Reste: 3500 - (583 × 6) = 2 centimes
  
  Distribution:
    J1: 583 + 1 = 584 = 5.84h
    J2: 583 + 1 = 584 = 5.84h
    J3: 583 = 5.83h
    J4: 583 = 5.83h
    J5: 583 = 5.83h
    J6: 583 = 5.83h
    Somme: 35.00h (exact!)
```

### 7. **Ordre chronologique des résultats**

```
RÈGLE: Tous les modes retournent les résultats triés par date croissante

- MODE JAT: Calcul à rebours MAIS résultat trié chronologiquement
- MODE ÉQUILIBRÉ: Naturellement chronologique
- MODE PEPS: Naturellement chronologique
- MODE MANUEL: Trié avant retour

Raison: Cohérence pour l'affichage frontend
```

### 8. **Validation de timezone (America/Toronto)**

```
RÈGLE: Toutes les dates/heures utilisent le fuseau America/Toronto (Ottawa)

- Gestion automatique DST (Daylight Saving Time)
- EST (UTC-5) en hiver
- EDT (UTC-4) en été
- PostgreSQL stocke en UTC → conversions explicites

Fonctions utilisées:
  - normalizeToOttawa(): Dates simples
  - normalizeToOttawaWithTime(): Dates + heures
  - formatOttawaISO(): Formatage sortie
  - todayOttawa(): Date du jour
```

---

## 🧮 **CALCUL DE CAPACITÉ NETTE - Fonction clé**

Cette fonction est appelée par **TOUS** les modes pour déterminer les heures travaillables d'un jour donné.

### Signature

```typescript
function capaciteNetteJour(
  horaire: { heureDebut: number, heureFin: number },
  jourConcerne: Date,
  deadlineDateTime?: Date
): number
```

### Algorithme Complet

```
ENTRÉE:
  - horaire: { heureDebut, heureFin } en heures décimales
  - jourConcerne: Date du jour à analyser
  - deadlineDateTime: (optionnel) Deadline si le même jour

ÉTAPE 1: Déterminer l'heure de fin effective
  heureFinEffective = horaire.heureFin
  
  SI deadlineDateTime existe ET même jour que jourConcerne:
    heureDeadline = extraire_heure(deadlineDateTime)
    heureFinEffective = min(horaire.heureFin, heureDeadline)

ÉTAPE 2: Vérifier chevauchement avec pause 12h-13h
  pauseDebut = 12.0
  pauseFin = 13.0
  
  SI heureFinEffective ≤ pauseDebut OU horaire.heureDebut ≥ pauseFin:
    // Pas de chevauchement avec la pause
    capaciteNette = max(heureFinEffective - horaire.heureDebut, 0)
    RETOURNER capaciteNette

ÉTAPE 3: Chevauchement détecté → Calculer avant et après pause
  avantPause = max(
    min(pauseDebut, heureFinEffective) - horaire.heureDebut,
    0
  )
  
  apresPause = max(
    heureFinEffective - max(pauseFin, horaire.heureDebut),
    0
  )
  
  capaciteNette = avantPause + apresPause
  RETOURNER capaciteNette
```

### Exemples Détaillés

#### **Exemple 1: Horaire standard, jour normal**
```
Horaire: 7h30-15h30 (7.5h à 15.5h)
Jour: Normal (pas de deadline)
Deadline: Aucune

Calcul:
  heureFinEffective = 15.5h
  Chevauchement pause? 7.5 < 13 ET 15.5 > 12 → OUI
  
  avantPause = min(12, 15.5) - 7.5 = 12 - 7.5 = 4.5h
  apresPause = 15.5 - max(13, 7.5) = 15.5 - 13 = 2.5h
  
  capaciteNette = 4.5h + 2.5h = 7h ✓
```

#### **Exemple 2: Jour avec deadline 14h**
```
Horaire: 7h30-15h30
Jour: Mardi 17 décembre
Deadline: Mardi 17 décembre 14h00

Calcul:
  heureFinEffective = min(15.5, 14.0) = 14.0h
  Chevauchement pause? 7.5 < 13 ET 14.0 > 12 → OUI
  
  avantPause = min(12, 14.0) - 7.5 = 12 - 7.5 = 4.5h
  apresPause = 14.0 - max(13, 7.5) = 14.0 - 13 = 1h
  
  capaciteNette = 4.5h + 1h = 5.5h ✓
```

#### **Exemple 3: Deadline avant pause**
```
Horaire: 7h30-15h30
Deadline: 11h30

Calcul:
  heureFinEffective = min(15.5, 11.5) = 11.5h
  Chevauchement pause? 11.5 ≤ 12 → NON (fin avant pause)
  
  capaciteNette = 11.5 - 7.5 = 4h ✓
```

#### **Exemple 4: Horaire matinal (pas de pause)**
```
Horaire: 7h-11h
Jour: Normal

Calcul:
  heureFinEffective = 11h
  Chevauchement pause? 11 ≤ 12 → NON (fin avant pause)
  
  capaciteNette = 11 - 7 = 4h ✓
```

#### **Exemple 5: Horaire après-midi (pas de pause)**
```
Horaire: 13h-18h
Jour: Normal

Calcul:
  heureFinEffective = 18h
  Chevauchement pause? 13 ≥ 13 → NON (début après pause)
  
  capaciteNette = 18 - 13 = 5h ✓
```

#### **Exemple 6: Deadline très tôt le matin**
```
Horaire: 7h30-15h30
Deadline: 9h00

Calcul:
  heureFinEffective = min(15.5, 9.0) = 9.0h
  Chevauchement pause? 9.0 ≤ 12 → NON
  
  capaciteNette = 9.0 - 7.5 = 1.5h ✓
```

#### **Exemple 7: Horaire englobant toute la pause**
```
Horaire: 10h-18h
Jour: Normal

Calcul:
  heureFinEffective = 18h
  Chevauchement pause? 10 < 13 ET 18 > 12 → OUI
  
  avantPause = min(12, 18) - 10 = 12 - 10 = 2h
  apresPause = 18 - max(13, 10) = 18 - 13 = 5h
  
  capaciteNette = 2h + 5h = 7h ✓
```

### Cas Limites

```
1. Deadline = heure de fin exacte:
   Horaire 9h-17h, deadline 17h
   → capaciteNette = 7h (normal, pas de limitation)

2. Deadline = début horaire:
   Horaire 9h-17h, deadline 9h
   → capaciteNette = 0h (rien à faire ce jour)

3. Horaire commence à 12h pile:
   Horaire 12h-18h
   → avantPause = 0h, apresPause = 5h
   → capaciteNette = 5h

4. Horaire finit à 13h pile:
   Horaire 8h-13h
   → avantPause = 4h, apresPause = 0h
   → capaciteNette = 4h

5. Horaire très court (< 1h):
   Horaire 11h30-12h
   → Pas de chevauchement pause
   → capaciteNette = 0.5h
```

---

## 📊 **COMPARAISON DES MODES**

### Tableau Récapitulatif

| Critère | JAT | ÉQUILIBRÉ | PEPS | MANUEL |
|---------|-----|-----------|------|--------|
| **Ordre d'allocation** | À rebours (deadline vers début) | Uniforme sur tous jours | Chronologique (début vers fin) | Spécifié par utilisateur |
| **Distribution** | Variable (concentré fin) | Uniforme | Variable (concentré début) | Personnalisée |
| **Jours utilisés** | Minimum nécessaire | Tous disponibles | Minimum nécessaire | Selon saisie |
| **Flexibilité planification** | Maximale (jours début libres) | Minimale (tous occupés) | Minimale (jours fin libres) | Contrôle total |
| **Écart-type distribution** | Moyen à élevé | Minimal (quasi-nul) | Moyen à élevé | Variable |
| **Complexité calcul** | Moyenne | Élevée (centimes) | Faible | Faible (validation) |
| **Use case principal** | Deadlines serrées | Charge équitable | Tâches séquentielles | Cas spéciaux |

### Exemple Comparatif: 20h sur 5 jours (capacité 7.5h/jour)

**Données:**
- Période: Lundi à Vendredi
- Heures: 20h
- Capacité: 7.5h/jour

**Résultats par mode:**

```
MODE JAT (échéance vendredi):
  Lundi:    0h
  Mardi:    0h
  Mercredi: 5h
  Jeudi:    7.5h
  Vendredi: 7.5h
  → Concentré sur derniers jours
  
MODE ÉQUILIBRÉ:
  Lundi:    4h
  Mardi:    4h
  Mercredi: 4h
  Jeudi:    4h
  Vendredi: 4h
  → Parfaitement uniforme
  
MODE PEPS:
  Lundi:    7.5h
  Mardi:    7.5h
  Mercredi: 5h
  Jeudi:    0h
  Vendredi: 0h
  → Concentré sur premiers jours
  
MODE MANUEL (exemple):
  Lundi:    3h
  Mardi:    5h
  Mercredi: 2h
  Jeudi:    6h
  Vendredi: 4h
  → Distribution personnalisée
```

---

## 🎓 **CONCEPTS CLÉS**

### Capacité Nette vs Capacité Brute

```
Capacité BRUTE = heureFin - heureDebut
  Exemple: 17h - 9h = 8h

Capacité NETTE = capacité brute - pause - limitations
  Exemple: 8h - 1h (pause) = 7h
  Avec deadline: peut être < 7h
```

### Heures Utilisées vs Heures Libres

```
Heures UTILISÉES = sum(ajustements existants pour ce jour)
  Source: table ajustementTemps
  Représente les allocations déjà faites

Heures LIBRES = capacité nette - heures utilisées
  C'est ce qui peut encore être alloué
```

### Plages Horaires JAT

```
JOUR J (échéance):
  Allocation en DÉBUT de journée
  Heures: 10h-12h (premières heures disponibles)
  Raison: Travail menant directement à la livraison

JOURS AVANT:
  Allocation en FIN de journée  
  Heures: 15h-18h (dernières heures disponibles)
  Raison: Maximiser flexibilité en gardant débuts libres
```

### Gestion Centimes (Mode ÉQUILIBRÉ)

```
Pourquoi des centimes?
  - Éviter accumulation erreurs arrondis
  - Précision maximale distribution
  - Garantir somme exacte

Comment:
  1. Convertir heures en centimes (×100)
  2. Distribuer en nombres entiers
  3. Reconvertir en heures (÷100)
```

---

## 🔍 **DIAGNOSTICS ET ERREURS**

### Erreurs Communes

#### 1. "Capacité insuffisante"
```
Cause: heuresTotal > capacité disponible globale

Solutions:
  - Réduire heuresTotal
  - Étendre la période
  - Choisir traducteur avec plus grande capacité
  - Vérifier ajustements existants (peut-être libérer des heures)
```

#### 2. "Dépassement capacité le [date]"
```
Cause (mode MANUEL): Allocation excède capacité nette du jour

Solutions:
  - Réduire heures ce jour
  - Répartir sur d'autres jours
  - Vérifier si d'autres tâches occupent ce jour
```

#### 3. "Somme des heures différente des heures totales"
```
Cause (mode MANUEL): Total saisi ≠ heuresTotal attendu

Solution:
  - Ajuster allocations pour correspondre au total
  - Vérifier calculs manuels
```

#### 4. "Date dans le passé"
```
Cause: Tentative d'allocation sur date antérieure à aujourd'hui

Solution:
  - Utiliser dates futures uniquement
  - Vérifier timezone (America/Toronto)
```

### Debug Mode

Activer le mode debug pour diagnostiquer les problèmes:

```typescript
// Mode JAT
await repartitionJusteATemps(traducteurId, heuresTotal, dateEcheance, {
  debug: true
});

// Sortie console:
[JAT] Début: traducteurId=xxx, heuresTotal=10, dateEcheance=2025-12-17
[JAT] Traducteur: Julie-Marie, capacité=7.5h/jour
[JAT] Horaire: 10h-18h
[JAT] Fenêtre: 3 jours (2025-12-15 à 2025-12-17)
[JAT] Capacité disponible totale: 21.00h
[JAT] 2025-12-17: 7.00h allouées (10h-17h) [JOUR J - début journée]
[JAT] 2025-12-16: 3.00h allouées (15h-18h) [à rebours - fin journée]
[JAT] Répartition finale (2 jours):
  2025-12-16: 3.00h (15h-18h)
  2025-12-17: 7.00h (10h-17h)
[JAT] Total alloué: 10.00h (demandé: 10h)
```

---

## 📚 **RÉFÉRENCES TECHNIQUES**

### Fichiers Sources
- **Backend:** `/backend/src/services/repartitionService.ts`
- **Utilitaires dates:** `/backend/src/utils/dateTimeOttawa.ts`
- **Capacité:** `/backend/src/services/capaciteService.ts`
- **Tests:** `/backend/tests/qa-distribution-modes.test.ts`

### Fonctions Principales
```typescript
// Modes de distribution
repartitionJusteATemps(traducteurId, heuresTotal, dateEcheance, options?)
repartitionEquilibree(traducteurId, heuresTotal, dateDebut, dateFin)
repartitionPEPS(traducteurId, heuresTotal, dateDebut, dateFin)
validerRepartition(traducteurId, repartition, heuresTotalAttendu, ...)

// Calculs de capacité
capaciteNetteJour(horaire, jourConcerne, deadlineDateTime?)
heuresUtiliseesParJour(traducteurId, dateDebut, dateFin)
parseHoraireTraducteur(horaire)

// Gestion dates
normalizeToOttawa(input, label)
normalizeToOttawaWithTime(input, includeTime, label)
businessDaysOttawa(dateFrom, dateTo)
isWeekendOttawa(date)
```

---

## ✅ **CHECKLIST DE VALIDATION**

Lors de l'implémentation ou modification de la logique:

- [ ] Pause 12h-13h exclue systématiquement
- [ ] Weekends exclus automatiquement
- [ ] Horaire traducteur respecté
- [ ] Deadline avec heure gérée correctement
- [ ] Ajustements existants soustraits
- [ ] Calculs avec précision centimes (mode ÉQUILIBRÉ)
- [ ] Tolérance ±0.01h pour comparaisons
- [ ] Résultats triés chronologiquement
- [ ] Timezone America/Toronto partout
- [ ] Validation somme totale
- [ ] Gestion erreurs explicites
- [ ] Messages d'erreur clairs
- [ ] Tests unitaires passent
- [ ] Mode debug fonctionnel

---

**Fin de la documentation**

*Pour toute question ou clarification, consulter le code source ou les tests.*
