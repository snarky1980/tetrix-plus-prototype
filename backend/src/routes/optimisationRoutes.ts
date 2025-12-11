import { Router } from 'express';
import { authentifier, AuthRequest } from '../middleware/auth';
import { analyserPlanification, genererSuggestions, appliquerReassignation } from '../services/optimisationService';
import { analyserAvecTetrixMaster } from '../services/tetrixMasterService';
import { genererRapportOrion } from '../services/orionStatService';

const router = Router();

/**
 * Analyser la planification avec Tetrix Master (version complète)
 * GET /api/optimisation/tetrix-master?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
 */
router.get('/tetrix-master', authentifier, async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    if (!dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'dateDebut et dateFin sont requis' });
      return;
    }

    const debut = new Date(dateDebut as string);
    const fin = new Date(dateFin as string);

    const analyse = await analyserAvecTetrixMaster(debut, fin);
    res.json(analyse);
  } catch (error) {
    console.error('[Tetrix Master] Erreur:', error);
    next(error);
  }
});

/**
 * Analyser la planification actuelle (version simplifiée, legacy)
 * GET /api/optimisation/analyser?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
 */
router.get('/analyser', authentifier, async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    if (!dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'dateDebut et dateFin sont requis' });
      return;
    }

    const debut = new Date(dateDebut as string);
    const fin = new Date(dateFin as string);

    const analyse = await analyserPlanification(debut, fin);
    res.json(analyse);
  } catch (error) {
    next(error);
  }
});

/**
 * Générer des suggestions d'optimisation
 * GET /api/optimisation/suggerer?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
 */
router.get('/suggerer', authentifier, async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    if (!dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'dateDebut et dateFin sont requis' });
      return;
    }

    const debut = new Date(dateDebut as string);
    const fin = new Date(dateFin as string);

    const suggestions = await genererSuggestions(debut, fin);
    res.json(suggestions);
  } catch (error) {
    next(error);
  }
});

/**
 * Appliquer une suggestion
 * POST /api/optimisation/appliquer
 * Body: { tacheId, nouveauTraducteurId }
 */
router.post('/appliquer', authentifier, async (req, res, next) => {
  try {
    const { tacheId, nouveauTraducteurId } = req.body;

    if (!tacheId || !nouveauTraducteurId) {
      res.status(400).json({ erreur: 'tacheId et nouveauTraducteurId sont requis' });
      return;
    }

    await appliquerReassignation(tacheId, nouveauTraducteurId);
    res.json({ message: 'Réassignation appliquée avec succès' });
  } catch (error) {
    next(error);
  }
});

/**
 * Générer rapport Tetrix Orion (analyse statistique avancée)
 * GET /api/optimisation/orion?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
 */
router.get('/orion', authentifier, async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    if (!dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'dateDebut et dateFin sont requis' });
      return;
    }

    const debut = new Date(dateDebut as string);
    const fin = new Date(dateFin as string);

    const rapport = await genererRapportOrion(debut, fin);
    res.json(rapport);
  } catch (error) {
    console.error('[Tetrix Orion] Erreur:', error);
    next(error);
  }
});

export default router;
