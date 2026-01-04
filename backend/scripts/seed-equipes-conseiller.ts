/**
 * Script de seed pour créer les équipes conseillers initiales
 * 
 * Équipes à créer:
 * - Équipe A, B, C, D, G
 * - Équipe Anglo
 * 
 * Usage: npx tsx scripts/seed-equipes-conseiller.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const equipesInitiales = [
  {
    nom: 'Équipe A',
    code: 'EQ-A',
    description: 'Équipe de conseillers A',
    couleur: '#3B82F6', // blue-500
  },
  {
    nom: 'Équipe B',
    code: 'EQ-B',
    description: 'Équipe de conseillers B',
    couleur: '#10B981', // green-500
  },
  {
    nom: 'Équipe C',
    code: 'EQ-C',
    description: 'Équipe de conseillers C',
    couleur: '#F59E0B', // amber-500
  },
  {
    nom: 'Équipe D',
    code: 'EQ-D',
    description: 'Équipe de conseillers D',
    couleur: '#EF4444', // red-500
  },
  {
    nom: 'Équipe G',
    code: 'EQ-G',
    description: 'Équipe de conseillers G',
    couleur: '#8B5CF6', // violet-500
  },
  {
    nom: 'Équipe Anglo',
    code: 'EQ-ANGLO',
    description: 'Équipe de conseillers anglophones',
    couleur: '#EC4899', // pink-500
  },
];

async function seedEquipesConseiller() {
  console.log('🌱 Seed des équipes conseillers...\n');

  // Trouver un utilisateur admin pour créer les équipes
  const admin = await prisma.utilisateur.findFirst({
    where: { role: 'ADMIN', actif: true },
  });

  if (!admin) {
    console.error('❌ Aucun utilisateur ADMIN trouvé. Créez d\'abord un admin.');
    return;
  }

  console.log(`✓ Utilisation de l'admin: ${admin.email}\n`);

  let created = 0;
  let skipped = 0;

  for (const equipeData of equipesInitiales) {
    // Vérifier si l'équipe existe déjà
    const existante = await prisma.equipeConseiller.findUnique({
      where: { code: equipeData.code },
    });

    if (existante) {
      console.log(`⏭️  ${equipeData.nom} (${equipeData.code}) existe déjà`);
      skipped++;
      continue;
    }

    // Créer l'équipe
    const equipe = await prisma.equipeConseiller.create({
      data: {
        ...equipeData,
        creePar: admin.id,
      },
    });

    console.log(`✅ ${equipe.nom} (${equipe.code}) créée - couleur: ${equipe.couleur}`);
    created++;
  }

  console.log('\n📊 Résumé:');
  console.log(`   • ${created} équipe(s) créée(s)`);
  console.log(`   • ${skipped} équipe(s) existante(s)`);

  // Afficher toutes les équipes
  const toutesLesEquipes = await prisma.equipeConseiller.findMany({
    orderBy: { code: 'asc' },
    select: {
      nom: true,
      code: true,
      couleur: true,
      actif: true,
      _count: {
        select: { membres: true },
      },
    },
  });

  console.log('\n📋 Équipes conseillers dans le système:');
  toutesLesEquipes.forEach(eq => {
    const status = eq.actif ? '✓' : '✗';
    console.log(`   ${status} ${eq.nom.padEnd(20)} (${eq.code.padEnd(10)}) - ${eq._count.membres} membre(s)`);
  });
}

async function main() {
  try {
    await seedEquipesConseiller();
  } catch (error) {
    console.error('\n❌ Erreur lors du seed:', error);
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
