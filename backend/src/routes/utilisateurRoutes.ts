import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import {
  obtenirUtilisateurs,
  obtenirUtilisateurParId,
  creerUtilisateur,
  mettreAJourUtilisateur,
  supprimerUtilisateur,
  gererAccesDivisions,
  obtenirDivisionsAccessibles,
} from '../controllers/utilisateurController';

const router = Router();

// Toutes les routes nécessitent une authentification et le rôle ADMIN
router.use(authentifier);
router.use(verifierRole('ADMIN'));

// Routes CRUD utilisateurs
router.get('/', obtenirUtilisateurs);
router.get('/:id', obtenirUtilisateurParId);
router.post('/', creerUtilisateur);
router.put('/:id', mettreAJourUtilisateur);
router.delete('/:id', supprimerUtilisateur);

// Routes pour gérer les accès aux divisions
router.put('/:id/divisions', gererAccesDivisions);
router.get('/:id/divisions', obtenirDivisionsAccessibles);

export default router;
