import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Obtenir les permissions d'équipes de projet d'un utilisateur
 */
export const obtenirPermissionsEquipesProjet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { utilisateurId } = req.params;

    // Vérifier les droits d'accès
    if (req.utilisateur!.role !== 'ADMIN') {
      res.status(403).json({ erreur: 'Accès refusé' });
      return;
    }

    const permissions = await prisma.equipeProjetAccess.findMany({
      where: {
        utilisateurId,
      },
      include: {
        equipeProjet: {
          select: { id: true, nom: true, code: true }
        }
      },
      orderBy: {
        equipeProjet: {
          nom: 'asc'
        }
      }
    });

    res.json(permissions);
  } catch (err) {
    console.error('Erreur lors de la récupération des permissions d\'équipes de projet:', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

/**
 * Définir les permissions d'équipes de projet d'un utilisateur
 */
export const definirPermissionsEquipesProjet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { utilisateurId } = req.params;
    const { permissions } = req.body;

    // Vérifier les droits d'accès
    if (req.utilisateur!.role !== 'ADMIN') {
      res.status(403).json({ erreur: 'Accès refusé' });
      return;
    }

    // Validation
    if (!Array.isArray(permissions)) {
      res.status(400).json({ erreur: 'permissions doit être un tableau' });
      return;
    }

    // Supprimer toutes les anciennes permissions
    await prisma.equipeProjetAccess.deleteMany({
      where: { utilisateurId }
    });

    // Créer les nouvelles permissions
    if (permissions.length > 0) {
      await prisma.equipeProjetAccess.createMany({
        data: permissions.map((perm: any) => ({
          utilisateurId,
          equipeProjetId: perm.equipeProjetId,
          peutLire: perm.peutLire !== undefined ? perm.peutLire : true,
          peutEcrire: perm.peutEcrire !== undefined ? perm.peutEcrire : false,
          peutGerer: perm.peutGerer !== undefined ? perm.peutGerer : false,
        }))
      });
    }

    // Retourner les nouvelles permissions
    const nouvellesPermissions = await prisma.equipeProjetAccess.findMany({
      where: { utilisateurId },
      include: {
        equipeProjet: {
          select: { id: true, nom: true, code: true }
        }
      }
    });

    res.json(nouvellesPermissions);
  } catch (err) {
    console.error('Erreur lors de la définition des permissions d\'équipes de projet:', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};
