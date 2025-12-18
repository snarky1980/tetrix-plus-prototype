/**
 * Script de restauration COMPLÈTE de tous les traducteurs réels
 * Restaure les 113 traducteurs depuis /tmp/traducteurs_complets.json
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface TraducteurData {
  nom: string;
  division: string;
  classification: string;
  capaciteHeuresParJour: number;
  clientsHabituels: string[];
  domaines: string[];
  pairesLinguistiques: Array<{ langueSource: string; langueCible: string }>;
  specialisations?: string[];
}

function generateEmail(nom: string): string {
  // Convertir "Nom, Prénom" en "prenom.nom@tetrix.com"
  const parts = nom.split(',').map(p => p.trim());
  if (parts.length === 2) {
    const [familyName, givenName] = parts;
    const email = `${givenName.toLowerCase()}.${familyName.toLowerCase()}@tetrix.com`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9.@]/g, '-') // Remplacer caractères spéciaux par tiret
      .replace(/--+/g, '-'); // Éviter doubles tirets
    return email;
  }
  // Fallback pour noms non standards
  return nom.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@tetrix.com';
}

async function restoreAllTraducteurs() {
  console.log('🚀 Restauration COMPLÈTE de tous les traducteurs réels...\n');

  // Lire le fichier JSON
  const jsonPath = '/tmp/traducteurs_complets.json';
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Fichier /tmp/traducteurs_complets.json introuvable');
    return;
  }

  const traducteursData: TraducteurData[] = JSON.parse(
    fs.readFileSync(jsonPath, 'utf-8')
  );

  console.log(`📊 Nombre de traducteurs à restaurer: ${traducteursData.length}\n`);

  const defaultPassword = await bcrypt.hash('password123', 10);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const tradData of traducteursData) {
    const email = generateEmail(tradData.nom);
    
    try {
      // Vérifier si l'email existe déjà
      let user = await prisma.utilisateur.findUnique({
        where: { email }
      });

      if (!user) {
        // Créer l'utilisateur
        user = await prisma.utilisateur.create({
          data: {
            email,
            motDePasse: defaultPassword,
            role: 'TRADUCTEUR',
            actif: true
          }
        });
        console.log(`✅ Utilisateur créé: ${email}`);
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
            capaciteHeuresParJour: tradData.capaciteHeuresParJour,
            domaines: tradData.domaines,
            clientsHabituels: tradData.clientsHabituels,
            actif: true,
            disponiblePourTravail: false
          }
        });
        
        // Supprimer anciennes paires linguistiques
        await prisma.paireLinguistique.deleteMany({
          where: { traducteurId: existingTrad.id }
        });
        
        // Recréer les paires linguistiques
        if (tradData.pairesLinguistiques && tradData.pairesLinguistiques.length > 0) {
          await prisma.paireLinguistique.createMany({
            data: tradData.pairesLinguistiques.map(p => ({
              ...p,
              traducteurId: existingTrad.id
            }))
          });
        }
        
        console.log(`🔄 Traducteur mis à jour: ${tradData.nom}`);
        updated++;
      } else {
        // Créer le profil traducteur
        await prisma.traducteur.create({
          data: {
            nom: tradData.nom,
            division: tradData.division,
            classification: tradData.classification,
            capaciteHeuresParJour: tradData.capaciteHeuresParJour,
            domaines: tradData.domaines,
            clientsHabituels: tradData.clientsHabituels,
            actif: true,
            disponiblePourTravail: false,
            utilisateurId: user.id,
            pairesLinguistiques: {
              create: tradData.pairesLinguistiques || []
            }
          }
        });
        console.log(`✅ Traducteur créé: ${tradData.nom}`);
        created++;
      }

    } catch (error) {
      console.error(`❌ Erreur pour ${tradData.nom}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Résumé de la restauration:');
  console.log(`   ✅ Créés: ${created}`);
  console.log(`   🔄 Mis à jour: ${updated}`);
  console.log(`   ❌ Erreurs: ${errors}`);
  console.log(`   📋 Total: ${traducteursData.length}`);
  
  // Afficher statistiques par division
  console.log('\n\n=== STATISTIQUES PAR DIVISION ===\n');
  const allTrad = await prisma.traducteur.findMany({
    where: { actif: true },
    select: { division: true }
  });

  const divisionCounts = allTrad.reduce((acc, t) => {
    acc[t.division] = (acc[t.division] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(divisionCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([division, count]) => {
      console.log(`${division}: ${count} traducteurs`);
    });

  console.log(`\n📊 TOTAL: ${allTrad.length} traducteurs actifs`);
}

restoreAllTraducteurs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
