import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Correction des paires linguistiques Droit/CISR\n');
  console.log('═'.repeat(80));
  console.log('\nDroit et CISR font uniquement EN→FR (pas FR→EN)\n');

  // Récupérer les traducteurs Droit/CISR
  const tradsDroitCISR = await prisma.traducteur.findMany({
    where: {
      division: {
        in: ['Droit 1', 'Droit 2', 'CISR']
      }
    },
    include: {
      pairesLinguistiques: true,
    }
  });

  console.log(`Trouvé ${tradsDroitCISR.length} traducteurs Droit/CISR\n`);

  let pairesSupprimeesCount = 0;
  let pairesCorrectes = 0;

  for (const trad of tradsDroitCISR) {
    console.log(`📋 ${trad.nom} (${trad.division}):`);
    
    // Supprimer les paires FR→EN
    const pairesASupprimer = trad.pairesLinguistiques.filter(
      p => p.langueSource === 'FR' && p.langueCible === 'EN'
    );
    
    // Garder les paires EN→FR
    const pairesAGarder = trad.pairesLinguistiques.filter(
      p => p.langueSource === 'EN' && p.langueCible === 'FR'
    );

    if (pairesASupprimer.length > 0) {
      for (const paire of pairesASupprimer) {
        await prisma.paireLinguistique.delete({
          where: { id: paire.id }
        });
        pairesSupprimeesCount++;
      }
      console.log(`   ❌ Supprimé ${pairesASupprimer.length} paire(s) FR→EN`);
    }

    if (pairesAGarder.length > 0) {
      console.log(`   ✅ Conservé ${pairesAGarder.length} paire(s) EN→FR`);
      pairesCorrectes += pairesAGarder.length;
    } else {
      // Si pas de paire EN→FR, en créer une
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: trad.id,
          langueSource: 'EN',
          langueCible: 'FR'
        }
      });
      console.log(`   ➕ Ajouté 1 paire EN→FR`);
      pairesCorrectes++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RÉCAPITULATIF:\n');
  console.log(`   Traducteurs Droit/CISR: ${tradsDroitCISR.length}`);
  console.log(`   Paires FR→EN supprimées: ${pairesSupprimeesCount}`);
  console.log(`   Paires EN→FR correctes: ${pairesCorrectes}`);
  console.log('\n✅ Correction terminée !');
  console.log('   Tous les traducteurs Droit/CISR ont uniquement EN→FR');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
