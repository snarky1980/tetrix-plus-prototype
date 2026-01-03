import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import {
  obtenirJoursFeries,
  obtenirJourFerieParId,
  creerJourFerie,
  mettreAJourJourFerie,
  supprimerJourFerie,
  importerJoursFeries,
  preremplirAnnee,
} from '../controllers/joursFeriesController';

const router = Router();

// Toutes les routes admin nécessitent authentification et rôle ADMIN
router.use(authentifier);
router.use(verifierRole('ADMIN'));

/**
 * GET /api/admin/jours-feries
 * Obtenir tous les jours fériés
 * Query params: annee, actif
 */
router.get('/', obtenirJoursFeries);

/**
 * GET /api/admin/jours-feries/:id
 * Obtenir un jour férié par ID
 */
router.get('/:id', obtenirJourFerieParId);

/**
 * POST /api/admin/jours-feries
 * Créer un nouveau jour férié
 * Body: { date, nom, description?, type? }
 */
router.post('/', creerJourFerie);

/**
 * PUT /api/admin/jours-feries/:id
 * Mettre à jour un jour férié
 * Body: { date?, nom?, description?, type?, actif? }
 */
router.put('/:id', mettreAJourJourFerie);

/**
 * DELETE /api/admin/jours-feries/:id
 * Supprimer un jour férié
 */
router.delete('/:id', supprimerJourFerie);

/**
 * POST /api/admin/jours-feries/import
 * Importer plusieurs jours fériés
 * Body: { joursFeries: [{ date, nom, description?, type? }] }
 */
router.post('/import', importerJoursFeries);

/**
 * POST /api/admin/jours-feries/preremplir/:annee
 * Pré-remplir avec les jours fériés officiels d'une année
 */
router.post('/preremplir/:annee', preremplirAnnee);

export default router;
