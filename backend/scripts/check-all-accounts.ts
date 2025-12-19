import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const accounts = [
    'admin@tetrix.com',
    'conseiller@tetrix.com',
    'gestionnaire@tetrix.com',
    'traducteur@tetrix.com'
  ];

  console.log('🔍 Vérification des comptes génériques\n');
  console.log('═'.repeat(80));

  for (const email of accounts) {
    const user = await prisma.utilisateur.findUnique({ where: { email } });
    
    if (!user) {
      console.log(`\n❌ ${email} - NON TROUVÉ`);
      continue;
    }
    
    console.log(`\n✅ ${email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Actif: ${user.actif ? '✅ OUI' : '❌ NON'}`);
    
    // Test mot de passe
    const passwordMatch = await bcrypt.compare('password123', user.motDePasse);
    console.log(`   Mot de passe "password123": ${passwordMatch ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    // Vérifier les divisions si conseiller
    if (user.role === 'CONSEILLER') {
      const divisions = await prisma.divisionAccess.findMany({
        where: { utilisateurId: user.id },
        include: { division: true }
      });
      console.log(`   Divisions accessibles: ${divisions.length}`);
      if (divisions.length > 0) {
        divisions.slice(0, 3).forEach(d => console.log(`      - ${d.division.nom}`));
        if (divisions.length > 3) console.log(`      ... et ${divisions.length - 3} autres`);
      }
    }
    
    // Vérifier le profil traducteur si traducteur
    if (user.role === 'TRADUCTEUR') {
      const traducteur = await prisma.traducteur.findFirst({
        where: { utilisateurId: user.id },
        include: { pairesLinguistiques: true }
      });
      if (traducteur) {
        console.log(`   Profil traducteur: ✅ ${traducteur.nom}`);
        console.log(`   Division: ${traducteur.division}`);
        console.log(`   Capacité: ${traducteur.capaciteHeuresParJour}h/jour`);
        console.log(`   Paires linguistiques: ${traducteur.pairesLinguistiques.length}`);
      } else {
        console.log(`   Profil traducteur: ❌ MANQUANT`);
      }
    }
  }
  
  console.log('\n' + '═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
