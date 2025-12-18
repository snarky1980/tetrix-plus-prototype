/**
 * ═══════════════════════════════════════════════════════════════════════
 * MIGRATION: APPLICATION DES PSEUDONYMES
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Ce script applique les pseudonymes générés à la base de données.
 * 
 * ATTENTION: Cette opération modifie les données existantes !
 * 
 * Étapes:
 * 1. Backup des données originales
 * 2. Mise à jour des noms dans `traducteurs`
 * 3. Mise à jour des emails dans `utilisateurs`
 * 4. Vérification de l'intégrité
 * 
 * Usage: npx tsx scripts/apply-pseudonyms.ts [--dry-run] [--backup]
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client';
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

// Options de ligne de commande
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BACKUP = args.includes('--backup') || !DRY_RUN;

async function applyPseudonyms() {
  console.log('\n🔄 APPLICATION DES PSEUDONYMES\n');
  console.log('═'.repeat(70));
  
  if (DRY_RUN) {
    console.log('\n⚠️  MODE DRY-RUN: Aucune modification ne sera appliquée\n');
  }
  
  console.log('═'.repeat(70) + '\n');

  try {
    // 1. Charger le mapping
    console.log('📂 Chargement du mapping...');
    const mappingPath = path.join(__dirname, '../prisma/pseudonym-mapping.json');
    
    if (!fs.existsSync(mappingPath)) {
      throw new Error(`Fichier de mapping introuvable: ${mappingPath}`);
    }
    
    const mappings: TranslatorMapping[] = JSON.parse(
      fs.readFileSync(mappingPath, 'utf-8')
    );
    
    console.log(`   ✅ ${mappings.length} mappings chargés\n`);

    // 2. Backup si demandé
    if (BACKUP && !DRY_RUN) {
      console.log('💾 Création du backup...');
      
      const traducteurs = await prisma.traducteur.findMany({
        include: { utilisateur: true }
      });
      
      const backupPath = path.join(__dirname, `../prisma/backup-before-pseudonymization-${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(traducteurs, null, 2));
      
      console.log(`   ✅ Backup sauvegardé: ${backupPath}\n`);
    }

    // 3. Appliquer les pseudonymes
    console.log('🔄 Application des pseudonymes...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const mapping of mappings) {
      try {
        if (DRY_RUN) {
          console.log(`[DRY-RUN] ${mapping.realName} → ${mapping.pseudonymName}`);
          console.log(`          ${mapping.realEmail} → ${mapping.pseudonymEmail}`);
        } else {
          // Mettre à jour le traducteur
          await prisma.traducteur.update({
            where: { id: mapping.traducteurId },
            data: { nom: mapping.pseudonymName }
          });

          // Récupérer l'utilisateur associé
          const traducteur = await prisma.traducteur.findUnique({
            where: { id: mapping.traducteurId },
            include: { utilisateur: true }
          });

          if (!traducteur) {
            throw new Error(`Traducteur non trouvé: ${mapping.traducteurId}`);
          }

          // Mettre à jour l'email de l'utilisateur
          await prisma.utilisateur.update({
            where: { id: traducteur.utilisateur.id },
            data: { email: mapping.pseudonymEmail }
          });

          console.log(`✅ ${mapping.realName} → ${mapping.pseudonymName}`);
        }
        
        successCount++;
        
      } catch (error) {
        errorCount++;
        const msg = `❌ Erreur pour ${mapping.realName}: ${error}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // 4. Résumé
    console.log('\n' + '─'.repeat(70));
    console.log(`\n📊 RÉSUMÉ:\n`);
    console.log(`   ✅ Succès: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  ERREURS DÉTAILLÉES:\n`);
      errors.forEach(err => console.log(`   ${err}`));
    }

    // 5. Vérification
    if (!DRY_RUN && errorCount === 0) {
      console.log(`\n🔍 Vérification de l'intégrité...\n`);
      
      const traducteurs = await prisma.traducteur.findMany({
        include: { utilisateur: true }
      });
      
      const realNamesRemaining = traducteurs.filter(t => {
        // Vérifier si le nom correspond à un des noms réels
        return mappings.some(m => m.realName === t.nom);
      });
      
      const realEmailsRemaining = traducteurs.filter(t => {
        return mappings.some(m => m.realEmail === t.utilisateur.email);
      });
      
      if (realNamesRemaining.length > 0) {
        console.log(`   ⚠️  ${realNamesRemaining.length} noms réels restants:`);
        realNamesRemaining.slice(0, 5).forEach(t => {
          console.log(`      - ${t.nom}`);
        });
      } else {
        console.log(`   ✅ Tous les noms ont été pseudonymisés`);
      }
      
      if (realEmailsRemaining.length > 0) {
        console.log(`   ⚠️  ${realEmailsRemaining.length} emails réels restants:`);
        realEmailsRemaining.slice(0, 5).forEach(t => {
          console.log(`      - ${t.utilisateur.email}`);
        });
      } else {
        console.log(`   ✅ Tous les emails ont été pseudonymisés`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    
    if (DRY_RUN) {
      console.log('\n✅ DRY-RUN TERMINÉ (aucune modification appliquée)');
      console.log('\nPour appliquer réellement, exécutez:');
      console.log('  npx tsx scripts/apply-pseudonyms.ts\n');
    } else {
      console.log('\n✅ MIGRATION TERMINÉE\n');
    }

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
applyPseudonyms().catch(console.error);
