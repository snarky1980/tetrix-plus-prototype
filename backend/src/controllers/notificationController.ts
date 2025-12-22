import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * Obtenir les compteurs de notifications pour l'utilisateur connecté
 * GET /api/notifications/compteurs
 */
export const obtenirCompteurs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;
    
    // Compteur traducteurs cherchant du travail (pour conseillers/gestionnaires)
    let traducteursCherchentTravail = 0;
    if (['CONSEILLER', 'GESTIONNAIRE', 'ADMIN'].includes(utilisateur.role)) {
      traducteursCherchentTravail = await prisma.traducteur.count({
        where: {
          disponiblePourTravail: true,
          actif: true,
        },
      });
    }

    // Compteur demandes de ressources actives (pour traducteurs)
    let demandesRessourcesActives = 0;
    if (['TRADUCTEUR', 'CONSEILLER', 'GESTIONNAIRE', 'ADMIN'].includes(utilisateur.role)) {
      demandesRessourcesActives = await prisma.demandeRessource.count({
        where: {
          actif: true,
          OR: [
            { expireLe: null },
            { expireLe: { gt: new Date() } },
          ],
        },
      });
    }

    res.json({
      traducteursCherchentTravail,
      demandesRessourcesActives,
    });
  } catch (error) {
    console.error('Erreur obtention compteurs:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'obtention des compteurs' });
  }
};

/**
 * Obtenir la liste des traducteurs cherchant du travail
 * GET /api/notifications/traducteurs-disponibles
 */
export const obtenirTraducteursDisponibles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const traducteurs = await prisma.traducteur.findMany({
      where: {
        disponiblePourTravail: true,
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        divisions: true,
        classification: true,
        categorie: true,
        capaciteHeuresParJour: true,
        commentaireDisponibilite: true,
        pairesLinguistiques: {
          select: {
            langueSource: true,
            langueCible: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    res.json(traducteurs);
  } catch (error) {
    console.error('Erreur obtention traducteurs disponibles:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'obtention des traducteurs' });
  }
};

/**
 * Créer une demande de ressource (conseiller cherche un traducteur)
 * POST /api/notifications/demandes-ressources
 */
export const creerDemandeRessource = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;
    
    // Seuls les conseillers/gestionnaires peuvent créer des demandes
    if (!['CONSEILLER', 'GESTIONNAIRE', 'ADMIN'].includes(utilisateur.role)) {
      res.status(403).json({ erreur: 'Non autorisé' });
      return;
    }

    const { titre, description, heuresEstimees, langueSource, langueCible, division, urgence, expireLe } = req.body;

    if (!titre) {
      res.status(400).json({ erreur: 'Le titre est requis' });
      return;
    }

    const demande = await prisma.demandeRessource.create({
      data: {
        conseillerId: utilisateur.id,
        titre,
        description,
        heuresEstimees: heuresEstimees ? parseFloat(heuresEstimees) : null,
        langueSource,
        langueCible,
        division,
        urgence: urgence || 'NORMALE',
        expireLe: expireLe ? new Date(expireLe) : null,
      },
    });

    res.status(201).json(demande);
  } catch (error) {
    console.error('Erreur création demande:', error);
    res.status(500).json({ erreur: 'Erreur lors de la création de la demande' });
  }
};

/**
 * Obtenir les demandes de ressources actives
 * GET /api/notifications/demandes-ressources
 */
export const obtenirDemandesRessources = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const demandes = await prisma.demandeRessource.findMany({
      where: {
        actif: true,
        OR: [
          { expireLe: null },
          { expireLe: { gt: new Date() } },
        ],
      },
      orderBy: [
        { urgence: 'desc' },
        { creeLe: 'desc' },
      ],
    });

    // Enrichir avec les infos du conseiller
    const demandesEnrichies = await Promise.all(
      demandes.map(async (demande) => {
        const conseiller = await prisma.utilisateur.findUnique({
          where: { id: demande.conseillerId },
          select: { nom: true, prenom: true, email: true },
        });
        return {
          ...demande,
          conseiller,
        };
      })
    );

    res.json(demandesEnrichies);
  } catch (error) {
    console.error('Erreur obtention demandes:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'obtention des demandes' });
  }
};

/**
 * Fermer une demande de ressource (trouvé un traducteur)
 * PUT /api/notifications/demandes-ressources/:id/fermer
 */
export const fermerDemandeRessource = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const utilisateur = req.utilisateur!;

    const demande = await prisma.demandeRessource.findUnique({
      where: { id },
    });

    if (!demande) {
      res.status(404).json({ erreur: 'Demande non trouvée' });
      return;
    }

    // Seul le créateur ou un admin peut fermer
    if (demande.conseillerId !== utilisateur.id && utilisateur.role !== 'ADMIN') {
      res.status(403).json({ erreur: 'Non autorisé' });
      return;
    }

    const demandeFermee = await prisma.demandeRessource.update({
      where: { id },
      data: { actif: false },
    });

    res.json(demandeFermee);
  } catch (error) {
    console.error('Erreur fermeture demande:', error);
    res.status(500).json({ erreur: 'Erreur lors de la fermeture de la demande' });
  }
};

/**
 * Supprimer une demande de ressource
 * DELETE /api/notifications/demandes-ressources/:id
 */
export const supprimerDemandeRessource = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const utilisateur = req.utilisateur!;

    const demande = await prisma.demandeRessource.findUnique({
      where: { id },
    });

    if (!demande) {
      res.status(404).json({ erreur: 'Demande non trouvée' });
      return;
    }

    // Seul le créateur ou un admin peut supprimer
    if (demande.conseillerId !== utilisateur.id && utilisateur.role !== 'ADMIN') {
      res.status(403).json({ erreur: 'Non autorisé' });
      return;
    }

    await prisma.demandeRessource.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression demande:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression de la demande' });
  }
};
