/**
 * Script de restauration rapide depuis le backup
 */
import { PrismaClient } from '@prisma/client';
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
  utilisateurId: string;
  classification: string;
  horaire: string;
  notes: string | null;
  specialisations: string[];
  disponiblePourTravail: boolean;
  commentaireDisponibilite: string | null;
  utilisateur: {
    id: string;
    email: string;
    motDePasse: string;
    nom: string | null;
    prenom: string | null;
    role: string;
    actif: boolean;
  };
}

async function restore() {
  console.log('🔄 Restauration des traducteurs depuis backup...');
  
  const backup: BackupTraducteur[] = JSON.parse(
    fs.readFileSync('./prisma/backup-original-real-names.json', 'utf-8')
  );
  console.log('📊 Traducteurs dans le backup:', backup.length);
  
  const existing = await prisma.traducteur.count();
  console.log('📊 Traducteurs existants:', existing);
  
  let created = 0, skipped = 0, errors = 0;
  
  for (const tr of backup) {
    try {
      // Vérifier si le traducteur existe déjà
      const exists = await prisma.traducteur.findFirst({ where: { nom: tr.nom } });
      if (exists) {
        skipped++;
        continue;
      }
      
      // Créer l'utilisateur d'abord s'il n'existe pas
      let utilisateur = await prisma.utilisateur.findUnique({ where: { email: tr.utilisateur.email } });
      if (!utilisateur) {
        utilisateur = await prisma.utilisateur.create({
          data: {
            email: tr.utilisateur.email,
            motDePasse: tr.utilisateur.motDePasse,
            role: 'TRADUCTEUR',
            actif: true
          }
        });
      }
      
      // Mapper la classification vers la catégorie
      let categorie: 'TR01' | 'TR02' | 'TR03' = 'TR03';
      if (tr.classification === 'TR-01') categorie = 'TR01';
      else if (tr.classification === 'TR-02') categorie = 'TR02';
      
      // Créer le traducteur
      await prisma.traducteur.create({
        data: {
          nom: tr.nom,
          divisions: tr.division ? [tr.division] : [],
          domaines: tr.domaines || [],
          clientsHabituels: tr.clientsHabituels || [],
          capaciteHeuresParJour: tr.capaciteHeuresParJour || 7,
          actif: tr.actif !== false,
          categorie,
          classification: tr.classification || 'TR-03',
          horaire: tr.horaire || '9h-17h',
          specialisations: tr.specialisations || [],
          disponiblePourTravail: tr.disponiblePourTravail || false,
          utilisateurId: utilisateur.id
        }
      });
      created++;
    } catch (e: any) {
      errors++;
      console.error('Erreur pour', tr.nom, ':', e.message);
    }
  }
  
  console.log('✅ Créés:', created, '| ⏭️ Existants:', skipped, '| ❌ Erreurs:', errors);
  const total = await prisma.traducteur.count();
  console.log('📊 Total traducteurs maintenant:', total);
  
  await prisma.$disconnect();
}

restore();
