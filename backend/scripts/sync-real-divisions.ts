import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Synchronisation des divisions réelles\n');
  console.log('═'.repeat(80));

  // 1. Supprimer les divisions génériques créées par erreur (sauf FINANCE qui existe déjà dans les traducteurs)
  console.log('\n🗑️  Suppression des divisions génériques incorrectes...');
  const divisionsASupprimer = ['LEGAL', 'TECH', 'MEDICAL', 'MARKETING', 'EDUCATION', 'GOVERNMENT', 'COMMERCE', 'ENERGIE', 'CULTURE', 'Division Test'];
  
  for (const nom of divisionsASupprimer) {
    const division = await prisma.division.findUnique({ where: { nom } });
    if (division) {
      // Supprimer les accès d'abord
      await prisma.divisionAccess.deleteMany({ where: { divisionId: division.id } });
      // Puis supprimer la division
      await prisma.division.delete({ where: { id: division.id } });
      console.log(`   ✅ Supprimé: ${nom}`);
    }
  }

  // 2. Créer les divisions réelles basées sur les profils traducteurs
  console.log('\n📋 Création des divisions réelles...');
  
  const divisionsReelles = [
    { nom: 'CISR', code: 'CISR', description: 'Commission de l\'immigration et du statut de réfugié' },
    { nom: 'Traduction anglaise 1', code: 'TRAD-EN-1', description: 'Traduction anglaise niveau 1' },
    { nom: 'Traduction anglaise 2', code: 'TRAD-EN-2', description: 'Traduction anglaise niveau 2' },
    { nom: 'Droit 1', code: 'DROIT-1', description: 'Services juridiques niveau 1' },
    { nom: 'Droit 2', code: 'DROIT-2', description: 'Services juridiques niveau 2' },
    { nom: 'Multilingue', code: 'MULTI', description: 'Services multilingues' },
    { nom: 'FINANCE', code: 'FIN', description: 'Services financiers' },
    { nom: 'TEST', code: 'TEST', description: 'Division de test' },
  ];

  let created = 0;
  let existing = 0;

  for (const div of divisionsReelles) {
    const exists = await prisma.division.findUnique({ where: { nom: div.nom } });
    
    if (!exists) {
      await prisma.division.create({ data: div });
      console.log(`   ✅ Créé: ${div.nom}`);
      created++;
    } else {
      console.log(`   ↻ Existe: ${div.nom}`);
      existing++;
    }
  }

  console.log(`\n📊 Résumé: ${created} créées, ${existing} existantes`);

  // 3. Donner accès à TOUTES les divisions réelles au conseiller et gestionnaire
  console.log('\n👥 Attribution des accès...');
  
  const conseiller = await prisma.utilisateur.findUnique({ where: { email: 'conseiller@tetrix.com' } });
  const gestionnaire = await prisma.utilisateur.findUnique({ where: { email: 'gestionnaire@tetrix.com' } });
  
  const toutesLesDivisions = await prisma.division.findMany();
  
  for (const user of [conseiller, gestionnaire].filter(Boolean)) {
    if (!user) continue;
    
    // Supprimer les accès existants
    await prisma.divisionAccess.deleteMany({ where: { utilisateurId: user.id } });
    
    // Créer les nouveaux accès
    for (const division of toutesLesDivisions) {
      await prisma.divisionAccess.create({
        data: {
          utilisateurId: user.id,
          divisionId: division.id,
          peutLire: true,
          peutEcrire: true,
          peutGerer: true,
        }
      });
    }
    
    console.log(`   ✅ ${user.email}: ${toutesLesDivisions.length} divisions`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Synchronisation terminée !\n');
  
  // Afficher le résumé final
  console.log('📊 RÉSUMÉ FINAL:\n');
  const divisions = await prisma.division.findMany({
    select: {
      nom: true,
      code: true,
    },
    orderBy: { nom: 'asc' }
  });
  
  console.log('   Divisions dans la base:');
  divisions.forEach(d => {
    console.log(`   - ${d.nom.padEnd(30)} (${d.code})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
