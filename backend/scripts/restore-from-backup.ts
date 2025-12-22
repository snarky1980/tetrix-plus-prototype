import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
  utilisateur: {
    id: string;
    email: string;
    motDePasse: string;
    role: string;
  };
}

interface PseudonymMapping {
  traducteurId: string;
  realName: string;
  pseudonymName: string;
  realEmail: string;
  pseudonymEmail: string;
}

async function restoreFromBackup() {
  console.log('🚀 Restauration complète depuis le backup...\n');
  
  const backupPath = path.join(__dirname, '../prisma/backup-original-real-names.json');
  const mappingPath = path.join(__dirname, '../prisma/pseudonym-mapping-final.json');
  
  const backup: BackupTraducteur[] = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const pseudoMapping: PseudonymMapping[] = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  
  console.log(`📂 Backup: ${backup.length} traducteurs`);
  console.log(`📂 Mapping: ${pseudoMapping.length} pseudonymes\n`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const trad of backup) {
    try {
      // Trouver le pseudonyme correspondant
      const mapping = pseudoMapping.find(m => m.realName === trad.nom);
      const pseudoName = mapping?.pseudonymName || trad.nom;
      const pseudoEmail = mapping?.pseudonymEmail || trad.utilisateur.email;
      
      // Vérifier si l'utilisateur existe déjà
      let user = await prisma.utilisateur.findUnique({ where: { email: pseudoEmail } });
      
      if (!user) {
        // Créer l'utilisateur
        user = await prisma.utilisateur.create({
          data: {
            email: pseudoEmail,
            motDePasse: trad.utilisateur.motDePasse,
            role: 'TRADUCTEUR',
            actif: true
          }
        });
      }
      
      // Vérifier si le traducteur existe déjà (par nom)
      const existingTrad = await prisma.traducteur.findFirst({ where: { nom: pseudoName } });
      
      if (existingTrad) {
        // Mettre à jour
        await prisma.traducteur.update({
          where: { id: existingTrad.id },
          data: {
            division: trad.division,
            domaines: trad.domaines,
            clientsHabituels: trad.clientsHabituels,
            capaciteHeuresParJour: trad.capaciteHeuresParJour,
            classification: trad.classification,
            horaire: trad.horaire,
            specialisations: trad.specialisations,
            actif: true,
            disponiblePourTravail: true
          }
        });
        updated++;
        console.log(`↻ ${pseudoName}`);
      } else {
        // Créer le traducteur
        await prisma.traducteur.create({
          data: {
            nom: pseudoName,
            division: trad.division,
            domaines: trad.domaines,
            clientsHabituels: trad.clientsHabituels,
            capaciteHeuresParJour: trad.capaciteHeuresParJour,
            classification: trad.classification,
            horaire: trad.horaire,
            specialisations: trad.specialisations,
            actif: true,
            disponiblePourTravail: true,
            utilisateurId: user.id
          }
        });
        created++;
        console.log(`✓ ${pseudoName}`);
      }
    } catch (err: any) {
      console.log(`✗ ${trad.nom}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('📊 RÉSULTAT');
  console.log('════════════════════════════════════════');
  console.log(`   Créés: ${created}`);
  console.log(`   Mis à jour: ${updated}`);
  console.log(`   Erreurs: ${errors}`);
  
  const total = await prisma.traducteur.count();
  console.log(`\n📁 Total traducteurs en base: ${total}`);
}

restoreFromBackup()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Erreur fatale:', e);
    prisma.$disconnect();
    process.exit(1);
  });
