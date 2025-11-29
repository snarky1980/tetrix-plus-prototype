import { Router } from 'express';
import {
  obtenirTaches,
  obtenirTache,
  creerTache,
  mettreAJourTache,
  supprimerTache,
} from '../controllers/tacheController';
import { authentifier, verifierRole } from '../middleware/auth';

const router = Router();

router.use(authentifier);

/**
 * GET /api/taches
 * Obtenir les tâches (avec filtres)
 * Accessible par : Admin, Conseiller
 */
router.get('/', verifierRole('ADMIN', 'CONSEILLER'), obtenirTaches);

/**
 * GET /api/taches/:id
 * Obtenir une tâche par ID
 * Accessible par : Admin, Conseiller
 */
router.get('/:id', verifierRole('ADMIN', 'CONSEILLER'), obtenirTache);

/**
 * POST /api/taches
 * Créer une nouvelle tâche
 * Accessible par : Admin, Conseiller
 */
router.post('/', verifierRole('ADMIN', 'CONSEILLER'), creerTache);

/**
 * PUT /api/taches/:id
 * Mettre à jour une tâche
 * Accessible par : Admin, Conseiller
 */
router.put('/:id', verifierRole('ADMIN', 'CONSEILLER'), mettreAJourTache);

/**
 * DELETE /api/taches/:id
 * Supprimer une tâche
 * Accessible par : Admin, Conseiller
 */
router.delete('/:id', verifierRole('ADMIN', 'CONSEILLER'), supprimerTache);

export default router;
