import { Router } from 'express';
import { importerCISR, importerDroit } from '../controllers/importController';
import { authentifier } from '../middleware/auth';

const router = Router();

// Routes protégées pour l'import (admin uniquement)
router.post('/cisr', authentifier, importerCISR);
router.post('/droit', authentifier, importerDroit);

export default router;
