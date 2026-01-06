import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Vérification des utilisateurs dans la base...\n');
  
  const users = await prisma.utilisateur.findMany({
    select: { email: true, role: true, actif: true },
    take: 15
  });
  
  console.log('Utilisateurs trouvés:', users.length);
  users.forEach(u => {
    console.log(`  - ${u.email} | ${u.role} | actif: ${u.actif}`);
  });

  // Test avec admin@tetrix.com
  console.log('\n🔐 Test connexion admin@tetrix.com...');
  const admin = await prisma.utilisateur.findUnique({ 
    where: { email: 'admin@tetrix.com' } 
  });
  
  if (admin) {
    const match = await bcrypt.compare('password123', admin.motDePasse);
    console.log('  Mot de passe "password123":', match ? '✅ OK' : '❌ INCORRECT');
  } else {
    console.log('  ❌ Utilisateur non trouvé');
  }

  // Test avec conseiller@tetrix.com
  console.log('\n🔐 Test connexion conseiller@tetrix.com...');
  const conseiller = await prisma.utilisateur.findUnique({ 
    where: { email: 'conseiller@tetrix.com' } 
  });
  
  if (conseiller) {
    const match = await bcrypt.compare('password123', conseiller.motDePasse);
    console.log('  Mot de passe "password123":', match ? '✅ OK' : '❌ INCORRECT');
  } else {
    console.log('  ❌ Utilisateur non trouvé');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
