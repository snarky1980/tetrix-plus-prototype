import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 RÉPARATION DES PAIRES LINGUISTIQUES MANQUANTES\n');

  // Récupérer tous les traducteurs
  const traducteurs = await prisma.traducteur.findMany({
    include: { pairesLinguistiques: true }
  });

  console.log(`Trouvé ${traducteurs.length} traducteurs\n`);

  let ajoutees = 0;
  let deja = 0;

  for (const trad of traducteurs) {
    // Vérifier si le traducteur a déjà au moins une paire
    if (trad.pairesLinguistiques.length > 0) {
      deja++;
      continue;
    }

    // Par défaut, tous les traducteurs peuvent faire EN→FR
    // (C'est la paire la plus courante selon les données CISR)
    await prisma.paireLinguistique.create({
      data: {
        traducteurId: trad.id,
        langueSource: 'EN',
        langueCible: 'FR'
      }
    });

    ajoutees++;

    if (ajoutees % 10 === 0) {
      console.log(`   Progression: ${ajoutees} paires ajoutées...`);
    }
  }

  console.log(`\n✅ Terminé!`);
  console.log(`   ${ajoutees} paires EN→FR ajoutées`);
  console.log(`   ${deja} traducteurs avaient déjà des paires`);

  // Vérifier le résultat
  const totalPaires = await prisma.paireLinguistique.count();
  console.log(`\n📊 Total de paires linguistiques: ${totalPaires}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
