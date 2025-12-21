import { Router } from 'express';
import { previewJAT, previewEquilibre, previewPEPS, suggererHeures, suggererRepartition } from '../controllers/repartitionController';
import { authentifier, verifierRole } from '../middleware/auth';

const router = Router();

router.use(authentifier);

// Accessible aux rôles planificateurs (Admin, Conseiller)
router.get('/jat-preview', verifierRole('ADMIN', 'CONSEILLER'), previewJAT);
router.get('/equilibre-preview', verifierRole('ADMIN', 'CONSEILLER'), previewEquilibre);
router.get('/peps-preview', verifierRole('ADMIN', 'CONSEILLER'), previewPEPS);
router.post('/suggerer-heures', verifierRole('ADMIN', 'CONSEILLER'), suggererHeures);
router.get('/suggerer-repartition', verifierRole('ADMIN', 'CONSEILLER'), suggererRepartition);

export default router;
