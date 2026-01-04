import { PrismaClient, RoleEquipeConseiller } from '.prisma/client';

const prisma = new PrismaClient();

// Types
export interface CreerEquipeConseillerDTO {
  nom: string;
  code: string;
  description?: string;
  couleur?: string;
}

export interface ModifierEquipeConseillerDTO {
  nom?: string;
  code?: string;
  description?: string;
  couleur?: string;
  actif?: boolean;
}

export interface AjouterMembreDTO {
  utilisateurId: string;
  role?: RoleEquipeConseiller;
  notes?: string;
}

// ============================================
// CRUD Équipes Conseillers
// ============================================

export async function listerEquipesConseiller(includeInactif = false) {
  return prisma.equipeConseiller.findMany({
    where: includeInactif ? {} : { actif: true },
    include: {
      membres: {
        where: { actif: true },
        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              nom: true,
              prenom: true,
              role: true,
              actif: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' }, // CHEF en premier
          { dateAjout: 'asc' },
        ],
      },
    },
    orderBy: { nom: 'asc' },
  });
}

export async function obtenirEquipeConseiller(id: string) {
  return prisma.equipeConseiller.findUnique({
    where: { id },
    include: {
      membres: {
        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              nom: true,
              prenom: true,
              role: true,
              actif: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' },
          { dateAjout: 'asc' },
        ],
      },
    },
  });
}

export async function creerEquipeConseiller(
  donnees: CreerEquipeConseillerDTO,
  creeParId: string
) {
  // Vérifier unicité du code
  const existante = await prisma.equipeConseiller.findFirst({
    where: {
      OR: [
        { nom: donnees.nom },
        { code: donnees.code },
      ],
    },
  });

  if (existante) {
    throw new Error(
      existante.nom === donnees.nom
        ? 'Une équipe avec ce nom existe déjà'
        : 'Une équipe avec ce code existe déjà'
    );
  }

  return prisma.equipeConseiller.create({
    data: {
      nom: donnees.nom,
      code: donnees.code.toUpperCase(),
      description: donnees.description,
      couleur: donnees.couleur || '#8B5CF6',
      creePar: creeParId,
    },
    include: {
      membres: true,
    },
  });
}

