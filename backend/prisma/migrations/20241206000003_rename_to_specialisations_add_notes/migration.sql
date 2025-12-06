-- Migration: Renommer typesTextes en specialisations et ajouter notes

-- Renommer la colonne
ALTER TABLE "Traducteur" RENAME COLUMN "typesTextes" TO "specialisations";

-- Ajouter notes
ALTER TABLE "Traducteur" ADD COLUMN "notes" TEXT;
