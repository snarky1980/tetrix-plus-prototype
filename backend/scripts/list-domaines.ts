import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Liste des sous-domaines et domaines parents:\n');

  const sousDomaines = await prisma.sousDomaine.findMany({
    orderBy: [
      { domaineParent: 'asc' },
      { nom: 'asc' }
    ]
  });

  // Grouper par domaine parent
  const parDomaine: Record<string, typeof sousDomaines> = {};
  const sansDomaine: typeof sousDomaines = [];

  sousDomaines.forEach(sd => {
    if (sd.domaineParent) {
      if (!parDomaine[sd.domaineParent]) {
        parDomaine[sd.domaineParent] = [];
      }
      parDomaine[sd.domaineParent].push(sd);
    } else {
      sansDomaine.push(sd);
    }
  });

  console.log(`Total: ${sousDomaines.length} sous-domaines\n`);

  // Afficher par domaine
  Object.keys(parDomaine).sort().forEach(domaine => {
    console.log(`📁 ${domaine}:`);
    parDomaine[domaine].forEach(sd => {
      console.log(`   - ${sd.nom} (${sd.actif ? '✓' : '✗'})`);
    });
    console.log('');
  });

  if (sansDomaine.length > 0) {
    console.log('📁 Sans domaine parent:');
    sansDomaine.forEach(sd => {
      console.log(`   - ${sd.nom} (${sd.actif ? '✓' : '✗'})`);
    });
  }

  // Liste unique des domaines parents
  const domainesUniques = new Set(sousDomaines.map(sd => sd.domaineParent).filter(Boolean));
  console.log(`\n✅ Domaines parents uniques (${domainesUniques.size}):`);
  Array.from(domainesUniques).sort().forEach(d => console.log(`   - ${d}`));
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
