import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Mise à jour du mot de passe pour Noémie Rhéaume...');

  const email = 'noemie.rheaume@tetrix.com';
  const nouveauMotDePasse = 'password123';
  
  // Créer le hash du mot de passe
  const hash = await bcrypt.hash(nouveauMotDePasse, 10);

  // Mettre à jour l'utilisateur
  const utilisateur = await prisma.utilisateur.update({
    where: { email },
    data: {
      motDePasse: hash,
    },
  });

  console.log('✅ Mot de passe mis à jour avec succès!');
  console.log('─────────────────────────────────────');
  console.log('Email:', email);
  console.log('Nouveau mot de passe:', nouveauMotDePasse);
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
