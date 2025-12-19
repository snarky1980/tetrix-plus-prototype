import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ANALYSE DES DIVISIONS ANGLO ET MULTILINGUE\n');
  console.log('═'.repeat(80));

  // Divisions concernées
  const divisionsAnglo = ['Traduction anglaise 1', 'Traduction anglaise 2'];
  const divisionMulti = 'Multilingue';

  // 1. TRADUCTION ANGLAISE
  console.log('\n📋 TRADUCTION ANGLAISE (1 & 2):\n');
  
  const tradsAnglo = await prisma.traducteur.findMany({
    where: {
      division: { in: divisionsAnglo }
    },
    include: {
      pairesLinguistiques: true,
      utilisateur: { select: { email: true } }
    },
    orderBy: { nom: 'asc' }
  });

  console.log(`   Total: ${tradsAnglo.length} traducteurs`);
  console.log(`   - Traduction anglaise 1: ${tradsAnglo.filter(t => t.division === 'Traduction anglaise 1').length}`);
  console.log(`   - Traduction anglaise 2: ${tradsAnglo.filter(t => t.division === 'Traduction anglaise 2').length}`);

  // Vérifier les paires linguistiques
  const angloAvecPaires = tradsAnglo.filter(t => t.pairesLinguistiques.length > 0);
  const angloSansPaires = tradsAnglo.filter(t => t.pairesLinguistiques.length === 0);

  console.log(`\n   Paires linguistiques:`);
  console.log(`   ✅ Avec paires: ${angloAvecPaires.length}`);
  console.log(`   ❌ Sans paires: ${angloSansPaires.length}`);

  if (angloAvecPaires.length > 0) {
    console.log(`\n   Échantillon avec paires (5 premiers):`);
    for (const trad of angloAvecPaires.slice(0, 5)) {
      console.log(`      ${trad.nom} (${trad.division}):`);
      trad.pairesLinguistiques.forEach(p => {
        console.log(`         - ${p.langueSource} → ${p.langueCible}`);
      });
    }
  }

  if (angloSansPaires.length > 0) {
    console.log(`\n   ⚠️ ${angloSansPaires.length} traducteurs SANS paires:`);
    angloSansPaires.slice(0, 5).forEach(t => {
      console.log(`      - ${t.nom} (${t.division})`);
    });
    if (angloSansPaires.length > 5) {
      console.log(`      ... et ${angloSansPaires.length - 5} autres`);
    }
  }

  // 2. MULTILINGUE
  console.log('\n\n📋 MULTILINGUE:\n');
  
  const tradsMulti = await prisma.traducteur.findMany({
    where: {
      division: divisionMulti
    },
    include: {
      pairesLinguistiques: true,
      utilisateur: { select: { email: true } }
    },
    orderBy: { nom: 'asc' }
  });

  console.log(`   Total: ${tradsMulti.length} traducteurs`);

  // Vérifier les paires linguistiques
  const multiAvecPaires = tradsMulti.filter(t => t.pairesLinguistiques.length > 0);
  const multiSansPaires = tradsMulti.filter(t => t.pairesLinguistiques.length === 0);

  console.log(`\n   Paires linguistiques:`);
  console.log(`   ✅ Avec paires: ${multiAvecPaires.length}`);
  console.log(`   ❌ Sans paires: ${multiSansPaires.length}`);

  if (multiAvecPaires.length > 0) {
    console.log(`\n   Échantillon avec paires (5 premiers):`);
    for (const trad of multiAvecPaires.slice(0, 5)) {
      console.log(`      ${trad.nom}:`);
      trad.pairesLinguistiques.forEach(p => {
        console.log(`         - ${p.langueSource} → ${p.langueCible}`);
      });
    }
  }

  if (multiSansPaires.length > 0) {
    console.log(`\n   ⚠️ ${multiSansPaires.length} traducteurs SANS paires:`);
    multiSansPaires.slice(0, 5).forEach(t => {
      console.log(`      - ${t.nom}`);
    });
    if (multiSansPaires.length > 5) {
      console.log(`      ... et ${multiSansPaires.length - 5} autres`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n❓ QUESTION:\n');
  
  if (angloSansPaires.length > 0 || multiSansPaires.length > 0) {
    console.log('   Quelles paires linguistiques appliquer pour:');
    if (angloSansPaires.length > 0) {
      console.log(`   - Traduction anglaise (${angloSansPaires.length} traducteurs) ?`);
      console.log('     Ex: FR↔EN (bidirectionnel) ?');
    }
    if (multiSansPaires.length > 0) {
      console.log(`   - Multilingue (${multiSansPaires.length} traducteurs) ?`);
      console.log('     Ex: EN↔FR, ES↔FR, etc. ?');
    }
  } else {
    console.log('   ✅ Tous les traducteurs Anglo et Multilingue ont des paires linguistiques !');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
