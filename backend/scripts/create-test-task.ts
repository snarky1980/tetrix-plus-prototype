import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const traducteur = await prisma.traducteur.findFirst();
  const user = await prisma.utilisateur.findFirst({ where: { role: 'CONSEILLER' } });
  
  if (!traducteur || !user) {
    console.log('Besoin d un traducteur et conseiller');
    return;
  }
  
  const tache = await prisma.tache.create({
    data: {
      numeroProjet: 'TEST-OPT-LOCK',
      traducteurId: traducteur.id,
      typeTache: 'TRADUCTION',
      description: 'Tâche de test pour optimistic locking',
      heuresTotal: 5,
      dateEcheance: new Date('2025-12-31'),
      statut: 'PLANIFIEE',
      creePar: user.id
    }
  });
  
  console.log('✅ Tâche créée:', tache.id);
  console.log('Version:', tache.version);
})().finally(() => prisma.$disconnect());
