import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getStatistiques,
  downloadBackup,
  downloadTable,
  validateBackup,
  restoreDatabase,
  readBackupFile,
  BackupStats,
  BackupValidation,
  BackupData,
  RestoreResult,
} from '../../services/backupService';

type RestoreStep = 'upload' | 'preview' | 'confirm' | 'progress' | 'done';

export default function BackupManagement() {
  // Stats state
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  
  // Restore state
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('upload');
  const [uploadedBackup, setUploadedBackup] = useState<BackupData | null>(null);
  const [validation, setValidation] = useState<BackupValidation | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [skipTables, setSkipTables] = useState<string[]>([]);
  
  // Common state
  const [erreur, setErreur] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les stats
  const chargerStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const data = await getStatistiques();
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      setErreur('Erreur lors du chargement des statistiques');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    chargerStats();
  }, [chargerStats]);

  // Export complet
  const handleExportComplet = async () => {
    try {
      setExporting(true);
      setErreur(null);
      await downloadBackup();
    } catch (err: any) {
      console.error('Erreur export:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Export table spécifique
  const handleExportTable = async (table: string) => {
    try {
      setExportingTable(table);
      setErreur(null);
      await downloadTable(table);
    } catch (err: any) {
      console.error('Erreur export table:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de l\'export');
    } finally {
      setExportingTable(null);
    }
  };

  // Upload et validation du fichier
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErreur(null);
      setRestoreStep('upload');
      
      // Lire le fichier
      const data = await readBackupFile(file);
      
      // Valider
      const validationResult = await validateBackup(data);
      setValidation(validationResult);
      
      if (validationResult.valid) {
        setUploadedBackup(data as BackupData);
        setRestoreStep('preview');
      } else {
        setErreur(`Backup invalide: ${validationResult.errors?.join(', ')}`);
      }
    } catch (err: any) {
      console.error('Erreur lecture fichier:', err);
      setErreur(err.message || 'Erreur lors de la lecture du fichier');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle skip table
  const toggleSkipTable = (table: string) => {
    setSkipTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  // Lancer la restauration
  const handleRestore = async () => {
    if (!uploadedBackup) return;

    try {
      setRestoring(true);
      setRestoreStep('progress');
      setErreur(null);
      
      const result = await restoreDatabase(uploadedBackup, {
        confirmed: true,
        skipTables,
        clearExisting: true,
      });
      
      setRestoreResult(result);
      setRestoreStep('done');
      
      // Recharger les stats
      await chargerStats();
    } catch (err: any) {
      console.error('Erreur restauration:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de la restauration');
      setRestoreStep('preview');
    } finally {
      setRestoring(false);
    }
  };

  // Annuler la restauration
  const handleCancelRestore = () => {
    setUploadedBackup(null);
    setValidation(null);
    setRestoreResult(null);
    setRestoreStep('upload');
    setSkipTables([]);
    setErreur(null);
  };

  // Formater la date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('fr-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">💾 Sauvegarde & Restauration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Exportez ou restaurez les données de la base de données
          </p>
        </div>
        <button
          onClick={chargerStats}
          disabled={loadingStats}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Erreur */}
      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {erreur}
          <button 
            onClick={() => setErreur(null)}
            className="float-right text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Statistiques actuelles */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📊 État actuel de la base</h3>
        
        {loadingStats ? (
          <div className="text-center py-4 text-gray-500">Chargement...</div>
        ) : stats ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Total enregistrements</div>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.tables.length}</div>
                <div className="text-xs text-gray-500">Tables</div>
              </div>
              <div className="text-xs text-gray-400 ml-auto">
                Dernière vérification: {formatDate(stats.lastCheck)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {stats.tables.map(table => (
                <div 
                  key={table}
                  className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded text-sm"
                >
                  <span className="text-gray-600 truncate" title={table}>{table}</span>
                  <span className="font-medium text-gray-800 ml-2">{stats.counts[table]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">Erreur de chargement</div>
        )}
      </div>

      {/* Export */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📤 Export</h3>
        
        <div className="space-y-3">
          {/* Export complet */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="font-medium text-blue-800">Export complet</div>
              <div className="text-xs text-blue-600">
                Toutes les tables ({stats?.total.toLocaleString() || '...'} enregistrements)
              </div>
            </div>
            <button
              onClick={handleExportComplet}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Export en cours...
                </>
              ) : (
                <>
                  <span>📥</span>
                  Télécharger le backup
                </>
              )}
            </button>
          </div>

          {/* Export par table */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 py-2">
              ▶ Export par table individuelle
            </summary>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {stats?.tables.map(table => (
                <button
                  key={table}
                  onClick={() => handleExportTable(table)}
                  disabled={exportingTable === table}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left disabled:opacity-50 flex items-center justify-between"
                >
                  <span className="truncate">{table}</span>
                  {exportingTable === table ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span className="text-gray-400">📥</span>
                  )}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Restore */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📥 Restauration</h3>
        
        {/* Step: Upload */}
        {restoreStep === 'upload' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <strong>Attention:</strong> La restauration remplace TOUTES les données existantes.
                  Assurez-vous d'avoir un backup récent avant de procéder.
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
              >
                <span>📂</span>
                Sélectionner un fichier backup (.json)
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {restoreStep === 'preview' && validation?.preview && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">📋 Aperçu du backup</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date de création:</span>
                  <span className="ml-2 font-medium">{formatDate(validation.preview.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Version:</span>
                  <span className="ml-2 font-medium">{validation.preview.version}</span>
                </div>
                <div>
                  <span className="text-gray-500">Environnement:</span>
                  <span className="ml-2 font-medium">{validation.preview.environment}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <span className="ml-2 font-medium">{validation.preview.totalRecords.toLocaleString()} enregistrements</span>
                </div>
              </div>
            </div>

            {/* Sélection des tables à ignorer */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Tables à restaurer</h4>
              <p className="text-xs text-gray-500 mb-2">
                Décochez les tables que vous souhaitez ignorer
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {Object.entries(validation.preview.counts).map(([table, count]) => (
                  <label 
                    key={table}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                      skipTables.includes(table) ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!skipTables.includes(table)}
                      onChange={() => toggleSkipTable(table)}
                      className="rounded border-gray-300"
                    />
                    <span className="truncate flex-1">{table}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                onClick={handleCancelRestore}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ✕ Annuler
              </button>
              <button
                onClick={() => setRestoreStep('confirm')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {restoreStep === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🚨</span>
                <div>
                  <h4 className="font-bold text-red-800 mb-2">Confirmation requise</h4>
                  <p className="text-sm text-red-700 mb-2">
                    Cette action va <strong>supprimer toutes les données existantes</strong> et les remplacer
                    par les données du backup. Cette opération est <strong>irréversible</strong>.
                  </p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    <li>{stats?.tables.length || 0} tables seront vidées</li>
                    <li>{stats?.total.toLocaleString() || 0} enregistrements actuels seront supprimés</li>
                    <li>{validation?.preview?.totalRecords.toLocaleString() || 0} enregistrements seront importés</li>
                    {skipTables.length > 0 && (
                      <li>{skipTables.length} table(s) ignorée(s): {skipTables.join(', ')}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setRestoreStep('preview')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Retour
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {restoring ? 'Restauration...' : '⚠️ Confirmer la restauration'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Progress */}
        {restoreStep === 'progress' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <div className="text-lg font-medium text-gray-800">Restauration en cours...</div>
            <div className="text-sm text-gray-500 mt-2">
              Ne fermez pas cette page
            </div>
          </div>
        )}

        {/* Step: Done */}
        {restoreStep === 'done' && restoreResult && (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${
              restoreResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{restoreResult.success ? '✅' : '⚠️'}</span>
                <div>
                  <h4 className={`font-bold mb-2 ${restoreResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
                    {restoreResult.message}
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li className="text-gray-600">
                      <strong>{restoreResult.tablesRestored.length}</strong> tables restaurées
                    </li>
                    {restoreResult.errors.length > 0 && (
                      <li className="text-red-600">
                        <strong>{restoreResult.errors.length}</strong> erreur(s)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Détails par table */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 py-2">
                ▶ Détails par table
              </summary>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(restoreResult.counts).map(([table, result]) => (
                  <div 
                    key={table}
                    className={`px-2 py-1.5 rounded ${
                      result.errors > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}
                  >
                    <span className="font-medium">{table}</span>
                    <span className="ml-2">{result.imported} ✓</span>
                    {result.errors > 0 && <span className="ml-1 text-red-600">{result.errors} ✗</span>}
                  </div>
                ))}
              </div>
            </details>

            {/* Erreurs détaillées */}
            {restoreResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <h4 className="font-medium text-red-800 mb-2">Erreurs:</h4>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {restoreResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleCancelRestore}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
