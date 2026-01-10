import prisma from '../config/database';
import cache, { CACHE_KEYS } from '../utils/cache';

export interface CreateDivisionData {
  nom: string;
  code: string;
  description?: string;
}

export interface UpdateDivisionData {
  nom?: string;
  code?: string;
  description?: string;
  actif?: boolean;
}

/**
 * Service pour la gestion des divisions
 * Utilise le cache pour les requêtes fréquentes
 */
export class DivisionService {
  /**
   * Obtenir toutes les divisions (avec cache pour liste complète)
   */
  static async obtenirDivisions(actif?: boolean) {
    const where = actif !== undefined ? { actif } : {};

    // Utiliser le cache seulement pour la liste complète sans filtre
    if (actif === undefined) {
      return cache.getOrSet(
        CACHE_KEYS.DIVISIONS_ALL,
        async () => prisma.division.findMany({
          where,
          include: {
            acces: {
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
        }),
        300 // 5 minutes
      );
    }

    // Avec filtre, pas de cache
    return await prisma.division.findMany({
      where,
      include: {
        acces: {
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
      orderBy: {
        nom: 'asc',
      },
    });
  }

  /**
   * Invalider le cache des divisions (à appeler après création/modification/suppression)
   */
  static invalidateCache() {
    cache.invalidate(CACHE_KEYS.DIVISIONS_ALL);
  }

  /**
   * Obtenir une division par ID
   */
  static async obtenirDivisionParId(id: string) {
    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        acces: {
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

    if (!division) {
      throw new Error('Division non trouvée');
    }

    return division;
  }

  /**
   * Créer une nouvelle division
   */
  static async creerDivision(data: CreateDivisionData) {
    // Vérifier si le code existe déjà
    const existant = await prisma.division.findUnique({
      where: { code: data.code },
    });

    if (existant) {
      throw new Error('Ce code de division est déjà utilisé');
    }

    const division = await prisma.division.create({
      data: {
        nom: data.nom,
        code: data.code,
        description: data.description,
      },
    });

    // Invalider le cache
    this.invalidateCache();
    
    return division;
  }

  /**
   * Mettre à jour une division
   */
  static async mettreAJourDivision(id: string, data: UpdateDivisionData) {
    // Si le code change, vérifier qu'il n'existe pas déjà
    if (data.code) {
      const existant = await prisma.division.findFirst({
        where: {
          code: data.code,
          NOT: { id },
        },
      });

      if (existant) {
        throw new Error('Ce code de division est déjà utilisé');
      }
    }

    const division = await prisma.division.update({
      where: { id },
      data,
    });

    // Invalider le cache
    this.invalidateCache();
    
    return division;
  }

  /**
   * Supprimer une division
   */
  static async supprimerDivision(id: string) {
    // Vérifier s'il y a des traducteurs dans cette division
    // Récupérer d'abord le nom de la division
    const division = await prisma.division.findUnique({
      where: { id },
      select: { nom: true },
    });

    if (!division) {
      throw new Error('Division non trouvée');
    }

    const traducteurs = await prisma.traducteur.findMany({
      where: { divisions: { has: division.nom } },
    });

    if (traducteurs.length > 0) {
      throw new Error(
        'Impossible de supprimer une division qui contient des traducteurs'
      );
    }

    await prisma.division.delete({
      where: { id },
    });

    return { message: 'Division supprimée avec succès' };
  }

  /**
   * Obtenir les utilisateurs ayant accès à une division
   */
  static async obtenirUtilisateursAvecAcces(divisionId: string) {
    const acces = await prisma.divisionAccess.findMany({
      where: { divisionId },
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
    });

    return acces.map((a) => ({
      ...a.utilisateur,
      peutLire: a.peutLire,
      peutEcrire: a.peutEcrire,
      peutGerer: a.peutGerer,
    }));
  }
}
