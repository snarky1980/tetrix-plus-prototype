import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 AUDIT COMPLET DES PROFILS TRADUCTEURS\n');
  console.log('═'.repeat(80));

  const traducteurs = await prisma.traducteur.findMany({
    include: {
      pairesLinguistiques: true,
      utilisateur: {
        select: {
          email: true,
          actif: true,
        }
      }
    },
    orderBy: { nom: 'asc' }
  });

  console.log(`\n📊 Total traducteurs: ${traducteurs.length}\n`);

  // Statistiques générales
  const stats = {
    avecHoraire: traducteurs.filter(t => t.horaire).length,
    sansHoraire: traducteurs.filter(t => !t.horaire).length,
    avecDomaines: traducteurs.filter(t => t.domaines && t.domaines.length > 0).length,
    sansDomaines: traducteurs.filter(t => !t.domaines || t.domaines.length === 0).length,
    avecClientsHabituels: traducteurs.filter(t => t.clientsHabituels && t.clientsHabituels.length > 0).length,
    sansClientsHabituels: traducteurs.filter(t => !t.clientsHabituels || t.clientsHabituels.length === 0).length,
    avecPairesLinguistiques: traducteurs.filter(t => t.pairesLinguistiques.length > 0).length,
    sansPairesLinguistiques: traducteurs.filter(t => t.pairesLinguistiques.length === 0).length,
    avecSpecialisations: traducteurs.filter(t => t.specialisations && t.specialisations.length > 0).length,
    sansSpecialisations: traducteurs.filter(t => !t.specialisations || t.specialisations.length === 0).length,
    avecClassification: traducteurs.filter(t => t.classification).length,
    sansClassification: traducteurs.filter(t => !t.classification).length,
  };

  console.log('📈 STATISTIQUES GLOBALES:\n');
  console.log('   Horaires:');
  console.log(`      ✅ Avec horaire: ${stats.avecHoraire} (${((stats.avecHoraire/traducteurs.length)*100).toFixed(1)}%)`);
  console.log(`      ❌ Sans horaire: ${stats.sansHoraire} (${((stats.sansHoraire/traducteurs.length)*100).toFixed(1)}%)`);
  
  console.log('\n   Domaines:');
  console.log(`      ✅ Avec domaines: ${stats.avecDomaines} (${((stats.avecDomaines/traducteurs.length)*100).toFixed(1)}%)`);
  console.log(`      ❌ Sans domaines: ${stats.sansDomaines} (${((stats.sansDomaines/traducteurs.length)*100).toFixed(1)}%)`);
  
  console.log('\n   Clients habituels:');
  console.log(`      ✅ Avec clients: ${stats.avecClientsHabituels} (${((stats.avecClientsHabituels/traducteurs.length)*100).toFixed(1)}%)`);
  console.log(`      ❌ Sans clients: ${stats.sansClientsHabituels} (${((stats.sansClientsHabituels/traducteurs.length)*100).toFixed(1)}%)`);
  
  console.log('\n   Paires linguistiques:');
  console.log(`      ✅ Avec paires: ${stats.avecPairesLinguistiques} (${((stats.avecPairesLinguistiques/traducteurs.length)*100).toFixed(1)}%)`);
  console.log(`      ❌ Sans paires: ${stats.sansPairesLinguistiques} (${((stats.sansPairesLinguistiques/traducteurs.length)*100).toFixed(1)}%)`);
  
  console.log('\n   Spécialisations:');
  console.log(`      ✅ Avec spécialisations: ${stats.avecSpecialisations} (${((stats.avecSpecialisations/traducteurs.length)*100).toFixed(1)}%)`);
  console.log(`      ❌ Sans spécialisations: ${stats.sansSpecialisations} (${((stats.sansSpecialisations/traducteurs.length)*100).toFixed(1)}%)`);

  console.log('\n   Classification:');
  console.log(`      ✅ Avec classification: ${stats.avecClassification} (${((stats.avecClassification/traducteurs.length)*100).toFixed(1)}%)`);
  console.log(`      ❌ Sans classification: ${stats.sansClassification} (${((stats.sansClassification/traducteurs.length)*100).toFixed(1)}%)`);

  // Échantillon de 10 profils avec détails
  console.log('\n\n📋 ÉCHANTILLON DE PROFILS (10 premiers):\n');
  console.log('═'.repeat(80));
  
  for (const trad of traducteurs.slice(0, 10)) {
    console.log(`\n👤 ${trad.nom}`);
    console.log(`   Email: ${trad.utilisateur?.email || 'N/A'}`);
    console.log(`   Division: ${trad.division || 'N/A'}`);
    console.log(`   Classification: ${trad.classification || '❌ MANQUANT'}`);
    console.log(`   Catégorie: ${trad.categorie}`);
    console.log(`   Horaire: ${trad.horaire || '❌ MANQUANT'}`);
    console.log(`   Capacité: ${trad.capaciteHeuresParJour}h/jour`);
    console.log(`   Domaines: ${trad.domaines && trad.domaines.length > 0 ? trad.domaines.join(', ') : '❌ MANQUANT'}`);
    console.log(`   Clients habituels: ${trad.clientsHabituels && trad.clientsHabituels.length > 0 ? trad.clientsHabituels.join(', ') : '❌ MANQUANT'}`);
    console.log(`   Spécialisations: ${trad.specialisations && trad.specialisations.length > 0 ? trad.specialisations.join(', ') : 'Aucune'}`);
    console.log(`   Paires linguistiques: ${trad.pairesLinguistiques.length}`);
    if (trad.pairesLinguistiques.length > 0) {
      trad.pairesLinguistiques.forEach(p => {
        console.log(`      - ${p.langueSource} → ${p.langueCible}`);
      });
    }
    console.log(`   Disponible: ${trad.disponiblePourTravail ? '✅' : '❌'}`);
    console.log(`   Notes: ${trad.notes || 'Aucune'}`);
  }

  // Répartition par division
  console.log('\n\n📊 RÉPARTITION PAR DIVISION:\n');
  const parDivision = traducteurs.reduce((acc, t) => {
    const div = t.division || 'Non assigné';
    acc[div] = (acc[div] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(parDivision)
    .sort((a, b) => b[1] - a[1])
    .forEach(([div, count]) => {
      console.log(`   ${div.padEnd(30)}: ${count} traducteurs`);
    });

  // Répartition par classification
  console.log('\n\n📊 RÉPARTITION PAR CLASSIFICATION:\n');
  const parClassification = traducteurs.reduce((acc, t) => {
    const classif = t.classification || 'Non assigné';
    acc[classif] = (acc[classif] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(parClassification)
    .sort((a, b) => b[1] - a[1])
    .forEach(([classif, count]) => {
      console.log(`   ${classif.padEnd(30)}: ${count} traducteurs`);
    });

  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 DIAGNOSTIC:\n');
  
  if (stats.sansHoraire > 0) {
    console.log(`   ⚠️ ${stats.sansHoraire} traducteurs sans horaire`);
  } else {
    console.log('   ✅ Tous les traducteurs ont un horaire');
  }
  
  if (stats.sansDomaines > 0) {
    console.log(`   ⚠️ ${stats.sansDomaines} traducteurs sans domaines`);
  } else {
    console.log('   ✅ Tous les traducteurs ont des domaines');
  }
  
  if (stats.sansPairesLinguistiques > 0) {
    console.log(`   ⚠️ ${stats.sansPairesLinguistiques} traducteurs sans paires linguistiques`);
  } else {
    console.log('   ✅ Tous les traducteurs ont des paires linguistiques');
  }
  
  if (stats.sansClassification > 0) {
    console.log(`   ⚠️ ${stats.sansClassification} traducteurs sans classification`);
  } else {
    console.log('   ✅ Tous les traducteurs ont une classification');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
