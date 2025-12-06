-- Migration manuelle pour ajouter les champs manquants
-- À exécuter si les migrations automatiques ont échoué

-- Ajouter les nouveaux champs au modèle Traducteur
ALTER TABLE "Traducteur" 
ADD COLUMN IF NOT EXISTS "classification" TEXT,
ADD COLUMN IF NOT EXISTS "horaire" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Renommer typesTextes en specialisations (si la colonne existe)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Traducteur' AND column_name = 'typesTextes'
    ) THEN
        ALTER TABLE "Traducteur" RENAME COLUMN "typesTextes" TO "specialisations";
    END IF;
END $$;

-- Ajouter la colonne specialisations si elle n'existe pas
ALTER TABLE "Traducteur" 
ADD COLUMN IF NOT EXISTS "specialisations" TEXT[] DEFAULT '{}';

-- Mettre à jour les enregistrements existants avec des valeurs par défaut
UPDATE "Traducteur" 
SET "classification" = 'TR2' 
WHERE "classification" IS NULL;

-- Rendre la classification obligatoire
ALTER TABLE "Traducteur" 
ALTER COLUMN "classification" SET NOT NULL;

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Traducteur' 
ORDER BY ordinal_position;
