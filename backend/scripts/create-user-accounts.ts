import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

// Divisions IDs
const DIVISIONS = {
  CISR: 'd024d96d-28ac-4df9-94c7-0b4af0a7b5bc',
  DROIT_1: '33dec08e-cd1b-4fcf-a218-1514d0c145cc',
  DROIT_2: '951aa113-6b4a-454c-b2bd-29a52f47b89f',
  FINANCE: 'a7716830-73a0-40eb-83df-020d4b1f0682',
  MULTI: 'c4e2fda9-7844-4d3b-b34a-fa3cc7a19b79',
  TEST: 'dfaaec80-3862-485e-85c8-c1e0b51d901c',
  TRAD_EN_1: 'd12e5920-428c-4ed6-88ec-454abd282db2',
  TRAD_EN_2: '2e6ab297-65db-4d2b-bc15-e0202bb6dd1b',
};

// Définition des comptes à créer
interface UserDefinition {
  realName: string;
  pseudonym: string;
  email: string;
  role: Role;
  divisions: string[] | 'ALL';
}

const usersToCreate: UserDefinition[] = [
  // Gestionnaires - Toutes divisions
  {
    realName: 'Steve Gravel',
    pseudonym: 'Steeeve Gravelle',
    email: 'steve.gravel@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: 'ALL',
  },
  {
    realName: 'Julie Paradis',
    pseudonym: 'July Parady',
    email: 'julie.paradis@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: 'ALL',
  },

  // Conseillers
  {
    realName: 'Jean-Sébastien Kennedy',
    pseudonym: 'Joan-Sébastyan Kénédi',
    email: 'jean-sebastien.kennedy@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Hamza Maames',
    pseudonym: 'Hamzah Maaaamès',
    email: 'hamza.maames@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Shanelle Tremblay',
    pseudonym: 'Shaneille Tramblé',
    email: 'shanelle.tremblay@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Josée Elser',
    pseudonym: 'Jozée Elsère',
    email: 'josee.elser@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Gabriel Baker',
    pseudonym: 'Gabryel Baquer',
    email: 'gabriel.baker@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Astrid LeBlanc',
    pseudonym: 'Awestrid LaBlank',
    email: 'astrid.leblanc@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Claudiane Plouffe',
    pseudonym: 'Claudyane Plouffé',
    email: 'claudiane.plouffe@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Mélissa Pilon',
    pseudonym: 'Maylissa Pylôn',
    email: 'melissa.pilon@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },
  {
    realName: 'Mireille Gagnon',
    pseudonym: 'Mirièle Gagnône',
    email: 'mireille.gagnon@tetrix.com',
    role: 'CONSEILLER',
    divisions: 'ALL',
  },

  // Gestionnaires - Droit 1 et 2
  {
    realName: 'Noémie Rhéaume',
    pseudonym: 'Nowaimy Réôme',
    email: 'noemie.rheaume@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.DROIT_1, DIVISIONS.DROIT_2],
  },
  {
    realName: 'Guylaine Boisvert',
    pseudonym: 'Gislayne Boiverre',
    email: 'guylaine.boisvert@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.DROIT_1, DIVISIONS.DROIT_2],
  },
  {
    realName: 'Andrée-Cybèle Bilinski',
    pseudonym: 'Andrée-Cybèl Bylinskee',
    email: 'andree-cybele.bilinski@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.DROIT_1, DIVISIONS.DROIT_2],
  },

  // Gestionnaires - CISR
  {
    realName: 'Caroline LeBouthillier',
    pseudonym: 'Karolyne LeBouthilyé',
    email: 'caroline.lebouthillier@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.CISR],
  },
  {
    realName: 'Marie-Noëlle Duquette',
    pseudonym: 'Mary-Noël Dukète',
    email: 'marie-noelle.duquette@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.CISR],
  },

  // Gestionnaires - Traduction anglaise 1, 2 et Anglo (Multilingue)
  {
    realName: 'Ian Audenhaege',
    pseudonym: 'Eeyann Howdenhègue',
    email: 'ian.audenhaege@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.TRAD_EN_1, DIVISIONS.TRAD_EN_2, DIVISIONS.MULTI],
  },
  {
    realName: 'Rie Yamagishi',
    pseudonym: 'Ryé Yamagichy',
    email: 'rie.yamagishi@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.TRAD_EN_1, DIVISIONS.TRAD_EN_2, DIVISIONS.MULTI],
  },
  {
    realName: 'Karine Rondeau',
    pseudonym: 'Karyne Rondô',
    email: 'karine.rondeau@tetrix.com',
    role: 'GESTIONNAIRE',
    divisions: [DIVISIONS.TRAD_EN_1, DIVISIONS.TRAD_EN_2, DIVISIONS.MULTI],
  },
];

async function main() {
  console.log('=== Création des comptes utilisateurs ===\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Récupérer toutes les divisions pour "ALL"
  const allDivisions = await prisma.division.findMany();
  const allDivisionIds = allDivisions.map(d => d.id);

  let created = 0;
  let skipped = 0;

  for (const userDef of usersToCreate) {
    // Vérifier si l'utilisateur existe déjà
    const existing = await prisma.utilisateur.findUnique({
      where: { email: userDef.email },
    });

    if (existing) {
      console.log(`⏭️  ${userDef.pseudonym} (${userDef.email}) - existe déjà`);
      skipped++;
      continue;
    }

    // Créer l'utilisateur
    const user = await prisma.utilisateur.create({
      data: {
        email: userDef.email,
        motDePasse: hashedPassword,
        nom: userDef.pseudonym,
        role: userDef.role,
        actif: true,
      },
    });

    // Assigner les accès aux divisions
    const divisionIds = userDef.divisions === 'ALL' ? allDivisionIds : userDef.divisions;

    for (const divisionId of divisionIds) {
      await prisma.divisionAccess.create({
        data: {
          utilisateurId: user.id,
          divisionId: divisionId,
          peutLire: true,
          peutEcrire: true,
          peutGerer: userDef.role === 'GESTIONNAIRE',
        },
      });
    }

    const divisionCount = divisionIds.length;
    const divisionLabel = userDef.divisions === 'ALL' ? 'TOUTES' : `${divisionCount} division(s)`;
    
    console.log(`✅ ${userDef.pseudonym}`);
    console.log(`   📧 ${userDef.email}`);
    console.log(`   👤 ${userDef.role} - ${divisionLabel}`);
    console.log('');
    created++;
  }

  console.log('=== Résumé ===');
  console.log(`✅ ${created} compte(s) créé(s)`);
  console.log(`⏭️  ${skipped} compte(s) existant(s) ignoré(s)`);
  console.log(`\n🔑 Mot de passe par défaut: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
