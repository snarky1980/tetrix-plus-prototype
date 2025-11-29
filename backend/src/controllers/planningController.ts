import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { calculerCouleurDisponibilite } from '../services/planningService';
import { verifierCapaciteJournaliere } from '../services/capaciteService';

/**
 * Obtenir le planning d'un traducteur
 * GET /api/traducteurs/:traducteurId/planning
 */
export const obtenirPlanning = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { traducteurId } = req.params;
    const { dateDebut, dateFin } = req.query;

    if (!dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'dateDebut et dateFin sont requis' });
      return;
    }

    // Récupérer le traducteur
    const traducteur = await prisma.traducteur.findUnique({
      where: { id: traducteurId },
      select: {
        id: true,
        nom: true,
        capaciteHeuresParJour: true,
      },
    });

    if (!traducteur) {
      res.status(404).json({ erreur: 'Traducteur non trouvé' });
      return;
    }

    // Récupérer tous les ajustements (tâches + blocages) dans la période
    const ajustements = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId,
        date: {
          gte: new Date(dateDebut as string),
          lte: new Date(dateFin as string),
        },
      },
      include: {
        tache: {
          select: {
            id: true,
            description: true,
            statut: true,
            client: {
              select: {
                nom: true,
              },
            },
            sousDomaine: {
              select: {
                nom: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Regrouper par date
    const planningParDate: Record<string, any> = {};

    for (const ajust of ajustements) {
      const dateStr = ajust.date.toISOString().split('T')[0];

      if (!planningParDate[dateStr]) {
        planningParDate[dateStr] = {
          date: dateStr,
          capacite: traducteur.capaciteHeuresParJour,
          heuresTaches: 0,
          heuresBlocages: 0,
          heuresTotal: 0,
          disponible: traducteur.capaciteHeuresParJour,
          taches: [],
          blocages: [],
        };
      }

      if (ajust.type === 'TACHE') {
        planningParDate[dateStr].heuresTaches += ajust.heures;
        planningParDate[dateStr].taches.push({
          id: ajust.tache?.id,
          description: ajust.tache?.description,
          heures: ajust.heures,
          client: ajust.tache?.client?.nom,
          sousDomaine: ajust.tache?.sousDomaine?.nom,
          statut: ajust.tache?.statut,
        });
      } else {
        planningParDate[dateStr].heuresBlocages += ajust.heures;
        planningParDate[dateStr].blocages.push({
          id: ajust.id,
          heures: ajust.heures,
        });
      }

      planningParDate[dateStr].heuresTotal += ajust.heures;
      planningParDate[dateStr].disponible = 
        traducteur.capaciteHeuresParJour - planningParDate[dateStr].heuresTotal;
    }

    // Convertir en array et trier par date
    const planning = Object.values(planningParDate)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((jour: any) => {
        const couleur = calculerCouleurDisponibilite(jour.heuresTotal, jour.capacite);
        return { ...jour, couleur };
      });

    res.json({
      traducteur,
      periode: {
        debut: dateDebut,
        fin: dateFin,
      },
      planning,
    });
  } catch (error) {
    console.error('Erreur récupération planning:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération du planning' });
  }
};

/**
 * Créer un blocage de temps
 * POST /api/ajustements (type: BLOCAGE)
 */
export const creerBlocage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { traducteurId, date, heures } = req.body;
    if (!traducteurId || !date || !heures) {
      res.status(400).json({ erreur: 'traducteurId, date et heures sont requis' });
      return;
    }
    try {
      const cap = await verifierCapaciteJournaliere(traducteurId, new Date(date), heures);
      if (cap.depassement) {
        res.status(400).json({ erreur: `Capacité dépassée le ${date} (actuelles ${cap.heuresActuelles.toFixed(2)} + nouvelles ${heures} > ${cap.capacite}).` });
        return;
      }
    } catch (e: any) {
      res.status(400).json({ erreur: e.message || 'Erreur vérification capacité' });
      return;
    }
    const blocage = await prisma.ajustementTemps.create({
      data: {
        traducteurId,
        date: new Date(date),
        heures,
        type: 'BLOCAGE',
        creePar: req.utilisateur!.id,
      },
    });

    res.status(201).json(blocage);
  } catch (error) {
    console.error('Erreur création blocage:', error);
    res.status(500).json({ erreur: 'Erreur lors de la création du blocage' });
  }
};

/**
 * Supprimer un blocage
 * DELETE /api/ajustements/:id
 */
export const supprimerBlocage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Vérifier que c'est bien un blocage
    const ajustement = await prisma.ajustementTemps.findUnique({
      where: { id },
    });

    if (!ajustement) {
      res.status(404).json({ erreur: 'Blocage non trouvé' });
      return;
    }

    if (ajustement.type !== 'BLOCAGE') {
      res.status(400).json({ erreur: 'Cet ajustement n\'est pas un blocage' });
      return;
    }

    await prisma.ajustementTemps.delete({
      where: { id },
    });

    res.json({ message: 'Blocage supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression blocage:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression du blocage' });
  }
};

/**
 * Obtenir le planning global (multi-traducteurs)
 * GET /api/planning-global
 */
export const obtenirPlanningGlobal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { 
      division, 
      client, 
      domaine, 
      langueSource, 
      langueCible,
      dateDebut,
      dateFin,
    } = req.query;

    if (!dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'dateDebut et dateFin sont requis' });
      return;
    }

    // Construire les filtres pour les traducteurs
    const whereTraducteur: any = { actif: true };

    if (division) whereTraducteur.division = division as string;
    if (client) whereTraducteur.clientsHabituels = { has: client as string };
    if (domaine) whereTraducteur.domaines = { has: domaine as string };

    if (langueSource || langueCible) {
      whereTraducteur.pairesLinguistiques = {
        some: {
          ...(langueSource && { langueSource: langueSource as string }),
          ...(langueCible && { langueCible: langueCible as string }),
        },
      };
    }

    // Récupérer les traducteurs filtrés
    const traducteurs = await prisma.traducteur.findMany({
      where: whereTraducteur,
      select: {
        id: true,
        nom: true,
        division: true,
        capaciteHeuresParJour: true,
      },
      orderBy: { nom: 'asc' },
    });

    // Pour chaque traducteur, récupérer ses ajustements
    const planningGlobal = await Promise.all(
      traducteurs.map(async (traducteur) => {
        const ajustements = await prisma.ajustementTemps.findMany({
          where: {
            traducteurId: traducteur.id,
            date: {
              gte: new Date(dateDebut as string),
              lte: new Date(dateFin as string),
            },
          },
        });

        // Regrouper par date
        const heuresParDate: Record<string, number> = {};
        for (const ajust of ajustements) {
          const dateStr = ajust.date.toISOString().split('T')[0];
          heuresParDate[dateStr] = (heuresParDate[dateStr] || 0) + ajust.heures;
        }

        // Construire structure dates avec couleur + disponibilité
        const dates: Record<string, { heures: number; couleur: string; capacite: number; disponible: number }> = {};
        Object.entries(heuresParDate).forEach(([dateStr, heures]) => {
          const capacite = traducteur.capaciteHeuresParJour;
            const couleur = calculerCouleurDisponibilite(heures as number, capacite);
            dates[dateStr] = {
              heures: heures as number,
              couleur,
              capacite,
              disponible: Math.max(capacite - (heures as number), 0),
            };
        });

        return {
          traducteur,
          dates,
        };
      })
    );

    res.json({
      periode: {
        debut: dateDebut,
        fin: dateFin,
      },
      planning: planningGlobal,
    });
  } catch (error) {
    console.error('Erreur récupération planning global:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération du planning global' });
  }
};
