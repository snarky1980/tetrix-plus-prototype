/**
 * Script pour réinitialiser tous les mots de passe à "password123"
 * et s'assurer que les comptes génériques fonctionnent
 * 
 * Usage: npx tsx scripts/reset-all-passwords.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

interface GenericAccount {
  email: string;
  role: Role;
  description: string;
  traducteurData?: {
    nom: string;
    divisions: string[];
    domaines: string[];
    classification: string;
    paires: { langueSource: string; langueCible: string }[];
  };
}

const GENERIC_ACCOUNTS: GenericAccount[] = [
  {
    email: 'admin@tetrix.com',
    role: Role.ADMIN,
    description: 'Administrateur système',
  },
  {
    email: 'conseiller@tetrix.com',
    role: Role.CONSEILLER,
    description: 'Conseiller - Planification globale',
  },
  {
    email: 'gestionnaire@tetrix.com',
    role: Role.GESTIONNAIRE,
    description: 'Gestionnaire - Vue divisions',
  },
  {
    email: 'traducteur@tetrix.com',
    role: Role.TRADUCTEUR,
    description: 'Traducteur - Vue personnelle',
    traducteurData: {
      nom: 'Générique, Traducteur',
      divisions: ['CISR', 'Droit 1', 'Finance'],
      domaines: ['Général', 'Juridique', 'Finance'],
      classification: 'TR-02',
      paires: [
        { langueSource: 'EN', langueCible: 'FR' },
        { langueSource: 'FR', langueCible: 'EN' },
      ],
    },
  },
];

const PLAYGROUND_ACCOUNTS: GenericAccount[] = [
  {
    email: 'playground-admin@tetrix.com',
    role: Role.ADMIN,
    description: 'Playground - Portail Admin',
  },
  {
    email: 'playground-conseiller@tetrix.com',
    role: Role.CONSEILLER,
    description: 'Playground - Portail Conseiller',
  },
  {
    email: 'playground-gestionnaire@tetrix.com',
    role: Role.GESTIONNAIRE,
    description: 'Playground - Portail Gestionnaire',
  },
  {
    email: 'playground-traducteur@tetrix.com',
    role: Role.TRADUCTEUR,
    description: 'Playground - Portail Traducteur',
    traducteurData: {
      nom: 'Playground, Test',
      divisions: ['CISR', 'Droit 1'],
      domaines: ['Général'],
      classification: 'TR-01',
      paires: [
        { langueSource: 'EN', langueCible: 'FR' },
        { langueSource: 'FR', langueCible: 'EN' },
      ],
    },
  },
];

async function resetAllPasswords() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔐 Réinitialisation des mots de passe - Tetrix PLUS      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // Réinitialiser tous les mots de passe
  const result = await prisma.utilisateur.updateMany({
    data: { motDePasse: hashedPassword },
  });

  console.log(`✅ ${result.count} comptes réinitialisés avec le mot de passe "${PASSWORD}"\n`);
}

async function ensureGenericAccounts() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👤 Configuration des comptes génériques                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const allDivisions = await prisma.division.findMany();

  for (const account of GENERIC_ACCOUNTS) {
    console.log(`\n📌 ${account.email} (${account.role})`);
    
    let user = await prisma.utilisateur.findUnique({
      where: { email: account.email },
      include: { traducteur: true },
    });

    if (!user) {
      // Créer le compte
      if (account.role === Role.TRADUCTEUR && account.traducteurData) {
        user = await prisma.utilisateur.create({
          data: {
            email: account.email,
            motDePasse: hashedPassword,
            role: account.role,
            actif: true,
            traducteur: {
              create: {
                nom: account.traducteurData.nom,
                divisions: account.traducteurData.divisions,
                domaines: account.traducteurData.domaines,
                classification: account.traducteurData.classification,
                capaciteHeuresParJour: 7.5,
                actif: true,
                clientsHabituels: [],
              },
            },
          },
          include: { traducteur: true },
        });
        console.log(`   ✓ Compte créé avec profil traducteur`);
      } else {
        user = await prisma.utilisateur.create({
          data: {
            email: account.email,
            motDePasse: hashedPassword,
            role: account.role,
            actif: true,
          },
          include: { traducteur: true },
        });
        console.log(`   ✓ Compte créé`);
      }
    } else {
      // Mettre à jour
      await prisma.utilisateur.update({
        where: { id: user.id },
        data: { 
          motDePasse: hashedPassword, 
          actif: true,
          role: account.role,
        },
      });
      console.log(`   ↻ Compte mis à jour`);
    }

    // Configurer les accès aux divisions pour CONSEILLER et GESTIONNAIRE
    if (account.role === Role.CONSEILLER || account.role === Role.GESTIONNAIRE) {
      await prisma.divisionAccess.deleteMany({
        where: { utilisateurId: user.id },
      });

      for (const division of allDivisions) {
        await prisma.divisionAccess.create({
          data: {
            utilisateurId: user.id,
            divisionId: division.id,
            peutLire: true,
            peutEcrire: true,
            peutGerer: account.role === Role.GESTIONNAIRE,
          },
        });
      }
      console.log(`   ✓ Accès à ${allDivisions.length} divisions`);
    }

    // Configurer les paires linguistiques pour traducteur
    if (account.role === Role.TRADUCTEUR && account.traducteurData && user.traducteur) {
      await prisma.paireLinguistique.deleteMany({
        where: { traducteurId: user.traducteur.id },
      });

      for (const paire of account.traducteurData.paires) {
        await prisma.paireLinguistique.create({
          data: {
            traducteurId: user.traducteur.id,
            langueSource: paire.langueSource,
            langueCible: paire.langueCible,
          },
        });
      }
      console.log(`   ✓ ${account.traducteurData.paires.length} paires linguistiques`);
    }
  }
}

async function ensurePlaygroundAccounts() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎮 Configuration des comptes Playground                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const allDivisions = await prisma.division.findMany();

  for (const account of PLAYGROUND_ACCOUNTS) {
    console.log(`\n🎮 ${account.email} (${account.role})`);
    
    let user = await prisma.utilisateur.findUnique({
      where: { email: account.email },
      include: { traducteur: true },
    });

    if (!user) {
      // Créer le compte
      if (account.role === Role.TRADUCTEUR && account.traducteurData) {
        user = await prisma.utilisateur.create({
          data: {
            email: account.email,
            motDePasse: hashedPassword,
            role: account.role,
            actif: true,
            traducteur: {
              create: {
                nom: account.traducteurData.nom,
                divisions: account.traducteurData.divisions,
                domaines: account.traducteurData.domaines,
                classification: account.traducteurData.classification,
                capaciteHeuresParJour: 7.5,
                actif: true,
                clientsHabituels: [],
              },
            },
          },
          include: { traducteur: true },
        });
        console.log(`   ✓ Compte créé avec profil traducteur`);
      } else {
        user = await prisma.utilisateur.create({
          data: {
            email: account.email,
            motDePasse: hashedPassword,
            role: account.role,
            actif: true,
          },
          include: { traducteur: true },
        });
        console.log(`   ✓ Compte créé`);
      }
    } else {
      // Mettre à jour
      await prisma.utilisateur.update({
        where: { id: user.id },
        data: { 
          motDePasse: hashedPassword, 
          actif: true,
          role: account.role,
        },
      });
      console.log(`   ↻ Compte mis à jour`);
    }

    // Configurer les accès aux divisions pour CONSEILLER et GESTIONNAIRE
    if (account.role === Role.CONSEILLER || account.role === Role.GESTIONNAIRE) {
      await prisma.divisionAccess.deleteMany({
        where: { utilisateurId: user.id },
      });

      for (const division of allDivisions) {
        await prisma.divisionAccess.create({
          data: {
            utilisateurId: user.id,
            divisionId: division.id,
            peutLire: true,
            peutEcrire: true,
            peutGerer: account.role === Role.GESTIONNAIRE,
          },
        });
      }
      console.log(`   ✓ Accès à ${allDivisions.length} divisions`);
    }

    // Configurer les paires linguistiques pour traducteur
    if (account.role === Role.TRADUCTEUR && account.traducteurData && user.traducteur) {
      await prisma.paireLinguistique.deleteMany({
        where: { traducteurId: user.traducteur.id },
      });

      for (const paire of account.traducteurData.paires) {
        await prisma.paireLinguistique.create({
          data: {
            traducteurId: user.traducteur.id,
            langueSource: paire.langueSource,
            langueCible: paire.langueCible,
          },
        });
      }
      console.log(`   ✓ ${account.traducteurData.paires.length} paires linguistiques`);
    }
  }
}

async function showSummary() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  📋 RÉCAPITULATIF DES COMPTES                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🔑 Mot de passe commun: ${PASSWORD}\n`);

  console.log('┌─────────────────────────────────────────┬──────────────┬────────┐');
  console.log('│ Email                                   │ Rôle         │ Actif  │');
  console.log('├─────────────────────────────────────────┼──────────────┼────────┤');

  const allAccounts = [...GENERIC_ACCOUNTS, ...PLAYGROUND_ACCOUNTS];
  
  for (const account of allAccounts) {
    const user = await prisma.utilisateur.findUnique({
      where: { email: account.email },
    });

    if (user) {
      const email = account.email.padEnd(39);
      const role = user.role.padEnd(12);
      const actif = user.actif ? '✓ OUI ' : '✗ NON ';
      console.log(`│ ${email} │ ${role} │ ${actif} │`);
    }
  }

  console.log('└─────────────────────────────────────────┴──────────────┴────────┘');

  console.log('\n🎯 COMPTES GÉNÉRIQUES:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  👑 admin@tetrix.com          → Portail Admin');
  console.log('  📋 conseiller@tetrix.com     → Portail Conseiller');
  console.log('  👔 gestionnaire@tetrix.com   → Portail Gestionnaire');
  console.log('  🔤 traducteur@tetrix.com     → Portail Traducteur');

  console.log('\n🎮 COMPTES PLAYGROUND:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  👑 playground-admin@tetrix.com          → Test Admin');
  console.log('  📋 playground-conseiller@tetrix.com     → Test Conseiller');
  console.log('  👔 playground-gestionnaire@tetrix.com   → Test Gestionnaire');
  console.log('  🔤 playground-traducteur@tetrix.com     → Test Traducteur');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Configuration terminée !');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function main() {
  try {
    await resetAllPasswords();
    await ensureGenericAccounts();
    await ensurePlaygroundAccounts();
    await showSummary();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
