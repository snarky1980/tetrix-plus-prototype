-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN "nom" TEXT,
ADD COLUMN "prenom" TEXT;

-- CreateTable
CREATE TABLE "divisions" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "division_access" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "peutLire" BOOLEAN NOT NULL DEFAULT true,
    "peutEcrire" BOOLEAN NOT NULL DEFAULT false,
    "peutGerer" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "division_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "divisions_nom_key" ON "divisions"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_code_key" ON "divisions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "division_access_utilisateurId_divisionId_key" ON "division_access"("utilisateurId", "divisionId");

-- CreateIndex
CREATE INDEX "division_access_utilisateurId_idx" ON "division_access"("utilisateurId");

-- CreateIndex
CREATE INDEX "division_access_divisionId_idx" ON "division_access"("divisionId");

-- AddForeignKey
ALTER TABLE "division_access" ADD CONSTRAINT "division_access_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_access" ADD CONSTRAINT "division_access_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
