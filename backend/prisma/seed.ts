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

  // Clients gouvernementaux canadiens
  const clientsData = [
    { nom: 'CBSA', sousDomaines: ['Immigration', 'Douanes'] },
    { nom: 'CIRNAC', sousDomaines: ['Affaires autochtones'] },
    { nom: 'CISR', sousDomaines: ['Immigration', 'Réfugiés'] },
    { nom: 'CISR/IRB', sousDomaines: ['Immigration', 'Réfugiés'] },
    { nom: 'CLO', sousDomaines: ['Langues officielles'] },
    { nom: 'DFO', sousDomaines: ['Pêches', 'Océans'] },
    { nom: 'ECCC', sousDomaines: ['Environnement', 'Changements climatiques'] },
    { nom: 'EDSC', sousDomaines: ['Emploi', 'Développement social'] },
    { nom: 'FPC', sousDomaines: ['Service correctionnel'] },
    { nom: 'GAC', sousDomaines: ['Affaires étrangères', 'Commerce'] },
    { nom: 'GRC', sousDomaines: ['Sécurité', 'Criminel'] },
    { nom: 'IRCC', sousDomaines: ['Immigration', 'Citoyenneté'] },
    { nom: 'Justice', sousDomaines: ['Légal', 'Juridique'] },
    { nom: 'Patrimoine', sousDomaines: ['Culture', 'Patrimoine canadien'] },
    { nom: 'PMO', sousDomaines: ['Cabinet du Premier ministre'] },
    { nom: 'RCMP', sousDomaines: ['Security', 'Criminal'] },
    { nom: 'SPAC', sousDomaines: ['Services publics', 'Approvisionnement'] },
    { nom: 'TC', sousDomaines: ['Transport'] },
    { nom: 'VAC', sousDomaines: ['Anciens combattants'] },
  ];

  for (const clientData of clientsData) {
    await prisma.client.upsert({
      where: { nom: clientData.nom },
      update: {},
      create: clientData,
    });
  }
  console.log('✓ Clients créés:', clientsData.length);

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
