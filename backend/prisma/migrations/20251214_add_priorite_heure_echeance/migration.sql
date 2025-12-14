-- AlterTable
ALTER TABLE "taches" ADD COLUMN IF NOT EXISTS "priorite" TEXT NOT NULL DEFAULT 'REGULIER';
ALTER TABLE "taches" ADD COLUMN IF NOT EXISTS "heureEcheance" TEXT NOT NULL DEFAULT '17:00';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "taches_priorite_idx" ON "taches"("priorite");
