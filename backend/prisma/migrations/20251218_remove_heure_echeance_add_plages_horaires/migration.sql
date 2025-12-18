-- Migration: remove_heure_echeance_add_plages_horaires
-- Date: 2025-12-18
-- Description: 
--   1. Supprime le champ redondant heureEcheance de la table taches
--   2. Ajoute heureDebut et heureFin à ajustements_temps pour traçabilité complète

-- Étape 1: Supprimer heureEcheance de taches (redondant, jamais utilisé dans les calculs)
ALTER TABLE "taches" DROP COLUMN IF EXISTS "heureEcheance";

-- Étape 2: Ajouter plages horaires à ajustements_temps
ALTER TABLE "ajustements_temps" ADD COLUMN IF NOT EXISTS "heureDebut" TEXT;
ALTER TABLE "ajustements_temps" ADD COLUMN IF NOT EXISTS "heureFin" TEXT;

-- Note: Les colonnes sont nullable pour permettre la rétro-compatibilité
-- Les ajustements existants auront heureDebut/heureFin = NULL
-- Les nouveaux ajustements les renseigneront systématiquement