export async function modifierEquipeConseiller(
  id: string,
  donnees: ModifierEquipeConseillerDTO,
  modifieParId: string
) {
  // Vérifier unicité si nom ou code change
  if (donnees.nom || donnees.code) {
    const existante = await prisma.equipeConseiller.findFirst({
      where: {
        id: { not: id },
        OR: [
          donnees.nom ? { nom: donnees.nom } : {},
          donnees.code ? { code: donnees.code } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    if (existante) {
      throw new Error(
        existante.nom === donnees.nom
          ? 'Une équipe avec ce nom existe déjà'
          : 'Une équipe avec ce code existe déjà'
      );
    }
  }

  return prisma.equipeConseiller.update({
    where: { id },
    data: {
      ...donnees,
      code: donnees.code?.toUpperCase(),
      modifiePar: modifieParId,
    },
    include: {
      membres: {
        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              nom: true,
              prenom: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function supprimerEquipeConseiller(id: string) {
  // Hard delete - suppression complète de l'équipe
  // Les membres sont supprimés automatiquement via onDelete: Cascade dans le schéma
  
  // D'abord, mettre à null les références dans les notes
  await prisma.note.updateMany({
    where: { equipeConseillerId: id },
    data: { 
      equipeConseillerId: null,
      // Changer la visibilité en PRIVE pour les notes qui avaient EQUIPE_CONSEILLER
      visibilite: 'PRIVE'
    },
  });
  
  // Ensuite, supprimer l'équipe (les membres sont supprimés en cascade)
  return prisma.equipeConseiller.delete({
    where: { id },
  });
}

// ============================================
// Gestion des membres
// ============================================

export async function ajouterMembre(
  equipeId: string,
  donnees: AjouterMembreDTO,
  ajouteParId: string
) {
  // Vérifier que l'utilisateur existe et n'est pas déjà membre
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: donnees.utilisateurId },
  });

  if (!utilisateur) {
    throw new Error('Utilisateur non trouvé');
  }

  // Vérifier le rôle - seuls CONSEILLER, GESTIONNAIRE, ADMIN peuvent être membres
  if (!['CONSEILLER', 'GESTIONNAIRE', 'ADMIN'].includes(utilisateur.role)) {
    throw new Error('Seuls les conseillers, gestionnaires et administrateurs peuvent être membres d\'une équipe conseiller');
  }

  const membreExistant = await prisma.equipeConseillerMembre.findFirst({
    where: {
      equipeConseillerId: equipeId,
      utilisateurId: donnees.utilisateurId,
    },
  });

  if (membreExistant) {
    if (membreExistant.actif) {
      throw new Error('Cet utilisateur est déjà membre de cette équipe');
    }
    // Réactiver le membre
    return prisma.equipeConseillerMembre.update({
      where: { id: membreExistant.id },
      data: {
        actif: true,
        role: donnees.role || 'MEMBRE',
        dateRetrait: null,
        notes: donnees.notes,
      },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            role: true,
          },
        },
      },
    });
  }

  return prisma.equipeConseillerMembre.create({
    data: {
      equipeConseillerId: equipeId,
      utilisateurId: donnees.utilisateurId,
      role: donnees.role || 'MEMBRE',
      ajoutePar: ajouteParId,
      notes: donnees.notes,
    },
    include: {
      utilisateur: {
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
        },
      },
    },
  });
}

export async function retirerMembre(equipeId: string, utilisateurId: string) {
  const membre = await prisma.equipeConseillerMembre.findFirst({
    where: {
      equipeConseillerId: equipeId,
      utilisateurId,
      actif: true,
    },
  });

  if (!membre) {
    throw new Error('Membre non trouvé dans cette équipe');
  }

  return prisma.equipeConseillerMembre.update({
    where: { id: membre.id },
    data: {
      actif: false,
      dateRetrait: new Date(),
    },
  });
}

export async function modifierRoleMembre(
  equipeId: string,
  utilisateurId: string,
  role: RoleEquipeConseiller
) {
  const membre = await prisma.equipeConseillerMembre.findFirst({
    where: {
      equipeConseillerId: equipeId,
      utilisateurId,
      actif: true,
    },
  });

  if (!membre) {
    throw new Error('Membre non trouvé dans cette équipe');
  }

  return prisma.equipeConseillerMembre.update({
    where: { id: membre.id },
    data: { role },
    include: {
      utilisateur: {
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
        },
      },
    },
  });
}

// ============================================
// Requêtes utilitaires
// ============================================

export async function obtenirEquipesUtilisateur(utilisateurId: string) {
  return prisma.equipeConseiller.findMany({
    where: {
      actif: true,
      membres: {
        some: {
          utilisateurId,
          actif: true,
        },
      },
    },
    include: {
      membres: {
        where: { actif: true },
        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              nom: true,
              prenom: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: { nom: 'asc' },
  });
}

export async function estMembreEquipe(
  utilisateurId: string,
  equipeId: string
): Promise<boolean> {
  const membre = await prisma.equipeConseillerMembre.findFirst({
    where: {
      equipeConseillerId: equipeId,
      utilisateurId,
      actif: true,
    },
  });
  return !!membre;
}

export async function obtenirMembresEquipe(equipeId: string) {
  return prisma.equipeConseillerMembre.findMany({
    where: {
      equipeConseillerId: equipeId,
      actif: true,
    },
    include: {
      utilisateur: {
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          actif: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { dateAjout: 'asc' },
    ],
  });
}

export async function obtenirUtilisateursDisponibles(equipeId: string) {
  // Retourne les utilisateurs éligibles (CONSEILLER, GESTIONNAIRE, ADMIN) 
  // qui ne sont pas déjà membres actifs de cette équipe
  const membresActuels = await prisma.equipeConseillerMembre.findMany({
    where: {
      equipeConseillerId: equipeId,
      actif: true,
    },
    select: { utilisateurId: true },
  });

  const idsActuels = membresActuels.map(m => m.utilisateurId);

  return prisma.utilisateur.findMany({
    where: {
      actif: true,
      role: { in: ['CONSEILLER', 'GESTIONNAIRE', 'ADMIN'] },
      id: { notIn: idsActuels },
    },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
    },
    orderBy: [
      { nom: 'asc' },
      { prenom: 'asc' },
    ],
  });
}
