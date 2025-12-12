-- ============================================================
-- Script SQL: Réinitialisation des tâches
-- ============================================================
-- 
-- OBJECTIF: Supprimer toutes les tâches et ajustements de temps
--           tout en préservant les profils (traducteurs, clients, etc.)
--
-- ATTENTION: Cette opération est IRRÉVERSIBLE!
--            Assurez-vous d'avoir une sauvegarde si nécessaire.
--
-- UTILISATION:
--   psql $DATABASE_URL -f backend/prisma/reset-taches.sql
--
-- ============================================================

\echo '🗑️  Suppression de toutes les tâches...'
\echo ''

-- Afficher l'état avant suppression
\echo '📊 État AVANT suppression:'
SELECT 
  (SELECT COUNT(*) FROM taches) as taches,
  (SELECT COUNT(*) FROM ajustements_temps) as ajustements_temps;
\echo ''

-- Confirmation visuelle
\echo '⚠️  ATTENTION: Suppression imminente!'
\echo '   - Toutes les tâches seront supprimées'
\echo '   - Tous les ajustements de temps seront supprimés'
\echo '   - Les profils seront PRÉSERVÉS (traducteurs, clients, utilisateurs)'
\echo ''
\echo 'Appuyez sur Ctrl+C pour annuler, ou Entrée pour continuer...'
\prompt 'Continuer? (oui/non) ' confirmation

-- Suppression des ajustements de temps (par sécurité, même si cascade)
DELETE FROM ajustements_temps;

-- Suppression de toutes les tâches
DELETE FROM taches;

\echo ''
\echo '✅ Suppression terminée!'
\echo ''

-- Afficher l'état après suppression
\echo '📊 État APRÈS suppression:'
SELECT 
  (SELECT COUNT(*) FROM taches) as taches,
  (SELECT COUNT(*) FROM ajustements_temps) as ajustements_temps;
\echo ''

-- Vérifier que les profils sont préservés
\echo '✅ Profils PRÉSERVÉS:'
SELECT 
  (SELECT COUNT(*) FROM utilisateurs) as utilisateurs,
  (SELECT COUNT(*) FROM traducteurs) as traducteurs,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM sous_domaines) as sous_domaines,
  (SELECT COUNT(*) FROM paires_linguistiques) as paires_linguistiques;
\echo ''

\echo '🚀 Réinitialisation complète!'
\echo '   La base est prête pour de nouvelles tâches.'
\echo ''
