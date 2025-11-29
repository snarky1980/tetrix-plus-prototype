import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

/**
 * Obtenir tous les clients
 * GET /api/clients
 */
export const obtenirClients = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { actif } = req.query;

    const where: any = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { nom: 'asc' },
    });

    res.json(clients);
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des clients' });
  }
};

/**
 * Créer un nouveau client
 * POST /api/clients
 */
export const creerClient = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { nom, sousDomaines } = req.body;

    const client = await prisma.client.create({
      data: {
        nom,
        sousDomaines: sousDomaines || [],
      },
    });

    res.status(201).json(client);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ erreur: 'Ce nom de client existe déjà' });
    } else {
      console.error('Erreur création client:', error);
      res.status(500).json({ erreur: 'Erreur lors de la création du client' });
    }
  }
};

/**
 * Mettre à jour un client
 * PUT /api/clients/:id
 */
export const mettreAJourClient = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nom, sousDomaines, actif } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(sousDomaines && { sousDomaines }),
        ...(actif !== undefined && { actif }),
      },
    });

    res.json(client);
  } catch (error) {
    console.error('Erreur mise à jour client:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour du client' });
  }
};
