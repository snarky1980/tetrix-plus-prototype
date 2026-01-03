import { Router, Request, Response } from 'express';
import { JoursFeriesService } from '../services/joursFeriesService';
import { authentifier } from '../middleware/auth';

const router = Router();

// Les routes de jours fériés nécessitent authentification (lecture seule pour tous)
router.use(authentifier);

/**
 * GET /api/jours-feries
 * Retourne tous les jours fériés configurés
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const joursFeries = JoursFeriesService.obtenirTousLesJoursFeries();
    res.json(joursFeries);
  } catch (error) {
    console.error('Erreur lors de la récupération des jours fériés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/jours-feries/:annee
 * Retourne les jours fériés pour une année spécifique
 */
router.get('/:annee', async (req: Request, res: Response) => {
  try {
    const annee = parseInt(req.params.annee, 10);
    
    if (isNaN(annee) || annee < 2026 || annee > 2027) {
      return res.status(400).json({ error: 'Année non supportée (2026-2027 uniquement)' });
    }

    const joursFeries = JoursFeriesService.obtenirJoursFeries(annee);
    res.json(joursFeries);
  } catch (error) {
    console.error('Erreur lors de la récupération des jours fériés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/jours-feries/verifier
 * Vérifie si une date est un jour férié
 * Body: { date: string (ISO format) }
 */
router.post('/verifier', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date requise' });
    }

    const dateObj = new Date(date);
    const estFerie = JoursFeriesService.estJourFerie(dateObj);
    const nom = JoursFeriesService.obtenirNomJourFerie(dateObj);

    res.json({
      date,
      estFerie,
      nom,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du jour férié:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/jours-feries/jours-ouvrables
 * Compte les jours ouvrables entre deux dates
 * Body: { dateDebut: string, dateFin: string }
 */
router.post('/jours-ouvrables', async (req: Request, res: Response) => {
  try {
    const { dateDebut, dateFin } = req.body;

    if (!dateDebut || !dateFin) {
      return res.status(400).json({ error: 'dateDebut et dateFin requises' });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    
    if (debut > fin) {
      return res.status(400).json({ error: 'dateDebut doit être avant dateFin' });
    }

    const joursOuvrables = JoursFeriesService.compterJoursOuvrables(debut, fin);
    const joursFeries = JoursFeriesService.obtenirJoursFeriesEntreDates(debut, fin);

    res.json({
      dateDebut,
      dateFin,
      joursOuvrables,
      joursFeries: joursFeries.length,
      details: joursFeries,
    });
  } catch (error) {
    console.error('Erreur lors du calcul des jours ouvrables:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
