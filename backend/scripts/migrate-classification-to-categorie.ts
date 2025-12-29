/**
 * Script de migration: classification → categorie
 * 
 * Migre les valeurs de classification (TR1, TR2, TR3, TR-01, TR-02, TR-03)
 * vers categorie (TR01, TR02, TR03)
 */

import { PrismaClient, CategorieTraducteur } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping des valeurs de classification vers categorie
const CLASSIFICATION_TO_CATEGORIE: Record<string, CategorieTraducteur> = {
  'TR1': 'TR01',
  'TR-1': 'TR01',
  'TR01': 'TR01',
  'TR-01': 'TR01',
  'tr1': 'TR01',
  'tr01': 'TR01',
  
  'TR2': 'TR02',
  'TR-2': 'TR02',
  'TR02': 'TR02',
  'TR-02': 'TR02',
  'tr2': 'TR02',
  'tr02': 'TR02',
  
  'TR3': 'TR03',
  'TR-3': 'TR03',
  'TR03': 'TR03',
  'TR-03': 'TR03',
  'tr3': 'TR03',
  'tr03': 'TR03',
};

async function migrateClassificationToCategorie() {
  console.log('🔄 Début de la migration classification → categorie...\n');

  // Récupérer tous les traducteurs
  const traducteurs = await prisma.traducteur.findMany({
    select: {
      id: true,
      nom: true,
      classification: true,
      categorie: true,
    },
  });

  console.log(`📊 ${traducteurs.length} traducteurs trouvés\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const trad of traducteurs) {
    const classification = trad.classification?.trim();
    
    if (!classification) {
      console.log(`⏭️  ${trad.nom}: pas de classification, garde categorie=${trad.categorie}`);
      skipped++;
      continue;
    }

    const newCategorie = CLASSIFICATION_TO_CATEGORIE[classification];
    
    if (!newCategorie) {
      console.log(`⚠️  ${trad.nom}: classification inconnue "${classification}", garde categorie=${trad.categorie}`);
      errors++;
      continue;
    }

    if (trad.categorie === newCategorie) {
      console.log(`✓  ${trad.nom}: déjà à jour (${classification} → ${newCategorie})`);
      skipped++;
      continue;
    }

    // Mettre à jour
    await prisma.traducteur.update({
      where: { id: trad.id },
      data: { categorie: newCategorie },
    });

    console.log(`✅ ${trad.nom}: ${classification} → ${newCategorie} (était ${trad.categorie})`);
    migrated++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📈 Résumé de la migration:');
  console.log(`   ✅ Migrés: ${migrated}`);
  console.log(`   ⏭️  Ignorés: ${skipped}`);
  console.log(`   ⚠️  Erreurs: ${errors}`);
  console.log('═'.repeat(50));
}

async function main() {
  try {
    await migrateClassificationToCategorie();
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
