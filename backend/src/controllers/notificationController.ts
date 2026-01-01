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
    const utilisateur = req.utilisateur;
    
    // Vérification que l'utilisateur est bien authentifié
    if (!utilisateur) {
      res.status(401).json({ erreur: 'Non authentifié' });
      return;
    }
    
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
    // Pour les traducteurs, on compte seulement celles qui correspondent à leur profil
    let demandesRessourcesActives = 0;
    if (['TRADUCTEUR', 'CONSEILLER', 'GESTIONNAIRE', 'ADMIN'].includes(utilisateur.role)) {
      const toutesLesDemandes = await prisma.demandeRessource.findMany({
        where: {
          actif: true,
          OR: [
            { expireLe: null },
            { expireLe: { gt: new Date() } },
          ],
        },
      });
      
      // Filtrer selon le profil si c'est un traducteur
      if (utilisateur.role === 'TRADUCTEUR') {
        const traducteur = await prisma.traducteur.findFirst({
          where: { utilisateurId: utilisateur.id },
          include: {
            equipeProjets: { select: { equipeProjetId: true } },
          },
        });
        
        if (traducteur) {
          const equipesIds = traducteur.equipeProjets.map(ep => ep.equipeProjetId);
          
          demandesRessourcesActives = toutesLesDemandes.filter(demande => {
            // Aucun ciblage → visible par tous
            const aucunCiblage = 
              (!demande.divisions || demande.divisions.length === 0) &&
              (!demande.categories || demande.categories.length === 0) &&
              (!demande.specialisations || demande.specialisations.length === 0) &&
              (!demande.domaines || demande.domaines.length === 0) &&
              !demande.equipeProjetId;
            
            if (aucunCiblage) return true;
            
            // Vérifier correspondance (OR logic)
            if (demande.divisions?.length > 0 && traducteur.divisions?.some(d => demande.divisions!.includes(d))) return true;
            if (demande.categories?.length > 0 && traducteur.categorie && demande.categories.includes(traducteur.categorie)) return true;
            if (demande.specialisations?.length > 0 && traducteur.specialisations?.some(s => demande.specialisations!.includes(s))) return true;
            if (demande.domaines?.length > 0 && traducteur.domaines?.some(d => demande.domaines!.includes(d))) return true;
            if (demande.equipeProjetId && equipesIds.includes(demande.equipeProjetId)) return true;
            
            return false;
          }).length;
        }
      } else {
        // Conseillers/Gestionnaires/Admin voient tout
        demandesRessourcesActives = toutesLesDemandes.length;
      }
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
 * 
 * Filtrage intelligent selon le profil:
 * - Si le traducteur a un ciblage défini, seuls les conseillers correspondants le verront
 * - Sans ciblage = visible par tous les conseillers
 */
export const obtenirTraducteursDisponibles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;
    
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
        ciblageDisponibilite: true,
        pairesLinguistiques: {
          select: {
            langueSource: true,
            langueCible: true,
          },
        },
        equipeProjets: {
          select: {
            equipeProjetId: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    // Filtrer selon le ciblage si c'est un conseiller
    let traducteursFiltres = traducteurs;
    
    if (['CONSEILLER', 'GESTIONNAIRE'].includes(utilisateur.role)) {
      // Charger les divisions accessibles par ce conseiller
      const divisionAccess = await prisma.divisionAccess.findMany({
        where: { utilisateurId: utilisateur.id, peutLire: true },
        select: { division: { select: { nom: true } } },
      });
      const divisionsConseiller = divisionAccess.map(da => da.division.nom);
      
      // Charger les équipes-projets du conseiller (si applicable)
      const equipesConseiller = await prisma.equipeProjetMembre.findMany({
        where: { traducteur: { utilisateurId: utilisateur.id } },
        select: { equipeProjetId: true },
      }).catch(() => []);
      const equipesIds = equipesConseiller.map(e => e.equipeProjetId);
      
      traducteursFiltres = traducteurs.filter(tr => {
        const ciblage = tr.ciblageDisponibilite as any;
        
        // Sans ciblage → visible par tous
        if (!ciblage) return true;
        
        const aucunCiblage = 
          (!ciblage.divisions || ciblage.divisions.length === 0) &&
          (!ciblage.categories || ciblage.categories.length === 0) &&
          (!ciblage.specialisations || ciblage.specialisations.length === 0) &&
          (!ciblage.domaines || ciblage.domaines.length === 0) &&
          !ciblage.equipeProjetId;
        
        if (aucunCiblage) return true;
        
        // Vérifier correspondance (OR logic)
        // Le conseiller doit avoir accès à au moins une des divisions ciblées
        if (ciblage.divisions?.length > 0) {
          if (divisionsConseiller.some(d => ciblage.divisions.includes(d))) return true;
        }
        
        // Équipe-projet ciblée
        if (ciblage.equipeProjetId) {
          if (equipesIds.includes(ciblage.equipeProjetId)) return true;
        }
        
        // Note: categories, specialisations et domaines sont des critères sur le conseiller
        // mais les conseillers n'ont pas ces attributs - donc on les ignore pour le filtrage
        // et on les affiche simplement comme indication
        
        // Si des critères sont définis mais ne correspondent pas, masquer
        // Sauf si seuls categories/specialisations/domaines sont définis (pas de division/équipe)
        const seulementCriteresNonFiltrables = 
          (!ciblage.divisions || ciblage.divisions.length === 0) &&
          !ciblage.equipeProjetId &&
          (ciblage.categories?.length > 0 || ciblage.specialisations?.length > 0 || ciblage.domaines?.length > 0);
        
        if (seulementCriteresNonFiltrables) return true;
        
        return false;
      });
    }

    // Retourner sans le champ ciblageDisponibilite (nettoyage)
    const resultat = traducteursFiltres.map(({ ciblageDisponibilite, equipeProjets, ...tr }) => ({
      ...tr,
      ciblage: ciblageDisponibilite, // Renommer pour le frontend
    }));

    res.json(resultat);
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

    const { 
      titre, 
      description, 
      heuresEstimees, 
      langueSource, 
      langueCible, 
      division,  // DEPRECATED - conservé pour compatibilité
      divisions,
      categories,
      specialisations,
      domaines,
      equipeProjetId,
      urgence, 
      expireLe 
    } = req.body;

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
        division, // DEPRECATED
        divisions: divisions || [],
        categories: categories || [],
        specialisations: specialisations || [],
        domaines: domaines || [],
        equipeProjetId: equipeProjetId || null,
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
 * 
 * Filtrage intelligent selon le profil:
 * - Conseillers/Gestionnaires/Admin: voient TOUTES les demandes
 * - Traducteurs: voient uniquement les demandes qui correspondent à leur profil
 *   (ou les demandes sans ciblage, visibles par tous)
 */
export const obtenirDemandesRessources = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;
    
    // Récupérer toutes les demandes actives
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

    // Filtrer selon le profil si c'est un traducteur
    let demandesFiltrees = demandes;
    
    if (utilisateur.role === 'TRADUCTEUR') {
      // Charger le profil du traducteur
      const traducteur = await prisma.traducteur.findFirst({
        where: { utilisateurId: utilisateur.id },
        include: {
          equipeProjets: { select: { equipeProjetId: true } },
        },
      });
      
      if (traducteur) {
        const equipesIds = traducteur.equipeProjets.map(ep => ep.equipeProjetId);
        
        demandesFiltrees = demandes.filter(demande => {
          // Si aucun ciblage défini → visible par tous
          const aucunCiblage = 
            (!demande.divisions || demande.divisions.length === 0) &&
            (!demande.categories || demande.categories.length === 0) &&
            (!demande.specialisations || demande.specialisations.length === 0) &&
            (!demande.domaines || demande.domaines.length === 0) &&
            !demande.equipeProjetId;
          
          if (aucunCiblage) return true;
          
          // Vérifier si le traducteur correspond à AU MOINS UN critère
          // (logique OR entre les critères)
          
          // Divisions: le traducteur doit appartenir à au moins une division ciblée
          if (demande.divisions?.length > 0) {
            const matchDivision = traducteur.divisions?.some(d => 
              demande.divisions!.includes(d)
            );
            if (matchDivision) return true;
          }
          
          // Catégorie: TR01, TR02, TR03
          if (demande.categories?.length > 0) {
            if (traducteur.categorie && demande.categories.includes(traducteur.categorie)) {
              return true;
            }
          }
          
          // Spécialisations
          if (demande.specialisations?.length > 0) {
            const matchSpec = traducteur.specialisations?.some(s => 
              demande.specialisations!.includes(s)
            );
            if (matchSpec) return true;
          }
          
          // Domaines
          if (demande.domaines?.length > 0) {
            const matchDomaine = traducteur.domaines?.some(d => 
              demande.domaines!.includes(d)
            );
            if (matchDomaine) return true;
          }
          
          // Équipe-projet
          if (demande.equipeProjetId) {
            if (equipesIds.includes(demande.equipeProjetId)) return true;
          }
          
          // Aucun match trouvé
          return false;
        });
      }
    }

    // Enrichir avec les infos du conseiller
    const demandesEnrichies = await Promise.all(
      demandesFiltrees.map(async (demande) => {
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
 * Modifier une demande de ressource
 * PUT /api/notifications/demandes-ressources/:id
 */
export const modifierDemandeRessource = async (
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

    // Seul le créateur ou un admin peut modifier
    if (demande.conseillerId !== utilisateur.id && utilisateur.role !== 'ADMIN') {
      res.status(403).json({ erreur: 'Non autorisé' });
      return;
    }

    const { 
      titre, 
      description, 
      heuresEstimees, 
      langueSource, 
      langueCible, 
      divisions,
      categories,
      specialisations,
      domaines,
      equipeProjetId,
      urgence, 
      expireLe 
    } = req.body;

    const demandeModifiee = await prisma.demandeRessource.update({
      where: { id },
      data: {
        titre: titre ?? demande.titre,
        description: description !== undefined ? description : demande.description,
        heuresEstimees: heuresEstimees !== undefined ? (heuresEstimees ? parseFloat(heuresEstimees) : null) : demande.heuresEstimees,
        langueSource: langueSource !== undefined ? langueSource : demande.langueSource,
        langueCible: langueCible !== undefined ? langueCible : demande.langueCible,
        divisions: divisions !== undefined ? divisions : demande.divisions,
        categories: categories !== undefined ? categories : demande.categories,
        specialisations: specialisations !== undefined ? specialisations : demande.specialisations,
        domaines: domaines !== undefined ? domaines : demande.domaines,
        equipeProjetId: equipeProjetId !== undefined ? (equipeProjetId || null) : demande.equipeProjetId,
        urgence: urgence ?? demande.urgence,
        expireLe: expireLe !== undefined ? (expireLe ? new Date(expireLe) : null) : demande.expireLe,
      },
    });

    res.json(demandeModifiee);
  } catch (error) {
    console.error('Erreur modification demande:', error);
    res.status(500).json({ erreur: 'Erreur lors de la modification de la demande' });
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
