import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

/**
 * Synchronise les clients habituels avec la table clients
 * Crée les clients qui n'existent pas encore
 */
const synchroniserClients = async (clientsHabituels: string[]): Promise<void> => {
  if (!clientsHabituels || clientsHabituels.length === 0) return;
  
  for (const nomClient of clientsHabituels) {
    await prisma.client.upsert({
      where: { nom: nomClient },
      update: {}, // Ne pas modifier si existe déjà
      create: { nom: nomClient, sousDomaines: [] },
    });
  }
};

/**
 * Récupérer la liste des traducteurs avec filtres
 * GET /api/traducteurs
 */
export const obtenirTraducteurs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { division, classification, client, domaine, specialisation, langueSource, langueCible, actif } = req.query;

    const where: any = {};

    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    if (division) {
      const divisions = (division as string).split(',').map(d => d.trim());
      if (divisions.length > 1) {
        where.division = { in: divisions };
      } else {
        where.division = division as string;
      }
    }

    if (classification) {
      where.classification = classification as string;
    }

    if (client) {
      const clients = (client as string).split(',').map(c => c.trim());
      if (clients.length > 1) {
        where.clientsHabituels = { hasSome: clients };
      } else {
        where.clientsHabituels = { has: client as string };
      }
    }

    if (domaine) {
      const domaines = (domaine as string).split(',').map(d => d.trim());
      if (domaines.length > 1) {
        where.domaines = { hasSome: domaines };
      } else {
        where.domaines = { has: domaine as string };
      }
    }

    if (specialisation) {
      where.specialisations = { has: specialisation as string };
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

    // Si l'utilisateur est un traducteur, vérifier qu'il accède à ses propres données
    if (req.utilisateur?.role === 'TRADUCTEUR') {
      const traducteurUser = await prisma.traducteur.findFirst({
        where: { utilisateurId: req.utilisateur.id },
      });

      if (!traducteurUser || traducteurUser.id !== id) {
        res.status(403).json({ erreur: 'Accès non autorisé' });
        return;
      }
    }

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
      classification,
      horaire,
      domaines,
      clientsHabituels,
      specialisations,
      notes,
      capaciteHeuresParJour,
    } = req.body;

    // Créer l'utilisateur et le traducteur en une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Synchroniser les clients habituels avec la table clients
      if (clientsHabituels && clientsHabituels.length > 0) {
        for (const nomClient of clientsHabituels) {
          await tx.client.upsert({
            where: { nom: nomClient },
            update: {},
            create: { nom: nomClient, sousDomaines: [] },
          });
        }
      }

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
          classification,
          horaire: horaire || null,
          domaines: domaines || [],
          clientsHabituels: clientsHabituels || [],
          specialisations: specialisations || [],
          notes: notes || null,
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
      classification,
      horaire,
      domaines,
      clientsHabituels,
      specialisations,
      notes,
      capaciteHeuresParJour,
      actif,
    } = req.body;

    // Synchroniser les clients habituels avec la table clients
    if (clientsHabituels && clientsHabituels.length > 0) {
      await synchroniserClients(clientsHabituels);
    }

    const traducteur = await prisma.traducteur.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(division && { division }),
        ...(classification && { classification }),
        ...(horaire !== undefined && { horaire }),
        ...(domaines && { domaines }),
        ...(clientsHabituels && { clientsHabituels }),
        ...(specialisations && { specialisations }),
        ...(notes !== undefined && { notes }),
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

/**
 * Mettre à jour le statut de disponibilité d'un traducteur
 * PUT /api/traducteurs/:id/disponibilite
 */
export const mettreAJourDisponibilite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { disponiblePourTravail, commentaireDisponibilite } = req.body;

    // Vérifier que le traducteur existe
    const traducteur = await prisma.traducteur.findUnique({
      where: { id },
    });

    if (!traducteur) {
      res.status(404).json({ erreur: 'Traducteur non trouvé' });
      return;
    }

    // Seul le traducteur lui-même peut modifier son statut (ou un admin)
    if (req.utilisateur?.role !== 'ADMIN') {
      const traducteurUser = await prisma.traducteur.findFirst({
        where: { utilisateurId: req.utilisateur!.id },
      });

      if (!traducteurUser || traducteurUser.id !== id) {
        res.status(403).json({ erreur: 'Non autorisé à modifier ce statut' });
        return;
      }
    }

    const traducteurMisAJour = await prisma.traducteur.update({
      where: { id },
      data: {
        disponiblePourTravail: disponiblePourTravail ?? traducteur.disponiblePourTravail,
        commentaireDisponibilite: commentaireDisponibilite !== undefined 
          ? commentaireDisponibilite 
          : traducteur.commentaireDisponibilite,
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DISPONIBILITE] ${traducteur.nom}: ${disponiblePourTravail ? '🟢 Cherche du travail' : '⚪ Pas disponible'}${commentaireDisponibilite ? ` - ${commentaireDisponibilite}` : ''}`);
    }

    res.json(traducteurMisAJour);
  } catch (error) {
    console.error('Erreur mise à jour disponibilité:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour de la disponibilité' });
  }
};
