import { Router } from 'express';
import {
  obtenirTraducteurs,
  obtenirTraducteur,
  creerTraducteur,
  mettreAJourTraducteur,
  desactiverTraducteur,
} from '../controllers/traducteurController';
import {
  ajouterPaireLinguistique,
  supprimerPaireLinguistique,
} from '../controllers/paireLinguistiqueController';
import { authentifier, verifierRole } from '../middleware/auth';

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
 * GET /api/traducteurs/:id
 * Récupérer un traducteur par ID
 * Accessible par : Admin, Conseiller
 */
router.get('/:id', verifierRole('ADMIN', 'CONSEILLER'), obtenirTraducteur);

/**
 * POST /api/traducteurs
 * Créer un nouveau traducteur
 * Accessible par : Admin uniquement
 */
router.post('/', verifierRole('ADMIN'), creerTraducteur);

/**
 * PUT /api/traducteurs/:id
 * Mettre à jour un traducteur
 * Accessible par : Admin uniquement
 */
router.put('/:id', verifierRole('ADMIN'), mettreAJourTraducteur);

/**
 * DELETE /api/traducteurs/:id
 * Désactiver un traducteur
 * Accessible par : Admin uniquement
 */
router.delete('/:id', verifierRole('ADMIN'), desactiverTraducteur);

/**
 * POST /api/traducteurs/:traducteurId/paires-linguistiques
 * Ajouter une paire linguistique
 * Accessible par : Admin uniquement
 */
router.post(
  '/:traducteurId/paires-linguistiques',
  verifierRole('ADMIN'),
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
  supprimerPaireLinguistique
);

export default router;
