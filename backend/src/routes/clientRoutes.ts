import { Router } from 'express';
import {
  obtenirClients,
  creerClient,
  mettreAJourClient,
} from '../controllers/clientController';
import { authentifier, verifierRole } from '../middleware/auth';
import { valider } from '../middleware/validation';
import { creerClientSchema, mettreAJourClientSchema } from '../validation/schemas';

const router = Router();

router.use(authentifier);

/**
 * GET /api/clients
 * Obtenir tous les clients
 * Accessible par : Admin, Conseiller
 */
router.get('/', verifierRole('ADMIN', 'CONSEILLER'), obtenirClients);

/**
 * POST /api/clients
 * Créer un nouveau client
 * Accessible par : Admin uniquement
 */
router.post('/', verifierRole('ADMIN'), valider(creerClientSchema), creerClient);

/**
 * PUT /api/clients/:id
 * Mettre à jour un client
 * Accessible par : Admin uniquement
 */
router.put('/:id', verifierRole('ADMIN'), valider(mettreAJourClientSchema), mettreAJourClient);

export default router;
