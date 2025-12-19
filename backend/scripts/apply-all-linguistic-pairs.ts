import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 APPLICATION DES PAIRES LINGUISTIQUES COMPLÈTES\n');
  console.log('═'.repeat(80));
  console.log('\nBasé sur les données originales :\n');
  console.log('   - CISR & Droit : EN → FR');
  console.log('   - Traduction anglaise : FR → EN');
  console.log('   - Multilingue : FR ↔ EN (bidirectionnel)\n');
  console.log('═'.repeat(80));

  let totalAdded = 0;

  // 1. TRADUCTION ANGLAISE : FR → EN uniquement
  console.log('\n📋 1. TRADUCTION ANGLAISE (FR → EN)...\n');
  
  const tradsAnglo = await prisma.traducteur.findMany({
    where: {
      division: { in: ['Traduction anglaise 1', 'Traduction anglaise 2'] }
    },
    include: { pairesLinguistiques: true }
  });

  console.log(`   Trouvé ${tradsAnglo.length} traducteurs`);

  for (const trad of tradsAnglo) {
    const hasFREN = trad.pairesLinguistiques.some(p => p.langueSource === 'FR' && p.langueCible === 'EN');
    
    if (!hasFREN) {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: trad.id,
          langueSource: 'FR',
          langueCible: 'EN'
        }
      });
      totalAdded++;
    }
  }

  console.log(`   ✅ ${totalAdded} paires FR→EN ajoutées`);

  // 2. MULTILINGUE : FR ↔ EN (bidirectionnel)
  console.log('\n\n📋 2. MULTILINGUE (FR ↔ EN)...\n');
  
  const tradsMulti = await prisma.traducteur.findMany({
    where: { division: 'Multilingue' },
    include: { pairesLinguistiques: true }
  });

  console.log(`   Trouvé ${tradsMulti.length} traducteurs`);

  let multiAdded = 0;
  for (const trad of tradsMulti) {
    const hasFREN = trad.pairesLinguistiques.some(p => p.langueSource === 'FR' && p.langueCible === 'EN');
    const hasENFR = trad.pairesLinguistiques.some(p => p.langueSource === 'EN' && p.langueCible === 'FR');

    if (!hasFREN) {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: trad.id,
          langueSource: 'FR',
          langueCible: 'EN'
        }
      });
      multiAdded++;
    }

    if (!hasENFR) {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: trad.id,
          langueSource: 'EN',
          langueCible: 'FR'
        }
      });
      multiAdded++;
    }
  }

  console.log(`   ✅ ${multiAdded} paires ajoutées (FR↔EN bidirectionnel)`);

  // RÉCAPITULATIF FINAL
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RÉCAPITULATIF FINAL:\n');

  const stats = {
    cisr: await prisma.traducteur.count({
      where: {
        division: { in: ['CISR', 'Droit 1', 'Droit 2'] },
        pairesLinguistiques: { some: {} }
      }
    }),
    anglo: await prisma.traducteur.count({
      where: {
        division: { in: ['Traduction anglaise 1', 'Traduction anglaise 2'] },
        pairesLinguistiques: { some: {} }
      }
    }),
    multi: await prisma.traducteur.count({
      where: {
        division: 'Multilingue',
        pairesLinguistiques: { some: {} }
      }
    }),
    total: await prisma.traducteur.count({
      where: { pairesLinguistiques: { some: {} } }
    }),
    totalTrads: await prisma.traducteur.count()
  };

  console.log(`   CISR/Droit avec paires (EN→FR): ${stats.cisr}/49`);
  console.log(`   Traduction anglaise avec paires (FR→EN): ${stats.anglo}/44`);
  console.log(`   Multilingue avec paires (FR↔EN): ${stats.multi}/21`);
  console.log(`\n   TOTAL avec paires: ${stats.total}/${stats.totalTrads}`);

  if (stats.total === stats.totalTrads) {
    console.log('\n   ✅ 100% des traducteurs ont leurs paires linguistiques !');
  } else {
    console.log(`\n   ⚠️ ${stats.totalTrads - stats.total} traducteurs sans paires`);
  }

  console.log('\n✅ Application terminée !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
