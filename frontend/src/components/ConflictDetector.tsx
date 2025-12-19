import React, { useState } from 'react';
import { ConflictBadge, ConflictDetectionModal } from './ConflictDetection';
import { useConflictDetection } from '../hooks/useConflictDetection';
import { useToast } from '../contexts/ToastContext';

interface ConflictDetectorProps {
  allocationId: string;
  onResolve?: () => void;
  className?: string;
}

/**
 * Composant intégré: Badge + Modal de détection de conflits
 * Utilisation simple: <ConflictDetector allocationId="..." />
 */
export const ConflictDetector: React.FC<ConflictDetectorProps> = ({ 
  allocationId, 
  onResolve,
  className = '' 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { analysis, isAnalyzing, analyzeAllocation, clearAnalysis } = useConflictDetection();
  const { addToast } = useToast();

  const handleBadgeClick = async () => {
    if (!analysis) {
      try {
        await analyzeAllocation(allocationId);
        setModalOpen(true);
      } catch (err: any) {
        addToast(err.message || 'Erreur lors de l\'analyse', 'error');
      }
    } else {
      setModalOpen(true);
    }
  };

  const handleRefresh = async () => {
    try {
      await analyzeAllocation(allocationId);
      addToast('Analyse mise à jour', 'success');
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de la réanalyse', 'error');
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    clearAnalysis();
  };

  const handleResolve = () => {
    if (onResolve) onResolve();
    handleClose();
  };

  return (
    <>
      <ConflictBadge 
        onClick={handleBadgeClick} 
        conflictCount={analysis?.conflictCount ?? 0}
        loading={isAnalyzing}
        className={className}
      />

      {analysis && (
        <ConflictDetectionModal
          isOpen={modalOpen}
          onClose={handleClose}
          conflits={analysis.conflits}
          suggestions={analysis.suggestions}
          onApply={handleResolve}
          onRefresh={handleRefresh}
          applying={false}
        />
      )}
    </>
  );
};
