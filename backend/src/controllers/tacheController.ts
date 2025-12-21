import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { repartitionJusteATemps, repartitionPEPS, repartitionEquilibree, validerRepartition, RepartitionItem } from '../services/repartitionService';
import { verifierCapaciteJournaliere } from '../services/capaciteService';
import { parseOttawaDateISO, normalizeToOttawaWithTime, hasSignificantTime } from '../utils/dateTimeOttawa';

/**
 * Obtenir les tâches avec filtres
 * GET /api/taches
 */
export const obtenirTaches = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { traducteurId, statut, dateDebut, dateFin, date, limit, sort } = req.query;

    const where: any = {};

    if (traducteurId) {
      where.traducteurId = traducteurId as string;
    }

    if (statut) {
      where.statut = statut as string;
    }

    // Si une date spécifique est fournie, filtrer les tâches ayant des ajustements pour cette date
    if (date) {
      // Utiliser parseOttawaDateISO pour une gestion correcte de la timezone
      const dateStr = date as string;
      const dateOttawa = parseOttawaDateISO(dateStr);
      
      where.ajustementsTemps = {
        some: {
          date: dateOttawa,
          type: 'TACHE'
        }
      };
    } else if (dateDebut || dateFin) {
      // Sinon, utiliser la plage de dates d'échéance
      where.dateEcheance = {};
      if (dateDebut) where.dateEcheance.gte = parseOttawaDateISO(dateDebut as string);
      if (dateFin) where.dateEcheance.lte = parseOttawaDateISO(dateFin as string);
    }

    // Gestion du tri avec priorité
    let orderBy: any = [
      { priorite: 'desc' }, // URGENT avant REGULIER
      { dateEcheance: 'asc' }
    ];
    if (sort) {
      const [field, direction] = (sort as string).split(':');
      orderBy = { [field]: direction || 'asc' };
    }

    // Gestion de la limite
    const limitNumber = limit ? parseInt(limit as string) : undefined;

    const taches = await prisma.tache.findMany({
      where,
      include: {
        traducteur: {
          select: {
            id: true,
            nom: true,
            horaire: true,
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
      orderBy,
      take: limitNumber,
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
            horaire: true,
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
      compteMots,
      dateEcheance,
      repartition, // Array de { date, heures }
      repartitionAuto, // bool: utiliser JAT si true et pas de répartition fournie
      modeDistribution, // 'JAT', 'PEPS', 'EQUILIBRE', 'MANUEL'
    } = req.body;

    if (!numeroProjet || !traducteurId || !typeTache || !heuresTotal || !dateEcheance) {
      res.status(400).json({ erreur: 'Champs requis manquants (numeroProjet, traducteurId, typeTache, heuresTotal, dateEcheance).' });
      return;
    }

    // Parser la dateEcheance avec support timestamp
    const { date: dateEcheanceParsee } = normalizeToOttawaWithTime(dateEcheance, true, 'dateEcheance');
    const echeanceAHeureSignificative = hasSignificantTime(dateEcheanceParsee);

    let repartitionEffective: RepartitionItem[] | undefined = undefined;
    if (repartition && Array.isArray(repartition) && repartition.length > 0) {
      // Validation répartition manuelle
      const { valide, erreurs } = await validerRepartition(traducteurId, repartition, heuresTotal, undefined, dateEcheance);
      if (!valide) {
        res.status(400).json({ erreur: 'Répartition invalide', details: erreurs });
        return;
      }

      // La disponibilité au moment de la création n'est pas vérifiée
      // Ce qui compte est la disponibilité lors de l'exécution de la tâche
      repartitionEffective = repartition;
    } else if (repartitionAuto === true) {
      // Vérifier que le traducteur est actif
      const traducteurCheck = await prisma.traducteur.findUnique({
        where: { id: traducteurId },
        select: { nom: true, actif: true }
      });

      if (!traducteurCheck) {
        res.status(404).json({ erreur: 'Traducteur introuvable' });
        return;
      }

      if (!traducteurCheck.actif) {
        res.status(400).json({ 
          erreur: `${traducteurCheck.nom} est désactivé(e) et ne peut pas recevoir de nouvelles tâches.` 
        });
        return;
      }

      // La disponibilité actuelle (disponiblePourTravail) n'est pas vérifiée
      // Ce qui compte est la disponibilité lors de l'exécution de la tâche

      // Génération automatique selon le mode
      try {
        if (modeDistribution === 'PEPS') {
          repartitionEffective = await repartitionPEPS(traducteurId, heuresTotal, new Date(), dateEcheance);
        } else if (modeDistribution === 'EQUILIBRE') {
          repartitionEffective = await repartitionEquilibree(traducteurId, heuresTotal, new Date(), dateEcheance);
        } else {
          // JAT par défaut
          repartitionEffective = await repartitionJusteATemps(traducteurId, heuresTotal, dateEcheance, {
            modeTimestamp: echeanceAHeureSignificative
          });
        }
      } catch (e: any) {
        console.error(`[Erreur Répartition ${modeDistribution || 'JAT'}]`, e.message, '| traducteurId:', traducteurId, '| heuresTotal:', heuresTotal, '| dateEcheance:', dateEcheance);
        res.status(400).json({ erreur: e.message || 'Erreur de répartition' });
        return;
      }
    }

    // Protection contre le double booking (race condition)
    const tache = await prisma.$transaction(async (tx) => {
      // 1. Vérifier l'accès AVANT toute autre opération
      const traducteur = await tx.traducteur.findUnique({
        where: { id: traducteurId },
        select: { 
          id: true, 
          nom: true, 
          division: true,
          capaciteHeuresParJour: true,
          actif: true
        }
      });

      if (!traducteur) {
        throw new Error('Traducteur introuvable');
      }

      // Vérifier que le traducteur est actif
      if (!traducteur.actif) {
        throw new Error(
          `${traducteur.nom} est désactivé(e) et ne peut pas recevoir de nouvelles tâches. ` +
          `Veuillez contacter l'administrateur.`
        );
      }

      // Note: Le champ disponiblePourTravail n'est plus vérifié lors de la création de tâches.
      // Ce qui importe est la disponibilité au moment de l'exécution, pas au moment de la planification.

      // Vérifier l'accès à la division (sauf pour ADMIN)
      if (req.utilisateur!.role !== 'ADMIN') {
        const acces = await tx.divisionAccess.findFirst({
          where: {
            utilisateurId: req.utilisateur!.id,
            division: { nom: traducteur.division },
            peutEcrire: true
          }
        });

        if (!acces) {
          throw new Error(
            `Vous n'avez pas accès en écriture à la division ${traducteur.division}. ` +
            `Vos permissions ont peut-être changé. Veuillez rafraîchir et réessayer.`
          );
        }
      }

      // 2. Vérifier la capacité disponible pour éviter les race conditions
      if (repartitionEffective && repartitionEffective.length > 0) {

        if (!traducteur) {
          throw new Error('Traducteur introuvable');
        }

        // Vérifier chaque jour de la répartition
        const conflits: string[] = [];
        for (const ajust of repartitionEffective) {
          const dateJour = parseOttawaDateISO(ajust.date);
          
          // Récupérer les ajustements existants pour ce jour (dans la transaction)
          const ajustementsExistants = await tx.ajustementTemps.findMany({
            where: {
              traducteurId,
              date: dateJour,
            }
          });
          
          const heuresDejaUtilisees = ajustementsExistants.reduce((sum, a) => sum + a.heures, 0);
          const heuresDisponibles = traducteur.capaciteHeuresParJour - heuresDejaUtilisees;
          
          // Vérifier si l'ajout dépasserait la capacité
          if (ajust.heures > heuresDisponibles + 0.001) { // Tolérance pour erreurs d'arrondi
            conflits.push(
              `${ajust.date}: ${ajust.heures}h demandées, seulement ${heuresDisponibles.toFixed(2)}h disponibles (${heuresDejaUtilisees.toFixed(2)}h/${traducteur.capaciteHeuresParJour}h utilisées)`
            );
          }
        }

        // Si des conflits sont détectés, rejeter la transaction
        if (conflits.length > 0) {
          throw new Error(
            `Conflit de capacité détecté pour ${traducteur.nom}:\n${conflits.join('\n')}\n\n` +
            `Un autre conseiller a peut-être créé une tâche en même temps. Veuillez rafraîchir et réessayer.`
          );
        }
      }

      // 2. Créer la tâche (seulement si la capacité est validée)
      const nouvelleTache = await tx.tache.create({
        data: {
          numeroProjet,
          traducteurId,
          clientId: clientId || null,
          sousDomaineId: sousDomaineId || null,
          paireLinguistiqueId: paireLinguistiqueId || null,
          typeTache: typeTache || 'TRADUCTION',
          specialisation: req.body.specialisation || '',
          modeDistribution: modeDistribution || (repartitionAuto ? 'JAT' : 'MANUEL'),
          description: description || '',
          heuresTotal,
          compteMots: compteMots ? parseInt(compteMots) : null,
          dateEcheance: dateEcheanceParsee, // Stocke date + heure complète (ex: 2025-02-14T10:30:00)
          priorite: req.body.priorite || 'REGULIER',
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
              date: parseOttawaDateISO(ajust.date),
              heures: ajust.heures,
              // TODO: Activer après application de la migration SQL
              // heureDebut: ajust.heureDebut || null,
              // heureFin: ajust.heureFin || null,
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
  } catch (error: any) {
    console.error('Erreur création tâche:', error);
    // Renvoyer le message d'erreur détaillé pour aider l'utilisateur
    const messageErreur = error.message || 'Erreur lors de la création de la tâche';
    res.status(400).json({ erreur: messageErreur });
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
      version: expectedVersion,
      numeroProjet,
      description,
      specialisation,
      heuresTotal,
      compteMots,
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
    // Garder en string pour JAT, convertir en Date uniquement pour l'insertion en base
    const echeanceCible = dateEcheance || existante.dateEcheance;

    if (repartition && Array.isArray(repartition) && repartition.length > 0) {
      const { valide, erreurs } = await validerRepartition(existante.traducteurId, repartition, heuresCible, id, echeanceCible);
      if (!valide) {
        res.status(400).json({ erreur: 'Répartition invalide', details: erreurs });
        return;
      }
      repartitionEffective = repartition;
    } else if (repartitionAuto) {
      try {
        // Passer string ou Date, normalizeToOttawa gère les deux
        repartitionEffective = await repartitionJusteATemps(existante.traducteurId, heuresCible, echeanceCible);
      } catch (e: any) {
        console.error('[Erreur JAT edition]', e.message, '| traducteurId:', existante.traducteurId, '| heuresTotal:', heuresCible, '| dateEcheance:', echeanceCible);
        res.status(400).json({ erreur: e.message || 'Erreur JAT' });
        return;
      }
    }

    // Parser dateEcheance si fournie
    let dateEcheanceParsee: Date | undefined;
    if (dateEcheance) {
      const { date } = normalizeToOttawaWithTime(dateEcheance, true, 'dateEcheance');
      dateEcheanceParsee = date;
    }

    const tache = await prisma.$transaction(async (tx) => {
      // Optimistic Locking: Vérifier la version
      if (expectedVersion !== undefined) {
        const current = await tx.tache.findUnique({
          where: { id },
          select: { version: true, modifieLe: true }
        });

        if (!current) {
          throw new Error('TASK_NOT_FOUND');
        }

        if (current.version !== expectedVersion) {
          const error: any = new Error(
            `Conflit de modification détecté: cette tâche a été modifiée par un autre utilisateur ` +
            `(version actuelle: ${current.version}, version attendue: ${expectedVersion}). ` +
            `Dernière modification: ${current.modifieLe.toISOString()}. ` +
            `Veuillez rafraîchir la page et réessayer.`
          );
          error.code = 'VERSION_CONFLICT';
          error.currentVersion = current.version;
          error.expectedVersion = expectedVersion;
          throw error;
        }
      }

      // Mettre à jour la tâche avec incrémentation de version
      const tacheMiseAJour = await tx.tache.update({
        where: { id },
        data: {
          ...(numeroProjet && { numeroProjet }),
          ...(description !== undefined && { description }),
          ...(specialisation !== undefined && { specialisation }),
          ...(heuresTotal && { heuresTotal }),
          ...(compteMots !== undefined && { compteMots: compteMots ? parseInt(compteMots) : null }),
          ...(dateEcheanceParsee && { dateEcheance: dateEcheanceParsee }),
          ...(statut && { statut }),
          ...(typeTache && { typeTache }),
          version: { increment: 1 }, // Incrémenter la version
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
              date: parseOttawaDateISO(ajust.date),
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
  } catch (error: any) {
    console.error('Erreur mise à jour tâche:', error);
    
    // Gestion spécifique des erreurs de conflit
    if (error.code === 'VERSION_CONFLICT') {
      res.status(409).json({ 
        erreur: error.message,
        code: 'VERSION_CONFLICT',
        currentVersion: error.currentVersion,
        expectedVersion: error.expectedVersion
      });
      return;
    }
    
    if (error.message === 'TASK_NOT_FOUND') {
      res.status(410).json({ 
        erreur: 'Cette tâche a été supprimée par un autre utilisateur',
        code: 'DELETED_ENTITY'
      });
      return;
    }
    
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
