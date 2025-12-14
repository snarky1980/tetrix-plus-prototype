import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: { actif: true },
    select: { nom: true },
    orderBy: { nom: 'asc' }
  });
  console.log('=== CLIENTS DISPONIBLES ===');
  console.log(clients.map((c: any) => c.nom).join(', '));
  
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    select: {
      nom: true,
      division: true,
      classification: true,
      horaire: true,
      capaciteHeuresParJour: true,
      pairesLinguistiques: { select: { langueSource: true, langueCible: true } }
    },
    orderBy: { nom: 'asc' }
  });
  
  console.log('\n=== HORAIRES VARIÉS (pour tests) ===');
  const seen = new Set<string>();
  for (const t of traducteurs) {
    const h = t.horaire || 'Normal';
    if (!seen.has(h) && seen.size < 12) {
      seen.add(h);
      const paires = t.pairesLinguistiques.map((p: any) => `${p.langueSource}->${p.langueCible}`).join(', ');
      console.log(`${seen.size}. ${t.nom} | ${t.division} | ${h} | ${t.capaciteHeuresParJour}h | ${paires}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
