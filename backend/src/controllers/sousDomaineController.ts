import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

/**
 * Obtenir tous les sous-domaines
 * GET /api/sous-domaines
 */
export const obtenirSousDomaines = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { actif } = req.query;

    const where: any = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const sousDomaines = await prisma.sousDomaine.findMany({
      where,
      orderBy: { nom: 'asc' },
    });

    res.json(sousDomaines);
  } catch (error) {
    console.error('Erreur récupération sous-domaines:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des sous-domaines' });
  }
};

/**
 * Créer un nouveau sous-domaine
 * POST /api/sous-domaines
 */
export const creerSousDomaine = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { nom, domaineParent } = req.body;

    const sousDomaine = await prisma.sousDomaine.create({
      data: {
        nom,
        domaineParent: domaineParent || null,
      },
    });

    res.status(201).json(sousDomaine);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ erreur: 'Ce nom de sous-domaine existe déjà' });
    } else {
      console.error('Erreur création sous-domaine:', error);
      res.status(500).json({ erreur: 'Erreur lors de la création du sous-domaine' });
    }
  }
};

/**
 * Mettre à jour un sous-domaine
 * PUT /api/sous-domaines/:id
 */
export const mettreAJourSousDomaine = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nom, domaineParent, actif } = req.body;

    const sousDomaine = await prisma.sousDomaine.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(domaineParent !== undefined && { domaineParent }),
        ...(actif !== undefined && { actif }),
      },
    });

    res.json(sousDomaine);
  } catch (error) {
    console.error('Erreur mise à jour sous-domaine:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour du sous-domaine' });
  }
};
