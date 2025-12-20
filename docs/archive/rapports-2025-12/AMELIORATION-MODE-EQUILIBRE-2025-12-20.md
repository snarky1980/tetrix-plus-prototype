# 🎯 Amélioration Mode ÉQUILIBRÉ - 20 décembre 2025

## 📋 Modifications Apportées

### 1. Calcul automatique des dates pour le mode ÉQUILIBRÉ

Lorsqu'un utilisateur sélectionne le mode **ÉQUILIBRÉ** et définit une date d'échéance, le système calcule automatiquement:

#### ✅ Date de début par défaut
- **Logique**: Prochain jour ouvrable (saute les weekends)
- **Fonction**: `getNextBusinessDay()` 
- **Exemple**: Si aujourd'hui est vendredi 20 déc, date de début = lundi 23 déc

#### ✅ Date de fin par défaut  
- **Logique**: Date d'échéance - 1 jour
- **Fonction**: `subDaysOttawa(dateEcheance, 1)`
- **Exemple**: Si échéance = 23 déc, date de fin = 22 déc

### 2. Nouvelle fonction utilitaire

**Fichier**: `frontend/src/utils/dateTimeOttawa.ts`

```typescript
/**
 * Obtenir le prochain jour ouvrable (saute les weekends)
 * @param fromDate Date de départ (par défaut aujourd'hui)
 * @returns Prochain jour ouvrable
 */
export function getNextBusinessDay(fromDate?: Date): Date {
  const start = fromDate || todayOttawa();
  let next = addDaysOttawa(start, 1);
  
  // Sauter les weekends
  while (isWeekendOttawa(next)) {
    next = addDaysOttawa(next, 1);
  }
  
  return next;
}
```

### 3. Hook React pour auto-complétion

**Fichier**: `frontend/src/pages/PlanificationGlobale.tsx`

```typescript
// Auto-remplir les dates pour le mode ÉQUILIBRÉ
useEffect(() => {
  if (formTache.typeRepartition === 'EQUILIBRE' && formTache.dateEcheance) {
    // Extraire la date seule si timestamp
    const dateEcheanceStr = formTache.dateEcheance.includes('T') 
      ? formTache.dateEcheance.split('T')[0] 
      : formTache.dateEcheance;
    
    // Date de début: Prochain jour ouvrable
    const nextBusinessDay = getNextBusinessDay();
    const dateDebutStr = formatOttawaISO(nextBusinessDay);
    
    // Date de fin: Échéance - 1 jour
    const dateEcheance = parseOttawaDateISO(dateEcheanceStr);
    const dateFinObj = subDaysOttawa(dateEcheance, 1);
    const dateFinStr = formatOttawaISO(dateFinObj);
    
    setFormTache(prev => ({
      ...prev,
      dateDebut: dateDebutStr,
      dateFin: dateFinStr
    }));
  }
}, [formTache.typeRepartition, formTache.dateEcheance]);
```

---

## 🎬 Flux Utilisateur

### Avant (Manuel)
1. Utilisateur sélectionne mode ÉQUILIBRÉ
2. Utilisateur saisit échéance: 30 déc 2025 à 16:00
3. ❌ Utilisateur doit **manuellement** saisir date début (ex: 23 déc)
4. ❌ Utilisateur doit **manuellement** saisir date fin (ex: 29 déc)

### Après (Automatique) ✅
1. Utilisateur sélectionne mode ÉQUILIBRÉ
2. Utilisateur saisit échéance: 30 déc 2025 à 16:00
3. ✅ **Système calcule automatiquement**:
   - Date début = 23 déc (prochain jour ouvrable)
   - Date fin = 29 déc (échéance - 1)
4. Utilisateur peut modifier si nécessaire

---

## 📊 Exemples de Calcul

### Exemple 1: Semaine normale
```
Aujourd'hui: Mercredi 18 déc 2025
Échéance saisie: Lundi 23 déc 2025 à 17:00

→ Date début: Jeudi 19 déc (prochain jour ouvrable)
→ Date fin: Dimanche 22 déc (23 - 1 jour)
```

### Exemple 2: Weekend intermédiaire
```
Aujourd'hui: Vendredi 20 déc 2025
Échéance saisie: Mercredi 25 déc 2025 à 14:00

→ Date début: Lundi 23 déc (saute sam 21 + dim 22)
→ Date fin: Mardi 24 déc (25 - 1 jour)
```

### Exemple 3: Échéance longue
```
Aujourd'hui: Vendredi 20 déc 2025
Échéance saisie: Vendredi 10 jan 2026 à 17:00

→ Date début: Lundi 23 déc (prochain jour ouvrable)
→ Date fin: Jeudi 9 jan 2026 (10 jan - 1 jour)
```

---

## ✅ Avantages

1. **Gain de temps**: Utilisateur n'a plus à calculer manuellement
2. **Moins d'erreurs**: Le système évite les weekends automatiquement
3. **Cohérence**: Les dates sont toujours logiques par rapport à l'échéance
4. **Flexibilité**: Les dates auto-remplies peuvent être modifiées si nécessaire

---

## 🔧 Fichiers Modifiés

1. **frontend/src/utils/dateTimeOttawa.ts**
   - Ajout fonction `getNextBusinessDay()`

2. **frontend/src/pages/PlanificationGlobale.tsx**
   - Import de `getNextBusinessDay` et `subDaysOttawa`
   - Ajout useEffect pour auto-complétion des dates

---

## 🧪 Tests à Effectuer

- [ ] Mode ÉQUILIBRÉ avec échéance en semaine
- [ ] Mode ÉQUILIBRÉ avec échéance un lundi (début devrait être mardi)
- [ ] Mode ÉQUILIBRÉ créé un vendredi (début devrait être lundi suivant)
- [ ] Vérifier que les dates peuvent être modifiées manuellement
- [ ] Vérifier que l'heure de l'échéance est modifiable (déjà fonctionnel via DateTimeInput)

---

**Auteur**: GitHub Copilot  
**Date**: 20 décembre 2025  
**Statut**: ✅ Implémenté
