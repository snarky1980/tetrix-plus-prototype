import { Router } from 'express';
import { importerCISR, importerDroit, importerEM } from '../controllers/importController';
import { authentifier, verifierRole } from '../middleware/auth';

const router = Router();

// Routes protégées pour l'import (admin uniquement)
router.post('/cisr', authentifier, verifierRole('ADMIN'), importerCISR);
router.post('/droit', authentifier, verifierRole('ADMIN'), importerDroit);
router.post('/em', authentifier, verifierRole('ADMIN'), importerEM);

export default router;
