import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { BoutonPlanificationTraducteur } from '../BoutonPlanificationTraducteur';
import { formatDateEcheanceDisplay } from '../../utils/dateTimeOttawa';
import type { Tache } from '../../types';

interface TacheCardProps {
  tache: Tache;
  /** Callback pour voir les détails (optionnel, sinon navigue vers /planification-globale?tache=id) */
  onViewDetails?: () => void;
  /** Callback pour éditer */
  onEdit?: () => void;
  /** Afficher le bouton planning traducteur */
  showPlanningButton?: boolean;
  /** Mode compact (moins d'infos) */
  compact?: boolean;
  /** Classe CSS supplémentaire */
  className?: string;
}

/**
 * Composant carte de tâche uniformisé
 * Utilisé dans DashboardConseiller et PlanificationGlobale
 */
export const TacheCard: React.FC<TacheCardProps> = ({
  tache,
  onViewDetails,
  onEdit,
  showPlanningButton = true,
  compact = false,
  className = '',
}) => {
  const navigate = useNavigate();
  
  const getStatutStyle = (statut: string) => {
    switch (statut) {
      case 'TERMINEE': return 'bg-green-100 text-green-700';
      case 'EN_COURS': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };
  
  // Navigation vers la tâche
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails();
    } else {
      // Naviguer vers PlanificationGlobale avec le paramètre tâche
      navigate(`/planification-globale?tache=${tache.id}`);
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'PLANIFIEE': return 'Planifiée';
      case 'EN_COURS': return 'En cours';
      case 'TERMINEE': return 'Terminée';
      default: return statut;
    }
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer ${className}`}
      onClick={handleViewDetails}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* En-tête avec numéro projet et badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-semibold text-primary">
              {tache.numeroProjet}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatutStyle(tache.statut)}`}>
              {getStatutLabel(tache.statut)}
            </span>
            {tache.priorite === 'URGENT' && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                🔥 URGENT
              </span>
            )}
            <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded">
              {tache.typeTache || 'TRADUCTION'}
            </span>
          </div>

          {/* Description (si présente) */}
          {tache.description && !compact && (
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
              {tache.description}
            </p>
          )}

          {/* Informations principales */}
          <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
            {/* Traducteur */}
            <span className="flex items-center gap-1">
              👤 {tache.traducteur?.nom || 'Non assigné'}
            </span>
            
            {/* Bouton planning traducteur */}
            {showPlanningButton && tache.traducteurId && (
              <BoutonPlanificationTraducteur 
                traducteurId={tache.traducteurId}
                label="📅"
                className="text-xs px-1.5 py-0.5 hover:bg-blue-50 rounded"
                useModal={true}
              />
            )}

            {/* Paire linguistique */}
            {tache.paireLinguistique && (
              <span className="flex items-center gap-1">
                🌐 {tache.paireLinguistique.langueSource} → {tache.paireLinguistique.langueCible}
              </span>
            )}

            {/* Client */}
            {tache.client && !compact && (
              <span className="flex items-center gap-1">
                📋 {tache.client.nom}
              </span>
            )}
          </div>

          {/* Métriques (heures, mots, échéance) */}
          <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
            {/* Heures */}
            <span className="flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
              ⏱️ {tache.heuresTotal}h
            </span>

            {/* Mots */}
            {tache.compteMots && tache.compteMots > 0 && (
              <span className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                📝 {tache.compteMots.toLocaleString()} mots
              </span>
            )}

            {/* Échéance */}
            {tache.dateEcheance && (
              <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded ${
                tache.priorite === 'URGENT' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
              }`}>
                📅 {formatDateEcheanceDisplay(tache.dateEcheance, (tache as any).heureEcheance)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs px-2 py-1"
              aria-label="Modifier la tâche"
            >
              ✏️
            </Button>
          )}
          {!onEdit && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails();
              }}
              className="text-xs px-2 py-1"
            >
              Voir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TacheCard;
