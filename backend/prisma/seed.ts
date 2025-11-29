import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed: démarrage');

  // Admin user (if not exists)
  const adminEmail = 'admin@tetrix.com';
  const adminExists = await prisma.utilisateur.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    const hash = await bcrypt.hash('password123', 10);
    await prisma.utilisateur.create({
      data: {
        email: adminEmail,
        motDePasse: hash,
        role: Role.ADMIN,
        actif: true,
      },
    });
    console.log('✓ Admin créé');
  } else {
    console.log('↻ Admin déjà présent');
  }

  // Sample conseiller
  const conseillerEmail = 'conseiller@tetrix.com';
  const conseillerExists = await prisma.utilisateur.findUnique({ where: { email: conseillerEmail } });
  if (!conseillerExists) {
    const hash = await bcrypt.hash('password123', 10);
    await prisma.utilisateur.create({
      data: {
        email: conseillerEmail,
        motDePasse: hash,
        role: Role.CONSEILLER,
        actif: true,
      },
    });
    console.log('✓ Conseiller créé');
  }

  // Sample traducteur + user
  const tradEmail = 'traducteur@tetrix.com';
  let tradUser = await prisma.utilisateur.findUnique({ where: { email: tradEmail } });
  if (!tradUser) {
    const hash = await bcrypt.hash('password123', 10);
    tradUser = await prisma.utilisateur.create({
      data: {
        email: tradEmail,
        motDePasse: hash,
        role: Role.TRADUCTEUR,
        actif: true,
      },
    });
    console.log('✓ Utilisateur traducteur créé');
  }

  // Create traducteur profile if absent
  const existingTrad = await prisma.traducteur.findFirst({ where: { utilisateurId: tradUser.id } });
  if (!existingTrad) {
    const trad = await prisma.traducteur.create({
      data: {
        nom: 'Jean Exemple',
        division: 'FINANCE',
        domaines: ['FINANCE', 'LEGAL'],
        clientsHabituels: ['ClientA'],
        capaciteHeuresParJour: 7.5,
        actif: true,
        utilisateurId: tradUser.id,
        pairesLinguistiques: {
          create: [
            { langueSource: 'EN', langueCible: 'FR' },
            { langueSource: 'FR', langueCible: 'EN' },
          ],
        },
      },
    });
    console.log('✓ Traducteur de démonstration créé', trad.id);
  } else {
    console.log('↻ Traducteur déjà présent');
  }

  // Sample client
  const clientName = 'ClientA';
  const client = await prisma.client.upsert({
    where: { nom: clientName },
    update: {},
    create: { nom: clientName, sousDomaines: ['COMPLIANCE', 'REPORTING'] },
  });
  console.log('✓ Client prêt', client.nom);

  // Sample sous-domaine (indépendant)
  await prisma.sousDomaine.upsert({
    where: { nom: 'COMPLIANCE' },
    update: {},
    create: { nom: 'COMPLIANCE', domaineParent: 'FINANCE' },
  });
  await prisma.sousDomaine.upsert({
    where: { nom: 'REPORTING' },
    update: {},
    create: { nom: 'REPORTING', domaineParent: 'FINANCE' },
  });
  console.log('✓ Sous-domaines prêts');

  console.log('🌱 Seed terminé');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
