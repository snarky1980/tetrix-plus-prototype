-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONSEILLER', 'TRADUCTEUR');

-- CreateEnum
CREATE TYPE "StatutTache" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE');

-- CreateEnum
CREATE TYPE "TypeAjustement" AS ENUM ('TACHE', 'BLOCAGE');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TRADUCTEUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traducteurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "domaines" TEXT[],
    "clientsHabituels" TEXT[],
    "capaciteHeuresParJour" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "utilisateurId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traducteurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paires_linguistiques" (
    "id" TEXT NOT NULL,
    "langueSource" TEXT NOT NULL,
    "langueCible" TEXT NOT NULL,
    "traducteurId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paires_linguistiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sousDomaines" TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sous_domaines" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "domaineParent" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sous_domaines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taches" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heuresTotal" DOUBLE PRECISION NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutTache" NOT NULL DEFAULT 'PLANIFIEE',
    "traducteurId" TEXT NOT NULL,
    "clientId" TEXT,
    "sousDomaineId" TEXT,
    "paireLinguistiqueId" TEXT NOT NULL,
    "creePar" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustements_temps" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "heures" DOUBLE PRECISION NOT NULL,
    "type" "TypeAjustement" NOT NULL,
    "traducteurId" TEXT NOT NULL,
    "tacheId" TEXT,
    "creePar" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustements_temps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "traducteurs_utilisateurId_key" ON "traducteurs"("utilisateurId");

-- CreateIndex
CREATE INDEX "traducteurs_division_idx" ON "traducteurs"("division");

-- CreateIndex
CREATE INDEX "traducteurs_actif_idx" ON "traducteurs"("actif");

-- CreateIndex
CREATE INDEX "paires_linguistiques_langueSource_langueCible_idx" ON "paires_linguistiques"("langueSource", "langueCible");

-- CreateIndex
CREATE UNIQUE INDEX "paires_linguistiques_traducteurId_langueSource_langueCible_key" ON "paires_linguistiques"("traducteurId", "langueSource", "langueCible");

-- CreateIndex
CREATE UNIQUE INDEX "clients_nom_key" ON "clients"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "sous_domaines_nom_key" ON "sous_domaines"("nom");

-- CreateIndex
CREATE INDEX "taches_traducteurId_idx" ON "taches"("traducteurId");

-- CreateIndex
CREATE INDEX "taches_dateEcheance_idx" ON "taches"("dateEcheance");

-- CreateIndex
CREATE INDEX "taches_statut_idx" ON "taches"("statut");

-- CreateIndex
CREATE INDEX "ajustements_temps_traducteurId_date_idx" ON "ajustements_temps"("traducteurId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ajustements_temps_traducteurId_date_tacheId_type_key" ON "ajustements_temps"("traducteurId", "date", "tacheId", "type");

-- AddForeignKey
ALTER TABLE "traducteurs" ADD CONSTRAINT "traducteurs_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paires_linguistiques" ADD CONSTRAINT "paires_linguistiques_traducteurId_fkey" FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_traducteurId_fkey" FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_sousDomaineId_fkey" FOREIGN KEY ("sousDomaineId") REFERENCES "sous_domaines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_paireLinguistiqueId_fkey" FOREIGN KEY ("paireLinguistiqueId") REFERENCES "paires_linguistiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustements_temps" ADD CONSTRAINT "ajustements_temps_traducteurId_fkey" FOREIGN KEY ("traducteurId") REFERENCES "traducteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustements_temps" ADD CONSTRAINT "ajustements_temps_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
