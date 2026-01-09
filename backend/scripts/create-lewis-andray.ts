/**
 * Script pour créer un compte playground pour Lewis-Andray Qhutur
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function creerCompte() {
  const nom = 'Lewis-Andray Qhutur';
  const email = 'lewis-andray.qhutur@playground.tetrix.com';
  const motDePasse = await bcrypt.hash('playground123', 10);
  
  // Trouver l'utilisateur existant (créé avant l'erreur)
  let utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
  
  if (!utilisateur) {
    utilisateur = await prisma.utilisateur.create({
      data: {
        email,
        motDePasse,
        nom: 'Qhutur',
        prenom: 'Lewis-Andray',
        role: 'TRADUCTEUR',
        actif: true,
        isPlayground: true,
      }
    });
    console.log('✅ Utilisateur créé:', utilisateur.email);
  } else {
    console.log('⏭️ Utilisateur existe déjà:', utilisateur.email);
  }
  
  // Vérifier si le traducteur existe déjà
  const existingTraducteur = await prisma.traducteur.findFirst({
    where: { utilisateurId: utilisateur.id }
  });
  
  if (existingTraducteur) {
    console.log('⏭️ Traducteur existe déjà:', existingTraducteur.nom);
    await prisma.$disconnect();
    return;
  }
  
  // Créer le profil traducteur
  const traducteur = await prisma.traducteur.create({
    data: {
      nom,
      utilisateurId: utilisateur.id,
      categorie: 'TR02',
      classification: 'TR-02',
      horaire: '08:00-16:00',
      capaciteHeuresParJour: 7,
      actif: true,
      disponiblePourTravail: true,
      necessiteRevision: true,
      domaines: ['TAG'],
      divisions: ['Playground'],
    }
  });
  console.log('✅ Traducteur créé:', traducteur.nom, '| ID:', traducteur.id);
  
  // Créer la paire linguistique
  await prisma.paireLinguistique.create({
    data: {
      traducteurId: traducteur.id,
      langueSource: 'EN',
      langueCible: 'FR',
    }
  });
  console.log('✅ Paire linguistique EN→FR créée');
  
  // Assigner à la division Playground
  const divPlayground = await prisma.division.findFirst({ where: { nom: 'Playground' } });
  if (divPlayground) {
    await prisma.traducteurDivision.create({
      data: {
        traducteurId: traducteur.id,
        divisionId: divPlayground.id,
      }
    });
    console.log('✅ Assigné à la division Playground');
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('🎮 Compte Playground créé avec succès!');
  console.log('════════════════════════════════════════');
  console.log('Email:', email);
  console.log('Mot de passe: playground123');
  console.log('Nom:', nom);
  console.log('Rôle: TRADUCTEUR');
  console.log('ID Traducteur:', traducteur.id);
  console.log('════════════════════════════════════════');
  
  await prisma.$disconnect();
}

creerCompte();
