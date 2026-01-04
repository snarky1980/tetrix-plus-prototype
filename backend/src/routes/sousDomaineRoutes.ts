import { Router } from 'express';
import {
  obtenirSousDomaines,
  creerSousDomaine,
  mettreAJourSousDomaine,
  supprimerSousDomaine,
} from '../controllers/sousDomaineController';
import { authentifier, verifierRole } from '../middleware/auth';
import { valider } from '../middleware/validation';
import { creerSousDomaineSchema, mettreAJourSousDomaineSchema } from '../validation/schemas';

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
router.post('/', verifierRole('ADMIN'), valider(creerSousDomaineSchema), creerSousDomaine);

/**
 * PUT /api/sous-domaines/:id
 * Mettre à jour un sous-domaine
 * Accessible par : Admin uniquement
 */
router.put('/:id', verifierRole('ADMIN'), valider(mettreAJourSousDomaineSchema), mettreAJourSousDomaine);

/**
 * DELETE /api/sous-domaines/:id
 * Supprimer un sous-domaine
 * Accessible par : Admin uniquement
 */
router.delete('/:id', verifierRole('ADMIN'), supprimerSousDomaine);

export default router;
