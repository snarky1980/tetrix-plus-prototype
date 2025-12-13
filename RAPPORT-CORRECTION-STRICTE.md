# Rapport de Correction : Conformité Stricte des Modes de Répartition

## 🎯 Objectif
Aligner tous les modes de répartition (`Équilibré`, `PEPS`, `Validation Manuelle`) sur les règles strictes déjà respectées par le mode `JAT` :
1.  **Capacité Nette** : Utiliser la capacité réelle (Horaire - Pause) et non la capacité théorique.
2.  **Horaire Strict** : Respecter les bornes de début et de fin de journée.
3.  **Pause Midi** : Exclure impérativement la plage 12h-13h.

## 🛠️ Corrections Appliquées

### 1. Refonte de `repartitionEquilibree`
*   **Avant** : Utilisait `traducteur.capaciteHeuresParJour` (ex: 7.5h) comme limite absolue.
*   **Après** : Calcule désormais `capaciteNetteJour(horaire, date)` pour chaque jour.
*   **Impact** : Si un traducteur a un horaire 09h-17h (8h amplitude), la capacité disponible est maintenant de **7h** (8h - 1h pause), et non plus 7.5h.

### 2. Refonte de `repartitionPEPS`
*   **Avant** : Remplissait les jours jusqu'à `traducteur.capaciteHeuresParJour`.
*   **Après** : Remplit jusqu'à `capaciteNetteJour(horaire, date)`.
*   **Impact** : Empêche le débordement sur la pause midi ou après la fin de journée.

### 3. Refonte de `validerRepartition`
*   **Avant** : Validait si `Total <= capaciteHeuresParJour`.
*   **Après** : Valide si `Total <= capaciteNetteJour(horaire, date)`.
*   **Impact** : Rejette toute saisie manuelle qui violerait la pause midi ou l'horaire, même si le total d'heures semble correct.

## ✅ Validation

### Tests de Non-Régression
*   **Total Tests** : 233 tests exécutés.
*   **Résultat** : 100% de succès (232 passés, 1 ignoré).

### Tests de Conformité Stricte (Nouveaux)
Un fichier de test dédié (`tests/strict-compliance.test.ts`) a été créé pour prouver la correction :
1.  **Scénario** : Traducteur avec capacité théorique 7.5h mais horaire 08h-16h (7h net).
2.  **Test** : Demande d'allocation de 7.5h.
3.  **Résultat** :
    *   `repartitionEquilibree` : Rejette (Correct).
    *   `repartitionPEPS` : Rejette (Correct).
    *   `validerRepartition` : Invalide (Correct).

## 📝 Notes pour la Migration
Les tests existants qui s'appuyaient sur une capacité "floue" (ex: 7.5h disponible sur un horaire 9h-17h) ont été mis à jour pour refléter la réalité physique (7h net). Cela garantit que le système ne promettra plus jamais de capacité impossible à honorer.
