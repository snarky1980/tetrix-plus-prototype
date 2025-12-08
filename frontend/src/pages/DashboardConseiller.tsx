import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard Conseiller - Redirige vers la planification globale
 */
const DashboardConseiller: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirection immédiate vers la planification globale
    navigate('/conseiller/planification-globale', { replace: true });
  }, [navigate]);

  return null;
};

export default DashboardConseiller;
