import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  intervalMs?: number; // Intervalle en millisecondes (défaut: 2 minutes)
  onRefresh: () => void | Promise<void>;
  pauseWhenHidden?: boolean; // Pause quand l'onglet n'est pas visible
}

/**
 * Hook pour rafraîchir automatiquement les données à intervalle régulier
 * 
 * @example
 * ```tsx
 * const { lastRefresh, isRefreshing, manualRefresh, toggleEnabled } = useAutoRefresh({
 *   enabled: true,
 *   intervalMs: 120000, // 2 minutes
 *   onRefresh: refresh,
 *   pauseWhenHidden: true
 * });
 * ```
 */
export function useAutoRefresh({
  enabled = true,
  intervalMs = 120000, // 2 minutes par défaut
  onRefresh,
  pauseWhenHidden = true,
}: UseAutoRefreshOptions) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const intervalRef = useRef<number | null>(null);

  // Détecte quand l'onglet devient visible/caché
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fonction de rafraîchissement
  const doRefresh = useCallback(async () => {
    if (pauseWhenHidden && !isPageVisible) {
      console.log('[AutoRefresh] Onglet caché, rafraîchissement reporté');
      return;
    }

    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('[AutoRefresh] Erreur lors du rafraîchissement:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, pauseWhenHidden, isPageVisible]);

  // Rafraîchissement manuel
  const manualRefresh = useCallback(async () => {
    await doRefresh();
  }, [doRefresh]);

  // Toggle enable/disable
  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Configure l'intervalle de rafraîchissement automatique
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Lance le premier rafraîchissement immédiatement
    doRefresh();

    // Configure l'intervalle
    intervalRef.current = window.setInterval(() => {
      doRefresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, intervalMs, doRefresh]);

  return {
    lastRefresh,
    isRefreshing,
    isEnabled,
    manualRefresh,
    toggleEnabled,
    setEnabled: setIsEnabled,
  };
}

/**
 * Formatte le temps écoulé depuis une date
 * @example "Il y a 2 minutes", "Il y a 30 secondes"
 */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return `Il y a ${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Il y a ${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}
