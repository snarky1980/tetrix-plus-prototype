import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { calculerCouleurDisponibilite, estWeekend } from '../services/planificationService';
import { verifierCapaciteJournaliere } from '../services/capaciteService';
import { parseOttawaDateISO } from '../utils/dateTimeOttawa';

/**
 * Obtenir la planification d'un traducteur
 * GET /api/traducteurs/:traducteurId/planification
 */
export const obtenirPlanification = async (
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
          gte: parseOttawaDateISO(dateDebut as string),
          lte: parseOttawaDateISO(dateFin as string),
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
    const planificationParDate: Record<string, any> = {};

    for (const ajust of ajustements) {
      const dateStr = ajust.date.toISOString().split('T')[0];

      if (!planificationParDate[dateStr]) {
        planificationParDate[dateStr] = {
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
        planificationParDate[dateStr].heuresTaches += ajust.heures;
        planificationParDate[dateStr].taches.push({
          id: ajust.tache?.id,
          description: ajust.tache?.description,
          heures: ajust.heures,
          client: ajust.tache?.client?.nom,
          sousDomaine: ajust.tache?.sousDomaine?.nom,
          statut: ajust.tache?.statut,
        });
      } else {
        planificationParDate[dateStr].heuresBlocages += ajust.heures;
        planificationParDate[dateStr].blocages.push({
          id: ajust.id,
          heures: ajust.heures,
        });
      }

      planificationParDate[dateStr].heuresTotal += ajust.heures;
      planificationParDate[dateStr].disponible = 
        traducteur.capaciteHeuresParJour - planificationParDate[dateStr].heuresTotal;
    }

    // Convertir en array et trier par date
    const planification = Object.values(planificationParDate)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((jour: any) => {
        const isWeekend = estWeekend(jour.date);
        const couleur = calculerCouleurDisponibilite(jour.heuresTotal, jour.capacite);
        return { ...jour, couleur, estWeekend: isWeekend };
      });

    res.json({
      traducteur,
      periode: {
        debut: dateDebut,
        fin: dateFin,
      },
      planification,
    });
  } catch (error) {
    console.error('Erreur récupération planification:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération de la planification' });
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
      const cap = await verifierCapaciteJournaliere(traducteurId, parseOttawaDateISO(date), heures);
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
        date: parseOttawaDateISO(date),
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
 * Obtenir le planification globale (multi-traducteurs)
 * GET /api/planification-globale
 */
export const obtenirPlanificationGlobale = async (
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

    if (division) {
      const divisions = (division as string).split(',').map(d => d.trim());
      if (divisions.length > 1) {
        whereTraducteur.division = { in: divisions };
      } else {
        whereTraducteur.division = division as string;
      }
    }
    if (client) {
      const clients = (client as string).split(',').map(c => c.trim());
      if (clients.length > 1) {
        whereTraducteur.clientsHabituels = { hasSome: clients };
      } else {
        whereTraducteur.clientsHabituels = { has: client as string };
      }
    }
    if (domaine) {
      const domaines = (domaine as string).split(',').map(d => d.trim());
      if (domaines.length > 1) {
        whereTraducteur.domaines = { hasSome: domaines };
      } else {
        whereTraducteur.domaines = { has: domaine as string };
      }
    }

    if (langueSource || langueCible) {
      const languesSourceArray = langueSource ? (langueSource as string).split(',').map(l => l.trim()) : undefined;
      const languesCibleArray = langueCible ? (langueCible as string).split(',').map(l => l.trim()) : undefined;
      
      if (languesSourceArray && languesSourceArray.length > 1) {
        whereTraducteur.pairesLinguistiques = {
          some: {
            langueSource: { in: languesSourceArray },
            ...(languesCibleArray && languesCibleArray.length === 1 && { langueCible: langueCible as string }),
            ...(languesCibleArray && languesCibleArray.length > 1 && { langueCible: { in: languesCibleArray } }),
          },
        };
      } else if (languesCibleArray && languesCibleArray.length > 1) {
        whereTraducteur.pairesLinguistiques = {
          some: {
            ...(langueSource && { langueSource: langueSource as string }),
            langueCible: { in: languesCibleArray },
          },
        };
      } else {
        whereTraducteur.pairesLinguistiques = {
          some: {
            ...(langueSource && { langueSource: langueSource as string }),
            ...(langueCible && { langueCible: langueCible as string }),
          },
        };
      }
    }

    // Récupérer les traducteurs filtrés
    const traducteurs = await prisma.traducteur.findMany({
      where: whereTraducteur,
      select: {
        id: true,
        nom: true,
        division: true,
        classification: true,
        capaciteHeuresParJour: true,
        clientsHabituels: true,
        domaines: true,
        pairesLinguistiques: {
          select: {
            langueSource: true,
            langueCible: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    // Récupérer TOUS les ajustements en une seule requête (évite l'épuisement du pool de connexions)
    const traducteurIds = traducteurs.map(t => t.id);
    const tousAjustements = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId: { in: traducteurIds },
        date: {
          gte: parseOttawaDateISO(dateDebut as string),
          lte: parseOttawaDateISO(dateFin as string),
        },
      },
    });

    // Indexer les ajustements par traducteurId
    const ajustementsParTraducteur: Record<string, typeof tousAjustements> = {};
    for (const ajust of tousAjustements) {
      if (!ajustementsParTraducteur[ajust.traducteurId]) {
        ajustementsParTraducteur[ajust.traducteurId] = [];
      }
      ajustementsParTraducteur[ajust.traducteurId].push(ajust);
    }

    // Pour chaque traducteur, construire la structure de réponse
    const planificationGlobale = traducteurs.map((traducteur) => {
      const ajustements = ajustementsParTraducteur[traducteur.id] || [];

      // Regrouper par date
      const heuresParDate: Record<string, number> = {};
      for (const ajust of ajustements) {
        const dateStr = ajust.date.toISOString().split('T')[0];
        heuresParDate[dateStr] = (heuresParDate[dateStr] || 0) + ajust.heures;
      }

      // Construire structure dates avec couleur + disponibilité
      const dates: Record<string, { heures: number; couleur: string; capacite: number; disponible: number; estWeekend: boolean }> = {};
      Object.entries(heuresParDate).forEach(([dateStr, heures]) => {
        const capacite = traducteur.capaciteHeuresParJour;
        const isWeekend = estWeekend(dateStr);
        const couleur = calculerCouleurDisponibilite(heures as number, capacite);
        dates[dateStr] = {
          heures: heures as number,
          couleur,
          capacite,
          disponible: Math.max(capacite - (heures as number), 0),
          estWeekend: isWeekend,
        };
      });

      return {
        traducteur,
        dates,
      };
    });

    res.json({
      periode: {
        debut: dateDebut,
        fin: dateFin,
      },
      planification: planificationGlobale,
    });
  } catch (error) {
    console.error('Erreur récupération planification globale:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération du planification globale' });
  }
};
