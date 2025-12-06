-- Migration: Ajouter classification et horaire
-- AlterTable
ALTER TABLE "Traducteur" 
ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'TR2',
ADD COLUMN "horaire" TEXT;
