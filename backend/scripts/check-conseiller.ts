import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'conseiller@tetrix.com';
  const user = await prisma.utilisateur.findUnique({ where: { email } });
  
  if (!user) {
    console.log('❌ Utilisateur non trouvé');
    return;
  }
  
  console.log('\n✅ Utilisateur trouvé:');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Rôle:', user.role);
  console.log('Actif:', user.actif);
  console.log('Hash du mot de passe:', user.motDePasse.substring(0, 20) + '...');
  
  // Vérifier le mot de passe
  const passwordMatch = await bcrypt.compare('password123', user.motDePasse);
  console.log('\n🔑 Test du mot de passe "password123":', passwordMatch ? '✅ CORRECT' : '❌ INCORRECT');
  
  // Vérifier les divisions accessibles
  const divisions = await prisma.divisionAccess.findMany({
    where: { utilisateurId: user.id },
    include: { division: true }
  });
  
  console.log('\n📋 Divisions accessibles:', divisions.length);
  divisions.forEach(d => {
    console.log('  -', d.division.nom);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
