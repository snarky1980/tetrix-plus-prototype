import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import {
  obtenirDivisions,
  obtenirDivisionParId,
  creerDivision,
  mettreAJourDivision,
  supprimerDivision,
  obtenirUtilisateursAvecAcces,
} from '../controllers/divisionController';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authentifier);

// Les routes de lecture sont accessibles à tous les rôles
router.get('/', obtenirDivisions);
router.get('/:id', obtenirDivisionParId);
router.get('/:id/utilisateurs', obtenirUtilisateursAvecAcces);

// Les routes d'écriture nécessitent le rôle ADMIN
router.post('/', verifierRole('ADMIN'), creerDivision);
router.put('/:id', verifierRole('ADMIN'), mettreAJourDivision);
router.delete('/:id', verifierRole('ADMIN'), supprimerDivision);

export default router;
