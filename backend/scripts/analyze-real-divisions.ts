import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analyse des divisions EXISTANTES dans les profils traducteurs\n');
  console.log('═'.repeat(80));

  // Récupérer toutes les divisions uniques des traducteurs
  const traducteurs = await prisma.traducteur.findMany({
    select: {
      division: true,
    }
  });

  const divisionsUniques = [...new Set(traducteurs.map(t => t.division))].filter(Boolean).sort();

  console.log(`\n📋 Divisions trouvées dans les profils traducteurs (${divisionsUniques.length}) :\n`);
  divisionsUniques.forEach((div, index) => {
    const count = traducteurs.filter(t => t.division === div).length;
    console.log(`   ${(index + 1).toString().padStart(2)}. ${div.padEnd(30)} (${count} traducteurs)`);
  });

  console.log('\n\n🏢 Divisions actuellement dans la table Division:\n');
  const divisionsDB = await prisma.division.findMany({
    select: {
      nom: true,
      code: true,
    }
  });
  
  divisionsDB.forEach(d => {
    console.log(`   - ${d.nom.padEnd(30)} (${d.code})`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 RECOMMANDATION:');
  console.log('   Il faut créer les divisions de la table Division basées sur les');
  console.log('   divisions réelles des traducteurs, pas des catégories génériques.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
