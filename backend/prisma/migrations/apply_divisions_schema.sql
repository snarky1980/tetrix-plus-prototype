-- Script d'application des changements de schéma pour les divisions et contrôle d'accès
-- À exécuter manuellement sur la base de données de production

-- 1. Ajouter les colonnes nom et prenom à la table utilisateurs
ALTER TABLE "utilisateurs" 
ADD COLUMN IF NOT EXISTS "nom" TEXT,
ADD COLUMN IF NOT EXISTS "prenom" TEXT;

-- 2. Créer la table divisions
CREATE TABLE IF NOT EXISTS "divisions" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- 3. Créer les index uniques pour divisions
CREATE UNIQUE INDEX IF NOT EXISTS "divisions_nom_key" ON "divisions"("nom");
CREATE UNIQUE INDEX IF NOT EXISTS "divisions_code_key" ON "divisions"("code");

-- 4. Créer la table division_access
CREATE TABLE IF NOT EXISTS "division_access" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "peutLire" BOOLEAN NOT NULL DEFAULT true,
    "peutEcrire" BOOLEAN NOT NULL DEFAULT false,
    "peutGerer" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "division_access_pkey" PRIMARY KEY ("id")
);

-- 5. Créer les index pour division_access
CREATE UNIQUE INDEX IF NOT EXISTS "division_access_utilisateurId_divisionId_key" 
ON "division_access"("utilisateurId", "divisionId");

CREATE INDEX IF NOT EXISTS "division_access_utilisateurId_idx" ON "division_access"("utilisateurId");
CREATE INDEX IF NOT EXISTS "division_access_divisionId_idx" ON "division_access"("divisionId");

-- 6. Ajouter les contraintes de clés étrangères si elles n'existent pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'division_access_utilisateurId_fkey'
    ) THEN
        ALTER TABLE "division_access" 
        ADD CONSTRAINT "division_access_utilisateurId_fkey" 
        FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'division_access_divisionId_fkey'
    ) THEN
        ALTER TABLE "division_access" 
        ADD CONSTRAINT "division_access_divisionId_fkey" 
        FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Insérer quelques divisions par défaut (optionnel)
INSERT INTO "divisions" ("id", "nom", "code", "description", "actif", "creeLe", "modifieLe")
VALUES 
    (gen_random_uuid()::text, 'Division Droit', 'DROIT', 'Division spécialisée en traduction juridique', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Division Science et Technologie', 'SCITECH', 'Division spécialisée en traduction scientifique et technique', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Division CISR', 'CISR', 'Commission de l''immigration et du statut de réfugié', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
