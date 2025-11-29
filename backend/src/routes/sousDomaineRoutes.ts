import { Router } from 'express';
import {
  obtenirSousDomaines,
  creerSousDomaine,
  mettreAJourSousDomaine,
} from '../controllers/sousDomaineController';
import { authentifier, verifierRole } from '../middleware/auth';

const router = Router();

router.use(authentifier);

/**
 * GET /api/sous-domaines
 * Obtenir tous les sous-domaines
 * Accessible par : Admin, Conseiller
 */
router.get('/', verifierRole('ADMIN', 'CONSEILLER'), obtenirSousDomaines);

/**
 * POST /api/sous-domaines
 * Créer un nouveau sous-domaine
 * Accessible par : Admin uniquement
 */
router.post('/', verifierRole('ADMIN'), creerSousDomaine);

/**
 * PUT /api/sous-domaines/:id
 * Mettre à jour un sous-domaine
 * Accessible par : Admin uniquement
 */
router.put('/:id', verifierRole('ADMIN'), mettreAJourSousDomaine);

export default router;
