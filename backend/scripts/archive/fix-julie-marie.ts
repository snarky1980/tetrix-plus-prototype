import prisma from '../src/config/database.js';

async function main() {
  console.log('🧹 Correction de Julie-Marie Bissonnette...\n');
  
  const bissonnettes = await prisma.traducteur.findMany({
    where: { nom: 'Bissonnette, Julie-Marie' }
  });
  
  console.log(`Trouvé ${bissonnettes.length} entrées\n`);
  
  // Garder celle avec Droit 2 (TR-03, plus standard)
  const toKeep = bissonnettes.find(b => b.division === 'Droit 2');
  const toDelete = bissonnettes.filter(b => b.division !== 'Droit 2');
  
  if (toKeep && toDelete.length > 0) {
    console.log(`✅ Garde: ${toKeep.id} (${toKeep.division})`);
    console.log(`❌ Supprime: ${toDelete.map(d => `${d.id} (${d.division})`).join(', ')}\n`);
    
    for (const dup of toDelete) {
      await prisma.traducteur.delete({
        where: { id: dup.id }
      });
      console.log(`Supprimé: ${dup.division}`);
    }
    
    // Corriger l'horaire
    await prisma.traducteur.update({
      where: { id: toKeep.id },
      data: { horaire: '9h-17h' }
    });
    
    console.log(`\n✅ Horaire mis à jour: 9h-17h`);
    
    // Vérifier le résultat
    const updated = await prisma.traducteur.findUnique({
      where: { id: toKeep.id }
    });
    
    console.log(`\n📋 Résultat final:`);
    console.log(`  Nom: ${updated?.nom}`);
    console.log(`  Division: ${updated?.division}`);
    console.log(`  Horaire: ${updated?.horaire}`);
    console.log(`  Classification: ${updated?.classification}`);
  }
  
  await prisma.$disconnect();
}

main();
