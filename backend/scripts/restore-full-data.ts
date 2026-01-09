/**
 * Script pour restaurer les données complètes des traducteurs
 * (catégories, horaires, paires linguistiques, etc.)
 */

import { PrismaClient, CategorieTraducteur } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface BackupTraducteur {
  id: string;
  nom: string;
  division: string;
  domaines: string[];
  clientsHabituels: string[];
  capaciteHeuresParJour: number;
  actif: boolean;
  classification: string;
  horaire: string;
  notes: string | null;
  specialisations: string[];
  disponiblePourTravail: boolean;
  commentaireDisponibilite: string | null;
  categorie?: string;
  necessiteRevision?: boolean;
  utilisateur: {
    id: string;
    email: string;
  };
}

interface MappingEntry {
  traducteurId: string;
  realName: string;
  pseudonymName: string;
  realEmail: string;
  pseudonymEmail: string;
}

// Mapping classification -> CategorieTraducteur
function mapClassification(classification: string): CategorieTraducteur {
  const normalized = classification?.toUpperCase().replace('-', '').replace(' ', '') || '';
  if (normalized.includes('TR01') || normalized.includes('TRO1') || normalized === 'TR1') return 'TR01';
  if (normalized.includes('TR02') || normalized.includes('TRO2') || normalized === 'TR2') return 'TR02';
  if (normalized.includes('TR03') || normalized.includes('TRO3') || normalized === 'TR3') return 'TR03';
  
  // Basé sur les classifications TT4, TT5, TT6
  if (normalized.includes('TT4')) return 'TR01';
  if (normalized.includes('TT5')) return 'TR02';
  if (normalized.includes('TT6')) return 'TR03';
  
  return 'TR01'; // Défaut
}

// Normaliser l'horaire au format HH:MM-HH:MM
function normalizeHoraire(horaire: string | null): string {
  if (!horaire) return '08:00-16:00';
  
  // Exemples: "8h-16h", "9h-17h", "8h30-16h30", "11h-19h"
  const match = horaire.match(/(\d{1,2})h?(\d{2})?[-–](\d{1,2})h?(\d{2})?/i);
  if (match) {
    const startH = match[1].padStart(2, '0');
    const startM = match[2] || '00';
    const endH = match[3].padStart(2, '0');
    const endM = match[4] || '00';
    return `${startH}:${startM}-${endH}:${endM}`;
  }
  
  return horaire; // Retourner tel quel si format déjà OK
}

