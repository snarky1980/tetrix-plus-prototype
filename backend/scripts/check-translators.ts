
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking translators...');
  const translators = await prisma.traducteur.findMany({
    include: {
      utilisateur: true
    }
  });

  if (translators.length === 0) {
    console.log('No translators found.');
  } else {
    const target = translators.find(t => t.nom === 'Bayer, Annie');
    if (target) {
        console.log('Found target translator:', target);
    } else {
        console.log('Target translator not found, showing first 5:');
        translators.slice(0, 5).forEach(t => {
            console.log(`- Name: ${t.nom}, Email: ${t.utilisateur?.email}, ID: ${t.id}, Division: ${t.division}, Capacity: ${t.capaciteHeuresParJour}`);
        });
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
