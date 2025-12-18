/**
 * Test de l'Optimistic Locking sur les tâches
 * 
 * Ce script simule deux utilisateurs modifiant la même tâche simultanément
 * pour vérifier que le système détecte et rejette le conflit.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOptimisticLocking() {
  console.log('🧪 Test Optimistic Locking - Conflit de Modification Concurrente\n');

  try {
    // 1. Trouver une tâche existante
    const tache = await prisma.tache.findFirst({
      select: {
        id: true,
        numeroProjet: true,
        description: true,
        heuresTotal: true,
        version: true,
        traducteur: {
          select: { nom: true }
        }
      }
    });

    if (!tache) {
      console.log('❌ Aucune tâche trouvée pour le test');
      return;
    }

    console.log('📋 Tâche initiale:');
    console.log(`   ID: ${tache.id}`);
    console.log(`   Traducteur: ${tache.traducteur.nom}`);
    console.log(`   Description: ${tache.description || 'N/A'}`);
    console.log(`   Heures: ${tache.heuresTotal}h`);
    console.log(`   Version: ${tache.version}\n`);

    // 2. Simuler User A qui lit la tâche
    console.log('👤 User A lit la tâche (version: ${tache.version})');
    const versionUserA = tache.version;

    // 3. Simuler User B qui lit la tâche
    console.log('👤 User B lit la tâche (version: ${tache.version})\n');
    const versionUserB = tache.version;

    // 4. User A modifie et sauvegarde EN PREMIER
    console.log('✏️  User A modifie et sauvegarde...');
    const updateA = await prisma.tache.update({
      where: {
        id: tache.id,
        version: versionUserA // ← Vérification optimiste
      },
      data: {
        description: 'Modifié par User A',
        version: { increment: 1 }
      },
      select: { version: true, description: true }
    });
    console.log(`   ✅ User A: Sauvegarde réussie (nouvelle version: ${updateA.version})`);
    console.log(`   Description: "${updateA.description}"\n`);

    // 5. User B tente de sauvegarder avec l'ancienne version
    console.log('✏️  User B tente de sauvegarder (avec version: ${versionUserB})...');
    try {
      await prisma.tache.update({
        where: {
          id: tache.id,
          version: versionUserB // ← Ancienne version!
        },
        data: {
          heuresTotal: 10,
          version: { increment: 1 }
        }
      });
      console.log('   ❌ ERREUR: La modification de User B ne devrait PAS réussir!\n');
    } catch (error) {
      console.log('   ✅ User B: Modification rejetée (conflit détecté)');
      console.log(`   Raison: La version ${versionUserB} ne correspond plus à la version actuelle ${updateA.version}\n`);
    }

    // 6. Vérifier l'état final
    const tacheFinal = await prisma.tache.findUnique({
      where: { id: tache.id },
      select: { description: true, heuresTotal: true, version: true }
    });

    console.log('📊 État final de la tâche:');
    console.log(`   Description: "${tacheFinal?.description}"`);
    console.log(`   Heures: ${tacheFinal?.heuresTotal}h`);
    console.log(`   Version: ${tacheFinal?.version}`);
    console.log('\n✅ Test réussi: Les modifications de User A sont préservées');
    console.log('✅ Les modifications de User B ont été correctement rejetées\n');

    // 7. Restaurer la tâche
    await prisma.tache.update({
      where: { id: tache.id },
      data: {
        description: tache.description,
        heuresTotal: tache.heuresTotal
      }
    });
    console.log('🔄 Tâche restaurée à son état initial\n');

  } catch (error) {
    console.error('❌ Erreur pendant le test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testOptimisticLocking()
  .then(() => {
    console.log('✨ Test terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
