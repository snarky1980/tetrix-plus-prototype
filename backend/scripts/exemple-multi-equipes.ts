/**
 * Script d'exemple : Assigner un conseiller à plusieurs équipes
 * 
 * Ce script montre comment un conseiller peut être membre de plusieurs équipes.
 * 
 * Usage: npx tsx scripts/exemple-multi-equipes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function demonstrationMultiEquipes() {
  console.log('📚 Démonstration : Conseiller dans plusieurs équipes\n');

  // 0. Trouver un admin pour les opérations
  const admin = await prisma.utilisateur.findFirst({
    where: {
      role: 'ADMIN',
      actif: true,
    },
  });

  if (!admin) {
    console.log('⚠️  Aucun admin trouvé.');
    return;
  }

  // 1. Trouver un conseiller
  const conseiller = await prisma.utilisateur.findFirst({
    where: {
      role: 'CONSEILLER',
      actif: true,
    },
  });

  if (!conseiller) {
    console.log('⚠️  Aucun conseiller trouvé. Créez d\'abord un utilisateur CONSEILLER.');
    return;
  }

  console.log(`✓ Conseiller trouvé: ${conseiller.email}`);
  const nomComplet = conseiller.prenom && conseiller.nom 
    ? `${conseiller.prenom} ${conseiller.nom}`
    : conseiller.email;

  // 2. Trouver les équipes A et B
  const equipeA = await prisma.equipeConseiller.findUnique({
    where: { code: 'EQ-A' },
  });

  const equipeB = await prisma.equipeConseiller.findUnique({
    where: { code: 'EQ-B' },
  });

  if (!equipeA || !equipeB) {
    console.log('⚠️  Équipes A ou B non trouvées. Lancez le seed des équipes d\'abord.');
    console.log('   Commande: npm run seed:equipes-conseiller');
    return;
  }

  console.log(`✓ Équipe A trouvée: ${equipeA.nom}`);
  console.log(`✓ Équipe B trouvée: ${equipeB.nom}\n`);

  // 3. Ajouter le conseiller aux deux équipes
  console.log('🔄 Ajout du conseiller aux équipes...\n');

  // Ajouter à l'Équipe A
  const membreA = await prisma.equipeConseillerMembre.upsert({
    where: {
      equipeConseillerId_utilisateurId: {
        equipeConseillerId: equipeA.id,
        utilisateurId: conseiller.id,
      },
    },
    create: {
      equipeConseillerId: equipeA.id,
      utilisateurId: conseiller.id,
      role: 'MEMBRE',
      ajoutePar: admin.id,
    },
    update: {
      actif: true,
    },
  });

  console.log(`  ✅ Ajouté à l'Équipe A (${equipeA.code}) comme ${membreA.role}`);

  // Ajouter à l'Équipe B (comme CHEF pour montrer qu'on peut avoir des rôles différents)
  const membreB = await prisma.equipeConseillerMembre.upsert({
    where: {
      equipeConseillerId_utilisateurId: {
        equipeConseillerId: equipeB.id,
        utilisateurId: conseiller.id,
      },
    },
    create: {
      equipeConseillerId: equipeB.id,
      utilisateurId: conseiller.id,
      role: 'CHEF',
      ajoutePar: admin.id,
    },
    update: {
      actif: true,
    },
  });

  console.log(`  ✅ Ajouté à l'Équipe B (${equipeB.code}) comme ${membreB.role}\n`);

  // 4. Vérifier les équipes du conseiller
  const equipesConseiller = await prisma.equipeConseillerMembre.findMany({
    where: {
      utilisateurId: conseiller.id,
      actif: true,
    },
    include: {
      equipeConseiller: true,
    },
    orderBy: {
      equipeConseiller: { code: 'asc' },
    },
  });

  console.log(`📋 ${nomComplet} est membre de ${equipesConseiller.length} équipe(s):`);
  equipesConseiller.forEach(membre => {
    const roleIcon = membre.role === 'CHEF' ? '👑' : '👤';
    console.log(`   ${roleIcon} ${membre.equipeConseiller.nom} (${membre.equipeConseiller.code}) - ${membre.role}`);
  });

  console.log('\n✅ Démonstration terminée !');
  console.log('💡 Points clés :');
  console.log('   • Un conseiller peut appartenir à plusieurs équipes');
  console.log('   • Il peut avoir des rôles différents dans chaque équipe');
  console.log('   • La contrainte unique empêche les doublons dans une même équipe');
}

async function main() {
  try {
    await demonstrationMultiEquipes();
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
