import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  // Trouver l'admin pour creePar
  const admin = await prisma.utilisateur.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('Erreur: pas d\'admin trouvé');
    return;
  }
  console.log('Admin trouvé:', admin.email);
  
  // Créer équipe Backlog SATJ avec tous les champs requis
  const backlog = await prisma.equipeProjet.findFirst({ where: { nom: 'Backlog SATJ' } });
  if (backlog) {
    console.log('Équipe projet existe déjà: Backlog SATJ');
  } else {
    await prisma.equipeProjet.create({ 
      data: { 
        nom: 'Backlog SATJ', 
        code: 'BACKLOG-SATJ',
        description: 'Équipe de projet pour le backlog SATJ', 
        actif: true,
        creePar: admin.id
      } 
    });
    console.log('✓ Créé équipe projet: Backlog SATJ');
  }
  
  // Résultat final
  const finalDivisions = await prisma.division.findMany({ 
    select: { nom: true }, 
    orderBy: { nom: 'asc' } 
  });
  const finalEquipes = await prisma.equipeProjet.findMany({ 
    select: { nom: true } 
  });
  
  console.log('\n=== DIVISIONS (' + finalDivisions.length + ') ===');
  finalDivisions.forEach(d => console.log('  - ' + d.nom));
  
  console.log('\n=== ÉQUIPES PROJET (' + finalEquipes.length + ') ===');
  finalEquipes.forEach(e => console.log('  - ' + e.nom));
  
  await prisma.$disconnect();
}

fix().catch(console.error);
