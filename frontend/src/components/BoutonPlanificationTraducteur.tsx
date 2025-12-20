import React, { useState } from 'react';
import { chargerPlanificationTraducteur, afficherPlanificationPopout } from '../utils/planificationTraducteur';
import { Button } from './ui/Button';

interface BoutonPlanificationTraducteurProps {
  traducteurId: string | null;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const BoutonPlanificationTraducteur: React.FC<BoutonPlanificationTraducteurProps> = ({ 
  traducteurId, 
  label = "📅 Voir la planification",
  className = "",
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!traducteurId) return;
    
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
  };

  if (!traducteurId) return null;

  return (
    <Button 
      onClick={handleClick} 
      disabled={disabled || loading}
      className={className}
    >
      {loading ? '⏳ Chargement...' : label}
    </Button>
  );
};

export default BoutonPlanificationTraducteur;
