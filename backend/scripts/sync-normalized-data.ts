/**
 * Script de synchronisation des données legacy vers les tables normalisées
 * Ce script complète la migration initiale en synchronisant les champs String[]
 * vers les tables de jonction many-to-many.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncDomaines() {
  console.log('\n=== Synchronisation des DOMAINES ===\n');
  
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    select: { id: true, nom: true, domaines: true }
  });
  
  let synced = 0;
  
  for (const t of traducteurs) {
    if (t.domaines?.length > 0) {
      for (const domNom of t.domaines) {
        // Trouver ou créer le domaine
        let domaine = await prisma.domaine.findFirst({ where: { nom: domNom } });
        if (!domaine) {
          domaine = await prisma.domaine.create({ data: { nom: domNom, actif: true } });
          console.log('Créé domaine: ' + domNom);
        }
        
        // Vérifier si la relation existe
        const existing = await prisma.traducteurDomaine.findFirst({
          where: { traducteurId: t.id, domaineId: domaine.id }
        });
        
        if (!existing) {
          await prisma.traducteurDomaine.create({
            data: { traducteurId: t.id, domaineId: domaine.id }
          });
          synced++;
          console.log('Lié: ' + t.nom + ' -> ' + domNom);
        }
      }
    }
  }
  
  console.log('\nTotal relations domaines créées: ' + synced);
  return synced;
}

async function syncClientsHabituels() {
  console.log('\n=== Synchronisation des CLIENTS HABITUELS ===\n');
  
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    select: { id: true, nom: true, clientsHabituels: true }
  });
  
  let synced = 0;
  
  for (const t of traducteurs) {
    if (t.clientsHabituels?.length > 0) {
      for (const clientNom of t.clientsHabituels) {
        // Trouver le client par nom
        const client = await prisma.client.findFirst({ 
          where: { nom: { contains: clientNom, mode: 'insensitive' } }
        });
        
        if (!client) {
          console.log('Client non trouvé: ' + clientNom + ' (pour ' + t.nom + ')');
          continue;
        }
        
        // Vérifier si la relation existe
        const existing = await prisma.traducteurClient.findFirst({
          where: { traducteurId: t.id, clientId: client.id }
        });
        
        if (!existing) {
          await prisma.traducteurClient.create({
            data: { traducteurId: t.id, clientId: client.id }
          });
          synced++;
          console.log('Lié: ' + t.nom + ' -> ' + client.nom);
        }
      }
    }
  }
  
  console.log('\nTotal relations clients créées: ' + synced);
  return synced;
}

async function showStats() {
  console.log('\n=== STATISTIQUES FINALES ===\n');
  
  const stats = await Promise.all([
    prisma.langue.count({ where: { actif: true } }),
    prisma.specialisation.count({ where: { actif: true } }),
    prisma.domaine.count({ where: { actif: true } }),
    prisma.traducteurSpecialisation.count(),
    prisma.traducteurDomaine.count(),
    prisma.traducteurDivision.count(),
    prisma.traducteurClient.count(),
  ]);
  
  console.log('Langues: ' + stats[0]);
  console.log('Spécialisations: ' + stats[1]);
  console.log('Domaines: ' + stats[2]);
  console.log('Relations traducteur-spécialisation: ' + stats[3]);
  console.log('Relations traducteur-domaine: ' + stats[4]);
  console.log('Relations traducteur-division: ' + stats[5]);
  console.log('Relations traducteur-client: ' + stats[6]);
}

async function main() {
  console.log('Démarrage de la synchronisation des données legacy...');
  
  await syncDomaines();
  await syncClientsHabituels();
  await showStats();
  
  console.log('\n=== Synchronisation terminée ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
