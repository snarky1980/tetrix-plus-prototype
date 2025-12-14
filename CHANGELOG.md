# Changelog - Tetrix Plus

Toutes les modifications notables du projet sont documentées ici.

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
