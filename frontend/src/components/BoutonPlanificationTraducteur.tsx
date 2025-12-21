import React, { useState } from 'react';
import { chargerPlanificationTraducteur, afficherPlanificationPopout } from '../utils/planificationTraducteur';
import { Button } from './ui/Button';
import { PlanificationTraducteurModal } from './traducteurs/PlanificationTraducteurModal';

interface BoutonPlanificationTraducteurProps {
  traducteurId: string | null;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Si true, ouvre un modal inline au lieu d'un popout externe */
  useModal?: boolean;
}

const BoutonPlanificationTraducteur: React.FC<BoutonPlanificationTraducteurProps> = ({ 
  traducteurId, 
  label = "📅 Voir la planification",
  className = "",
  disabled = false,
  useModal = false
}) => {
  const [loading, setLoading] = useState(false);
  const [modalOuvert, setModalOuvert] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation du clic
    
    if (!traducteurId) return;
    
    if (useModal) {
      // Ouvrir le modal inline
      setModalOuvert(true);
    } else {
      // Ouvrir le popout externe (comportement legacy)
      setLoading(true);
      try {
        const { traducteur, planification } = await chargerPlanificationTraducteur(traducteurId, 7);
        afficherPlanificationPopout(traducteur, planification);
      } catch (error: any) {
        console.error('Erreur chargement planification:', error);
        alert('Impossible de charger la planification: ' + (error.message || 'Erreur inconnue'));
      } finally {
        setLoading(false);
      }
    }
  };

  if (!traducteurId) return null;

  return (
    <>
      <Button 
        onClick={handleClick} 
        disabled={disabled || loading}
        className={className}
      >
        {loading ? '⏳ Chargement...' : label}
      </Button>
      
      {useModal && traducteurId && (
        <PlanificationTraducteurModal
          traducteurId={traducteurId}
          ouvert={modalOuvert}
          onFermer={() => setModalOuvert(false)}
        />
      )}
    </>
  );
};

export { BoutonPlanificationTraducteur };
