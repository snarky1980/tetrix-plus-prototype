import { Router } from 'express';
import { authentifier } from '../middleware/auth';
import {
  obtenirPermissionsEquipesProjet,
  definirPermissionsEquipesProjet
} from '../controllers/equipeProjetAccessController';

const router = Router();

// Obtenir les permissions d'équipes de projet d'un utilisateur
router.get('/:utilisateurId', authentifier, obtenirPermissionsEquipesProjet);

// Définir les permissions d'équipes de projet d'un utilisateur
router.put('/:utilisateurId', authentifier, definirPermissionsEquipesProjet);

export default router;
