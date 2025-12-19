import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 AUDIT DE LA BASE DE DONNÉES\n');
  console.log('═'.repeat(80));

  // Compter tous les éléments
  const counts = {
    utilisateurs: await prisma.utilisateur.count(),
    traducteurs: await prisma.traducteur.count(),
    divisions: await prisma.division.count(),
    divisionAccess: await prisma.divisionAccess.count(),
    clients: await prisma.client.count(),
    taches: await prisma.tache.count(),
  };

  console.log('\n📊 COMPTAGE DES TABLES:');
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`   ${table.padEnd(20)} : ${count}`);
  });

  console.log('\n\n👥 UTILISATEURS:');
  const users = await prisma.utilisateur.findMany({
    select: {
      email: true,
      role: true,
      actif: true,
    }
  });
  users.forEach(u => {
    console.log(`   ${u.email.padEnd(30)} | ${u.role.padEnd(15)} | ${u.actif ? '✅' : '❌'}`);
  });

  console.log('\n\n🏢 DIVISIONS:');
  const divisions = await prisma.division.findMany({
    select: {
      nom: true,
      code: true,
      actif: true,
    }
  });
  
  if (divisions.length === 0) {
    console.log('   ⚠️ AUCUNE DIVISION TROUVÉE !');
  } else {
    divisions.forEach(d => {
      console.log(`   ${d.nom.padEnd(20)} (${d.code}) | ${d.actif ? '✅' : '❌'}`);
    });
  }

  console.log('\n\n🏢 CLIENTS:');
  const clients = await prisma.client.findMany({
    select: {
      nom: true,
      actif: true,
    },
    take: 10
  });
  
  if (clients.length === 0) {
    console.log('   ⚠️ AUCUN CLIENT TROUVÉ !');
  } else {
    clients.forEach(c => {
      console.log(`   ${c.nom.padEnd(30)} | ${c.actif ? '✅' : '❌'}`);
    });
    if (counts.clients > 10) {
      console.log(`   ... et ${counts.clients - 10} autres`);
    }
  }

  console.log('\n\n👨‍💼 TRADUCTEURS:');
  const traducteurs = await prisma.traducteur.findMany({
    select: {
      nom: true,
      division: true,
      actif: true,
    },
    take: 10
  });
  
  if (traducteurs.length === 0) {
    console.log('   ⚠️ AUCUN TRADUCTEUR TROUVÉ !');
  } else {
    traducteurs.forEach(t => {
      console.log(`   ${t.nom.padEnd(30)} | ${(t.division || 'N/A').padEnd(15)} | ${t.actif ? '✅' : '❌'}`);
    });
    if (counts.traducteurs > 10) {
      console.log(`   ... et ${counts.traducteurs - 10} autres`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  
  // Diagnostic
  console.log('\n🔍 DIAGNOSTIC:');
  if (counts.divisions === 0) {
    console.log('   ❌ Base de données VIDE ou NON-SEEDÉE');
    console.log('   💡 Exécutez: npm run prisma:seed');
  } else if (counts.divisions < 5) {
    console.log('   ⚠️ Base de données INCOMPLÈTE');
    console.log('   💡 Divisions manquantes - exécutez le script de création');
  } else {
    console.log('   ✅ Base de données semble correcte');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
