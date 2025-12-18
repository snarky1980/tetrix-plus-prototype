import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Obtenir les permissions de divisions d'un utilisateur
 */
export const obtenirPermissionsDivisions = async (
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

    const permissions = await prisma.divisionAccess.findMany({
      where: {
        utilisateurId,
      },
      include: {
        division: {
          select: { id: true, nom: true }
        }
      },
      orderBy: {
        division: {
          nom: 'asc'
        }
      }
    });

    res.json(permissions);
  } catch (err) {
    console.error('Erreur lors de la récupération des permissions:', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

/**
 * Définir les permissions de divisions d'un utilisateur
 */
export const definirPermissionsDivisions = async (
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
    await prisma.divisionAccess.deleteMany({
      where: { utilisateurId }
    });

    // Créer les nouvelles permissions
    if (permissions.length > 0) {
      const permissionsACreer = permissions.map((perm: any) => ({
        utilisateurId,
        divisionId: perm.divisionId,
        peutLire: perm.peutLire ?? true,
        peutEcrire: perm.peutEcrire ?? false,
        peutGerer: perm.peutGerer ?? false,
      }));

      await prisma.divisionAccess.createMany({
        data: permissionsACreer
      });
    }

    // Récupérer les permissions créées
    const nouvellesPermissions = await prisma.divisionAccess.findMany({
      where: { utilisateurId },
      include: {
        division: {
          select: { id: true, nom: true }
        }
      }
    });

    res.json(nouvellesPermissions);
  } catch (err) {
    console.error('Erreur lors de la mise à jour des permissions:', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};
