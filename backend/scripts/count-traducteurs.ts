import prisma from '../src/config/database.js';

async function main() {
  const total = await prisma.traducteur.count({ where: { actif: true } });
  const test = await prisma.traducteur.count({ where: { actif: true, division: 'TEST' } });
  const bissonnettes = await prisma.traducteur.count({ where: { nom: 'Bissonnette, Julie-Marie' } });
  
  console.log(`📊 Statistiques:`);
  console.log(`  Total traducteurs actifs: ${total}`);
  console.log(`  Profils TEST: ${test}`);
  console.log(`  Julie-Marie Bissonnette: ${bissonnettes}\n`);
  
  if (bissonnettes > 0) {
    const julie = await prisma.traducteur.findFirst({
      where: { nom: 'Bissonnette, Julie-Marie' }
    });
    console.log(`📋 Julie-Marie Bissonnette:`);
    console.log(`  Division: ${julie?.division}`);
    console.log(`  Horaire: ${julie?.horaire}`);
    console.log(`  Classification: ${julie?.classification}`);
  }
  
  await prisma.$disconnect();
}

main();
