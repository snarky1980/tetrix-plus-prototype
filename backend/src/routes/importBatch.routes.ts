/**
 * Routes d'import batch pour traducteurs et tâches
 */

import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import {
  previewTraducteurs,
  importTraducteurs,
  previewTaches,
  importTaches,
  getTemplate
} from '../controllers/importBatchController';

const router = Router();

// Toutes les routes nécessitent auth + rôle ADMIN ou CONSEILLER
router.use(authentifier);

// Templates
router.get('/template/:type', getTemplate);

// Import traducteurs (ADMIN seulement)
router.post('/preview-traducteurs', verifierRole('ADMIN'), previewTraducteurs);
router.post('/traducteurs', verifierRole('ADMIN'), importTraducteurs);

// Import tâches (ADMIN ou CONSEILLER)
router.post('/preview-taches', verifierRole('ADMIN', 'CONSEILLER'), previewTaches);
router.post('/taches', verifierRole('ADMIN', 'CONSEILLER'), importTaches);

export default router;
