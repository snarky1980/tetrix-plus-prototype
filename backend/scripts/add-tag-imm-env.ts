import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOMAINES_A_AJOUTER = [
  { nom: 'TAG - Général', domaineParent: 'TAG', actif: true },
  { nom: 'IMM - Général', domaineParent: 'IMM', actif: true },
  { nom: 'Env - Général', domaineParent: 'Env', actif: true },
];

async function main() {
  console.log('🌱 Ajout des domaines TAG, IMM, Env...\n');

  for (const sd of DOMAINES_A_AJOUTER) {
    try {
      await prisma.sousDomaine.upsert({
        where: { nom: sd.nom },
        update: { actif: true, domaineParent: sd.domaineParent },
        create: sd,
      });
      console.log(`✓ ${sd.domaineParent} ajouté`);
    } catch (error: any) {
      console.error(`❌ Erreur pour ${sd.nom}:`, error.message);
    }
  }

  console.log('\n✅ Domaines ajoutés avec succès!');
  
  // Afficher tous les domaines disponibles
  console.log('\n📋 Liste complète des domaines:');
  const result = await prisma.$queryRaw<Array<{ domaineParent: string }>>`
    SELECT DISTINCT "domaineParent" 
    FROM sous_domaines 
    WHERE "domaineParent" IS NOT NULL AND actif = true
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
