import { Router } from 'express';
import {
  obtenirPlanning,
  creerBlocage,
  supprimerBlocage,
  obtenirPlanningGlobal,
} from '../controllers/planningController';
import { authentifier, verifierRole, verifierAccesTraducteur } from '../middleware/auth';
import { valider } from '../middleware/validation';
import {
  obtenirPlanningSchema,
  obtenirPlanningGlobalSchema,
  creerBlocageSchema,
  supprimerBlocageSchema,
} from '../validation/schemas';

const router = Router();

router.use(authentifier);

/**
 * GET /api/traducteurs/:traducteurId/planning
 * Obtenir le planning d'un traducteur
 * Accessible par : Admin, Conseiller, ou le traducteur lui-même
 */
router.get(
  '/traducteurs/:traducteurId/planning',
  verifierAccesTraducteur,
  valider(obtenirPlanningSchema),
  obtenirPlanning
);

/**
 * GET /api/planning-global
 * Obtenir le planning global (multi-traducteurs)
 * Accessible par : Admin, Conseiller
 */
router.get('/planning-global', verifierRole('ADMIN', 'CONSEILLER'), valider(obtenirPlanningGlobalSchema), obtenirPlanningGlobal);

/**
 * POST /api/ajustements
 * Créer un blocage de temps
 * Accessible par : Admin, Conseiller, Traducteur (pour ses propres blocages)
 */
router.post('/ajustements', valider(creerBlocageSchema), creerBlocage);

/**
 * DELETE /api/ajustements/:id
 * Supprimer un blocage
 * Accessible par : Admin, Conseiller, Traducteur (pour ses propres blocages)
 */
router.delete('/ajustements/:id', valider(supprimerBlocageSchema), supprimerBlocage);

export default router;
