import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Chercher TAG, IMM, Env
  const recherche = ['TAG', 'IMM', 'Env', 'ENV'];
  
  console.log('🔍 Recherche des domaines TAG, IMM, Env...\n');

  for (const terme of recherche) {
    const sds = await prisma.sousDomaine.findMany({
      where: {
        OR: [
          { nom: { contains: terme, mode: 'insensitive' } },
          { domaineParent: { contains: terme, mode: 'insensitive' } },
        ]
      }
    });

    if (sds.length > 0) {
      console.log(`📌 Résultats pour "${terme}":`);
      sds.forEach(sd => {
        console.log(`   - ${sd.nom} | Domaine: ${sd.domaineParent || 'Aucun'} | Actif: ${sd.actif}`);
      });
      console.log('');
    }
  }

  // Tous les domaines parents
  console.log('\n📊 TOUS les domaines parents (actifs et inactifs):');
  const result = await prisma.$queryRaw<Array<{ domaineParent: string }>>`
    SELECT DISTINCT "domaineParent" 
    FROM sous_domaines 
    WHERE "domaineParent" IS NOT NULL 
    ORDER BY "domaineParent"
  `;
  
  result.forEach(r => console.log(`   - ${r.domaineParent}`));
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
