import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Application des données manquantes\n');
  console.log('═'.repeat(80));

  // 1. HORAIRES - Appliquer 8h-16h à tous ceux qui n'ont pas d'horaire
  console.log('\n⏰ HORAIRES - Application de 8h-16h...\n');
  
  const sansHoraire = await prisma.traducteur.findMany({
    where: {
      OR: [
        { horaire: null },
        { horaire: '' }
      ]
    },
    select: {
      id: true,
      nom: true,
      horaire: true,
    }
  });

  console.log(`   Trouvé ${sansHoraire.length} traducteurs sans horaire`);

  let horaireUpdated = 0;
  for (const trad of sansHoraire) {
    await prisma.traducteur.update({
      where: { id: trad.id },
      data: { horaire: '8h-16h' }
    });
    horaireUpdated++;
  }

  console.log(`   ✅ ${horaireUpdated} horaires mis à jour (8h-16h)`);

  // 2. PAIRES LINGUISTIQUES - EN-FR pour Droit et CISR uniquement
  console.log('\n\n🌐 PAIRES LINGUISTIQUES - EN↔FR pour Droit et CISR...\n');
  
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

  console.log(`   Trouvé ${tradsDroitCISR.length} traducteurs Droit/CISR`);

  let pairesAdded = 0;
  for (const trad of tradsDroitCISR) {
    // Vérifier si les paires existent déjà
    const hasENFR = trad.pairesLinguistiques.some(p => p.langueSource === 'EN' && p.langueCible === 'FR');
    const hasFREN = trad.pairesLinguistiques.some(p => p.langueSource === 'FR' && p.langueCible === 'EN');

    if (!hasENFR) {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: trad.id,
          langueSource: 'EN',
          langueCible: 'FR'
        }
      });
      pairesAdded++;
    }

    if (!hasFREN) {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: trad.id,
          langueSource: 'FR',
          langueCible: 'EN'
        }
      });
      pairesAdded++;
    }
  }

  console.log(`   ✅ ${pairesAdded} paires linguistiques ajoutées`);

  // RÉCAPITULATIF
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RÉCAPITULATIF FINAL:\n');

  const statsFinales = {
    totalTraducteurs: await prisma.traducteur.count(),
    avecHoraire: await prisma.traducteur.count({ where: { horaire: { not: null } } }),
    droitCISRAvecPaires: await prisma.traducteur.count({
      where: {
        division: { in: ['Droit 1', 'Droit 2', 'CISR'] },
        pairesLinguistiques: { some: {} }
      }
    }),
    droitCISRTotal: await prisma.traducteur.count({
      where: { division: { in: ['Droit 1', 'Droit 2', 'CISR'] } }
    }),
  };

  console.log(`   Total traducteurs: ${statsFinales.totalTraducteurs}`);
  console.log(`   Avec horaire: ${statsFinales.avecHoraire} (${((statsFinales.avecHoraire/statsFinales.totalTraducteurs)*100).toFixed(1)}%)`);
  console.log(`   Droit/CISR avec paires linguistiques: ${statsFinales.droitCISRAvecPaires}/${statsFinales.droitCISRTotal}`);

  console.log('\n✅ Mise à jour terminée !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
