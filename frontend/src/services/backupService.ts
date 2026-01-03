import api from './api';

// Types
export interface BackupMetadata {
  version: string;
  createdAt: string;
  createdBy: string;
  tables: string[];
  counts: Record<string, number>;
  environment: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, unknown[]>;
}

export interface BackupStats {
  tables: string[];
  counts: Record<string, number>;
  total: number;
  lastCheck: string;
}

export interface BackupValidation {
  valid: boolean;
  errors?: string[];
  metadata?: BackupMetadata;
  preview?: {
    version: string;
    createdAt: string;
    createdBy: string;
    environment: string;
    tables: number;
    totalRecords: number;
    counts: Record<string, number>;
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  tablesRestored: string[];
  errors: string[];
  counts: Record<string, { imported: number; errors: number }>;
}

export interface RestoreOptions {
  confirmed: boolean;
  skipTables?: string[];
  clearExisting?: boolean;
}

// =========================
// BACKUP API
// =========================

/**
 * Obtenir la liste des tables disponibles
 */
export const getTables = async (): Promise<{ tables: string[] }> => {
  const response = await api.get('/admin/backup/tables');
  return response.data;
};

/**
 * Obtenir les statistiques actuelles de la base
 */
export const getStatistiques = async (): Promise<BackupStats> => {
  const response = await api.get('/admin/backup/stats');
  return response.data;
};

/**
 * Exporter toute la base de données
 * Retourne le backup complet en JSON
 */
export const exportDatabase = async (): Promise<BackupData> => {
  const response = await api.get('/admin/backup/export');
  return response.data;
};

/**
 * Télécharger le backup comme fichier
 */
export const downloadBackup = async (): Promise<void> => {
  const backup = await exportDatabase();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tetrix-backup-${timestamp}.json`;
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exporter une table spécifique
 */
export const exportTable = async (tableName: string): Promise<{
  table: string;
  exportedAt: string;
  count: number;
  data: unknown[];
}> => {
  const response = await api.get(`/admin/backup/export/${tableName}`);
  return response.data;
};

/**
 * Télécharger une table comme fichier
 */
export const downloadTable = async (tableName: string): Promise<void> => {
  const result = await exportTable(tableName);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tetrix-${tableName}-${timestamp}.json`;
  
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Valider un fichier de backup
 */
export const validateBackup = async (backup: unknown): Promise<BackupValidation> => {
  const response = await api.post('/admin/backup/validate', backup);
  return response.data;
};

/**
 * Restaurer la base depuis un backup
 * ATTENTION: Opération destructive!
 */
export const restoreDatabase = async (
  backup: BackupData,
  options: RestoreOptions
): Promise<RestoreResult> => {
  const response = await api.post('/admin/backup/restore', { backup, options });
  return response.data;
};

/**
 * Lire un fichier JSON uploadé
 */
export const readBackupFile = (file: File): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (err) {
        reject(new Error('Fichier JSON invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
};
