import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Liste complète des domaines de spécialisation utilisés
 * dans le système Tetrix PLUS
 */
const TOUS_LES_DOMAINES = [
  // Domaines principaux
  { nom: 'TAG - Général', domaineParent: 'TAG', actif: true },
  { nom: 'IMM - Général', domaineParent: 'IMM', actif: true },
  { nom: 'AUT - Autochtone', domaineParent: 'AUT', actif: true },
  { nom: 'CRIM SCorr. - Criminel Services Correctionnels', domaineParent: 'CRIM SCorr.', actif: true },
  { nom: 'CRIM Front. - Criminel Frontalier', domaineParent: 'CRIM Front.', actif: true },
  { nom: 'ENV - Environnement', domaineParent: 'ENV', actif: true },
  { nom: 'AGRI - Agriculture', domaineParent: 'AGRI', actif: true },
  { nom: 'BIO - Biologie', domaineParent: 'BIO', actif: true },
  { nom: 'SCN - Sciences', domaineParent: 'SCN', actif: true },
  { nom: 'MED - Médical', domaineParent: 'MED', actif: true },
  { nom: 'DROIT - Droit', domaineParent: 'DROIT', actif: true },
  { nom: 'EMP - Emploi', domaineParent: 'EMP', actif: true },
  { nom: 'SOC - Social', domaineParent: 'SOC', actif: true },
  { nom: 'TECH - Technique', domaineParent: 'TECH', actif: true },
  { nom: 'TRA - Transport', domaineParent: 'TRA', actif: true },
  { nom: 'MIL TERRE - Militaire Terre', domaineParent: 'MIL TERRE', actif: true },
  { nom: 'MIL AIR - Militaire Air', domaineParent: 'MIL AIR', actif: true },
  
  // Domaines génériques (déjà créés mais on les inclut pour référence)
  { nom: 'Juridique - Général', domaineParent: 'Juridique', actif: true },
  { nom: 'Médical - Général', domaineParent: 'Médical', actif: true },
  { nom: 'Technique - Général', domaineParent: 'Technique', actif: true },
  { nom: 'Financier - Général', domaineParent: 'Financier', actif: true },
  { nom: 'Marketing - Général', domaineParent: 'Marketing', actif: true },
  { nom: 'Éducation - Général', domaineParent: 'Éducation', actif: true },
  { nom: 'Scientifique - Général', domaineParent: 'Scientifique', actif: true },
  { nom: 'Administratif - Général', domaineParent: 'Administratif', actif: true },
  { nom: 'Commerce - Général', domaineParent: 'Commerce', actif: true },
  { nom: 'Technologies - Général', domaineParent: 'Technologies', actif: true },
];

async function main() {
  console.log('🌱 Ajout de tous les domaines de spécialisation...\n');

  let compteur = 0;
  let existants = 0;

  for (const sd of TOUS_LES_DOMAINES) {
    try {
      await prisma.sousDomaine.upsert({
        where: { nom: sd.nom },
        update: { actif: true, domaineParent: sd.domaineParent },
        create: sd,
      });
      compteur++;
      console.log(`✓ ${sd.domaineParent} - ${sd.nom}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        existants++;
        console.log(`⏭️  ${sd.nom} existe déjà`);
      } else {
        console.error(`❌ Erreur pour ${sd.nom}:`, error.message);
      }
    }
  }

  console.log(`\n✅ ${compteur} domaines ajoutés/mis à jour`);
  if (existants > 0) {
    console.log(`⏭️  ${existants} domaines existants ignorés`);
  }

  // Afficher tous les domaines parents disponibles
  console.log('\n📋 Liste complète des domaines parents:');
  const result = await prisma.$queryRaw<Array<{ domaineParent: string }>>`
    SELECT DISTINCT "domaineParent" 
    FROM sous_domaines 
    WHERE "domaineParent" IS NOT NULL AND actif = true
    ORDER BY "domaineParent"
  `;
  
  console.log(`\nTotal: ${result.length} domaines parents\n`);
  result.forEach(r => console.log(`   - ${r.domaineParent}`));
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
