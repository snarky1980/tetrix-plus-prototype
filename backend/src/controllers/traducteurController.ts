import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

/**
 * Récupérer la liste des traducteurs avec filtres
 * GET /api/traducteurs
 */
export const obtenirTraducteurs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { division, client, domaine, langueSource, langueCible, actif } = req.query;

    const where: any = {};

    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    if (division) {
      where.division = division as string;
    }

    if (client) {
      where.clientsHabituels = { has: client as string };
    }

    if (domaine) {
      where.domaines = { has: domaine as string };
    }

    // Filtre par paire linguistique
    if (langueSource || langueCible) {
      where.pairesLinguistiques = {
        some: {
          ...(langueSource && { langueSource: langueSource as string }),
          ...(langueCible && { langueCible: langueCible as string }),
        },
      };
    }

    const traducteurs = await prisma.traducteur.findMany({
      where,
      include: {
        pairesLinguistiques: true,
        utilisateur: {
          select: {
            email: true,
            actif: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    res.json(traducteurs);
  } catch (error) {
    console.error('Erreur récupération traducteurs:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des traducteurs' });
  }
};

/**
 * Récupérer un traducteur par ID
 * GET /api/traducteurs/:id
 */
export const obtenirTraducteur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const traducteur = await prisma.traducteur.findUnique({
      where: { id },
      include: {
        pairesLinguistiques: true,
        utilisateur: {
          select: {
            email: true,
            role: true,
            actif: true,
          },
        },
      },
    });

    if (!traducteur) {
      res.status(404).json({ erreur: 'Traducteur non trouvé' });
      return;
    }

    res.json(traducteur);
  } catch (error) {
    console.error('Erreur récupération traducteur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération du traducteur' });
  }
};

/**
 * Créer un nouveau traducteur (Admin uniquement)
 * POST /api/traducteurs
 */
export const creerTraducteur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      nom,
      email,
      motDePasse,
      division,
      domaines,
      clientsHabituels,
      capaciteHeuresParJour,
    } = req.body;

    // Créer l'utilisateur et le traducteur en une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Hasher le mot de passe
      const bcrypt = require('bcrypt');
      const motDePasseHash = await bcrypt.hash(motDePasse, 10);

      // Créer l'utilisateur
      const utilisateur = await tx.utilisateur.create({
        data: {
          email,
          motDePasse: motDePasseHash,
          role: 'TRADUCTEUR',
        },
      });

      // Créer le traducteur
      const traducteur = await tx.traducteur.create({
        data: {
          nom,
          division,
          domaines: domaines || [],
          clientsHabituels: clientsHabituels || [],
          capaciteHeuresParJour: capaciteHeuresParJour || 7.5,
          utilisateurId: utilisateur.id,
        },
        include: {
          pairesLinguistiques: true,
          utilisateur: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });

      return traducteur;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur création traducteur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la création du traducteur' });
  }
};

/**
 * Mettre à jour un traducteur (Admin uniquement)
 * PUT /api/traducteurs/:id
 */
export const mettreAJourTraducteur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nom,
      division,
      domaines,
      clientsHabituels,
      capaciteHeuresParJour,
      actif,
    } = req.body;

    const traducteur = await prisma.traducteur.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(division && { division }),
        ...(domaines && { domaines }),
        ...(clientsHabituels && { clientsHabituels }),
        ...(capaciteHeuresParJour && { capaciteHeuresParJour }),
        ...(actif !== undefined && { actif }),
      },
      include: {
        pairesLinguistiques: true,
        utilisateur: {
          select: {
            email: true,
            actif: true,
          },
        },
      },
    });

    res.json(traducteur);
  } catch (error) {
    console.error('Erreur mise à jour traducteur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour du traducteur' });
  }
};

/**
 * Désactiver un traducteur (Admin uniquement)
 * DELETE /api/traducteurs/:id
 */
export const desactiverTraducteur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.traducteur.update({
      where: { id },
      data: { actif: false },
    });

    res.json({ message: 'Traducteur désactivé avec succès' });
  } catch (error) {
    console.error('Erreur désactivation traducteur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la désactivation du traducteur' });
  }
};
