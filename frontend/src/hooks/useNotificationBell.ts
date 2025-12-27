/**
 * Hook pour la gestion des notifications système (cloche)
 * 
 * Centralise la logique de:
 * - Récupération du compteur de notifications non-lues
 * - Chargement des notifications détaillées
 * - Marquage comme lue (individuel et global)
 * - Polling intelligent avec pause sur onglet caché
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { NotificationSysteme } from '../types';
import { NOTIFICATION_POLLING_INTERVAL_MS, NOTIFICATION_FETCH_LIMIT } from '../config/constants';

interface UseNotificationBellResult {
  /** Compteur de notifications non-lues */
  count: number;
  /** Liste des notifications chargées */
  notifications: NotificationSysteme[];
  /** Indicateur de chargement */
  loading: boolean;
  /** Charge les notifications détaillées */
  loadNotifications: () => Promise<void>;
  /** Marque une notification comme lue */
  markAsRead: (id: string) => Promise<void>;
  /** Marque toutes les notifications comme lues */
  markAllAsRead: () => Promise<void>;
}

export function useNotificationBell(): UseNotificationBellResult {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationSysteme[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  /**
   * Récupère le compteur de notifications non-lues
   */
  const fetchCount = useCallback(async () => {
    // Ne pas rafraîchir si l'onglet est caché
    if (document.hidden) return;

    try {
      const response = await api.get('/notifications/systeme/count');
      setCount(response.data.count);
    } catch (error) {
      console.error('[NotificationBell] Erreur chargement compteur:', error);
    }
  }, []);

  /**
   * Charge les notifications détaillées
   */
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/notifications/systeme?limit=${NOTIFICATION_FETCH_LIMIT}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('[NotificationBell] Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Marque une notification spécifique comme lue
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.post(`/notifications/systeme/${notificationId}/lue`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, lue: true } : n)
      );
      setCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[NotificationBell] Erreur marquage notification:', error);
    }
  }, []);

  /**
   * Marque toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notifications/systeme/lire-toutes');
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      setCount(0);
    } catch (error) {
      console.error('[NotificationBell] Erreur marquage toutes notifications:', error);
    }
  }, []);

  // Chargement initial et polling
  useEffect(() => {
    fetchCount();

    intervalRef.current = window.setInterval(fetchCount, NOTIFICATION_POLLING_INTERVAL_MS);

    // Rafraîchir immédiatement quand l'onglet redevient visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCount]);

  return {
    count,
    notifications,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}
