/**
 * ═══════════════════════════════════════════════════════════════════════
 * GÉNÉRATION DES PSEUDONYMES POUR TOUS LES TRADUCTEURS
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Ce script génère les pseudonymes pour tous les traducteurs réels
 * et crée un fichier JSON de mapping pour la migration.
 * 
 * Usage: npx tsx scripts/generate-all-pseudonyms.ts
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client';
import { generatePseudonym, isGenericAccount, resolveCollision, Pseudonym } from '../src/utils/pseudonymGenerator';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TranslatorMapping {
  traducteurId: string;
  realName: string;
  realEmail: string;
  pseudonymName: string;
  pseudonymEmail: string;
}

async function generateAllPseudonyms() {
  console.log('\n🔄 GÉNÉRATION DES PSEUDONYMES\n');
  console.log('═'.repeat(70) + '\n');

  try {
    // Récupérer tous les traducteurs avec leur utilisateur
    const traducteurs = await prisma.traducteur.findMany({
      include: {
        utilisateur: true
      },
      orderBy: {
        nom: 'asc'
      }
    });

    console.log(`📊 Total de traducteurs: ${traducteurs.length}\n`);

    // Filtrer les comptes génériques
    const realTranslators = traducteurs.filter(t => 
      !isGenericAccount(t.utilisateur.email)
    );

    console.log(`✅ Traducteurs réels à pseudonymiser: ${realTranslators.length}`);
    console.log(`⚠️  Comptes génériques (ignorés): ${traducteurs.length - realTranslators.length}\n`);

    // Générer pseudonymes et détecter collisions
    const mappings: TranslatorMapping[] = [];
    const usedPseudonyms = new Set<string>();
    const collisions: string[] = [];

    for (const traducteur of realTranslators) {
      // Générer pseudonyme initial
      let pseudonym = generatePseudonym(traducteur.id, traducteur.nom);
      const key = `${pseudonym.firstName}:${pseudonym.lastName}`;

      // Résoudre collision si nécessaire
      let attempt = 0;
      while (usedPseudonyms.has(key) && attempt < 26) {
        attempt++;
        pseudonym = resolveCollision(pseudonym, usedPseudonyms, attempt);
        collisions.push(`${traducteur.nom} → ${pseudonym.displayName} (tentative ${attempt})`);
      }

      usedPseudonyms.add(key);

      // Ajouter au mapping
      mappings.push({
        traducteurId: traducteur.id,
        realName: traducteur.nom,
        realEmail: traducteur.utilisateur.email,
        pseudonymName: pseudonym.displayName,
        pseudonymEmail: pseudonym.email
      });
    }

    console.log('─'.repeat(70));
    console.log(`\n✅ Pseudonymes générés: ${mappings.length}`);
    
    if (collisions.length > 0) {
      console.log(`⚠️  Collisions détectées et résolues: ${collisions.length}`);
      collisions.forEach(c => console.log(`   - ${c}`));
    } else {
      console.log(`✅ Aucune collision détectée`);
    }

    // Afficher échantillon
    console.log(`\n📋 ÉCHANTILLON (10 premiers):\n`);
    mappings.slice(0, 10).forEach(m => {
      console.log(`  ${m.realName}`);
      console.log(`    → ${m.pseudonymName}`);
      console.log(`    📧 ${m.realEmail} → ${m.pseudonymEmail}\n`);
    });

    // Sauvegarder dans un fichier JSON
    const outputPath = path.join(__dirname, '../prisma/pseudonym-mapping.json');
    fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));

    console.log('─'.repeat(70));
    console.log(`\n💾 Mapping sauvegardé: ${outputPath}`);
    console.log(`\n✅ GÉNÉRATION TERMINÉE\n`);

    // Statistiques
    console.log('📊 STATISTIQUES:');
    console.log(`   - Traducteurs traités: ${mappings.length}`);
    console.log(`   - Pseudonymes uniques: ${usedPseudonyms.size}`);
    console.log(`   - Collisions résolues: ${collisions.length}`);

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
generateAllPseudonyms().catch(console.error);
