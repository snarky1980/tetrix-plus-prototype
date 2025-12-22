import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  console.log('🔧 Correction des horaires et paires linguistiques...\n');

  // 1. Mettre horaire 9h-17h pour ceux qui n'en ont pas
  const sansHoraire = await prisma.traducteur.updateMany({
    where: { horaire: null },
    data: { horaire: '9h-17h' }
  });
  console.log(`✓ Horaires 9h-17h ajoutés: ${sansHoraire.count} traducteurs`);

  // 2. Trouver ou créer la paire EN→FR
  let paireEnFr = await prisma.paireLinguistique.findFirst({
    where: { langueSource: 'EN', langueCible: 'FR' }
  });
  if (!paireEnFr) {
    paireEnFr = await prisma.paireLinguistique.create({
      data: { langueSource: 'EN', langueCible: 'FR' }
    });
    console.log('✓ Paire EN→FR créée');
  } else {
    console.log('✓ Paire EN→FR existante trouvée, id:', paireEnFr.id);
  }

  // 3. Trouver les traducteurs sans paires et ajouter EN→FR
  const tousTraducteurs = await prisma.traducteur.findMany({
    include: { pairesLinguistiques: true }
  });
  
  let ajoutees = 0;
  for (const trad of tousTraducteurs) {
    if (trad.pairesLinguistiques.length === 0) {
      try {
        await prisma.traducteur.update({
          where: { id: trad.id },
          data: {
            pairesLinguistiques: { connect: { id: paireEnFr.id } }
          }
        });
        ajoutees++;
        console.log(`  + ${trad.nom}`);
      } catch (err: any) {
        console.log(`  ✗ ${trad.nom}: ${err.message}`);
      }
    }
  }
  console.log(`✓ Paires EN→FR ajoutées: ${ajoutees} traducteurs`);
  
  // Vérification finale
  const total = await prisma.traducteur.count();
  const avecHoraire = await prisma.traducteur.count({ where: { horaire: { not: null } } });
  const avecPaires = await prisma.traducteur.count({ where: { pairesLinguistiques: { some: {} } } });
  
  console.log('\n════════════════════════════════════════');
  console.log('📊 ÉTAT FINAL');
  console.log('════════════════════════════════════════');
  console.log(`   Total traducteurs: ${total}`);
  console.log(`   Avec horaire: ${avecHoraire}/${total}`);
  console.log(`   Avec paires: ${avecPaires}/${total}`);
}

fix()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Erreur:', e);
    prisma.$disconnect();
    process.exit(1);
  });
