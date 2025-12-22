import { Router } from 'express';
import { authentifier, verifierRole, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import {
  obtenirCompteurs,
  obtenirTraducteursDisponibles,
  creerDemandeRessource,
  obtenirDemandesRessources,
  fermerDemandeRessource,
  supprimerDemandeRessource,
} from '../controllers/notificationController';

const router = Router();

// Toutes les routes nécessitent authentification
router.use(authentifier);

// Compteurs de notifications (pour tous les utilisateurs authentifiés)
router.get('/compteurs', obtenirCompteurs);

// Traducteurs disponibles (pour conseillers/gestionnaires)
router.get(
  '/traducteurs-disponibles',
  verifierRole(Role.CONSEILLER, Role.GESTIONNAIRE, Role.ADMIN),
  obtenirTraducteursDisponibles
);

// Demandes de ressources
router.get('/demandes-ressources', obtenirDemandesRessources);
router.post(
  '/demandes-ressources',
  verifierRole(Role.CONSEILLER, Role.GESTIONNAIRE, Role.ADMIN),
  creerDemandeRessource
);
router.put('/demandes-ressources/:id/fermer', fermerDemandeRessource);
router.delete('/demandes-ressources/:id', supprimerDemandeRessource);

export default router;
