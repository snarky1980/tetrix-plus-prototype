import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetTaches() {
  console.log('🗑️  Suppression de toutes les tâches...\n');

  try {
    // Compte avant suppression
    const countAvant = await prisma.tache.count();
    const countAjustementsAvant = await prisma.ajustementTemps.count();

    console.log(`📊 État actuel:`);
    console.log(`   - Tâches: ${countAvant}`);
    console.log(`   - Ajustements temps: ${countAjustementsAvant}\n`);

    if (countAvant === 0) {
      console.log('✅ Aucune tâche à supprimer.\n');
      return;
    }

    // Confirmation (désactiver en prod ou passer en argument)
    console.log('⚠️  ATTENTION: Cette opération est IRRÉVERSIBLE!\n');
    console.log('   Toutes les tâches et ajustements de temps seront supprimés.');
    console.log('   Les profils traducteurs, clients et domaines seront PRÉSERVÉS.\n');

    // Suppression des tâches (cascade supprime automatiquement ajustements_temps)
    const resultat = await prisma.tache.deleteMany({});

    console.log(`✅ Suppression terminée:`);
    console.log(`   - ${resultat.count} tâches supprimées`);
    console.log(`   - Ajustements temps supprimés automatiquement (cascade)\n`);

    // Vérification
    const countApres = await prisma.tache.count();
    const countAjustementsApres = await prisma.ajustementTemps.count();

    console.log(`📊 État final:`);
    console.log(`   - Tâches: ${countApres}`);
    console.log(`   - Ajustements temps: ${countAjustementsApres}\n`);

    // Vérification profils préservés
    const countTraducteurs = await prisma.traducteur.count();
    const countClients = await prisma.client.count();
    const countUtilisateurs = await prisma.utilisateur.count();
    const countPairesLinguistiques = await prisma.paireLinguistique.count();

    console.log(`✅ Profils préservés:`);
    console.log(`   - Utilisateurs: ${countUtilisateurs}`);
    console.log(`   - Traducteurs: ${countTraducteurs}`);
    console.log(`   - Clients: ${countClients}`);
    console.log(`   - Paires linguistiques: ${countPairesLinguistiques}\n`);

    console.log('🚀 Réinitialisation complète! La base est prête pour de nouvelles tâches.\n');

  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
resetTaches()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
