/**
 * Script pour associer les traducteurs à leurs divisions originales
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface BackupTraducteur {
  nom: string;
  division: string;
}

interface MappingEntry {
  traducteurId: string;
  realName: string;
  pseudonymName: string;
  realEmail: string;
  pseudonymEmail: string;
}

async function assignerDivisions() {
  console.log('🔄 Association des traducteurs à leurs divisions...\n');
  
  const backup: BackupTraducteur[] = JSON.parse(
    fs.readFileSync('prisma/backup-original-real-names.json', 'utf8')
  );
  const mapping: MappingEntry[] = JSON.parse(
    fs.readFileSync('prisma/pseudonym-mapping-final.json', 'utf8')
  );
  
  let created = 0;
  let skipped = 0;
  
  for (const item of backup) {
    const originalName = item.nom;
    const divisionName = item.division;
    
    if (!divisionName) continue;
    
    // Trouver le pseudonyme
    const mappingEntry = mapping.find((m) => m.realName === originalName);
    const searchName = mappingEntry?.pseudonymName || originalName;
    
    // Trouver le traducteur par nom
    const traducteur = await prisma.traducteur.findFirst({ where: { nom: searchName } });
    if (!traducteur) {
      skipped++;
      continue;
    }
    
    // Trouver la division
    const division = await prisma.division.findFirst({ where: { nom: divisionName } });
    if (!division) {
      console.log('⚠️ Division non trouvée:', divisionName);
      continue;
    }
    
    // Créer l'association
    const existing = await prisma.traducteurDivision.findFirst({
      where: { traducteurId: traducteur.id, divisionId: division.id }
    });
    
    if (!existing) {
      await prisma.traducteurDivision.create({
        data: { traducteurId: traducteur.id, divisionId: division.id }
      });
      created++;
      console.log(`✅ ${searchName} → ${divisionName}`);
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log('   Associations créées:', created);
  console.log('   Ignorés (traducteur non trouvé):', skipped);
  
  // Vérification
  const total = await prisma.traducteurDivision.count();
  console.log('   Total associations:', total);
  
  await prisma.$disconnect();
}

assignerDivisions();
