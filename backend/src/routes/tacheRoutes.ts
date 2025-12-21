import { Router } from 'express';
import {
  obtenirTaches,
  obtenirTache,
  creerTache,
  mettreAJourTache,
  supprimerTache,
  terminerTache,
  obtenirHistoriqueTache,
} from '../controllers/tacheController';
import { authentifier, verifierRole } from '../middleware/auth';
import { valider } from '../middleware/validation';
import { creerTacheSchema, mettreAJourTacheSchema } from '../validation/schemas';

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
 * GET /api/taches/:id/historique
 * Obtenir l'historique des modifications d'une tâche
 * Accessible par : Admin, Conseiller
 */
router.get('/:id/historique', verifierRole('ADMIN', 'CONSEILLER'), obtenirHistoriqueTache);

/**
 * POST /api/taches
 * Créer une nouvelle tâche
 * Accessible par : Admin, Conseiller
 */
router.post('/', verifierRole('ADMIN', 'CONSEILLER'), valider(creerTacheSchema), creerTache);

/**
 * PUT /api/taches/:id
 * Mettre à jour une tâche
 * Accessible par : Admin, Conseiller
 */
router.put('/:id', verifierRole('ADMIN', 'CONSEILLER'), valider(mettreAJourTacheSchema), mettreAJourTache);

/**
 * POST /api/taches/:id/terminer
 * Terminer une tâche manuellement (libère le calendrier mais garde la tâche)
 * Accessible par : Admin, Conseiller, Traducteur (propriétaire)
 */
router.post('/:id/terminer', verifierRole('ADMIN', 'CONSEILLER', 'TRADUCTEUR'), terminerTache);

/**
 * DELETE /api/taches/:id
 * Supprimer une tâche
 * Accessible par : Admin, Conseiller
 */
router.delete('/:id', verifierRole('ADMIN', 'CONSEILLER'), supprimerTache);

export default router;
