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
    const { division, client, domaine, typeTexte, langueSource, langueCible, actif } = req.query;

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

    if (typeTexte) {
      where.typesTextes = { has: typeTexte as string };
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
      typesTextes,
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
          typesTextes: typesTextes || [],
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
      typesTextes,
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
        ...(typesTextes && { typesTextes }),
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

/**
 * Bloquer du temps pour un traducteur (Admin/Conseiller)
 * POST /api/traducteurs/:id/bloquer-temps
 */
export const bloquerTemps = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: traducteurId } = req.params;
    const { date, heures, raison } = req.body;

    // Validation
    if (!date) {
      res.status(400).json({ erreur: 'Date requise' });
      return;
    }

    if (!heures || heures <= 0) {
      res.status(400).json({ erreur: 'Heures doivent être > 0' });
      return;
    }

    // Vérifier que le traducteur existe
    const traducteur = await prisma.traducteur.findUnique({
      where: { id: traducteurId },
    });

    if (!traducteur) {
      res.status(404).json({ erreur: 'Traducteur non trouvé' });
      return;
    }

    // Vérifier que le blocage ne dépasse pas la capacité journalière
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Récupérer les ajustements existants pour cette date
    const ajustementsExistants = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId,
        date: dateObj,
      },
    });

    const heuresUtilisees = ajustementsExistants.reduce((sum, a) => sum + a.heures, 0);
    const capaciteRestante = traducteur.capaciteHeuresParJour - heuresUtilisees;

    if (heures > capaciteRestante + 1e-6) {
      res.status(400).json({
        erreur: `Blocage de ${heures}h dépasse la capacité disponible de ${capaciteRestante.toFixed(2)}h pour cette date`,
        capaciteDisponible: capaciteRestante,
        capaciteTotale: traducteur.capaciteHeuresParJour,
        heuresUtilisees,
      });
      return;
    }

    // Créer le blocage
    const blocage = await prisma.ajustementTemps.create({
      data: {
        traducteurId,
        date: dateObj,
        heures,
        type: 'BLOCAGE',
        creePar: req.utilisateur?.id || 'system',
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TIME BLOCK] Créé pour ${traducteur.nom}: ${heures}h le ${dateObj.toISOString().split('T')[0]}${raison ? ` (${raison})` : ''}`);
    }

    res.status(201).json({
      message: 'Temps bloqué avec succès',
      blocage: {
        id: blocage.id,
        date: blocage.date,
        heures: blocage.heures,
        type: blocage.type,
      },
      capaciteRestante: capaciteRestante - heures,
    });
  } catch (error) {
    console.error('Erreur blocage temps:', error);
    res.status(500).json({ erreur: 'Erreur lors du blocage de temps' });
  }
};

/**
 * Obtenir les blocages de temps pour un traducteur
 * GET /api/traducteurs/:id/blocages
 */
export const obtenirBlocages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: traducteurId } = req.params;
    const { dateDebut, dateFin } = req.query;

    const where: any = {
      traducteurId,
      type: 'BLOCAGE',
    };

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        where.date.gte = new Date(dateDebut as string);
      }
      if (dateFin) {
        where.date.lte = new Date(dateFin as string);
      }
    }

    const blocages = await prisma.ajustementTemps.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.json(blocages);
  } catch (error) {
    console.error('Erreur récupération blocages:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des blocages' });
  }
};

/**
 * Supprimer un blocage de temps
 * DELETE /api/traducteurs/blocages/:blocageId
 */
export const supprimerBlocage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { blocageId } = req.params;

    // Vérifier que c'est bien un blocage
    const blocage = await prisma.ajustementTemps.findUnique({
      where: { id: blocageId },
    });

    if (!blocage) {
      res.status(404).json({ erreur: 'Blocage non trouvé' });
      return;
    }

    if (blocage.type !== 'BLOCAGE') {
      res.status(400).json({ erreur: 'Cet ajustement n\'est pas un blocage' });
      return;
    }

    await prisma.ajustementTemps.delete({
      where: { id: blocageId },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TIME BLOCK] Supprimé: ${blocage.heures}h le ${blocage.date.toISOString().split('T')[0]}`);
    }

    res.json({ message: 'Blocage supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression blocage:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression du blocage' });
  }
};
