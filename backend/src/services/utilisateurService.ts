import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export interface CreateUtilisateurData {
  email: string;
  motDePasse: string;
  nom?: string;
  prenom?: string;
  role: Role;
  divisions?: string[]; // IDs des divisions avec accès
}

export interface UpdateUtilisateurData {
  email?: string;
  nom?: string;
  prenom?: string;
  role?: Role;
  actif?: boolean;
  motDePasse?: string;
}

export interface DivisionAccessData {
  divisionId: string;
  peutLire: boolean;
  peutEcrire: boolean;
  peutGerer: boolean;
}

/**
 * Service pour la gestion des utilisateurs (conseillers/gestionnaires)
 */
export class UtilisateurService {
  /**
   * Obtenir tous les utilisateurs avec filtres optionnels
   */
  static async obtenirUtilisateurs(options?: {
    role?: Role;
    actif?: boolean;
    divisionId?: string;
  }) {
    const where: any = {};

    if (options?.role) {
      where.role = options.role;
    }

    if (options?.actif !== undefined) {
      where.actif = options.actif;
    }

    if (options?.divisionId) {
      where.divisionAccess = {
        some: {
          divisionId: options.divisionId,
        },
      };
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      include: {
        divisionAccess: {
          include: {
            division: true,
          },
        },
        traducteur: {
          select: {
            id: true,
            nom: true,
            division: true,
          },
        },
      },
      orderBy: {
        creeLe: 'desc',
      },
    });

    // Masquer les mots de passe
    return utilisateurs.map(({ motDePasse, ...user }) => user);
  }

  /**
   * Obtenir un utilisateur par ID
   */
  static async obtenirUtilisateurParId(id: string) {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        divisionAccess: {
          include: {
            division: true,
          },
        },
        traducteur: {
          select: {
            id: true,
            nom: true,
            division: true,
          },
        },
      },
    });

    if (!utilisateur) {
      throw new Error('Utilisateur non trouvé');
    }

    // Masquer le mot de passe
    const { motDePasse, ...userSansMotDePasse } = utilisateur;
    return userSansMotDePasse;
  }

  /**
   * Créer un nouvel utilisateur
   */
  static async creerUtilisateur(data: CreateUtilisateurData) {
    // Vérifier si l'email existe déjà
    const existant = await prisma.utilisateur.findUnique({
      where: { email: data.email },
    });

    if (existant) {
      throw new Error('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const motDePasseHash = await bcrypt.hash(data.motDePasse, 10);

    // Créer l'utilisateur avec ses accès aux divisions
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: data.email,
        motDePasse: motDePasseHash,
        nom: data.nom,
        prenom: data.prenom,
        role: data.role,
        divisionAccess: data.divisions
          ? {
              create: data.divisions.map((divisionId) => ({
                divisionId,
                peutLire: true,
                peutEcrire: data.role === 'GESTIONNAIRE' || data.role === 'ADMIN',
                peutGerer: data.role === 'ADMIN',
              })),
            }
          : undefined,
      },
      include: {
        divisionAccess: {
          include: {
            division: true,
          },
        },
      },
    });

    // Masquer le mot de passe
    const { motDePasse, ...userSansMotDePasse } = utilisateur;
    return userSansMotDePasse;
  }

  /**
   * Mettre à jour un utilisateur
   */
  static async mettreAJourUtilisateur(id: string, data: UpdateUtilisateurData) {
    const updateData: any = {};

    if (data.email) updateData.email = data.email;
    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.prenom !== undefined) updateData.prenom = data.prenom;
    if (data.role) updateData.role = data.role;
    if (data.actif !== undefined) updateData.actif = data.actif;

    // Si un nouveau mot de passe est fourni, le hasher
    if (data.motDePasse) {
      updateData.motDePasse = await bcrypt.hash(data.motDePasse, 10);
    }

    const utilisateur = await prisma.utilisateur.update({
      where: { id },
      data: updateData,
      include: {
        divisionAccess: {
          include: {
            division: true,
          },
        },
      },
    });

    // Masquer le mot de passe
    const { motDePasse, ...userSansMotDePasse } = utilisateur;
    return userSansMotDePasse;
  }

  /**
   * Supprimer un utilisateur
   */
  static async supprimerUtilisateur(id: string) {
    await prisma.utilisateur.delete({
      where: { id },
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  /**
   * Gérer les accès aux divisions d'un utilisateur
   */
  static async gererAccesDivisions(
    utilisateurId: string,
    acces: DivisionAccessData[]
  ) {
    // Supprimer tous les accès existants
    await prisma.divisionAccess.deleteMany({
      where: { utilisateurId },
    });

    // Créer les nouveaux accès
    if (acces.length > 0) {
      await prisma.divisionAccess.createMany({
        data: acces.map((a) => ({
          utilisateurId,
          divisionId: a.divisionId,
          peutLire: a.peutLire,
          peutEcrire: a.peutEcrire,
          peutGerer: a.peutGerer,
        })),
      });
    }

    return this.obtenirUtilisateurParId(utilisateurId);
  }

  /**
   * Vérifier si un utilisateur a accès à une division
   */
  static async verifierAccesDivision(
    utilisateurId: string,
    divisionId: string,
    typeAcces: 'lire' | 'ecrire' | 'gerer' = 'lire'
  ): Promise<boolean> {
    const acces = await prisma.divisionAccess.findUnique({
      where: {
        utilisateurId_divisionId: {
          utilisateurId,
          divisionId,
        },
      },
    });

    if (!acces) return false;

    switch (typeAcces) {
      case 'lire':
        return acces.peutLire;
      case 'ecrire':
        return acces.peutEcrire;
      case 'gerer':
        return acces.peutGerer;
      default:
        return false;
    }
  }

  /**
   * Obtenir les divisions accessibles par un utilisateur
   */
  static async obtenirDivisionsAccessibles(
    utilisateurId: string,
    typeAcces?: 'lire' | 'ecrire' | 'gerer'
  ) {
    const where: any = { utilisateurId };

    if (typeAcces === 'ecrire') {
      where.peutEcrire = true;
    } else if (typeAcces === 'gerer') {
      where.peutGerer = true;
    } else if (typeAcces === 'lire') {
      where.peutLire = true;
    }

    const acces = await prisma.divisionAccess.findMany({
      where,
      include: {
        division: true,
      },
    });

    return acces.map((a) => a.division);
  }
}
