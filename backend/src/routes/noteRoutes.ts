import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authentifier } from '../middleware/auth';
import * as noteController from '../controllers/noteController';

const router = Router();

// ============================================
// CONFIGURATION MULTER POUR UPLOAD
// ============================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pieces-jointes');

// Créer le dossier si nécessaire
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const nomFichier = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
    cb(null, nomFichier);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (_req, file, cb) => {
    // Types de fichiers autorisés
    const typesAutorises = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed',
    ];

    if (typesAutorises.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
  },
});

// ============================================
// ROUTES NOTES
// ============================================

// Toutes les routes nécessitent une authentification
router.use(authentifier);

// Référentiels (types, catégories, visibilités)
router.get('/referentiels', noteController.obtenirReferentiels);

// Recherche globale
router.get('/recherche', noteController.rechercherNotes);

// Stats d'une entité
router.get('/stats/:entiteType/:entiteId', noteController.obtenirStatistiques);

// Notes d'une entité spécifique
router.get('/entite/:entiteType/:entiteId', noteController.obtenirNotesEntite);

// CRUD Note
router.post('/', noteController.creerNote);
router.get('/:id', noteController.obtenirNote);
router.put('/:id', noteController.modifierNote);
router.patch('/:id/epingle', noteController.toggleEpingle);
router.delete('/:id', noteController.supprimerNote);

// ============================================
// ROUTES PIÈCES JOINTES
// ============================================

// Upload avec multer
router.post(
  '/pieces-jointes',
  upload.single('fichier'),
  noteController.uploadPieceJointe
);

// Pièces jointes d'une entité
router.get(
  '/pieces-jointes/entite/:entiteType/:entiteId',
  noteController.obtenirPiecesJointesEntite
);

// Télécharger une pièce jointe
router.get(
  '/pieces-jointes/:id/download',
  noteController.telechargerPieceJointe
);

// Supprimer une pièce jointe
router.delete(
  '/pieces-jointes/:id',
  noteController.supprimerPieceJointe
);

export default router;
