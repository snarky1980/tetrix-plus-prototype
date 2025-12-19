import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Correction des comptes génériques\n');
  console.log('═'.repeat(80));

  // 1. CONSEILLER - Accès à TOUTES les divisions
  console.log('\n📋 1. Configuration du conseiller...');
  const conseiller = await prisma.utilisateur.findUnique({ 
    where: { email: 'conseiller@tetrix.com' } 
  });
  
  if (conseiller) {
    // Récupérer toutes les divisions
    const allDivisions = await prisma.division.findMany();
    console.log(`   Trouvé ${allDivisions.length} divisions`);
    
    // Supprimer les accès existants
    await prisma.divisionAccess.deleteMany({
      where: { utilisateurId: conseiller.id }
    });
    
    // Créer les accès pour toutes les divisions
    for (const division of allDivisions) {
      await prisma.divisionAccess.create({
        data: {
          utilisateurId: conseiller.id,
          divisionId: division.id
        }
      });
    }
    console.log(`   ✅ Accès accordé à ${allDivisions.length} divisions`);
  } else {
    console.log('   ❌ Conseiller non trouvé');
  }

  // 2. TRADUCTEUR - Ajouter les paires linguistiques
  console.log('\n🌐 2. Configuration du traducteur...');
  const traducteur = await prisma.utilisateur.findUnique({ 
    where: { email: 'traducteur@tetrix.com' },
    include: { traducteur: true }
  });
  
  if (traducteur && traducteur.traducteur) {
    const tradProfile = traducteur.traducteur;
    
    // Supprimer les paires existantes
    await prisma.paireLinguistique.deleteMany({
      where: { traducteurId: tradProfile.id }
    });
    
    // Ajouter les paires linguistiques
    const paires = [
      { langueSource: 'EN', langueCible: 'FR' },
      { langueSource: 'FR', langueCible: 'EN' },
      { langueSource: 'ES', langueCible: 'FR' },
      { langueSource: 'FR', langueCible: 'ES' },
    ];
    
    for (const paire of paires) {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: tradProfile.id,
          ...paire
        }
      });
    }
    console.log(`   ✅ ${paires.length} paires linguistiques ajoutées`);
  } else {
    console.log('   ❌ Traducteur non trouvé ou profil manquant');
  }

  // 3. GESTIONNAIRE - Créer le compte
  console.log('\n👔 3. Configuration du gestionnaire...');
  let gestionnaire = await prisma.utilisateur.findUnique({ 
    where: { email: 'gestionnaire@tetrix.com' } 
  });
  
  if (!gestionnaire) {
    // Créer le compte gestionnaire
    const hash = await bcrypt.hash('password123', 10);
    gestionnaire = await prisma.utilisateur.create({
      data: {
        email: 'gestionnaire@tetrix.com',
        motDePasse: hash,
        role: Role.CONSEILLER, // Les gestionnaires ont le rôle CONSEILLER
        actif: true,
      },
    });
    console.log('   ✅ Compte gestionnaire créé');
  } else {
    console.log('   ↻ Compte gestionnaire existant');
  }
  
  // Donner accès aux divisions principales
  const divisionsPrincipales = await prisma.division.findMany({
    where: {
      nom: {
        in: ['FINANCE', 'LEGAL', 'TECH', 'MEDICAL', 'MARKETING']
      }
    }
  });
  
  // Supprimer les accès existants
  await prisma.divisionAccess.deleteMany({
    where: { utilisateurId: gestionnaire.id }
  });
  
  // Créer les accès
  for (const division of divisionsPrincipales) {
    await prisma.divisionAccess.create({
      data: {
        utilisateurId: gestionnaire.id,
        divisionId: division.id
      }
    });
  }
  console.log(`   ✅ Accès accordé à ${divisionsPrincipales.length} divisions`);

  // RÉCAPITULATIF FINAL
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RÉCAPITULATIF FINAL\n');
  
  const accounts = [
    'admin@tetrix.com',
    'conseiller@tetrix.com',
    'gestionnaire@tetrix.com',
    'traducteur@tetrix.com'
  ];

  for (const email of accounts) {
    const user = await prisma.utilisateur.findUnique({ 
      where: { email },
      include: { traducteur: { include: { pairesLinguistiques: true } } }
    });
    
    if (!user) continue;
    
    console.log(`✅ ${email}`);
    console.log(`   Rôle: ${user.role} | Actif: ${user.actif ? 'OUI' : 'NON'}`);
    
    if (user.role === 'CONSEILLER') {
      const divisions = await prisma.divisionAccess.count({
        where: { utilisateurId: user.id }
      });
      console.log(`   Divisions: ${divisions}`);
    }
    
    if (user.traducteur) {
      console.log(`   Profil: ${user.traducteur.nom}`);
      console.log(`   Paires linguistiques: ${user.traducteur.pairesLinguistiques.length}`);
    }
    console.log('');
  }
  
  console.log('═'.repeat(80));
  console.log('\n✅ Configuration terminée !');
  console.log('\n🔑 Tous les comptes utilisent le mot de passe: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
