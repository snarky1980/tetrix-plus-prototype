import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Création du compte pour Noémie Rhéaume...');

  const email = 'noemie.rheaume@tetrix.com';
  
  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.utilisateur.findUnique({ 
    where: { email } 
  });

  if (existingUser) {
    console.log('❌ Un compte existe déjà avec cet email:', email);
    return;
  }

  // Créer le hash du mot de passe
  const motDePasse = 'password123'; // Mot de passe temporaire
  const hash = await bcrypt.hash(motDePasse, 10);

  // Créer l'utilisateur
  const utilisateur = await prisma.utilisateur.create({
    data: {
      email,
      motDePasse: hash,
      nom: 'Rhéaume',
      prenom: 'Noémie',
      role: Role.CONSEILLER,
      actif: true,
    },
  });

  console.log('✅ Compte créé avec succès!');
  console.log('─────────────────────────────────────');
  console.log('Email:', email);
  console.log('Mot de passe temporaire:', motDePasse);
  console.log('Nom:', utilisateur.prenom, utilisateur.nom);
  console.log('Rôle:', utilisateur.role);
  console.log('─────────────────────────────────────');
  console.log('⚠️  Veuillez demander à l\'utilisatrice de changer son mot de passe lors de la première connexion.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
