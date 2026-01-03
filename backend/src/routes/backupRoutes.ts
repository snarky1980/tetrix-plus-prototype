import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import {
  exportDatabase,
  getStatistiques,
  validateBackup,
  restoreDatabase,
  exportTable,
  getTables,
} from '../controllers/backupController';

const router = Router();

// Toutes les routes nécessitent authentification + rôle ADMIN
router.use(authentifier);
router.use(verifierRole('ADMIN'));

/**
 * @route   GET /api/admin/backup/tables
 * @desc    Liste des tables disponibles pour export
 * @access  Admin
 */
router.get('/tables', getTables);

/**
 * @route   GET /api/admin/backup/stats
 * @desc    Statistiques actuelles de la base (nombre d'enregistrements par table)
 * @access  Admin
 */
router.get('/stats', getStatistiques);

/**
 * @route   GET /api/admin/backup/export
 * @desc    Exporter toute la base de données en JSON
 * @access  Admin
 */
router.get('/export', exportDatabase);

/**
 * @route   GET /api/admin/backup/export/:table
 * @desc    Exporter une table spécifique en JSON
 * @access  Admin
 */
router.get('/export/:table', exportTable);

/**
 * @route   POST /api/admin/backup/validate
 * @desc    Valider un fichier de backup avant restauration
 * @access  Admin
 */
router.post('/validate', validateBackup);

/**
 * @route   POST /api/admin/backup/restore
 * @desc    Restaurer la base depuis un backup (DESTRUCTIF!)
 * @access  Admin
 * @body    { backup: BackupData, options: { confirmed: true, skipTables?: string[], clearExisting?: boolean } }
 */
router.post('/restore', restoreDatabase);

export default router;
