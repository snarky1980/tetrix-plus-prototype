import prisma from '../src/config/database.js';

async function main() {
  const traducteurs = await prisma.traducteur.findMany({
    where: { 
      nom: { contains: 'Bissonnette' }
    },
    select: { 
      id: true, 
      nom: true, 
      division: true, 
      horaire: true, 
      capaciteHeuresParJour: true,
      classification: true,
      actif: true
    }
  });
  
  console.log('=== JULIE-MARIE BISSONNETTE ===\n');
  traducteurs.forEach((t, i) => {
    console.log(`Entrée ${i+1}:`);
    console.log(`  Nom: ${t.nom}`);
    console.log(`  Division: ${t.division}`);
    console.log(`  Horaire: ${t.horaire}`);
    console.log(`  Capacité: ${t.capaciteHeuresParJour}h/jour`);
    console.log(`  Classification: ${t.classification}`);
    console.log(`  Actif: ${t.actif}`);
    console.log(`  ID: ${t.id}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

main();
