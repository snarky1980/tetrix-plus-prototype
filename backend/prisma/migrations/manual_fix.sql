-- Migration manuelle pour ajouter les champs manquants
-- À exécuter si les migrations automatiques ont échoué

-- Ajouter les nouveaux champs au modèle Traducteur (table mappée: "traducteurs")
ALTER TABLE "traducteurs" 
ADD COLUMN IF NOT EXISTS "classification" TEXT,
ADD COLUMN IF NOT EXISTS "horaire" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'traducteurs' AND column_name = 'typesTextes'
    ) THEN
        ALTER TABLE "traducteurs" RENAME COLUMN "typesTextes" TO "specialisations";
    END IF;
END $$;

ALTER TABLE "traducteurs" 
ADD COLUMN IF NOT EXISTS "specialisations" TEXT[] DEFAULT '{}';

-- Mettre à jour les enregistrements existants avec des valeurs par défaut
UPDATE "traducteurs" 
SET "classification" = 'TR2' 
WHERE "classification" IS NULL;

-- Rendre la classification obligatoire
ALTER TABLE "traducteurs" 
ALTER COLUMN "classification" SET NOT NULL;

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'traducteurs' 
ORDER BY ordinal_position;
