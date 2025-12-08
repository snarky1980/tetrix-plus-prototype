/**
 * Script pour donner accès à toutes les divisions aux utilisateurs existants
 * qui n'ont pas encore d'accès configuré
 */

import prisma from '../src/config/database';

async function grantDefaultDivisions() {
  console.log('🔍 Recherche des utilisateurs sans accès aux divisions...');

  // Obtenir tous les utilisateurs
  const utilisateurs = await prisma.utilisateur.findMany({
    include: {
      divisionAccess: true,
    },
  });

  // Obtenir toutes les divisions actives
  const divisions = await prisma.division.findMany({
    where: { actif: true },
  });

  console.log(`📊 ${utilisateurs.length} utilisateur(s) trouvé(s)`);
  console.log(`📊 ${divisions.length} division(s) active(s) trouvée(s)`);

  let compteurMisAJour = 0;

  for (const utilisateur of utilisateurs) {
    // Si l'utilisateur n'a aucun accès, lui donner accès à toutes les divisions
    if (!utilisateur.divisionAccess || utilisateur.divisionAccess.length === 0) {
      console.log(`\n👤 ${utilisateur.email} n'a aucun accès configuré`);
      
      // Déterminer les permissions selon le rôle
      const peutEcrire = utilisateur.role === 'GESTIONNAIRE' || utilisateur.role === 'ADMIN';
      const peutGerer = utilisateur.role === 'ADMIN';

      // Créer les accès pour toutes les divisions
      for (const division of divisions) {
        await prisma.divisionAccess.create({
          data: {
            utilisateurId: utilisateur.id,
            divisionId: division.id,
            peutLire: true,
            peutEcrire,
            peutGerer,
          },
        });
        console.log(`  ✅ Accès accordé à "${division.nom}" (lecture: ✓, écriture: ${peutEcrire ? '✓' : '✗'}, gestion: ${peutGerer ? '✓' : '✗'})`);
      }

      compteurMisAJour++;
    } else {
      console.log(`✓ ${utilisateur.email} a déjà ${utilisateur.divisionAccess.length} accès configuré(s)`);
    }
  }

  console.log(`\n✅ ${compteurMisAJour} utilisateur(s) mis à jour avec les accès par défaut`);
  console.log('✨ Migration terminée avec succès !');
}

grantDefaultDivisions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  });
