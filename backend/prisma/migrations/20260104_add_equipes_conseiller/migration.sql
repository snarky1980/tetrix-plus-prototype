-- CreateEnum: RoleEquipeConseiller
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleEquipeConseiller') THEN
        CREATE TYPE "RoleEquipeConseiller" AS ENUM ('CHEF', 'MEMBRE');
    END IF;
END$$;

-- Add EQUIPE_CONSEILLER to TypeEntiteNote enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EQUIPE_CONSEILLER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TypeEntiteNote')
    ) THEN
        ALTER TYPE "TypeEntiteNote" ADD VALUE 'EQUIPE_CONSEILLER';
    END IF;
END$$;

-- Add EQUIPE_CONSEILLER to VisibiliteNote enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EQUIPE_CONSEILLER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VisibiliteNote')
    ) THEN
        ALTER TYPE "VisibiliteNote" ADD VALUE 'EQUIPE_CONSEILLER';
    END IF;
END$$;

-- CreateTable: equipes_conseiller
CREATE TABLE IF NOT EXISTS "equipes_conseiller" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "couleur" TEXT NOT NULL DEFAULT '#8B5CF6',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creePar" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_conseiller_pkey" PRIMARY KEY ("id")
);

-- CreateTable: equipes_conseiller_membres
CREATE TABLE IF NOT EXISTS "equipes_conseiller_membres" (
    "id" TEXT NOT NULL,
    "equipeConseillerId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "role" "RoleEquipeConseiller" NOT NULL DEFAULT 'MEMBRE',
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateRetrait" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ajoutePar" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "equipes_conseiller_membres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "equipes_conseiller_nom_key" ON "equipes_conseiller"("nom");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "equipes_conseiller_code_key" ON "equipes_conseiller"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "equipes_conseiller_actif_idx" ON "equipes_conseiller"("actif");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "equipes_conseiller_membres_equipeConseillerId_idx" ON "equipes_conseiller_membres"("equipeConseillerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "equipes_conseiller_membres_utilisateurId_idx" ON "equipes_conseiller_membres"("utilisateurId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "equipes_conseiller_membres_actif_idx" ON "equipes_conseiller_membres"("actif");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "equipes_conseiller_membres_equipeConseillerId_utilisateurId_key" ON "equipes_conseiller_membres"("equipeConseillerId", "utilisateurId");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'equipes_conseiller_membres_equipeConseillerId_fkey'
    ) THEN
        ALTER TABLE "equipes_conseiller_membres" ADD CONSTRAINT "equipes_conseiller_membres_equipeConseillerId_fkey" 
        FOREIGN KEY ("equipeConseillerId") REFERENCES "equipes_conseiller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'equipes_conseiller_membres_utilisateurId_fkey'
    ) THEN
        ALTER TABLE "equipes_conseiller_membres" ADD CONSTRAINT "equipes_conseiller_membres_utilisateurId_fkey" 
        FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Add equipeConseillerId column to notes table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'equipeConseillerId'
    ) THEN
        ALTER TABLE "notes" ADD COLUMN "equipeConseillerId" TEXT;
    END IF;
END$$;

-- Add index on notes.equipeConseillerId if not exists
CREATE INDEX IF NOT EXISTS "notes_equipeConseillerId_idx" ON "notes"("equipeConseillerId");
