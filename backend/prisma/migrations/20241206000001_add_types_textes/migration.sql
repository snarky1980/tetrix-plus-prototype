-- CreateEnum
-- Migration: Ajouter typesTextes aux traducteurs

-- AlterTable
ALTER TABLE "Traducteur" ADD COLUMN "typesTextes" TEXT[] DEFAULT ARRAY[]::TEXT[];
