# Changelog - Tetrix Plus

Toutes les modifications notables du projet sont documentées ici.

---

## [2.2.0] - 2025-12-19 🔍✨

### Ajouté - Système de Détection de Conflits
- **Détection automatique de conflits** (5 types)
  - `CHEVAUCHEMENT_BLOCAGE` - Allocation chevauche un blocage
  - `DEPASSEMENT_CAPACITE` - Heures totales > capacité journalière
  - `HORS_HORAIRE` - Allocation hors des heures de travail
  - `EMPIETE_PAUSE` - Allocation chevauche la pause déjeuner
  - `ECHEANCE_IMPOSSIBLE` - Impossible de terminer avant l'échéance

- **Génération intelligente de suggestions** (3 types)
  - `REPARATION_LOCALE` - Déplacement sur autres plages (même traducteur)
  - `REATTRIBUTION` - Réassignation à un autre traducteur (jusqu'à 5 candidats)
  - `IMPOSSIBLE` - Aucune solution automatique disponible

- **Score d'impact détaillé** (0-100)
  - Heures déplacées (+1 à +20)
  - Nombre de tâches affectées (+5 par tâche)
  - Changement de traducteur (+15)
  - Risque échéance (+10 à +30)
  - Morcellement (+5 par plage)
  - Niveau: FAIBLE / MODERE / ELEVE

- **API REST complète** (5 endpoints)
  - `POST /api/conflicts/detect/allocation/:id` - Détecter conflits d'une allocation
  - `POST /api/conflicts/detect/blocage/:id` - Détecter conflits d'un blocage
  - `POST /api/conflicts/suggest` - Générer suggestions de résolution
  - `POST /api/conflicts/report/blocage/:id` - Rapport complet
  - `GET /api/conflicts/allocation/:id/full` - Analyse complète (optimisé frontend)

- **Composants React prêts à l'emploi**
  - `ConflictDetectionModal` - Modal complet avec conflits et suggestions
  - `ConflictBadge` - Badge de notification dans les listes
  - `ConflictCard` - Affichage d'un conflit
  - `SuggestionCard` - Affichage d'une suggestion avec actions

- **Documentation exhaustive**
  - `DETECTION-CONFLITS-GUIDE.md` - Guide technique complet
  - `backend/docs/API-CONFLICTS.md` - Documentation API REST
  - `frontend/INTEGRATION-CONFLICTS.md` - Guide d'intégration frontend
  - `IMPLEMENTATION-CONFLICTS-SUMMARY.md` - Récapitulatif de l'implémentation

- **Tests complets** (13 nouveaux tests)
  - 7 tests unitaires (détection + suggestions) ✅
  - 6 tests d'intégration API ✅
  - Coverage > 80% des scénarios critiques

### Technique
- Service: `backend/src/services/conflictDetectionService.ts` (967 lignes)
- Routes: `backend/src/routes/conflicts.routes.ts`
- Composants: `frontend/src/components/ConflictDetection.tsx`
- Performance: < 8s pour analyse complète
- Principe: **AUCUNE modification automatique** - Suggestions uniquement

---

## [2.1.0] - 2025-12-14 🚀

### Ajouté
- **Mode MANUEL avec suggestions automatiques**
  - Fonction `suggererHeuresManuel()` - Propose heures par défaut (le plus tôt possible)
  - Endpoint `/api/repartition/suggerer-heures` - API pour obtenir suggestions
  - Validation complète des heures précises
  - 11 nouveaux tests (236 tests au total)
  - Documentation complète: `MODE-MANUEL-GUIDE.md`

### Amélioré
- Nettoyage complet de la documentation
  - 29 fichiers archivés dans `/docs/archive/`
  - Documentation structurée et organisée
  - Index mis à jour

## [2.0.0] - 2025-12-13

### Changé
- **Heure par défaut**: 23:59:59 → 17:00:00 (fin de journée réaliste)
- **Mode JAT**: Allocation STRICTEMENT à rebours pour tous les jours
  - Avant: Jour J en début, autres jours en fin
  - Maintenant: Tous jours à rebours depuis deadline
  
### Ajouté
- **Heures précises pour tous les modes automatiques**
  - Mode JAT: `{date, heures, heureDebut, heureFin}`
  - Mode ÉQUILIBRÉ: `{date, heures, heureDebut, heureFin}`
  - Mode PEPS: `{date, heures, heureDebut, heureFin}`
- Documentation technique complète
  - `MODES-DISTRIBUTION-GUIDE.md` - Guide principal
  - `CHANGEMENTS-LOGIQUE-V2.md` - Changements détaillés
  - `RECAPITULATIF-COMPLET.md` - Vue d'ensemble

### Corrigé
- Calcul de capacité avec heure de deadline précise
- Traversée de pause midi (12h-13h) cohérente
- 225 tests passent (vs plusieurs échecs avant)

## [1.x] - Archives

Les changements antérieurs sont documentés dans:
- `/docs/archive/changelogs/CHANGELOG-2025-12-11.md`
- `/docs/archive/changelogs/CHANGELOG-CORRECTION-PAUSE-MIDI.md`
- `/docs/archive/changelogs/CHANGELOG-DEADLINE-HORAIRE.md`

---

## Format

Ce changelog suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

### Types de changements
- **Ajouté** - Nouvelles fonctionnalités
- **Changé** - Modifications de fonctionnalités existantes
- **Déprécié** - Fonctionnalités bientôt supprimées
- **Supprimé** - Fonctionnalités supprimées
- **Corrigé** - Corrections de bugs
- **Sécurité** - Corrections de vulnérabilités
