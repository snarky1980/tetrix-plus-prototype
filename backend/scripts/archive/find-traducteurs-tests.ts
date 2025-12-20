import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const noms = [
  'Bissonnette, Julie-Marie',
  'Martin, Isabelle', 
  'Kadnikov, Patrick',
  'Lacasse, Mélanie',
  'Laroche, Christian',
  'Lavigne, Benoit',
  'La Salle, Ginette',
  'Mann, Elizabeth',
  'Lampron, Jimmy',
  'Ouellet, Diane'
];

(async () => {
  const found: any = {};
  for (const nom of noms) {
    const t = await prisma.traducteur.findFirst({ 
      where: { nom }, 
      select: { id: true, nom: true, horaire: true } 
    });
    if (t) {
      console.log(`✅ ${nom}: ${t.id} (${t.horaire})`);
      found[nom] = t.id;
    } else {
      console.log(`❌ ${nom}: NON TROUVÉ`);
    }
  }
  console.log('\n=== IDS ===');
  console.log(JSON.stringify(found, null, 2));
  await prisma.$disconnect();
})();
