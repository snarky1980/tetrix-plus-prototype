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
 * Récupérer la liste des traducteurs avec filtres et pagination optionnelle
 * GET /api/traducteurs
 * 
 * Query params:
 * - page: numéro de page (si spécifié, active la pagination)
 * - limit: nombre de résultats par page (défaut: 50, max: 100)
 * - paginated: si 'true', force le format paginé même sans page
 * - division, classification, client, domaine, specialisation, langueSource, langueCible, actif: filtres
 * 
 * Rétro-compatibilité: sans 'page' ni 'paginated', retourne un tableau simple
 */
export const obtenirTraducteurs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { division, classification, client, domaine, specialisation, langueSource, langueCible, actif, page, limit, paginated } = req.query;

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

    // Déterminer si pagination activée
    const usePagination = page !== undefined || paginated === 'true';
    
    // Pagination (ou pas de limite)
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const pageNumber = Math.max(1, parseInt(page as string) || 1);
    const skip = usePagination ? (pageNumber - 1) * limitNumber : 0;

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
        // Relations normalisées
        traducteurDomaines: {
          include: { domaine: true }
        },
        traducteurSpecialisations: {
          include: { specialisation: true }
        },
        traducteurDivisions: {
          include: { division: true }
        },
        traducteurClients: {
          include: { client: true }
        },
      },
      orderBy: { nom: 'asc' },
      skip,
      take: usePagination ? limitNumber : undefined,
    });

    // Format de réponse selon mode
    if (usePagination) {
      const total = await prisma.traducteur.count({ where });
      res.json({
        data: traducteurs,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
          hasMore: skip + traducteurs.length < total
        }
      });
    } else {
      // Rétro-compatibilité: retourner tableau simple
      res.json(traducteurs);
    }
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

    // Les comptes Playground ont accès à tous les traducteurs (mode démo)
    const isPlayground = req.utilisateur?.isPlayground === true;

    // Si l'utilisateur est un traducteur (non Playground), vérifier qu'il accède à ses propres données
    if (req.utilisateur?.role === 'TRADUCTEUR' && !isPlayground) {
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
        // Relations normalisées
        traducteurDomaines: {
          include: { domaine: true }
        },
        traducteurSpecialisations: {
          include: { specialisation: true }
        },
        traducteurDivisions: {
          include: { division: true }
        },
        traducteurClients: {
          include: { client: true }
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
 * Obtenir les blocages pour plusieurs traducteurs en batch
 * POST /api/traducteurs/blocages/batch
 * Body: { traducteurIds: string[], dateDebut?: string, dateFin?: string }
 * 
 * Optimisation: évite le problème N+1 en récupérant tous les blocages en une seule requête
 */
export const obtenirBlocagesBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { traducteurIds, dateDebut, dateFin } = req.body;

    if (!traducteurIds || !Array.isArray(traducteurIds) || traducteurIds.length === 0) {
      res.status(400).json({ erreur: 'traducteurIds requis (tableau non vide)' });
      return;
    }

    // Limiter le nombre de traducteurs pour éviter les abus
    if (traducteurIds.length > 200) {
      res.status(400).json({ erreur: 'Maximum 200 traducteurs par requête' });
      return;
    }

    const where: any = {
      traducteurId: { in: traducteurIds },
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
        traducteur: {
          select: {
            id: true,
            nom: true,
            capaciteHeuresParJour: true,
          },
        },
        tache: {
          select: {
            description: true,
            specialisation: true,
          },
        },
      },
    });

    // Grouper par traducteurId pour faciliter l'utilisation côté frontend
    const blocagesParTraducteur: Record<string, any[]> = {};
    for (const blocage of blocages) {
      const tid = blocage.traducteurId;
      if (!blocagesParTraducteur[tid]) {
        blocagesParTraducteur[tid] = [];
      }
      blocagesParTraducteur[tid].push(blocage);
    }

    res.json({ blocages, blocagesParTraducteur });
  } catch (error) {
    console.error('Erreur récupération blocages batch:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des blocages' });
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

    // Déterminer si on doit mettre à jour disponibleDepuis
    // (seulement si le traducteur passe de non-disponible à disponible)
    const passeADisponible = disponiblePourTravail === true && !traducteur.disponiblePourTravail;
    const passeANonDisponible = disponiblePourTravail === false && traducteur.disponiblePourTravail;

    const traducteurMisAJour = await prisma.traducteur.update({
      where: { id },
      data: {
        disponiblePourTravail: disponiblePourTravail ?? traducteur.disponiblePourTravail,
        // Mettre à jour disponibleDepuis uniquement si passage à disponible
        ...(passeADisponible && { disponibleDepuis: new Date() }),
        // Effacer disponibleDepuis si passage à non-disponible
        ...(passeANonDisponible && { disponibleDepuis: null }),
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

