/**
 * Composant d'import batch pour traducteurs et tâches
 * Permet le copier-coller depuis Excel ou l'upload CSV
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  previewTraducteurs,
  importTraducteurs,
  previewTaches,
  importTaches,
  TraducteurPreview,
  TachePreview,
  COLONNES_TRADUCTEURS,
  COLONNES_TACHES
} from '../../services/importBatchService';

type ImportType = 'traducteurs' | 'taches';

interface ImportBatchModalProps {
  type: ImportType;
  ouvert: boolean;
  onFermer: () => void;
  onSuccess?: () => void;
}

export const ImportBatchModal: React.FC<ImportBatchModalProps> = ({
  type,
  ouvert,
  onFermer,
  onSuccess
}) => {
  const { addToast } = useToast();
  const { utilisateur } = useAuth();
  
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [rawData, setRawData] = useState('');
  const [delimiter, setDelimiter] = useState<'tab' | 'comma' | 'semicolon'>('tab');
  const [loading, setLoading] = useState(false);
  
  // Preview data
  const [previewData, setPreviewData] = useState<{
    total: number;
    valid: number;
    invalid: number;
    items: (TraducteurPreview | TachePreview)[];
  } | null>(null);
  
  // Result
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);

  const colonnes = type === 'traducteurs' ? COLONNES_TRADUCTEURS : COLONNES_TACHES;
  const titre = type === 'traducteurs' ? 'Import de traducteurs' : 'Import de tâches';

  const getDelimiterChar = () => {
    switch (delimiter) {
      case 'comma': return ',';
      case 'semicolon': return ';';
      default: return '\t';
    }
  };

  const handlePreview = async () => {
    if (!rawData.trim()) {
      addToast('Veuillez coller des données', 'error');
      return;
    }

    setLoading(true);
    try {
      if (type === 'traducteurs') {
        const result = await previewTraducteurs(rawData, getDelimiterChar());
        setPreviewData({
          total: result.total,
          valid: result.valid,
          invalid: result.invalid,
          items: result.traducteurs || []
        });
      } else {
        const result = await previewTaches(rawData, getDelimiterChar());
        setPreviewData({
          total: result.total,
          valid: result.valid,
          invalid: result.invalid,
          items: result.taches || []
        });
      }
      setStep('preview');
    } catch (error: any) {
      addToast(error.response?.data?.erreur || 'Erreur lors de la prévisualisation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.valid === 0) {
      addToast('Aucune donnée valide à importer', 'error');
      return;
    }

    setLoading(true);
    try {
      let importResult;
      if (type === 'traducteurs') {
        importResult = await importTraducteurs(previewData.items as TraducteurPreview[]);
      } else {
        importResult = await importTaches(
          previewData.items as TachePreview[],
          utilisateur?.id || ''
        );
      }
      
      setResult({
        created: importResult.created,
        errors: importResult.errors
      });
      setStep('result');
      
      if (importResult.created > 0) {
        addToast(importResult.message, 'success');
        onSuccess?.();
      }
    } catch (error: any) {
      addToast(error.response?.data?.erreur || 'Erreur lors de l\'import', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setRawData('');
    setPreviewData(null);
    setResult(null);
    onFermer();
  };

  const handlePaste = useCallback((_e: React.ClipboardEvent) => {
    // Les données sont automatiquement collées dans le textarea
  }, []);

  const generateExampleData = () => {
    if (type === 'traducteurs') {
      return `nom\temail\tdivision\tcatégorie\tcapacité\thoraire\tdomaines
Exemple, Jean\tjean.exemple@tetrix.com\tCISR\tTR-02\t7\t9h-17h\tIMM,TAG
Test, Marie\tmarie.test@tetrix.com\tDroit 1\tTR-03\t7.5\t8h30-16h30\tDroit`;
    } else {
      return `numéro\ttitre\tclient\ttraducteur\theures\tdébut\téchéance\tmode
PROJ-001\tTraduction document\tCISR\t\t10\t2026-01-06\t2026-01-15\tJAT
PROJ-002\tRévision rapport\tJustice\t\t5\t2026-01-07\t2026-01-10\tPEPS`;
    }
  };

  return (
    <Modal
      titre={titre}
      ouvert={ouvert}
      onFermer={handleClose}
      extraWide
    >
      <div className="space-y-4">
        {/* Étape 1: Saisie des données */}
        {step === 'input' && (
          <>
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">📋 Comment importer</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Copiez vos données depuis Excel, Google Sheets ou un fichier texte</li>
                <li>Collez-les dans la zone ci-dessous</li>
                <li>La première ligne doit contenir les en-têtes de colonnes</li>
                <li>Cliquez sur "Prévisualiser" pour valider</li>
              </ol>
            </div>

            {/* Colonnes attendues */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-medium mb-2">Colonnes reconnues</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {colonnes.map(col => (
                  <div key={col.nom} className="flex items-start gap-2">
                    <span className={`font-mono px-1 rounded ${col.obligatoire ? 'bg-red-100 text-red-700' : 'bg-gray-200'}`}>
                      {col.nom}
                    </span>
                    <span className="text-gray-600">{col.description}</span>
                    {col.obligatoire && <span className="text-red-500 text-xs">*</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Sélection du délimiteur */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Séparateur:</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="tab"
                  checked={delimiter === 'tab'}
                  onChange={() => setDelimiter('tab')}
                />
                <span className="text-sm">Tab (Excel)</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="comma"
                  checked={delimiter === 'comma'}
                  onChange={() => setDelimiter('comma')}
                />
                <span className="text-sm">Virgule (CSV)</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="semicolon"
                  checked={delimiter === 'semicolon'}
                  onChange={() => setDelimiter('semicolon')}
                />
                <span className="text-sm">Point-virgule</span>
              </label>
            </div>

            {/* Zone de saisie */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">Données à importer</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRawData(generateExampleData())}
                >
                  Charger exemple
                </Button>
              </div>
              <textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                onPaste={handlePaste}
                placeholder="Collez vos données ici (Ctrl+V)..."
                className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                spellCheck={false}
              />
              <p className="text-xs text-gray-500 mt-1">
                {rawData.split('\n').filter(l => l.trim()).length} ligne(s) détectée(s)
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handlePreview} disabled={loading || !rawData.trim()}>
                {loading ? 'Analyse...' : 'Prévisualiser'}
              </Button>
            </div>
          </>
        )}

        {/* Étape 2: Prévisualisation */}
        {step === 'preview' && previewData && (
          <>
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{previewData.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{previewData.valid}</div>
                <div className="text-sm text-gray-600">Valides</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{previewData.invalid}</div>
                <div className="text-sm text-gray-600">Erreurs</div>
              </div>
            </div>

            {/* Tableau de prévisualisation */}
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">✓</th>
                    {type === 'traducteurs' ? (
                      <>
                        <th className="px-3 py-2 text-left">Nom</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Division</th>
                        <th className="px-3 py-2 text-left">Catégorie</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left">N° Projet</th>
                        <th className="px-3 py-2 text-left">Titre</th>
                        <th className="px-3 py-2 text-left">Heures</th>
                        <th className="px-3 py-2 text-left">Échéance</th>
                        <th className="px-3 py-2 text-left">Traducteur</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.valid ? 'bg-white' : 'bg-red-50'}
                    >
                      <td className="px-3 py-2">
                        {item.valid ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-red-500">✗</span>
                        )}
                      </td>
                      {type === 'traducteurs' ? (
                        <>
                          <td className="px-3 py-2 font-medium">{(item as TraducteurPreview).nom}</td>
                          <td className="px-3 py-2 text-gray-600">{(item as TraducteurPreview).email}</td>
                          <td className="px-3 py-2">{(item as TraducteurPreview).division || '-'}</td>
                          <td className="px-3 py-2">{(item as TraducteurPreview).categorie || 'TR-03'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 font-medium">{(item as TachePreview).numeroProjet}</td>
                          <td className="px-3 py-2">{(item as TachePreview).titre || '-'}</td>
                          <td className="px-3 py-2">{(item as TachePreview).heuresTotal}h</td>
                          <td className="px-3 py-2">{(item as TachePreview).dateEcheance}</td>
                          <td className="px-3 py-2">{(item as TachePreview).traducteurNom || '-'}</td>
                        </>
                      )}
                      <td className="px-3 py-2">
                        {item.valid ? (
                          <span className="text-green-600 text-xs">Prêt</span>
                        ) : (
                          <span className="text-red-600 text-xs" title={item.errors.join(', ')}>
                            {item.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('input')}>
                ← Modifier
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || previewData.valid === 0}
                >
                  {loading ? 'Import...' : `Importer ${previewData.valid} ${type}`}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Étape 3: Résultat */}
        {step === 'result' && result && (
          <>
            <div className="text-center py-8">
              {result.created > 0 ? (
                <>
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-green-600 mb-2">
                    Import réussi !
                  </h3>
                  <p className="text-gray-600">
                    {result.created} {type === 'traducteurs' ? 'traducteur(s) créé(s)' : 'tâche(s) créée(s)'}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold text-orange-600 mb-2">
                    Import incomplet
                  </h3>
                </>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">
                  Erreurs ({result.errors.length})
                </h4>
                <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center pt-4 border-t">
              <Button onClick={handleClose}>
                Fermer
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ImportBatchModal;
