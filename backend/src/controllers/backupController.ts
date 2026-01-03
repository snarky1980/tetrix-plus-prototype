import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { backupService } from '../services/backupService';

/**
 * Exporter toute la base de données
 * GET /api/admin/backup/export
 */
export const exportDatabase = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateurId = req.utilisateur!.id;
    
    console.log(`[BackupController] Export demandé par ${utilisateurId}`);
    
    const backup = await backupService.exportDatabase(utilisateurId);
    
    // Générer un nom de fichier avec timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tetrix-backup-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
    
  } catch (error: any) {
    console.error('[BackupController] Erreur export:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'export de la base de données' });
  }
};

/**
 * Obtenir les statistiques actuelles de la base
 * GET /api/admin/backup/stats
 */
export const getStatistiques = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await backupService.getStatistiques();
    const tables = backupService.getTables();
    
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    
    res.json({
      tables,
      counts: stats,
      total,
      lastCheck: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('[BackupController] Erreur stats:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des statistiques' });
  }
};

/**
 * Valider un fichier de backup
 * POST /api/admin/backup/validate
 */
export const validateBackup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const backup = req.body;
    
    if (!backup) {
      res.status(400).json({ erreur: 'Aucune donnée de backup fournie' });
      return;
    }
    
    const validation = backupService.validateBackup(backup);
    
    if (validation.valid && backup.metadata) {
      res.json({
        valid: true,
        metadata: backup.metadata,
        preview: {
          version: backup.metadata.version,
          createdAt: backup.metadata.createdAt,
          createdBy: backup.metadata.createdBy,
          environment: backup.metadata.environment,
          tables: backup.metadata.tables?.length || 0,
          totalRecords: backup.metadata.counts 
            ? Object.values(backup.metadata.counts as Record<string, number>).reduce((a, b) => a + b, 0)
            : 0,
          counts: backup.metadata.counts || {},
        },
      });
    } else {
      res.json({
        valid: false,
        errors: validation.errors,
      });
    }
    
  } catch (error: any) {
    console.error('[BackupController] Erreur validation:', error);
    res.status(500).json({ erreur: 'Erreur lors de la validation du backup' });
  }
};

/**
 * Restaurer la base depuis un backup
 * POST /api/admin/backup/restore
 * ATTENTION: Opération destructive!
 */
export const restoreDatabase = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateurId = req.utilisateur!.id;
    const { backup, options } = req.body;
    
    if (!backup) {
      res.status(400).json({ erreur: 'Aucune donnée de backup fournie' });
      return;
    }
    
    // Validation préalable
    const validation = backupService.validateBackup(backup);
    if (!validation.valid) {
      res.status(400).json({ 
        erreur: 'Backup invalide',
        details: validation.errors,
      });
      return;
    }
    
    console.log(`[BackupController] Restauration demandée par ${utilisateurId}`);
    console.log(`  Options:`, options);
    
    // Vérification de confirmation
    if (!options?.confirmed) {
      res.status(400).json({ 
        erreur: 'Confirmation requise',
        message: 'Ajoutez { confirmed: true } dans les options pour confirmer la restauration',
      });
      return;
    }
    
    const result = await backupService.restoreDatabase(backup, utilisateurId, {
      skipTables: options?.skipTables || [],
      clearExisting: options?.clearExisting !== false,
    });
    
    if (result.success) {
      res.json({
        message: 'Base de données restaurée avec succès',
        ...result,
      });
    } else {
      res.status(500).json({
        message: 'Restauration partielle avec erreurs',
        ...result,
      });
    }
    
  } catch (error: any) {
    console.error('[BackupController] Erreur restauration:', error);
    res.status(500).json({ 
      erreur: 'Erreur lors de la restauration',
      details: error.message,
    });
  }
};

/**
 * Exporter une table spécifique
 * GET /api/admin/backup/export/:table
 */
export const exportTable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const utilisateurId = req.utilisateur!.id;
    const { table } = req.params;
    
    const tables = backupService.getTables();
    if (!tables.includes(table)) {
      res.status(400).json({ 
        erreur: `Table inconnue: ${table}`,
        tablesDisponibles: tables,
      });
      return;
    }
    
    const result = await backupService.exportSingleTable(table, utilisateurId);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tetrix-${table}-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      table,
      exportedAt: new Date().toISOString(),
      count: result.count,
      data: result.data,
    });
    
  } catch (error: any) {
    console.error('[BackupController] Erreur export table:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'export de la table' });
  }
};

/**
 * Obtenir la liste des tables disponibles
 * GET /api/admin/backup/tables
 */
export const getTables = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  const tables = backupService.getTables();
  res.json({ tables });
};
