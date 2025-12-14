import prisma from '../src/config/database.js';

async function main() {
  console.log('🧹 NETTOYAGE DES PROFILS...\n');
  
  // 1. Vérifier les profils TEST restants
  const testProfiles = await prisma.traducteur.count({
    where: { division: 'TEST' }
  });
  console.log(`Profils TEST trouvés: ${testProfiles}`);
  
  if (testProfiles > 0) {
    const deleted = await prisma.traducteur.deleteMany({
      where: { division: 'TEST' }
    });
    console.log(`✅ ${deleted.count} profils TEST supprimés\n`);
  }
  
  // 2. Trouver les doublons de Julie-Marie Bissonnette
  const bissonnettes = await prisma.traducteur.findMany({
    where: { nom: 'Bissonnette, Julie-Marie' },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`\n📋 Entrées pour Julie-Marie Bissonnette: ${bissonnettes.length}`);
  bissonnettes.forEach((t, i) => {
    console.log(`\n  Entrée ${i+1}:`);
    console.log(`    ID: ${t.id}`);
    console.log(`    Division: ${t.division}`);
    console.log(`    Horaire: ${t.horaire}`);
    console.log(`    Classification: ${t.classification}`);
    console.log(`    Créé le: ${t.createdAt}`);
  });
  
  if (bissonnettes.length > 1) {
    // Garder la première (la plus ancienne, probablement l'originale)
    const toKeep = bissonnettes[0];
    const toDelete = bissonnettes.slice(1);
    
    console.log(`\n✅ Garde l'entrée ${toKeep.id} (${toKeep.division})`);
    console.log(`❌ Supprime ${toDelete.length} doublon(s)`);
    
    for (const dup of toDelete) {
      await prisma.traducteur.delete({
        where: { id: dup.id }
      });
      console.log(`   Supprimé: ${dup.id} (${dup.division})`);
    }
    
    // 3. Corriger l'horaire pour 9h-17h
    await prisma.traducteur.update({
      where: { id: toKeep.id },
      data: { 
        horaire: '9h-17h',
        division: 'Droit 2'
      }
    });
    console.log(`\n✅ Horaire de Julie-Marie Bissonnette mis à jour: 9h-17h`);
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Nettoyage terminé!');
}

main();
