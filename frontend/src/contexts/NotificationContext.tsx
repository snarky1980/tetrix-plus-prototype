import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, CompteursNotifications } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  compteurs: CompteursNotifications;
  rafraichirCompteurs: () => Promise<void>;
  chargement: boolean;
}

const defaultCompteurs: CompteursNotifications = {
  traducteursCherchentTravail: 0,
  demandesRessourcesActives: 0,
};

const NotificationContext = createContext<NotificationContextType>({
  compteurs: defaultCompteurs,
  rafraichirCompteurs: async () => {},
  chargement: false,
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { estAuthentifie } = useAuth();
  const [compteurs, setCompteurs] = useState<CompteursNotifications>(defaultCompteurs);
  const [chargement, setChargement] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rafraichirCompteurs = useCallback(async () => {
    if (!estAuthentifie) return;
    
    try {
      setChargement(true);
      const data = await notificationService.obtenirCompteurs();
      setCompteurs(data);
    } catch (error) {
      console.error('Erreur rafraîchissement compteurs:', error);
    } finally {
      setChargement(false);
    }
  }, [estAuthentifie]);

  // Charger les compteurs au montage et quand l'auth change
  useEffect(() => {
    if (estAuthentifie) {
      rafraichirCompteurs();
    } else {
      setCompteurs(defaultCompteurs);
    }
  }, [estAuthentifie, rafraichirCompteurs]);

  // Rafraîchir toutes les 30 secondes si authentifié
  useEffect(() => {
    if (estAuthentifie) {
      intervalRef.current = setInterval(rafraichirCompteurs, 30000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [estAuthentifie, rafraichirCompteurs]);

  return (
    <NotificationContext.Provider value={{ compteurs, rafraichirCompteurs, chargement }}>
      {children}
    </NotificationContext.Provider>
  );
};
