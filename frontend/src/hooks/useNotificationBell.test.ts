/**
 * Tests unitaires pour useNotificationBell hook
 * 
 * Note: Les tests asynchrones avec hooks React et fake timers peuvent être complexes.
 * Ces tests se concentrent sur le comportement des fonctions du hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationBell } from './useNotificationBell';
import api from '../services/api';

// Mock du module api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock des constantes
vi.mock('../config/constants', () => ({
  NOTIFICATION_POLLING_INTERVAL_MS: 60000,
  NOTIFICATION_FETCH_LIMIT: 20,
}));

describe('useNotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset document.hidden
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    
    // Default mock pour count et notifications
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.includes('/count')) {
        return Promise.resolve({ data: { count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as Mock).mockResolvedValue({});
  });
  
  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('état initial', () => {
    it('initialise avec count à 0', () => {
      const { result } = renderHook(() => useNotificationBell());
      
      expect(result.current.count).toBe(0);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('retourne les fonctions attendues', () => {
      const { result } = renderHook(() => useNotificationBell());
      
      expect(typeof result.current.loadNotifications).toBe('function');
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
    });
  });

  describe('loadNotifications', () => {
    it('appelle l\'API avec la bonne limite', async () => {
      const mockNotifications = [
        { id: '1', titre: 'Test 1', type: 'TACHE_EN_COURS', lue: false },
        { id: '2', titre: 'Test 2', type: 'TACHE_TERMINEE', lue: true },
      ];
      
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 0 } });
        }
        return Promise.resolve({ data: mockNotifications });
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      await act(async () => {
        await result.current.loadNotifications();
      });
      
      expect(api.get).toHaveBeenCalledWith('/notifications/systeme?limit=20');
      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.loading).toBe(false);
    });

    it('gère les erreurs sans planter', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 0 } });
        }
        return Promise.reject(new Error('Network error'));
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      await act(async () => {
        await result.current.loadNotifications();
      });
      
      // Le hook ne plante pas et loading revient à false
      expect(result.current.loading).toBe(false);
      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('appelle l\'API avec le bon ID', async () => {
      const { result } = renderHook(() => useNotificationBell());
      
      // Attendre le montage initial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      await act(async () => {
        await result.current.markAsRead('notification-123');
      });
      
      expect(api.post).toHaveBeenCalledWith('/notifications/systeme/notification-123/lue');
    });

    it('met à jour la notification dans la liste', async () => {
      const mockNotifications = [
        { id: '1', titre: 'Test 1', lue: false },
        { id: '2', titre: 'Test 2', lue: false },
      ];
      
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 2 } });
        }
        return Promise.resolve({ data: mockNotifications });
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      // Charger les notifications
      await act(async () => {
        await result.current.loadNotifications();
      });
      
      // Marquer la première comme lue
      await act(async () => {
        await result.current.markAsRead('1');
      });
      
      expect(result.current.notifications[0].lue).toBe(true);
      expect(result.current.notifications[1].lue).toBe(false);
    });

    it('décrémente le compteur', async () => {
      // Simuler un compteur initial de 5
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 5 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      // Attendre le fetchCount initial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(result.current.count).toBe(5);
      
      // Marquer comme lu
      await act(async () => {
        await result.current.markAsRead('1');
      });
      
      expect(result.current.count).toBe(4);
    });

    it('ne descend pas en dessous de 0', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      await act(async () => {
        await result.current.markAsRead('1');
      });
      
      expect(result.current.count).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('appelle l\'API correctement', async () => {
      const { result } = renderHook(() => useNotificationBell());
      
      // Attendre le montage initial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      await act(async () => {
        await result.current.markAllAsRead();
      });
      
      expect(api.post).toHaveBeenCalledWith('/notifications/systeme/lire-toutes');
    });

    it('marque toutes les notifications comme lues', async () => {
      const mockNotifications = [
        { id: '1', titre: 'Test 1', lue: false },
        { id: '2', titre: 'Test 2', lue: false },
        { id: '3', titre: 'Test 3', lue: true },
      ];
      
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 2 } });
        }
        return Promise.resolve({ data: mockNotifications });
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      await act(async () => {
        await result.current.loadNotifications();
      });
      
      await act(async () => {
        await result.current.markAllAsRead();
      });
      
      expect(result.current.notifications.every(n => n.lue)).toBe(true);
    });

    it('remet le compteur à 0', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 10 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      const { result } = renderHook(() => useNotificationBell());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(result.current.count).toBe(10);
      
      await act(async () => {
        await result.current.markAllAsRead();
      });
      
      expect(result.current.count).toBe(0);
    });
  });

  describe('fetchCount comportement', () => {
    it('ne fait pas d\'appel si document est caché', async () => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      
      renderHook(() => useNotificationBell());
      
      // L'appel initial ne devrait pas se faire car document.hidden est true
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      // Le premier appel est pour le count au montage, mais il retourne immédiatement si hidden
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('gestion des erreurs', () => {
    it('markAsRead gère les erreurs sans planter', async () => {
      // Le count initial fonctionne, mais le post échoue
      (api.post as Mock).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useNotificationBell());
      
      // Attendre le montage initial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      // Ne devrait pas throw
      await act(async () => {
        await result.current.markAsRead('1');
      });
      
      // Le hook fonctionne toujours
      expect(result.current.count).toBe(0);
    });

    it('markAllAsRead gère les erreurs sans planter', async () => {
      (api.post as Mock).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useNotificationBell());
      
      // Attendre le montage initial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      // Ne devrait pas throw
      await act(async () => {
        await result.current.markAllAsRead();
      });
      
      // Le hook fonctionne toujours
      expect(result.current.notifications).toEqual([]);
    });
  });
});
