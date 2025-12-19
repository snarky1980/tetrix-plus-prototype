import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Création des divisions standard\n');

  const divisionsStandard = [
    { nom: 'FINANCE', code: 'FIN', description: 'Services financiers et bancaires' },
    { nom: 'LEGAL', code: 'LEG', description: 'Juridique et légal' },
    { nom: 'TECH', code: 'TEC', description: 'Technologies et informatique' },
    { nom: 'MEDICAL', code: 'MED', description: 'Médical et pharmaceutique' },
    { nom: 'MARKETING', code: 'MKT', description: 'Marketing et communication' },
    { nom: 'EDUCATION', code: 'EDU', description: 'Éducation et formation' },
    { nom: 'GOVERNMENT', code: 'GOV', description: 'Services gouvernementaux' },
    { nom: 'COMMERCE', code: 'COM', description: 'Commerce international' },
    { nom: 'ENERGIE', code: 'ENE', description: 'Énergie et environnement' },
    { nom: 'CULTURE', code: 'CUL', description: 'Culture et patrimoine' },
  ];

  let created = 0;
  let existing = 0;

  for (const div of divisionsStandard) {
    const exists = await prisma.division.findUnique({ where: { nom: div.nom } });
    
    if (!exists) {
      await prisma.division.create({ data: div });
      console.log(`✅ Créé: ${div.nom}`);
      created++;
    } else {
      console.log(`↻ Existe: ${div.nom}`);
      existing++;
    }
  }

  console.log(`\n📊 Résumé: ${created} créées, ${existing} existantes`);
  
  const total = await prisma.division.count();
  console.log(`📁 Total divisions: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
