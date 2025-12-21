import { Router } from 'express';
import {
  creerBlocage,
  supprimerBlocage,
  obtenirPlanificationGlobale,
} from '../controllers/planificationController';
import { authentifier, verifierRole } from '../middleware/auth';
import { valider } from '../middleware/validation';
import {
  obtenirPlanificationGlobaleSchema,
  creerBlocageSchema,
  supprimerBlocageSchema,
} from '../validation/schemas';

const router = Router();

router.use(authentifier);

// Note: La route /traducteurs/:traducteurId/planification est dans traducteurRoutes.ts

/**
 * GET /api/planification-globale
 * Obtenir le planification globale (multi-traducteurs)
 * Accessible par : Admin, Conseiller
 */
router.get('/planification-globale', verifierRole('ADMIN', 'CONSEILLER'), valider(obtenirPlanificationGlobaleSchema), obtenirPlanificationGlobale);

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
