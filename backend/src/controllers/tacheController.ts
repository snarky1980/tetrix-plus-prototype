import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { repartitionJusteATemps, validerRepartition, RepartitionItem } from '../services/repartitionService';
import { verifierCapaciteJournaliere } from '../services/capaciteService';

/**
 * Obtenir les tâches avec filtres
 * GET /api/taches
 */
export const obtenirTaches = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { traducteurId, statut, dateDebut, dateFin, date } = req.query;

    const where: any = {};

    if (traducteurId) {
      where.traducteurId = traducteurId as string;
    }

    if (statut) {
      where.statut = statut as string;
    }

    // Si une date spécifique est fournie, filtrer les tâches ayant des ajustements pour cette date
    if (date) {
      // Utiliser une plage pour gérer les problèmes de timezone
      const dateStr = date as string;
      const dateDebut = new Date(dateStr + 'T00:00:00.000Z');
      const dateFin = new Date(dateStr + 'T23:59:59.999Z');
      
      where.ajustementsTemps = {
        some: {
          date: {
            gte: dateDebut,
            lte: dateFin
          },
          type: 'TACHE'
        }
      };
    } else if (dateDebut || dateFin) {
      // Sinon, utiliser la plage de dates d'échéance
      where.dateEcheance = {};
      if (dateDebut) where.dateEcheance.gte = new Date(dateDebut as string);
      if (dateFin) where.dateEcheance.lte = new Date(dateFin as string);
    }

    const taches = await prisma.tache.findMany({
      where,
      include: {
        traducteur: {
          select: {
            id: true,
            nom: true,
          },
        },
        client: true,
        sousDomaine: true,
        paireLinguistique: true,
        ajustementsTemps: {
          where: { type: 'TACHE' },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { dateEcheance: 'asc' },
    });

    res.json(taches);
  } catch (error) {
    console.error('Erreur récupération tâches:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des tâches' });
  }
};

/**
 * Obtenir une tâche par ID
 * GET /api/taches/:id
 */
export const obtenirTache = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const tache = await prisma.tache.findUnique({
      where: { id },
      include: {
        traducteur: {
          select: {
            id: true,
            nom: true,
            capaciteHeuresParJour: true,
          },
        },
        client: true,
        sousDomaine: true,
        paireLinguistique: true,
        ajustementsTemps: {
          where: { type: 'TACHE' },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!tache) {
      res.status(404).json({ erreur: 'Tâche non trouvée' });
      return;
    }

    res.json(tache);
  } catch (error) {
    console.error('Erreur récupération tâche:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération de la tâche' });
  }
};

/**
 * Créer une nouvelle tâche
 * POST /api/taches
 * Note: La logique de répartition automatique sera implémentée par Agent 3
 */
export const creerTache = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      numeroProjet,
      traducteurId,
      clientId,
      sousDomaineId,
      paireLinguistiqueId,
      typeTache,
      description,
      heuresTotal,
      dateEcheance,
      repartition, // Array de { date, heures }
      repartitionAuto, // bool: utiliser JAT si true et pas de répartition fournie
    } = req.body;

    if (!numeroProjet || !traducteurId || !typeTache || !heuresTotal || !dateEcheance) {
      res.status(400).json({ erreur: 'Champs requis manquants (numeroProjet, traducteurId, typeTache, heuresTotal, dateEcheance).' });
      return;
    }

    let repartitionEffective: RepartitionItem[] | undefined = undefined;
    if (repartition && Array.isArray(repartition) && repartition.length > 0) {
      // Validation répartition manuelle
      const { valide, erreurs } = await validerRepartition(traducteurId, repartition, heuresTotal);
      if (!valide) {
        res.status(400).json({ erreur: 'Répartition invalide', details: erreurs });
        return;
      }
      repartitionEffective = repartition;
    } else if (repartitionAuto) {
      // Génération JAT
      try {
        repartitionEffective = await repartitionJusteATemps(traducteurId, heuresTotal, new Date(dateEcheance));
      } catch (e: any) {
        res.status(400).json({ erreur: e.message || 'Erreur JAT' });
        return;
      }
    }

    const tache = await prisma.$transaction(async (tx) => {
      // Créer la tâche
      const nouvelleTache = await tx.tache.create({
        data: {
          numeroProjet,
          traducteurId,
          clientId: clientId || null,
          sousDomaineId: sousDomaineId || null,
          paireLinguistiqueId: paireLinguistiqueId || null,
          typeTache: typeTache || 'TRADUCTION',
          specialisation: req.body.specialisation || '',
          description: description || '',
          heuresTotal,
          dateEcheance: new Date(dateEcheance),
          statut: 'PLANIFIEE',
          creePar: req.utilisateur!.id,
        },
      });

      // Créer les ajustements de temps si une répartition (manuelle ou auto) est définie
      if (repartitionEffective) {
        for (const ajust of repartitionEffective) {
          await tx.ajustementTemps.create({
            data: {
              traducteurId,
              tacheId: nouvelleTache.id,
              date: new Date(ajust.date),
              heures: ajust.heures,
              type: 'TACHE',
              creePar: req.utilisateur!.id,
            },
          });
        }
      }

      return nouvelleTache;
    });

    // Récupérer la tâche complète
    const tacheComplete = await prisma.tache.findUnique({
      where: { id: tache.id },
      include: {
        traducteur: {
          select: {
            id: true,
            nom: true,
          },
        },
        client: true,
        sousDomaine: true,
        paireLinguistique: true,
        ajustementsTemps: {
          where: { type: 'TACHE' },
          orderBy: { date: 'asc' },
        },
      },
    });

    res.status(201).json(tacheComplete);
  } catch (error) {
    console.error('Erreur création tâche:', error);
    res.status(500).json({ erreur: 'Erreur lors de la création de la tâche' });
  }
};

