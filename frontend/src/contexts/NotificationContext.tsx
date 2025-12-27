/**
 * Contexte de notifications pour les compteurs globaux
 * 
 * Gère les compteurs de:
 * - Traducteurs cherchant du travail (visible par conseillers/gestionnaires)
 * - Demandes de ressources actives (visible par traducteurs)
 * 
 * À distinguer de useNotificationBell qui gère les notifications système (cloche).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, CompteursNotifications } from '../services/notificationService';
import { useAuth } from './AuthContext';
import { COMPTEURS_POLLING_INTERVAL_MS } from '../config/constants';

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
    // Ne pas rafraîchir si l'onglet est caché
    if (document.hidden) return;
    
    try {
      setChargement(true);
      const data = await notificationService.obtenirCompteurs();
      setCompteurs(data);
    } catch (error) {
      console.error('[NotificationContext] Erreur rafraîchissement compteurs:', error);
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

  // Rafraîchir périodiquement si authentifié
  useEffect(() => {
    if (!estAuthentifie) return;

    intervalRef.current = setInterval(rafraichirCompteurs, COMPTEURS_POLLING_INTERVAL_MS);

    // Rafraîchir immédiatement quand l'onglet redevient visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        rafraichirCompteurs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [estAuthentifie, rafraichirCompteurs]);

  return (
    <NotificationContext.Provider value={{ compteurs, rafraichirCompteurs, chargement }}>
      {children}
    </NotificationContext.Provider>
  );
};
