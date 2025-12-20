import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.utilisateur.findUnique({ where: { email: 'conseiller@tetrix.com' } });
  if (!user) {
    console.error('Utilisateur non trouvé');
    process.exit(1);
  }
  
  const divisions = await prisma.division.findMany();
  
  for (const div of divisions) {
    await prisma.divisionAccess.upsert({
      where: {
        utilisateurId_divisionId: {
          utilisateurId: user.id,
          divisionId: div.id
        }
      },
      update: {
        peutLire: true,
        peutEcrire: true,
        peutGerer: true
      },
      create: {
        utilisateurId: user.id,
        divisionId: div.id,
        peutLire: true,
        peutEcrire: true,
        peutGerer: true
      }
    });
    console.log(`✅ Accès accordé à: ${div.nom}`);
  }
  
  console.log(`\n✅ ${divisions.length} divisions accessibles pour conseiller@tetrix.com`);
  await prisma.$disconnect();
})();
