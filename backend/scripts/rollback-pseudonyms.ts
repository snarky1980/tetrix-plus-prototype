/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRIPT DE ROLLBACK: RESTAURATION DES NOMS RÉELS
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Ce script restaure les noms et emails réels à partir d'un backup JSON.
 * 
 * ⚠️  UTILISER UNIQUEMENT EN CAS D'URGENCE
 * 
 * Usage: npx tsx scripts/rollback-pseudonyms.ts <backup-file.json> [--dry-run]
 * 
 * Exemple:
 *   npx tsx scripts/rollback-pseudonyms.ts backup-before-pseudonymization-1234567890.json --dry-run
 *   npx tsx scripts/rollback-pseudonyms.ts backup-before-pseudonymization-1234567890.json
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  id: string;
  nom: string;
  utilisateur: {
    id: string;
    email: string;
  };
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const backupFile = args.find(arg => !arg.startsWith('--'));

async function rollbackPseudonyms() {
  console.log('\n🔄 ROLLBACK DES PSEUDONYMES\n');
  console.log('═'.repeat(70));
  
  if (DRY_RUN) {
    console.log('\n⚠️  MODE DRY-RUN: Aucune modification ne sera appliquée\n');
  } else {
    console.log('\n⚠️  ATTENTION: Cette opération restaurera les noms réels!\n');
  }
  
  console.log('═'.repeat(70) + '\n');

  try {
    // 1. Vérifier le fichier de backup
    if (!backupFile) {
      throw new Error('Usage: npx tsx scripts/rollback-pseudonyms.ts <backup-file.json> [--dry-run]');
    }

    const backupPath = path.isAbsolute(backupFile)
      ? backupFile
      : path.join(__dirname, '../prisma', backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Fichier de backup introuvable: ${backupPath}`);
    }

    console.log(`📂 Chargement du backup: ${backupPath}\n`);

    // 2. Charger les données du backup
    const backupData: BackupData[] = JSON.parse(
      fs.readFileSync(backupPath, 'utf-8')
    );

    console.log(`   ✅ ${backupData.length} traducteurs chargés du backup\n`);

    // 3. Restaurer les données
    console.log('🔄 Restauration des données...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const backup of backupData) {
      try {
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Restauration: ${backup.nom} (${backup.utilisateur.email})`);
        } else {
          // Restaurer le nom du traducteur
          await prisma.traducteur.update({
            where: { id: backup.id },
            data: { nom: backup.nom }
          });

          // Restaurer l'email de l'utilisateur
          await prisma.utilisateur.update({
            where: { id: backup.utilisateur.id },
            data: { email: backup.utilisateur.email }
          });

          console.log(`✅ Restauré: ${backup.nom} (${backup.utilisateur.email})`);
        }

        successCount++;

      } catch (error) {
        errorCount++;
        const msg = `❌ Erreur pour ${backup.nom}: ${error}`;
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

    console.log('\n' + '═'.repeat(70));

    if (DRY_RUN) {
      console.log('\n✅ DRY-RUN TERMINÉ (aucune modification appliquée)');
      console.log('\nPour appliquer réellement le rollback, exécutez:');
      console.log(`  npx tsx scripts/rollback-pseudonyms.ts ${backupFile}\n`);
    } else {
      console.log('\n✅ ROLLBACK TERMINÉ\n');
      console.log('⚠️  Les noms et emails réels ont été restaurés.');
    }

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
rollbackPseudonyms().catch(console.error);
