import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOMAINES_PAR_DEFAUT = [
  'Juridique',
  'Médical',
  'Technique',
  'Financier',
  'Marketing',
  'Éducation',
  'Scientifique',
  'Administratif',
  'Commerce',
  'Technologies',
];

async function main() {
  console.log('🌱 Ajout des domaines par défaut...\n');

  // Créer des sous-domaines avec des domaines parents pour générer la liste des domaines
  const sousDomainesACreer = DOMAINES_PAR_DEFAUT.flatMap(domaine => [
    { nom: `${domaine} - Général`, domaineParent: domaine, actif: true },
  ]);

  let compteur = 0;
  for (const sd of sousDomainesACreer) {
    try {
      await prisma.sousDomaine.upsert({
        where: { nom: sd.nom },
        update: {},
        create: sd,
      });
      compteur++;
      console.log(`✓ ${sd.nom} (Domaine: ${sd.domaineParent})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  ${sd.nom} existe déjà`);
      } else {
        console.error(`❌ Erreur pour ${sd.nom}:`, error.message);
      }
    }
  }

  console.log(`\n✅ ${compteur} sous-domaines ajoutés/mis à jour`);
  console.log(`📊 ${DOMAINES_PAR_DEFAUT.length} domaines parents disponibles\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
