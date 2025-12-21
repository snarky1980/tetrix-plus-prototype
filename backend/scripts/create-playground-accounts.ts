/**
 * Script pour créer des comptes "playground" pour chaque portail
 * 
 * Usage: npx ts-node scripts/create-playground-accounts.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface PlaygroundAccount {
  email: string;
  role: Role;
  description: string;
  traducteurNom?: string;
}

const PLAYGROUND_ACCOUNTS: PlaygroundAccount[] = [
  {
    email: 'playground-admin@tetrix.com',
    role: Role.ADMIN,
    description: 'Portail Administrateur - Gestion complète du système',
  },
  {
    email: 'playground-conseiller@tetrix.com',
    role: Role.CONSEILLER,
    description: 'Portail Conseiller - Planification et gestion des tâches',
  },
  {
    email: 'playground-gestionnaire@tetrix.com',
    role: Role.GESTIONNAIRE,
    description: 'Portail Gestionnaire - Vue division et équipes',
  },
  {
    email: 'playground-traducteur@tetrix.com',
    role: Role.TRADUCTEUR,
    description: 'Portail Traducteur - Vue personnelle et planification',
    traducteurNom: 'Playground, Test',
  },
];

const PASSWORD = 'playground123';

async function createPlaygroundAccounts() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🎮 Création des comptes Playground - Tetrix PLUS      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const results: { email: string; status: string; role: string }[] = [];

  for (const account of PLAYGROUND_ACCOUNTS) {
    try {
      // Vérifier si le compte existe déjà
      const existingUser = await prisma.utilisateur.findUnique({
        where: { email: account.email },
        include: { traducteur: true },
      });

      if (existingUser) {
        // Mettre à jour le mot de passe si le compte existe
        await prisma.utilisateur.update({
          where: { email: account.email },
          data: { motDePasse: hashedPassword, actif: true },
        });
        results.push({ email: account.email, status: '↻ Mis à jour', role: account.role });
        console.log(`↻ ${account.email} - Mot de passe mis à jour`);
      } else {
        // Créer le compte
        if (account.role === Role.TRADUCTEUR && account.traducteurNom) {
          // Pour le traducteur, créer l'utilisateur ET le profil traducteur ensemble
          await prisma.utilisateur.create({
            data: {
              email: account.email,
              motDePasse: hashedPassword,
              role: account.role,
              actif: true,
              traducteur: {
                create: {
                  nom: account.traducteurNom,
                  division: 'Playground',
                  classification: 'TR-01',
                  actif: true,
                  capaciteHeuresParJour: 7,
                  horaire: '9h-17h',
                  domaines: ['Général'],
                },
              },
            },
          });
          console.log(`  ✓ Profil traducteur créé: ${account.traducteurNom}`);
        } else {
          await prisma.utilisateur.create({
            data: {
              email: account.email,
              motDePasse: hashedPassword,
              role: account.role,
              actif: true,
            },
          });
        }

        results.push({ email: account.email, status: '✓ Créé', role: account.role });
        console.log(`✓ ${account.email} - Compte créé`);
      }
    } catch (error: any) {
      results.push({ email: account.email, status: `✗ Erreur: ${error.message}`, role: account.role });
      console.error(`✗ ${account.email} - Erreur: ${error.message}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📋 RÉSUMÉ DES COMPTES PLAYGROUND');
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log(`🔑 Mot de passe commun: ${PASSWORD}\n`);

  console.log('┌─────────────────────────────────────────┬──────────────┬────────────────┐');
  console.log('│ Email                                   │ Rôle         │ Statut         │');
  console.log('├─────────────────────────────────────────┼──────────────┼────────────────┤');

  for (const result of results) {
    const email = result.email.padEnd(39);
    const role = result.role.padEnd(12);
    const status = result.status.padEnd(14);
    console.log(`│ ${email} │ ${role} │ ${status} │`);
  }

  console.log('└─────────────────────────────────────────┴──────────────┴────────────────┘');

  console.log('\n🎮 ACCÈS AUX PORTAILS:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log('👑 ADMIN         → playground-admin@tetrix.com');
  console.log('   Accès: Administration système, gestion utilisateurs, divisions');
  console.log('');
  console.log('📋 CONSEILLER    → playground-conseiller@tetrix.com');
  console.log('   Accès: Planification globale, création tâches, statistiques');
  console.log('');
  console.log('👔 GESTIONNAIRE  → playground-gestionnaire@tetrix.com');
  console.log('   Accès: Vue équipes par division, blocages, planification');
  console.log('');
  console.log('🔤 TRADUCTEUR    → playground-traducteur@tetrix.com');
  console.log('   Accès: Mon tableau de bord, mes tâches, disponibilité');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function main() {
  try {
    await createPlaygroundAccounts();
  } catch (error) {
    console.error('Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
