import prisma from '../src/config/database';

async function listRealTranslators() {
  // Récupérer tous les traducteurs avec leurs utilisateurs
  const traducteurs = await prisma.traducteur.findMany({
    include: {
      utilisateur: {
        select: {
          email: true,
          nom: true,
          prenom: true
        }
      }
    },
    orderBy: {
      nom: 'asc'
    }
  });

  console.log(`\n📋 TRADUCTEURS DANS LA BASE DE DONNÉES\n`);
  console.log(`Total: ${traducteurs.length}\n`);

  // Exclure les comptes génériques
  const generiques = ['admin@tetrix.com', 'conseiller@tetrix.com', 'gestionnaire@tetrix.com', 'traducteur@tetrix.com'];
  
  const reels = traducteurs.filter(t => !generiques.includes(t.utilisateur.email));
  const generiquesFiltered = traducteurs.filter(t => generiques.includes(t.utilisateur.email));

  console.log(`\n✅ COMPTES GÉNÉRIQUES (à ne pas toucher): ${generiquesFiltered.length}`);
  generiquesFiltered.forEach(t => {
    console.log(`  - ${t.nom} (${t.utilisateur.email})`);
  });

  console.log(`\n🔄 TRADUCTEURS RÉELS (à pseudonymiser): ${reels.length}`);
  reels.slice(0, 20).forEach(t => {
    console.log(`  - ${t.nom} (${t.utilisateur.email})`);
  });
  
  if (reels.length > 20) {
    console.log(`  ... et ${reels.length - 20} autres`);
  }

  await prisma.$disconnect();
}

listRealTranslators().catch(console.error);
