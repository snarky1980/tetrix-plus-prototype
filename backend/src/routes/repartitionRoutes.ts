import { Router } from 'express';
import { previewJAT } from '../controllers/repartitionController';
import { authentifier, verifierRole } from '../middleware/auth';

const router = Router();

router.use(authentifier);

// Accessible aux rôles planificateurs (Admin, Conseiller)
router.get('/jat-preview', verifierRole('ADMIN', 'CONSEILLER'), previewJAT);

export default router;
