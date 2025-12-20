import prisma from '../src/config/database.js';

async function main() {
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    select: { 
      id: true, 
      nom: true, 
      division: true, 
      horaire: true, 
      capaciteHeuresParJour: true,
      classification: true
    },
    orderBy: { nom: 'asc' }
  });
  
  console.log('=== TRADUCTEURS ACTIFS ===\n');
  traducteurs.forEach((t, i) => {
    console.log(`${i+1}. ${t.nom}`);
    console.log(`   Division: ${t.division}`);
    console.log(`   Horaire: ${t.horaire || '9h-17h (défaut)'}`);
    console.log(`   Capacité: ${t.capaciteHeuresParJour}h/jour`);
    console.log(`   Classification: ${t.classification}`);
    console.log(`   ID: ${t.id}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

main();
