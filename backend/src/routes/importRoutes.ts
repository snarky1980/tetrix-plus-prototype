import { Router } from 'express';
import { importerCISR } from '../controllers/importController';
import { authentifier } from '../middleware/auth';

const router = Router();

// Route protégée pour l'import CISR (admin uniquement)
router.post('/cisr', authentifier, importerCISR);

export default router;
