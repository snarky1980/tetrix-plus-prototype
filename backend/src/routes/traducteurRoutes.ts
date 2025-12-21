import { Router } from 'express';
import {
  obtenirTraducteurs,
  obtenirTraducteur,
  creerTraducteur,
  mettreAJourTraducteur,
  desactiverTraducteur,
  bloquerTemps,
  obtenirBlocages,
  supprimerBlocage,
  mettreAJourDisponibilite,
} from '../controllers/traducteurController';
import { obtenirPlanification } from '../controllers/planificationController';
import {
  ajouterPaireLinguistique,
  supprimerPaireLinguistique,
} from '../controllers/paireLinguistiqueController';
import { authentifier, verifierRole, verifierAccesTraducteur } from '../middleware/auth';
import { valider } from '../middleware/validation';
import {
  creerTraducteurSchema,
  mettreAJourTraducteurSchema,
  desactiverTraducteurSchema,
  ajouterPaireLinguistiqueSchema,
  supprimerPaireLinguistiqueSchema,
  obtenirPlanificationSchema,
} from '../validation/schemas';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authentifier);

/**
 * GET /api/traducteurs
 * Récupérer la liste des traducteurs (avec filtres)
 * Accessible par : Admin, Conseiller
 */
router.get('/', verifierRole('ADMIN', 'CONSEILLER'), obtenirTraducteurs);

/**
 * GET /api/traducteurs/:traducteurId/planification
 * Obtenir la planification d'un traducteur
 * Accessible par : Admin, Conseiller, ou le traducteur lui-même
 */
router.get(
  '/:traducteurId/planification',
  verifierAccesTraducteur,
  valider(obtenirPlanificationSchema),
  obtenirPlanification
);

/**
 * GET /api/traducteurs/:id
 * Récupérer un traducteur par ID
 * Accessible par : Admin, Conseiller, Traducteur (ses propres données uniquement)
 */
router.get('/:id', obtenirTraducteur);

/**
 * POST /api/traducteurs
 * Créer un nouveau traducteur
 * Accessible par : Admin uniquement
 */
router.post('/', verifierRole('ADMIN'), valider(creerTraducteurSchema), creerTraducteur);

/**
 * PUT /api/traducteurs/:id
 * Mettre à jour un traducteur
 * Accessible par : Admin uniquement
 */
router.put('/:id', verifierRole('ADMIN'), valider(mettreAJourTraducteurSchema), mettreAJourTraducteur);

/**
 * DELETE /api/traducteurs/:id
 * Désactiver un traducteur
 * Accessible par : Admin uniquement
 */
router.delete('/:id', verifierRole('ADMIN'), valider(desactiverTraducteurSchema), desactiverTraducteur);

/**
 * POST /api/traducteurs/:traducteurId/paires-linguistiques
 * Ajouter une paire linguistique
 * Accessible par : Admin uniquement
 */
router.post(
  '/:traducteurId/paires-linguistiques',
  verifierRole('ADMIN'),
  valider(ajouterPaireLinguistiqueSchema),
  ajouterPaireLinguistique
);

/**
 * DELETE /api/paires-linguistiques/:id
 * Supprimer une paire linguistique
 * Accessible par : Admin uniquement
 */
router.delete(
  '/paires-linguistiques/:id',
  verifierRole('ADMIN'),
  valider(supprimerPaireLinguistiqueSchema),
  supprimerPaireLinguistique
);

/**
 * POST /api/traducteurs/:id/bloquer-temps
 * Bloquer du temps pour un traducteur
 * Accessible par : Admin, Conseiller
 */
router.post('/:id/bloquer-temps', verifierRole('ADMIN', 'CONSEILLER'), bloquerTemps);

/**
 * GET /api/traducteurs/:id/blocages
 * Obtenir les blocages de temps d'un traducteur
 * Accessible par : Admin, Conseiller
 */
router.get('/:id/blocages', verifierRole('ADMIN', 'CONSEILLER'), obtenirBlocages);

/**
 * DELETE /api/traducteurs/blocages/:blocageId
 * Supprimer un blocage de temps
 * Accessible par : Admin, Conseiller
 */
router.delete('/blocages/:blocageId', verifierRole('ADMIN', 'CONSEILLER'), supprimerBlocage);

/**
 * PUT /api/traducteurs/:id/disponibilite
 * Mettre à jour le statut de disponibilité d'un traducteur
 * Accessible par : Le traducteur lui-même ou Admin
 */
router.put('/:id/disponibilite', mettreAJourDisponibilite);

export default router;
