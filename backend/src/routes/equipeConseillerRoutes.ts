import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import * as controller from '../controllers/equipeConseillerController';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authentifier);

// Routes pour les équipes
router.get('/', controller.listerEquipes);
router.get('/mes-equipes', controller.mesEquipes);
router.get('/:id', controller.obtenirEquipe);

// Création/modification/suppression - réservé aux ADMIN et GESTIONNAIRE
router.post('/', verifierRole('ADMIN', 'GESTIONNAIRE'), controller.creerEquipe);
router.put('/:id', verifierRole('ADMIN', 'GESTIONNAIRE'), controller.modifierEquipe);
router.delete('/:id', verifierRole('ADMIN', 'GESTIONNAIRE'), controller.supprimerEquipe);

// Routes pour les membres
router.get('/:id/membres', controller.listerMembres);
router.get('/:id/utilisateurs-disponibles', controller.utilisateursDisponibles);
router.post('/:id/membres', verifierRole('ADMIN', 'GESTIONNAIRE'), controller.ajouterMembre);
router.delete('/:id/membres/:utilisateurId', verifierRole('ADMIN', 'GESTIONNAIRE'), controller.retirerMembre);
router.patch('/:id/membres/:utilisateurId/role', verifierRole('ADMIN', 'GESTIONNAIRE'), controller.modifierRoleMembre);

export default router;
