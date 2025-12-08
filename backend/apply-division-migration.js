/**
 * Script pour appliquer les migrations de schéma pour les divisions et contrôle d'accès
 * Usage: node apply-division-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔧 Application de la migration pour les divisions et contrôle d\'accès...\n');

  try {
    // 1. Ajouter les colonnes nom et prenom
    console.log('1. Ajout des colonnes nom et prenom à la table utilisateurs...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "utilisateurs" 
      ADD COLUMN IF NOT EXISTS "nom" TEXT,
      ADD COLUMN IF NOT EXISTS "prenom" TEXT;
    `);
    console.log('   ✓ Colonnes ajoutées\n');

    // 2. Créer la table divisions
    console.log('2. Création de la table divisions...');
    await prisma.$executeRawUnsafe(`
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
    `);
    console.log('   ✓ Table divisions créée\n');

    // 3. Créer les index pour divisions
    console.log('3. Création des index pour divisions...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "divisions_nom_key" ON "divisions"("nom");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "divisions_code_key" ON "divisions"("code");
    `);
    console.log('   ✓ Index créés\n');

    // 4. Créer la table division_access
    console.log('4. Création de la table division_access...');
    await prisma.$executeRawUnsafe(`
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
    `);
    console.log('   ✓ Table division_access créée\n');

    // 5. Créer les index pour division_access
    console.log('5. Création des index pour division_access...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "division_access_utilisateurId_divisionId_key" 
      ON "division_access"("utilisateurId", "divisionId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "division_access_utilisateurId_idx" 
      ON "division_access"("utilisateurId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "division_access_divisionId_idx" 
      ON "division_access"("divisionId");
    `);
    console.log('   ✓ Index créés\n');

    // 6. Ajouter les contraintes de clés étrangères
    console.log('6. Ajout des contraintes de clés étrangères...');
    await prisma.$executeRawUnsafe(`
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
    `);
    console.log('   ✓ Contraintes ajoutées\n');

    // 7. Insérer les divisions par défaut
    console.log('7. Insertion des divisions par défaut...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO "divisions" ("id", "nom", "code", "description", "actif", "creeLe", "modifieLe")
      SELECT 
        gen_random_uuid()::text,
        'Division Droit',
        'DROIT',
        'Division spécialisée en traduction juridique',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM "divisions" WHERE "code" = 'DROIT');
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "divisions" ("id", "nom", "code", "description", "actif", "creeLe", "modifieLe")
      SELECT 
        gen_random_uuid()::text,
        'Division Science et Technologie',
        'SCITECH',
        'Division spécialisée en traduction scientifique et technique',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM "divisions" WHERE "code" = 'SCITECH');
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "divisions" ("id", "nom", "code", "description", "actif", "creeLe", "modifieLe")
      SELECT 
        gen_random_uuid()::text,
        'Division CISR',
        'CISR',
        'Commission de l''immigration et du statut de réfugié',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM "divisions" WHERE "code" = 'CISR');
    `);
    console.log('   ✓ Divisions insérées\n');

    console.log('✅ Migration appliquée avec succès !');
    console.log('\nVous pouvez maintenant utiliser les fonctionnalités de gestion des divisions et des accès.');

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
