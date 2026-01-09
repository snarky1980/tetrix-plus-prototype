/**
 * Script pour assigner les paires linguistiques aux traducteurs
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface BackupTraducteur {
  nom: string;
  division: string;
}

interface MappingEntry {
  realName: string;
  pseudonymName: string;
}

async function assignerPaires() {
  console.log('🔗 Attribution des paires linguistiques...\n');
  
  const backup: BackupTraducteur[] = JSON.parse(
    fs.readFileSync('prisma/backup-original-real-names.json', 'utf8')
  );
  const mapping: MappingEntry[] = JSON.parse(
    fs.readFileSync('prisma/pseudonym-mapping-final.json', 'utf8')
  );
  
  // Traducteurs sans paire
  const sansPaire = await prisma.traducteur.findMany({
    where: { pairesLinguistiques: { none: {} } }
  });
  
  console.log('Traducteurs sans paire:', sansPaire.length);
  
  let created = 0;
  
  for (const tr of sansPaire) {
    // Trouver les infos originales
    const mappingEntry = mapping.find(m => m.pseudonymName === tr.nom);
    const originalData = backup.find(b => b.nom === mappingEntry?.realName);
    const division = originalData?.division || '';
    
    // Paire par défaut EN→FR
    const langueSource = 'EN';
    const langueCible = 'FR';
    
    try {
      await prisma.paireLinguistique.create({
        data: {
          traducteurId: tr.id,
          langueSource,
          langueCible,
        }
      });
      created++;
      console.log(`✅ ${tr.nom}: ${langueSource} → ${langueCible}`);
    } catch (e: any) {
      if (!e.message?.includes('Unique constraint')) {
        console.log(`❌ ${tr.nom}: ${e.message}`);
      }
    }
  }
  
  console.log('\n📊 Paires créées:', created);
  
  // Vérification
  const total = await prisma.paireLinguistique.count();
  console.log('Total paires:', total);
  
  await prisma.$disconnect();
}

assignerPaires();
