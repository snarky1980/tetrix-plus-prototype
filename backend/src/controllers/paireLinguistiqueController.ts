import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

/**
 * Ajouter une paire linguistique à un traducteur
 * POST /api/traducteurs/:traducteurId/paires-linguistiques
 */
export const ajouterPaireLinguistique = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { traducteurId } = req.params;
    const { langueSource, langueCible } = req.body;

    const paire = await prisma.paireLinguistique.create({
      data: {
        langueSource,
        langueCible,
        traducteurId,
      },
    });

    res.status(201).json(paire);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ erreur: 'Cette paire linguistique existe déjà pour ce traducteur' });
    } else {
      console.error('Erreur ajout paire linguistique:', error);
      res.status(500).json({ erreur: 'Erreur lors de l\'ajout de la paire linguistique' });
    }
  }
};

/**
 * Supprimer une paire linguistique
 * DELETE /api/paires-linguistiques/:id
 */
export const supprimerPaireLinguistique = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.paireLinguistique.delete({
      where: { id },
    });

    res.json({ message: 'Paire linguistique supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression paire linguistique:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression de la paire linguistique' });
  }
};
