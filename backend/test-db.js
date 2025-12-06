const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://admin:xPkRVwQSoIvFcRxoXVb8GCzEpfmpno9K@dpg-d4lk0vgdl3ps7387uevg-a/tetrix_plus"
    }
  }
});

async function main() {
  console.log('Vérification de la base de données...\n');
  
  const users = await prisma.utilisateur.findMany();
  console.log(`📊 Utilisateurs trouvés: ${users.length}`);
  users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  
  const traducteurs = await prisma.traducteur.findMany();
  console.log(`\n📊 Traducteurs trouvés: ${traducteurs.length}`);
  
  const clients = await prisma.client.findMany();
  console.log(`\n📊 Clients trouvés: ${clients.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0));
