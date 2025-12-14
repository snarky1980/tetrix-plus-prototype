# Journal des modifications - 11 décembre 2025

## Vue d'ensemble
Session de corrections et d'améliorations UX/UI avec focus sur la gestion des dates, le formatage automatique et la cohérence de l'interface.

---

## 🕐 Corrections timezone et dates

### 1. Fix timezone frontend - Calendrier affichant la bonne date
**Problème:** Le calendrier affichait le 10 décembre au lieu du 11 décembre à 6h56 AM (heure d'Ottawa)  
**Cause:** Frontend utilisait `new Date()` qui retourne l'heure locale du navigateur au lieu de l'heure d'Ottawa  
**Solution:**
- Créé `/frontend/src/utils/dateTimeOttawa.ts` avec API complète de gestion timezone
- Fonctions: `nowOttawa()`, `todayOttawa()`, `formatOttawaISO()`, `parseOttawaDateISO()`, `addDaysOttawa()`, `isWeekendOttawa()`, etc.
- Refactorisé `PlanificationGlobale.tsx` : tous les `new Date()` remplacés par équivalents timezone-aware
- Le calendrier surligne maintenant correctement "aujourd'hui" selon le timezone America/Toronto

**Fichiers modifiés:**
- `frontend/src/utils/dateTimeOttawa.ts` (CRÉÉ - 126 lignes)
- `frontend/src/pages/PlanificationGlobale.tsx` (50+ remplacements)

**Commit:** `bba4248` - "fix: Frontend timezone awareness - calendar shows correct today in Ottawa TZ"

---

### 2. Fix affichage "Invalid Date" partout
**Problème:** Échéances affichées comme "Invalid Date" dans les modals et listes  
**Cause:** Utilisation de `.toLocaleDateString('fr-CA')` sans validation sur des dates potentiellement invalides  
**Solution:**
- Ajouté `formatDateDisplay()` aux imports du module dateTimeOttawa
- Remplacé tous les `parseISODate().toLocaleDateString()` par `formatDateDisplay(parseISODate())`
- Ajouté protections null: `tache.dateEcheance ? formatDateDisplay(...) : 'Non définie'`
- Dates maintenant affichées en format français lisible: "11 déc. 2025"

**Zones corrigées:**
- Aperçu création de tâche
- Modal traducteur (liste tâches)
- Grille de planification
- Modal détails tâche
- Tableaux d'ajustements de temps
- Preview JAT

**Fichiers modifiés:**
- `frontend/src/pages/PlanificationGlobale.tsx` (7 sections)

**Commit:** `1236394` - "fix: Replace Invalid Date displays with formatted dates"

---

### 3. Fix erreur 400 en mode JAT (Juste-à-temps)
**Problème:** Erreur "Request failed with status code 400" lors de la création de tâches en mode JAT  
**Cause:** Backend faisait `new Date(dateEcheance)` sur une string, créant un objet Date en UTC qui pouvait sembler être dans le passé selon le timezone  
**Solution:**
- Passer la string `dateEcheance` directement à `repartitionJusteATemps()`
- Laisser `normalizeToOttawa()` gérer la conversion correcte avec le bon timezone
- Ajout de logs d'erreur détaillés pour debugging
- Appliqué à `creerTache` et `mettreAJourTache`

**Exemple du problème résolu:**
```
Avant: "2025-12-19" → new Date() → 2025-12-19T00:00:00Z (UTC) → 2025-12-18 19:00 EST → "date dans le passé!"
Après: "2025-12-19" → normalizeToOttawa() → 2025-12-19 00:00 EST → valide ✓
```

**Fichiers modifiés:**
- `backend/src/controllers/tacheController.ts`

**Commit:** `4c3db10` - "fix: JAT timezone handling - pass string to repartitionJusteATemps"

---

## ✨ Améliorations UX/UI

### 4. Formatage automatique des numéros de projet
**Fonctionnalité:** Format automatique `123-4567-001` pendant la saisie  
**Implémentation:**
- Créé `/frontend/src/utils/formatters.ts` avec fonction `formatNumeroProjet()`
- Accepte seulement les chiffres, ajoute tirets automatiquement
- Format: 3 chiffres - 4 chiffres - 3 chiffres (max 10 chiffres + 2 tirets)
- Appliqué aux formulaires création et édition de tâches
- Placeholder mis à jour: "123-4567-001"

**Comportement:**
- Utilisateur tape: `1234567001`
- Affichage automatique: `123-4567-001`

**Fichiers modifiés:**
- `frontend/src/utils/formatters.ts` (CRÉÉ - 54 lignes)
- `frontend/src/pages/PlanificationGlobale.tsx` (2 champs)

**Commit:** `fec4a3a` - "feat: Auto-format project numbers to 123-4567-001 pattern"

---

### 5. Harmonisation formulaires création et édition
**Problème:** Formulaire d'édition avait un style différent du formulaire de création  
**Solution:** Uniformisé les deux formulaires avec le style "bleu"

**Changements:**
- Section "Informations obligatoires" avec fond bleu (`bg-blue-50 border-2 border-blue-300`)
- Labels en gras avec astérisques rouges pour champs requis
- Section "Informations optionnelles" plus discrète (gris)
- Modes de répartition avec cartes stylisées
  - Bordure bleue `#3b82f6` quand sélectionné
  - Effet hover `hover:bg-blue-50`
  - Icônes et descriptions détaillées (📊 JAT, 🔄 PEPS, ⚖️ Équilibré, ✍️ Manuel)

**Impact:** Les deux chemins (Charge de travail → Créer / Planificateur → Éditer) ont maintenant le même look

**Fichiers modifiés:**
- `frontend/src/pages/PlanificationGlobale.tsx`

**Commit:** `12d87af` - "feat: Harmonize edit and create task forms with blue styling"

---

### 6. Clarification champs optionnels
**Amélioration:** Ajout du label "(optionnel)" en gris aux champs non requis  
**Champs mis à jour:**
- Client
- Sous-domaine
- Spécialisation
- Paire linguistique (déjà présent)
- Commentaire (déjà présent)

**Style:** `<span className="text-gray-500 text-xs">(optionnel)</span>`

**Fichiers modifiés:**
- `frontend/src/pages/PlanificationGlobale.tsx`

**Commit:** `e918b43` - "feat: Add (optionnel) label to Client, Sous-domaine, Spécialisation fields"

---

### 7. Terminologie: "Vue" → "Portrait"
**Changement:** Remplacement du terme "Vue" par "Portrait" dans toute l'interface  
**Justification:** Terme plus intuitif pour les configurations sauvegardées

**Modifications:**
- "Vues sauvegardées" → "Portraits sauvegardés"
- "📌 Vues (X)" → "📌 Portraits (X)"
- "Nom de la vue..." → "Nom du portrait..."
- "Aucune vue sauvegardée" → "Aucun portrait sauvegardé"
- "Statistiques basées sur la vue actuelle" → "Statistiques basées sur le portrait actuel"
- "📈 Vue d'ensemble" → "📈 Portrait d'ensemble"

**Fichiers modifiés:**
- `frontend/src/pages/PlanificationGlobale.tsx`

**Commit:** `81e666a` - "feat: Replace 'Vue' with 'Portrait' throughout UI"

---

## 📊 Résumé technique

### Commits
- 7 commits déployés avec succès
- Frontend: 6 déploiements sur GitHub Pages
- Backend: 1 déploiement sur Render

### Fichiers créés
1. `frontend/src/utils/dateTimeOttawa.ts` - Module timezone Ottawa (126 lignes)
2. `frontend/src/utils/formatters.ts` - Utilitaires formatage (54 lignes)

### Fichiers modifiés
1. `frontend/src/pages/PlanificationGlobale.tsx` - Composant principal (multiples sections)
2. `backend/src/controllers/tacheController.ts` - Gestion création/édition tâches

### Technologies utilisées
- date-fns-tz v3.x (gestion timezone)
- TypeScript (typage fort)
- React 18 (frontend)
- Prisma (backend ORM)

### Tests effectués
- ✅ Compilation TypeScript frontend
- ✅ Compilation TypeScript backend  
- ✅ Build production Vite
- ✅ Déploiements GitHub Actions
- ✅ Déploiement Render (backend)

---

## 🌐 Environnement

**Frontend:** https://snarky1980.github.io/tetrix-plus-prototype/  
**Backend:** https://tetrix-plus-backend.onrender.com  
**Timezone:** America/Toronto (EST/EDT avec DST automatique)  
**Date session:** 11 décembre 2025

---

## 📝 Notes importantes

1. **Timezone critique:** Tous les calculs de dates doivent maintenant utiliser les fonctions du module `dateTimeOttawa.ts`
2. **Format projet standardisé:** 123-4567-001 (automatique dans les formulaires)
3. **Cohérence UI:** Les deux formulaires (création/édition) sont maintenant identiques visuellement
4. **Gestion erreurs:** Logs améliorés pour le debugging des erreurs JAT
5. **Terminologie:** "Portrait" est maintenant le terme officiel pour les vues sauvegardées

---

## 🔜 Améliorations futures possibles

1. Validation format numéro projet côté backend
2. Tests unitaires pour dateTimeOttawa.ts
3. Tests e2e pour vérifier timezone dans différents fuseaux horaires
4. Documentation utilisateur sur les modes de répartition
5. Export/import de portraits sauvegardés
