import prisma from '../src/config/database.js';

async function main() {
  console.log('🗑️  Suppression des traducteurs TEST...\n');
  
  const result = await prisma.traducteur.deleteMany({
    where: { division: 'TEST' }
  });
  
  console.log(`✅ ${result.count} traducteurs TEST supprimés\n`);
  
  await prisma.$disconnect();
}

main();
