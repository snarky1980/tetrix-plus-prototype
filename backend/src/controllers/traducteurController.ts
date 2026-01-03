import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { bloquerTemps as bloquerTempsService, supprimerBlocage as supprimerBlocageService } from '../services/timeBlockingService';

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
      const divisionsList = (division as string).split(',').map(d => d.trim());
      // Chercher les traducteurs qui ont au moins une des divisions demandées
      where.divisions = { hasSome: divisionsList };
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
      divisions,
      classification,
      categorie,
      horaire,
      domaines,
      clientsHabituels,
      specialisations,
      notes,
      capaciteHeuresParJour,
    } = req.body;

    // Mapper classification vers categorie si nécessaire
    let categorieEffective = categorie;
    if (!categorieEffective && classification) {
      // Convertir TR-01 -> TR01, TR-02 -> TR02, TR-03 -> TR03
      if (classification === 'TR-01') categorieEffective = 'TR01';
      else if (classification === 'TR-02') categorieEffective = 'TR02';
      else if (classification === 'TR-03') categorieEffective = 'TR03';
      else categorieEffective = 'TR03'; // Par défaut
    }

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
          divisions: divisions || [],
          classification: classification || 'TR-03',
          categorie: categorieEffective || 'TR03',
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
      divisions,
      classification,
      horaire,
      domaines,
      clientsHabituels,
      specialisations,
      notes,
      capaciteHeuresParJour,
      actif,
      // Nouveaux champs
      categorie,
      necessiteRevision,
      heureDinerDebut,
      heureDinerFin,
      disponiblePourTravail,
      commentaireDisponibilite,
    } = req.body;

    // Synchroniser les clients habituels avec la table clients
    if (clientsHabituels && clientsHabituels.length > 0) {
      await synchroniserClients(clientsHabituels);
    }

    // Synchroniser classification et categorie
    let categorieEffective = categorie;
    let classificationEffective = classification;
    
    if (classification && !categorie) {
      // Convertir classification -> categorie
      if (classification === 'TR-01') categorieEffective = 'TR01';
      else if (classification === 'TR-02') categorieEffective = 'TR02';
      else if (classification === 'TR-03') categorieEffective = 'TR03';
    } else if (categorie && !classification) {
      // Convertir categorie -> classification  
      if (categorie === 'TR01') classificationEffective = 'TR-01';
      else if (categorie === 'TR02') classificationEffective = 'TR-02';
      else if (categorie === 'TR03') classificationEffective = 'TR-03';
    }

    const traducteur = await prisma.traducteur.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(divisions && { divisions }),
        ...(classificationEffective && { classification: classificationEffective }),
        ...(horaire !== undefined && { horaire }),
        ...(domaines && { domaines }),
        ...(clientsHabituels && { clientsHabituels }),
        ...(specialisations && { specialisations }),
        ...(notes !== undefined && { notes }),
        ...(capaciteHeuresParJour && { capaciteHeuresParJour }),
        ...(actif !== undefined && { actif }),
        // Nouveaux champs
        ...(categorieEffective !== undefined && { categorie: categorieEffective }),
        ...(necessiteRevision !== undefined && { necessiteRevision }),
        ...(heureDinerDebut !== undefined && { heureDinerDebut }),
        ...(heureDinerFin !== undefined && { heureDinerFin }),
        ...(disponiblePourTravail !== undefined && { disponiblePourTravail }),
        ...(commentaireDisponibilite !== undefined && { commentaireDisponibilite }),
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
    const { date, heureDebut, heureFin, motif } = req.body;
    const utilisateurId = req.utilisateur?.id;

    if (!utilisateurId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!date || !heureDebut || !heureFin || !motif) {
      res.status(400).json({ message: 'Paramètres manquants (date, heureDebut, heureFin, motif)' });
      return;
    }

    const result = await bloquerTempsService(traducteurId, date, heureDebut, heureFin, motif, utilisateurId);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Erreur lors du blocage de temps:', error);
    res.status(500).json({ message: 'Erreur lors du blocage de temps', error: error.message });
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
      include: {
        tache: {
          select: {
            description: true,
            specialisation: true,
          },
        },
      },
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
    await supprimerBlocageService(blocageId);
    res.status(200).json({ message: 'Blocage supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du blocage:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du blocage', error: error.message });
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
    const { disponiblePourTravail, commentaireDisponibilite, ciblageDisponibilite } = req.body;

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
        ciblageDisponibilite: ciblageDisponibilite !== undefined
          ? ciblageDisponibilite
          : traducteur.ciblageDisponibilite,
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
      const ciblage = ciblageDisponibilite as any;
      const ciblageStr = ciblage ? ` [Ciblage: ${JSON.stringify(ciblage)}]` : '';
      console.log(`[DISPONIBILITE] ${traducteur.nom}: ${disponiblePourTravail ? '🟢 Cherche du travail' : '⚪ Pas disponible'}${commentaireDisponibilite ? ` - ${commentaireDisponibilite}` : ''}${ciblageStr}`);
    }

    res.json(traducteurMisAJour);
  } catch (error) {
    console.error('Erreur mise à jour disponibilité:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour de la disponibilité' });
  }
};

