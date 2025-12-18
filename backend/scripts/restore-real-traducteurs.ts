/**
 * Script de restauration des traducteurs réels
 * Basé sur TESTS-PRODUCTION-REALISTES.md
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface TraducteurData {
  nom: string;
  email: string;
  division: string;
  classification: string;
  horaire: string;
  capaciteHeuresParJour: number;
  pairesLinguistiques: Array<{ langueSource: string; langueCible: string }>;
  domaines: string[];
  specialisations?: string[];
}

const TRADUCTEURS_REELS: TraducteurData[] = [
  {
    nom: 'Parent, Geneviève',
    email: 'genevieve.parent@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '9h-17h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Ahlgren, Anna',
    email: 'anna.ahlgren@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '9h-17h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Baillargeon, Véronique',
    email: 'veronique.baillargeon@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '8h30-16h30',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Bayer, Annie',
    email: 'annie.bayer@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '8h-16h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Bel Hassan, Meriem',
    email: 'meriem.belhossan@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '11h-19h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Bergeron, Julie',
    email: 'julie.bergeron@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '8h30-16h30',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Bissonnette, Julie-Marie',
    email: 'julie-marie.bissonnette@tetrix.com',
    division: 'Droit 2',
    classification: 'TR-03',
    horaire: '9h-17h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['LEGAL'],
    specialisations: ['Droit']
  },
  {
    nom: 'Blais, Marie-France',
    email: 'marie-france.blais@tetrix.com',
    division: 'Droit 2',
    classification: 'TR-03',
    horaire: '8h-16h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['LEGAL'],
    specialisations: ['Droit']
  },
  {
    nom: 'Charette, Léanne',
    email: 'leanne.charette@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '7h-15h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Gagnon, Hugo',
    email: 'hugo.gagnon@tetrix.com',
    division: 'CISR',
    classification: 'TR-03',
    horaire: '9h-17h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'EN', langueCible: 'FR' }],
    domaines: ['TAG', 'IMM'],
    specialisations: ['CISR']
  },
  {
    nom: 'Kadnikov, Patrick',
    email: 'patrick.kadnikov@tetrix.com',
    division: 'Trad. anglaise 1',
    classification: 'TR-03',
    horaire: '9h-17h',
    capaciteHeuresParJour: 7,
    pairesLinguistiques: [{ langueSource: 'FR', langueCible: 'EN' }],
    domaines: ['GENERAL'],
    specialisations: []
  }
];

async function restoreRealTraducteurs() {
  console.log('🔄 Restauration des traducteurs réels...\n');

  const defaultPassword = await bcrypt.hash('password123', 10);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tradData of TRADUCTEURS_REELS) {
    try {
      // Vérifier si l'email existe déjà
      let user = await prisma.utilisateur.findUnique({
        where: { email: tradData.email }
      });

      if (!user) {
        // Créer l'utilisateur
        user = await prisma.utilisateur.create({
          data: {
            email: tradData.email,
            motDePasse: defaultPassword,
            role: 'TRADUCTEUR',
            actif: true
          }
        });
        console.log(`✅ Utilisateur créé: ${tradData.email}`);
      }

      // Vérifier si le traducteur existe
      const existingTrad = await prisma.traducteur.findFirst({
        where: { utilisateurId: user.id }
      });

      if (existingTrad) {
        // Mettre à jour le traducteur existant
        await prisma.traducteur.update({
          where: { id: existingTrad.id },
          data: {
            nom: tradData.nom,
            division: tradData.division,
            classification: tradData.classification,
            horaire: tradData.horaire,
            capaciteHeuresParJour: tradData.capaciteHeuresParJour,
            domaines: tradData.domaines,
            specialisations: tradData.specialisations || [],
            actif: true,
            disponiblePourTravail: true
          }
        });
        
        // Supprimer anciennes paires linguistiques
        await prisma.paireLinguistique.deleteMany({
          where: { traducteurId: existingTrad.id }
        });
        
        // Recréer les paires linguistiques
        await prisma.paireLinguistique.createMany({
          data: tradData.pairesLinguistiques.map(p => ({
            ...p,
            traducteurId: existingTrad.id
          }))
        });
        
        console.log(`🔄 Traducteur mis à jour: ${tradData.nom}`);
        updated++;
      } else {
        // Créer le profil traducteur
        await prisma.traducteur.create({
          data: {
            nom: tradData.nom,
            division: tradData.division,
            classification: tradData.classification,
            horaire: tradData.horaire,
            capaciteHeuresParJour: tradData.capaciteHeuresParJour,
            domaines: tradData.domaines,
            specialisations: tradData.specialisations || [],
            actif: true,
            disponiblePourTravail: true,
            utilisateurId: user.id,
            pairesLinguistiques: {
              create: tradData.pairesLinguistiques
            }
          }
        });
        console.log(`✅ Traducteur créé: ${tradData.nom}`);
        created++;
      }

    } catch (error) {
      console.error(`❌ Erreur pour ${tradData.nom}:`, error);
      skipped++;
    }
  }

  console.log('\n📊 Résumé:');
  console.log(`   Créés: ${created}`);
  console.log(`   Mis à jour: ${updated}`);
  console.log(`   Erreurs: ${skipped}`);
  console.log(`   Total: ${TRADUCTEURS_REELS.length}`);
  
  // Afficher tous les traducteurs
  console.log('\n\n=== TRADUCTEURS ACTUELS ===\n');
  const allTrad = await prisma.traducteur.findMany({
    include: {
      utilisateur: { select: { email: true } },
      pairesLinguistiques: true
    },
    orderBy: { nom: 'asc' }
  });

  allTrad.forEach((t, i) => {
    console.log(`${i + 1}. ${t.nom}`);
    console.log(`   Email: ${t.utilisateur.email}`);
    console.log(`   Division: ${t.division}`);
    console.log(`   Horaire: ${t.horaire}`);
    console.log(`   Classification: ${t.classification}`);
    console.log(`   Paires: ${t.pairesLinguistiques.map(p => `${p.langueSource}→${p.langueCible}`).join(', ')}`);
    console.log('');
  });
}

restoreRealTraducteurs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
