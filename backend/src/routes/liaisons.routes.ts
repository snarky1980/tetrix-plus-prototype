/**
 * Routes API pour la gestion des liaisons Traducteur-Réviseur
 */

import { Router, Request, Response } from 'express';
import liaisonService from '../services/liaisonReviseurService';
import { CategorieTraducteur } from '@prisma/client';
import { authentifier, verifierRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Toutes les routes de liaisons nécessitent authentification
router.use(authentifier);
router.use(verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'));

/**
 * GET /api/liaisons/resume
 * Récupère le résumé des liaisons (statistiques)
 */
router.get('/resume', async (req: Request, res: Response) => {
  try {
    const division = req.query.division as string | undefined;
    const resume = await liaisonService.obtenirResumeLiaisons(division);
    
    res.json({
      success: true,
      data: resume,
    });
  } catch (error: any) {
    console.error('Erreur résumé liaisons:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du résumé',
    });
  }
});

/**
 * GET /api/liaisons/reviseurs-potentiels
 * Liste tous les TR03 pouvant être réviseurs
 */
router.get('/reviseurs-potentiels', async (req: Request, res: Response) => {
  try {
    const division = req.query.division as string | undefined;
    const domaine = req.query.domaine as string | undefined;
    const reviseurs = await liaisonService.obtenirReviseursPotentiels(division, domaine);
    
    res.json({
      success: true,
      data: reviseurs,
    });
  } catch (error: any) {
    console.error('Erreur liste réviseurs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des réviseurs',
    });
  }
});

/**
 * GET /api/liaisons/necessitant-revision
 * Liste les traducteurs nécessitant révision (TR01 + TR02 avec flag)
 */
router.get('/necessitant-revision', async (req: Request, res: Response) => {
  try {
    const traducteurs = await liaisonService.obtenirTraducteursNecessitantRevision();
    
    res.json({
      success: true,
      data: traducteurs,
    });
  } catch (error: any) {
    console.error('Erreur liste traducteurs nécessitant révision:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération',
    });
  }
});

/**
 * GET /api/liaisons/traducteur/:traducteurId
 * Récupère les liaisons d'un traducteur
 */
router.get('/traducteur/:traducteurId', async (req: Request, res: Response) => {
  try {
    const { traducteurId } = req.params;
    const liaisons = await liaisonService.obtenirLiaisonsTraducteur(traducteurId);
    
    res.json({
      success: true,
      data: liaisons,
    });
  } catch (error: any) {
    console.error('Erreur liaisons traducteur:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des liaisons',
    });
  }
});

/**
 * GET /api/liaisons/reviseur/:reviseurId
 * Récupère les traducteurs révisés par un TR03
 */
router.get('/reviseur/:reviseurId', async (req: Request, res: Response) => {
  try {
    const { reviseurId } = req.params;
    const liaisons = await liaisonService.obtenirTraducteursRevises(reviseurId);
    
    res.json({
      success: true,
      data: liaisons,
    });
  } catch (error: any) {
    console.error('Erreur traducteurs révisés:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération',
    });
  }
});

/**
 * GET /api/liaisons/traducteur/:traducteurId/reviseur-principal
 * Récupère le réviseur principal d'un traducteur
 */
router.get('/traducteur/:traducteurId/reviseur-principal', async (req: Request, res: Response) => {
  try {
    const { traducteurId } = req.params;
    const reviseur = await liaisonService.obtenirReviseurPrincipal(traducteurId);
    
    res.json({
      success: true,
      data: reviseur,
    });
  } catch (error: any) {
    console.error('Erreur réviseur principal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du réviseur',
    });
  }
});

/**
 * POST /api/liaisons
 * Crée une nouvelle liaison traducteur-réviseur
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { traducteurId, reviseurId, estPrincipal, notes, mode, domaine, dateFin } = req.body;
    
    if (!traducteurId || !reviseurId) {
      return res.status(400).json({
        success: false,
        error: 'traducteurId et reviseurId sont requis',
      });
    }

    const liaison = await liaisonService.creerLiaison({
      traducteurId,
      reviseurId,
      estPrincipal,
      mode,
      domaine,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      notes,
    });
    
    res.status(201).json({
      success: true,
      data: liaison,
      message: 'Liaison créée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur création liaison:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Erreur lors de la création de la liaison',
    });
  }
});

/**
 * DELETE /api/liaisons/:liaisonId
 * Supprime (désactive) une liaison
 */
router.delete('/:liaisonId', async (req: Request, res: Response) => {
  try {
    const { liaisonId } = req.params;
    await liaisonService.supprimerLiaison(liaisonId);
    
    res.json({
      success: true,
      message: 'Liaison supprimée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur suppression liaison:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la suppression',
    });
  }
});

/**
 * POST /api/liaisons/verifier-disponibilite
 * Vérifie la disponibilité combinée traducteur + réviseur
 */
router.post('/verifier-disponibilite', async (req: Request, res: Response) => {
  try {
    const { traducteurId, heuresTraduction, dateEcheance, reviseurId, domaine, forceRevision, mode } = req.body;
    
    if (!traducteurId || !heuresTraduction || !dateEcheance) {
      return res.status(400).json({
        success: false,
        error: 'traducteurId, heuresTraduction et dateEcheance sont requis',
      });
    }

    const result = await liaisonService.verifierDisponibiliteCombinee(
      traducteurId,
      parseFloat(heuresTraduction),
      new Date(dateEcheance),
      {
        reviseurId,
        domaine,
        forceRevision,
        mode,
      }
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Erreur vérification disponibilité:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification',
    });
  }
});

/**
 * PUT /api/liaisons/traducteur/:traducteurId/categorie
 * Met à jour la catégorie d'un traducteur
 */
router.put('/traducteur/:traducteurId/categorie', async (req: Request, res: Response) => {
  try {
    const { traducteurId } = req.params;
    const { categorie, necessiteRevision } = req.body;
    
    if (!categorie || !['TR01', 'TR02', 'TR03'].includes(categorie)) {
      return res.status(400).json({
        success: false,
        error: 'Catégorie invalide. Valeurs acceptées: TR01, TR02, TR03',
      });
    }

    const traducteur = await liaisonService.mettreAJourCategorie(
      traducteurId,
      categorie as CategorieTraducteur,
      necessiteRevision
    );
    
    res.json({
      success: true,
      data: traducteur,
      message: `Catégorie mise à jour: ${categorie}`,
    });
  } catch (error: any) {
    console.error('Erreur mise à jour catégorie:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la mise à jour',
    });
  }
});

export default router;
