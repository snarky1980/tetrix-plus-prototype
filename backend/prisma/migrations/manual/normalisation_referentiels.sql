-- Migration: Normalisation des référentiels
-- Date: 2024-01-04
-- Description: Crée les tables normalisées pour langues, spécialisations, domaines
--              et les tables de jonction many-to-many

-- ============================================
-- 1. TABLES RÉFÉRENTIELS PRINCIPALES
-- ============================================

-- Table des langues
CREATE TABLE IF NOT EXISTS "langues" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "langues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "langues_code_key" ON "langues"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "langues_nom_key" ON "langues"("nom");
CREATE INDEX IF NOT EXISTS "langues_actif_idx" ON "langues"("actif");

-- Table des spécialisations
CREATE TABLE IF NOT EXISTS "specialisations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "specialisations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "specialisations_nom_key" ON "specialisations"("nom");
CREATE INDEX IF NOT EXISTS "specialisations_actif_idx" ON "specialisations"("actif");

-- Table des domaines (parents des sous-domaines)
CREATE TABLE IF NOT EXISTS "domaines" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "domaines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "domaines_nom_key" ON "domaines"("nom");
CREATE INDEX IF NOT EXISTS "domaines_actif_idx" ON "domaines"("actif");

-- ============================================
-- 2. TABLES DE JONCTION (MANY-TO-MANY)
-- ============================================

-- Traducteur <-> Spécialisation
CREATE TABLE IF NOT EXISTS "traducteur_specialisations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "traducteurId" TEXT NOT NULL,
    "specialisationId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traducteur_specialisations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "traducteur_specialisations_traducteurId_specialisationId_key" 
    ON "traducteur_specialisations"("traducteurId", "specialisationId");
CREATE INDEX IF NOT EXISTS "traducteur_specialisations_traducteurId_idx" 
    ON "traducteur_specialisations"("traducteurId");
CREATE INDEX IF NOT EXISTS "traducteur_specialisations_specialisationId_idx" 
    ON "traducteur_specialisations"("specialisationId");

ALTER TABLE "traducteur_specialisations" 
    ADD CONSTRAINT "traducteur_specialisations_traducteurId_fkey" 
    FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "traducteur_specialisations" 
    ADD CONSTRAINT "traducteur_specialisations_specialisationId_fkey" 
    FOREIGN KEY ("specialisationId") REFERENCES "specialisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Traducteur <-> Domaine
CREATE TABLE IF NOT EXISTS "traducteur_domaines" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "traducteurId" TEXT NOT NULL,
    "domaineId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traducteur_domaines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "traducteur_domaines_traducteurId_domaineId_key" 
    ON "traducteur_domaines"("traducteurId", "domaineId");
CREATE INDEX IF NOT EXISTS "traducteur_domaines_traducteurId_idx" 
    ON "traducteur_domaines"("traducteurId");
CREATE INDEX IF NOT EXISTS "traducteur_domaines_domaineId_idx" 
    ON "traducteur_domaines"("domaineId");

ALTER TABLE "traducteur_domaines" 
    ADD CONSTRAINT "traducteur_domaines_traducteurId_fkey" 
    FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "traducteur_domaines" 
    ADD CONSTRAINT "traducteur_domaines_domaineId_fkey" 
    FOREIGN KEY ("domaineId") REFERENCES "domaines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Traducteur <-> Division (relation normalisée)
CREATE TABLE IF NOT EXISTS "traducteur_divisions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "traducteurId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traducteur_divisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "traducteur_divisions_traducteurId_divisionId_key" 
    ON "traducteur_divisions"("traducteurId", "divisionId");
CREATE INDEX IF NOT EXISTS "traducteur_divisions_traducteurId_idx" 
    ON "traducteur_divisions"("traducteurId");
CREATE INDEX IF NOT EXISTS "traducteur_divisions_divisionId_idx" 
    ON "traducteur_divisions"("divisionId");

ALTER TABLE "traducteur_divisions" 
    ADD CONSTRAINT "traducteur_divisions_traducteurId_fkey" 
    FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "traducteur_divisions" 
    ADD CONSTRAINT "traducteur_divisions_divisionId_fkey" 
    FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Traducteur <-> Client (clients habituels)
CREATE TABLE IF NOT EXISTS "traducteur_clients" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "traducteurId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traducteur_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "traducteur_clients_traducteurId_clientId_key" 
    ON "traducteur_clients"("traducteurId", "clientId");
CREATE INDEX IF NOT EXISTS "traducteur_clients_traducteurId_idx" 
    ON "traducteur_clients"("traducteurId");
CREATE INDEX IF NOT EXISTS "traducteur_clients_clientId_idx" 
    ON "traducteur_clients"("clientId");

ALTER TABLE "traducteur_clients" 
    ADD CONSTRAINT "traducteur_clients_traducteurId_fkey" 
    FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "traducteur_clients" 
    ADD CONSTRAINT "traducteur_clients_clientId_fkey" 
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 3. MODIFICATION TABLE SOUS_DOMAINES
-- ============================================

-- Ajouter colonnes FK si elles n'existent pas
ALTER TABLE "sous_domaines" ADD COLUMN IF NOT EXISTS "domaineId" TEXT;
ALTER TABLE "sous_domaines" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Ajouter les FK
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sous_domaines_domaineId_fkey'
    ) THEN
        ALTER TABLE "sous_domaines" 
            ADD CONSTRAINT "sous_domaines_domaineId_fkey" 
            FOREIGN KEY ("domaineId") REFERENCES "domaines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sous_domaines_clientId_fkey'
    ) THEN
        ALTER TABLE "sous_domaines" 
            ADD CONSTRAINT "sous_domaines_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "sous_domaines_domaineId_idx" ON "sous_domaines"("domaineId");
CREATE INDEX IF NOT EXISTS "sous_domaines_clientId_idx" ON "sous_domaines"("clientId");

-- ============================================
-- 4. DONNÉES INITIALES: LANGUES
-- ============================================

INSERT INTO "langues" ("code", "nom") VALUES 
    ('FR', 'Français'),
    ('EN', 'Anglais'),
    ('ES', 'Espagnol'),
    ('DE', 'Allemand'),
    ('IT', 'Italien'),
    ('PT', 'Portugais'),
    ('NL', 'Néerlandais'),
    ('PL', 'Polonais'),
    ('RU', 'Russe'),
    ('ZH', 'Chinois'),
    ('JA', 'Japonais'),
    ('KO', 'Coréen'),
    ('AR', 'Arabe')
ON CONFLICT ("code") DO NOTHING;

-- ============================================
-- 5. MARQUER LA MIGRATION DANS _prisma_migrations
-- ============================================

INSERT INTO "_prisma_migrations" (
    "id", 
    "checksum", 
    "finished_at", 
    "migration_name", 
    "logs", 
    "rolled_back_at", 
    "started_at", 
    "applied_steps_count"
) VALUES (
    gen_random_uuid()::TEXT,
    'normalisation_referentiels_manual_20240104',
    NOW(),
    '20240104_normalisation_referentiels',
    NULL,
    NULL,
    NOW(),
    1
) ON CONFLICT DO NOTHING;

-- FIN