/**
 * Mettre à jour une tâche
 * PUT /api/taches/:id
 */
export const mettreAJourTache = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      numeroProjet,
      description,
      specialisation,
      heuresTotal,
      dateEcheance,
      statut,
      typeTache,
      repartition,
      repartitionAuto,
    } = req.body;

    // Récupérer tâche existante (pour validations JAT / manuelle en ignorance)
    const existante = await prisma.tache.findUnique({ where: { id } });
    if (!existante) {
      res.status(404).json({ erreur: 'Tâche non trouvée' });
      return;
    }

    let repartitionEffective: RepartitionItem[] | undefined = undefined;
    const heuresCible = heuresTotal || existante.heuresTotal;
    const echeanceCible = dateEcheance ? new Date(dateEcheance) : existante.dateEcheance;

    if (repartition && Array.isArray(repartition) && repartition.length > 0) {
      const { valide, erreurs } = await validerRepartition(existante.traducteurId, repartition, heuresCible, id);
      if (!valide) {
        res.status(400).json({ erreur: 'Répartition invalide', details: erreurs });
        return;
      }
      repartitionEffective = repartition;
    } else if (repartitionAuto) {
      try {
        repartitionEffective = await repartitionJusteATemps(existante.traducteurId, heuresCible, echeanceCible);
      } catch (e: any) {
        res.status(400).json({ erreur: e.message || 'Erreur JAT' });
        return;
      }
    }

    const tache = await prisma.$transaction(async (tx) => {
      // Mettre à jour la tâche
      const tacheMiseAJour = await tx.tache.update({
        where: { id },
        data: {
          ...(numeroProjet && { numeroProjet }),
          ...(description !== undefined && { description }),
          ...(specialisation !== undefined && { specialisation }),
          ...(heuresTotal && { heuresTotal }),
          ...(dateEcheance && { dateEcheance: new Date(dateEcheance) }),
          ...(statut && { statut }),
          ...(typeTache && { typeTache }),
        },
      });

      // Si répartition (auto ou manuelle) définie, remplacer les ajustements
      if (repartitionEffective) {
        await tx.ajustementTemps.deleteMany({
          where: { tacheId: id, type: 'TACHE' },
        });
        for (const ajust of repartitionEffective) {
          await tx.ajustementTemps.create({
            data: {
              traducteurId: tacheMiseAJour.traducteurId,
              tacheId: id,
              date: new Date(ajust.date),
              heures: ajust.heures,
              type: 'TACHE',
              creePar: req.utilisateur!.id,
            },
          });
        }
      }

      return tacheMiseAJour;
    });

    // Récupérer la tâche complète
    const tacheComplete = await prisma.tache.findUnique({
      where: { id },
      include: {
        traducteur: {
          select: {
            id: true,
            nom: true,
          },
        },
        client: true,
        sousDomaine: true,
        paireLinguistique: true,
        ajustementsTemps: {
          where: { type: 'TACHE' },
          orderBy: { date: 'asc' },
        },
      },
    });

    res.json(tacheComplete);
  } catch (error) {
    console.error('Erreur mise à jour tâche:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour de la tâche' });
  }
};

/**
 * Supprimer une tâche
 * DELETE /api/taches/:id
 */
export const supprimerTache = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.tache.delete({
      where: { id },
    });

    res.json({ message: 'Tâche supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression tâche:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression de la tâche' });
  }
};
