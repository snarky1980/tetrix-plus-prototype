import { Router } from 'express';
import { authentifier } from '../middleware/auth';
import {
  obtenirPermissionsDivisions,
  definirPermissionsDivisions
} from '../controllers/divisionAccessController';

const router = Router();

// Obtenir les permissions de divisions d'un utilisateur
router.get('/:utilisateurId', authentifier, obtenirPermissionsDivisions);

// Définir les permissions de divisions d'un utilisateur
router.put('/:utilisateurId', authentifier, definirPermissionsDivisions);

export default router;
