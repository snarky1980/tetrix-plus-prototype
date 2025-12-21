import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/Spinner';
import { tacheService, HistoriqueTacheResponse, HistoriqueTacheEntry } from '../../services/tacheService';

interface HistoriqueTacheModalProps {
  tacheId: string;
  numeroProjet: string;
  ouvert: boolean;
  onFermer: () => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('fr-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    'CREATION': 'Création',
    'MODIFICATION': 'Modification',
    'REASSIGNATION': 'Réassignation',
    'STATUT_CHANGE': 'Changement de statut',
    'REPARTITION_CHANGE': 'Changement de répartition',
    'SUPPRESSION': 'Suppression',
  };
  return labels[action] || action;
};

const getActionIcon = (action: string): string => {
  const icons: Record<string, string> = {
    'CREATION': '✨',
    'MODIFICATION': '✏️',
    'REASSIGNATION': '🔄',
    'STATUT_CHANGE': '📊',
    'REPARTITION_CHANGE': '📅',
    'SUPPRESSION': '🗑️',
  };
  return icons[action] || '📝';
};

const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    'CREATION': 'bg-green-100 text-green-800 border-green-200',
    'MODIFICATION': 'bg-blue-100 text-blue-800 border-blue-200',
    'REASSIGNATION': 'bg-purple-100 text-purple-800 border-purple-200',
    'STATUT_CHANGE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'REPARTITION_CHANGE': 'bg-orange-100 text-orange-800 border-orange-200',
    'SUPPRESSION': 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const HistoriqueTacheModal: React.FC<HistoriqueTacheModalProps> = ({
  tacheId,
  numeroProjet,
  ouvert,
  onFermer,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriqueTacheResponse | null>(null);

  useEffect(() => {
    if (ouvert && tacheId) {
      chargerHistorique();
    }
  }, [ouvert, tacheId]);

  const chargerHistorique = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tacheService.obtenirHistorique(tacheId);
      setHistorique(data);
    } catch (err: any) {
      console.error('Erreur chargement historique:', err);
      setError(err.response?.data?.erreur || 'Impossible de charger l\'historique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      titre={`📜 Historique - ${numeroProjet}`}
      ouvert={ouvert}
      onFermer={onFermer}
      wide
      ariaDescription={`Historique des modifications pour la tâche ${numeroProjet}`}
    >
      <div className="space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && historique && (
          <>
            {/* Info création */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <span>✨</span>
                <span>Créée par</span>
                <span className="font-bold">{historique.creation.par}</span>
              </div>
              <div className="text-sm text-green-600 mt-1">
                {formatDate(historique.creation.le)}
              </div>
            </div>

            {/* Info dernière modification */}
            {historique.derniereModification && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <span>✏️</span>
                  <span>Dernière modification par</span>
                  <span className="font-bold">{historique.derniereModification.par}</span>
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {formatDate(historique.derniereModification.le)}
                </div>
              </div>
            )}

            {/* Liste des modifications */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📋</span>
                Journal des modifications ({historique.historique.length})
              </h3>
              
              {historique.historique.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl">📭</span>
                  <p className="mt-2">Aucune modification enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {historique.historique.map((entry) => (
                    <HistoriqueEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const HistoriqueEntry: React.FC<{ entry: HistoriqueTacheEntry }> = ({ entry }) => {
  return (
    <div className={`border rounded-lg p-3 ${getActionColor(entry.action)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{getActionIcon(entry.action)}</span>
          <span className="font-medium">{getActionLabel(entry.action)}</span>
          {entry.champModifie && (
            <span className="text-sm opacity-75">• {entry.champModifie}</span>
          )}
        </div>
        <div className="text-xs opacity-75">
          {formatDate(entry.creeLe)}
        </div>
      </div>
      
      <div className="text-sm mt-1 opacity-90">
        par <span className="font-medium">{entry.utilisateur}</span>
      </div>
      
      {(entry.ancienneValeur || entry.nouvelleValeur) && (
        <div className="mt-2 text-sm bg-white/50 rounded p-2">
          {entry.ancienneValeur && (
            <div className="flex items-center gap-1">
              <span className="text-red-600">−</span>
              <span className="line-through opacity-60">{entry.ancienneValeur}</span>
            </div>
          )}
          {entry.nouvelleValeur && (
            <div className="flex items-center gap-1">
              <span className="text-green-600">+</span>
              <span>{entry.nouvelleValeur}</span>
            </div>
          )}
        </div>
      )}
      
      {entry.details && (
        <div className="mt-2 text-xs bg-white/30 rounded p-2 font-mono">
          {entry.details}
        </div>
      )}
    </div>
  );
};

export default HistoriqueTacheModal;
