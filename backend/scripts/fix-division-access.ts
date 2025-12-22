/**
 * Script pour corriger les accès aux divisions
 * 
 * Ce script:
 * 1. Crée les divisions manquantes basées sur les traducteurs
 * 2. Donne accès à toutes les divisions aux comptes admin/gestionnaire/conseiller génériques
 * 
 * Usage: npx ts-node scripts/fix-division-access.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Correction des accès aux divisions...\n');

  // 1. Récupérer toutes les divisions uniques des traducteurs
  const traducteurs = await prisma.traducteur.findMany();
  const divisionsFromTraducteurs = [...new Set(traducteurs.flatMap((t) => t.divisions).filter(Boolean))];
  console.log('📋 Divisions utilisées par les traducteurs:', divisionsFromTraducteurs);

  // 2. Créer les divisions manquantes
  for (const nom of divisionsFromTraducteurs) {
    const existing = await prisma.division.findFirst({ where: { nom } });
    if (!existing) {
      // Générer un code à partir du nom
      const code = nom
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10)
        .toUpperCase();
      
      await prisma.division.create({
        data: {
          nom,
          code,
          description: `Division ${nom}`
        }
      });
      console.log('✅ Division créée:', nom);
    }
  }

  // 3. Récupérer toutes les divisions
  const allDivisions = await prisma.division.findMany();
  console.log('\n📊 Total divisions:', allDivisions.length);

  // 4. Donner accès aux comptes génériques
  const comptes = [
    { email: 'admin@tetrix.com', role: 'ADMIN' },
    { email: 'gestionnaire@tetrix.com', role: 'GESTIONNAIRE' },
    { email: 'conseiller@tetrix.com', role: 'CONSEILLER' }
  ];

  for (const compte of comptes) {
    const user = await prisma.utilisateur.findUnique({ where: { email: compte.email } });
    if (!user) {
      console.log('⚠️ Compte non trouvé:', compte.email);
      continue;
    }

    for (const division of allDivisions) {
      await prisma.divisionAccess.upsert({
        where: {
          utilisateurId_divisionId: {
            utilisateurId: user.id,
            divisionId: division.id
          }
        },
        update: { 
          peutEcrire: true, 
          peutGerer: compte.role === 'ADMIN'
        },
        create: {
          utilisateurId: user.id,
          divisionId: division.id,
          peutLire: true,
          peutEcrire: true,
          peutGerer: compte.role === 'ADMIN'
        }
      });
    }
    console.log('✅ Accès corrigé pour:', compte.email, '- role:', compte.role);
  }

  console.log('\n🎉 Correction terminée!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