async function analyserBackup() {
  const backup: BackupTraducteur[] = JSON.parse(
    fs.readFileSync('prisma/backup-original-real-names.json', 'utf8')
  );
  
  console.log('=== Analyse du backup original ===');
  console.log('Nombre de traducteurs:', backup.length);
  
  // Catégories
  const categories: Record<string, number> = {};
  backup.forEach(t => {
    const cat = t.classification || 'N/A';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  console.log('\n=== Classifications dans le backup ===');
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  
  // Horaires uniques
  const horaires = new Set(backup.map(t => t.horaire).filter(Boolean));
  console.log('\n=== Horaires uniques ===');
  Array.from(horaires).forEach(h => console.log(`  - ${h}`));
  
  // Domaines
  const domainesSet = new Set<string>();
  backup.forEach(t => t.domaines?.forEach(d => domainesSet.add(d)));
  console.log('\n=== Domaines uniques ===');
  Array.from(domainesSet).forEach(d => console.log(`  - ${d}`));
  
  // Spécialisations
  const specsSet = new Set<string>();
  backup.forEach(t => t.specialisations?.forEach(s => specsSet.add(s)));
  console.log('\n=== Spécialisations uniques ===');
  Array.from(specsSet).forEach(s => console.log(`  - ${s}`));
  
  // Clients habituels
  const clientsSet = new Set<string>();
  backup.forEach(t => t.clientsHabituels?.forEach(c => clientsSet.add(c)));
  console.log('\n=== Clients habituels uniques ===');
  Array.from(clientsSet).forEach(c => console.log(`  - ${c}`));
  
  return backup;
}

async function restaurerDonnees() {
  console.log('\n🔄 Restauration des données complètes...\n');
  
  const backup: BackupTraducteur[] = JSON.parse(
    fs.readFileSync('prisma/backup-original-real-names.json', 'utf8')
  );
  const mapping: MappingEntry[] = JSON.parse(
    fs.readFileSync('prisma/pseudonym-mapping-final.json', 'utf8')
  );
  
  let updated = 0;
  let errors = 0;
  
  for (const item of backup) {
    const originalName = item.nom;
    
    // Trouver le pseudonyme
    const mappingEntry = mapping.find(m => m.realName === originalName);
    const searchName = mappingEntry?.pseudonymName || originalName;
    
    // Trouver le traducteur actuel
    const traducteur = await prisma.traducteur.findFirst({ where: { nom: searchName } });
    if (!traducteur) {
      continue;
    }
    
    try {
      // Mettre à jour les données
      const categorie = mapClassification(item.classification);
      const horaire = normalizeHoraire(item.horaire);
      const necessiteRevision = categorie !== 'TR03'; // TR03 = réviseurs, pas besoin de révision
      
      await prisma.traducteur.update({
        where: { id: traducteur.id },
        data: {
          categorie,
          horaire,
          classification: item.classification,
          domaines: item.domaines || [],
          clientsHabituels: item.clientsHabituels || [],
          specialisations: item.specialisations || [],
          capaciteHeuresParJour: item.capaciteHeuresParJour || 7,
          disponiblePourTravail: item.disponiblePourTravail ?? true,
          commentaireDisponibilite: item.commentaireDisponibilite,
          notes: item.notes,
          necessiteRevision,
        }
      });
      
      updated++;
      console.log(`✅ ${searchName}: ${categorie}, ${horaire}`);
    } catch (err) {
      errors++;
      console.log(`❌ ${searchName}: ${err}`);
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`   Mis à jour: ${updated}`);
  console.log(`   Erreurs: ${errors}`);
}

async function verifierPairesLinguistiques() {
  console.log('\n=== Vérification des paires linguistiques ===');
  
  const paires = await prisma.paireLinguistique.count();
  console.log('Paires linguistiques existantes:', paires);
  
  if (paires === 0) {
    console.log('\n⚠️  Aucune paire linguistique. Création des paires de base...');
    
    // Créer les paires de base
    const pairesDeBase = [
      { langueSource: 'EN', langueCible: 'FR', nom: 'Anglais → Français' },
      { langueSource: 'FR', langueCible: 'EN', nom: 'Français → Anglais' },
      { langueSource: 'ES', langueCible: 'FR', nom: 'Espagnol → Français' },
      { langueSource: 'ES', langueCible: 'EN', nom: 'Espagnol → Anglais' },
      { langueSource: 'DE', langueCible: 'FR', nom: 'Allemand → Français' },
      { langueSource: 'IT', langueCible: 'FR', nom: 'Italien → Français' },
      { langueSource: 'PT', langueCible: 'FR', nom: 'Portugais → Français' },
      { langueSource: 'ZH', langueCible: 'FR', nom: 'Chinois → Français' },
      { langueSource: 'AR', langueCible: 'FR', nom: 'Arabe → Français' },
      { langueSource: 'RU', langueCible: 'FR', nom: 'Russe → Français' },
    ];
    
    for (const paire of pairesDeBase) {
      await prisma.paireLinguistique.upsert({
        where: { 
          langueSource_langueCible: { 
            langueSource: paire.langueSource, 
            langueCible: paire.langueCible 
          } 
        },
        update: {},
        create: paire,
      });
      console.log(`  ✅ ${paire.nom}`);
    }
  }
}

async function assignerPairesLinguistiques() {
  console.log('\n=== Attribution des paires linguistiques aux traducteurs ===');
  
  // Récupérer la paire EN→FR (la plus commune)
  const paireEnFr = await prisma.paireLinguistique.findFirst({
    where: { langueSource: 'EN', langueCible: 'FR' }
  });
  
  if (!paireEnFr) {
    console.log('❌ Paire EN→FR non trouvée');
    return;
  }
  
  // Récupérer tous les traducteurs sans paire
  const traducteursSansPaire = await prisma.traducteur.findMany({
    where: {
      pairesLinguistiques: { none: {} }
    }
  });
  
  console.log(`Traducteurs sans paire: ${traducteursSansPaire.length}`);
  
  // Par défaut, assigner EN→FR à tous (division Traduction anglaise)
  // Pour multilingue, on peut ajouter d'autres paires
  
  const backup: BackupTraducteur[] = JSON.parse(
    fs.readFileSync('prisma/backup-original-real-names.json', 'utf8')
  );
  const mapping: MappingEntry[] = JSON.parse(
    fs.readFileSync('prisma/pseudonym-mapping-final.json', 'utf8')
  );
  
  let assigned = 0;
  
  for (const tr of traducteursSansPaire) {
    // Trouver les infos originales
    const mappingEntry = mapping.find(m => m.pseudonymName === tr.nom);
    const originalData = backup.find(b => b.nom === mappingEntry?.realName);
    const division = originalData?.division || '';
    
    // Déterminer les paires selon la division
    let pairesToAssign: string[] = [];
    
    if (division.includes('anglaise') || division === 'CISR') {
      pairesToAssign.push('EN-FR');
    } else if (division === 'Multilingue') {
      // Multilingue: plusieurs paires possibles
      pairesToAssign.push('EN-FR', 'ES-FR', 'DE-FR');
    } else if (division.includes('Droit')) {
      pairesToAssign.push('EN-FR');
    } else {
      pairesToAssign.push('EN-FR'); // Défaut
    }
    
    // Assigner la paire principale (EN→FR)
    try {
      await prisma.traducteurPaireLinguistique.create({
        data: {
          traducteurId: tr.id,
          paireLinguistiqueId: paireEnFr.id,
        }
      });
      assigned++;
    } catch (e) {
      // Déjà assigné
    }
  }
  
  console.log(`✅ Paires assignées: ${assigned}`);
}

async function verifierEtat() {
  console.log('\n=== État actuel de la base ===');
  
  // Catégories
  const parCategorie = await prisma.traducteur.groupBy({
    by: ['categorie'],
    _count: true,
  });
  console.log('\nPar catégorie:');
  parCategorie.forEach(c => console.log(`  ${c.categorie || 'N/A'}: ${c._count}`));
  
  // Paires linguistiques
  const pairesAssignees = await prisma.traducteurPaireLinguistique.count();
  console.log(`\nPaires linguistiques assignées: ${pairesAssignees}`);
  
  // Traducteurs avec horaire
  const avecHoraire = await prisma.traducteur.count({ where: { horaire: { not: null } } });
  console.log(`Traducteurs avec horaire: ${avecHoraire}`);
  
  // Traducteurs avec domaines
  const avecDomaines = await prisma.traducteur.count({ 
    where: { domaines: { isEmpty: false } } 
  });
  console.log(`Traducteurs avec domaines: ${avecDomaines}`);
}

async function main() {
  try {
    await analyserBackup();
    await restaurerDonnees();
    await verifierPairesLinguistiques();
    await assignerPairesLinguistiques();
    await verifierEtat();
  } finally {
    await prisma.$disconnect();
  }
}

main();
