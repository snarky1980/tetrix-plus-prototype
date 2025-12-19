import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap } from 'lucide-react';

/**
 * Types TypeScript
 */
export interface Conflict {
  type: string;
  allocationId: string;
  traducteurId: string;
  dateConflict: string;
  heureDebut: string;
  heureFin: string;
  heuresAllouees: number;
  explication: string;
}

export interface ScoreImpact {
  total: number;
  niveau: 'FAIBLE' | 'MODERE' | 'ELEVE';
  justification: string;
  decomposition?: {
    heuresDeplacees: number;
    nombreTachesAffectees: number;
    changementTraducteur: number;
    risqueEcheance: number;
    morcellement: number;
  };
}

export interface PlageDisponible {
  date: string;
  heureDebut: string;
  heureFin: string;
  heuresDisponibles: number;
}

export interface CandidatReattribution {
  traducteurId: string;
  traducteurNom: string;
  heuresDisponiblesTotal: number;
  score: number;
}

export interface Suggestion {
  id: string;
  type: 'REPARATION_LOCALE' | 'REATTRIBUTION' | 'IMPOSSIBLE';
  conflitsResolus: string[];
  tacheId: string;
  traducteurActuel: string;
  traducteurPropose?: string;
  plagesProposees: PlageDisponible[];
  candidatsAlternatifs?: CandidatReattribution[];
  scoreImpact: ScoreImpact;
  description: string;
  creeA: string;
}

/**
 * Modal de détection de conflits
 */
export const ConflictDetectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  conflits: Conflict[];
  suggestions: Suggestion[];
  onApply: (suggestion: Suggestion) => void;
  onRefresh?: () => void;
  applying?: boolean;
}> = ({ isOpen, onClose, conflits, suggestions, onApply, onRefresh, applying = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="text-amber-600" />
                Analyse de conflits
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Détection automatique et suggestions de résolution
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
              <div className="text-sm text-amber-600 font-medium">Conflits détectés</div>
              <div className="text-3xl font-bold text-amber-900 mt-1">{conflits.length}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="text-sm text-blue-600 font-medium">Solutions proposées</div>
              <div className="text-3xl font-bold text-blue-900 mt-1">{suggestions.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
              <div className="text-sm text-green-600 font-medium">Statut</div>
              <div className="text-lg font-bold text-green-900 mt-1">
                {suggestions.length > 0 ? 'Résolvable' : 'Action requise'}
              </div>
            </div>
          </div>

          {/* Conflits */}
          {conflits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={20} />
                Conflits identifiés
              </h3>
              <div className="space-y-3">
                {conflits.map((conflit, idx) => (
                  <ConflictCard key={idx} conflict={conflit} />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Zap className="text-blue-600" size={20} />
                Solutions proposées
              </h3>
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApply={() => onApply(suggestion)}
                    isApplying={applying}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No suggestions */}
          {conflits.length > 0 && suggestions.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <AlertTriangle className="text-gray-400 mx-auto mb-3" size={32} />
              <p className="text-gray-700 font-medium">Aucune suggestion automatique disponible</p>
              <p className="text-sm text-gray-500 mt-2">
                Une intervention manuelle est requise pour résoudre ces conflits
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Zap size={16} className="inline mr-2" />
              Réanalyser
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Carte de conflit
 */
const ConflictCard: React.FC<{ conflict: Conflict }> = ({ conflict }) => {
  const getTypeIcon = () => {
    switch (conflict.type) {
      case 'SURALLOCATION':
      case 'CHEVAUCHEMENT_TACHES':
        return <Clock className="text-amber-600" size={18} />;
      default:
        return <AlertTriangle className="text-amber-600" size={18} />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-r-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          {getTypeIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-medium text-gray-900">{conflict.type}</div>
            <div className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
              {conflict.heuresAllouees}h
            </div>
          </div>
          <div className="text-sm text-amber-700">{conflict.explication}</div>
          <div className="flex items-center gap-3 mt-2 text-xs text-amber-600">
            <span>{conflict.heureDebut} - {conflict.heureFin}</span>
            <span>{new Date(conflict.dateConflict).toLocaleDateString('fr-CA')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Carte de suggestion
 */
const SuggestionCard: React.FC<{
  suggestion: Suggestion;
  onApply: () => void;
  isApplying: boolean;
}> = ({ suggestion, onApply, isApplying }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getTypeIcon = () => {
    switch (suggestion.type) {
      case 'REPARATION_LOCALE':
        return <Clock className="text-blue-600" size={20} />;
      case 'REATTRIBUTION':
        return <Users className="text-purple-600" size={20} />;
      case 'IMPOSSIBLE':
        return <XCircle className="text-red-600" size={20} />;
    }
  };

  const getImpactColor = (niveau: string) => {
    switch (niveau) {
      case 'FAIBLE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'MODERE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ELEVE':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className={`bg-white border-2 rounded-xl p-5 ${suggestion.type === 'IMPOSSIBLE' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-blue-100">
            {getTypeIcon()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{suggestion.type}</div>
            <div className="text-sm text-gray-600 mt-1">{suggestion.description}</div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getImpactColor(suggestion.scoreImpact.niveau)}`}>
          Impact {suggestion.scoreImpact.niveau} ({suggestion.scoreImpact.total}/100)
        </div>
      </div>

      {/* Plages */}
      {suggestion.plagesProposees.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-xs font-medium text-blue-900 mb-2">Plages disponibles :</div>
          <div className="space-y-1">
            {suggestion.plagesProposees.slice(0, 3).map((plage, idx) => (
              <div key={idx} className="text-xs text-blue-700">
                {new Date(plage.date).toLocaleDateString('fr-CA')} : {plage.heureDebut} - {plage.heureFin} ({plage.heuresDisponibles}h)
              </div>
            ))}
            {suggestion.plagesProposees.length > 3 && (
              <div className="text-xs text-blue-600 italic">
                +{suggestion.plagesProposees.length - 3} autres plages...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {suggestion.type !== 'IMPOSSIBLE' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onApply}
            disabled={isApplying}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            {isApplying ? 'Application...' : (
              <>
                <CheckCircle size={16} className="inline mr-1" />
                Appliquer
              </>
            )}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            {showDetails ? 'Masquer' : 'Détails'}
          </button>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <div className="text-xs text-gray-600">{suggestion.scoreImpact.justification}</div>
        </div>
      )}
    </div>
  );
};

/**
 * Badge de notification de conflits
 */
export const ConflictBadge: React.FC<{
  onClick: () => void;
  conflictCount: number;
  loading?: boolean;
  className?: string;
}> = ({ onClick, conflictCount, loading = false, className = '' }) => {
  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full ${className}`}>
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
        <span className="text-xs text-gray-600">Analyse...</span>
      </div>
    );
  }

  if (conflictCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border-2 border-amber-300 hover:from-amber-200 hover:to-orange-200 transition-all ${className}`}
      title={`${conflictCount} conflit${conflictCount > 1 ? 's' : ''} détecté${conflictCount > 1 ? 's' : ''}`}
    >
      <AlertTriangle size={14} />
      <span>{conflictCount} conflit{conflictCount > 1 ? 's' : ''}</span>
    </button>
  );
};
