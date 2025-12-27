/**
 * Tests unitaires pour useDashboardConseiller hook
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardConseiller } from './useDashboardConseiller';
import { tacheService } from '../services/tacheService';

// Mock du service
vi.mock('../services/tacheService', () => ({
  tacheService: {
    obtenirTaches: vi.fn(),
  },
}));

describe('useDashboardConseiller', () => {
  const mockTaches = [
    {
      id: '1',
      numeroProjet: 'PRJ-001',
      description: 'Traduction document A',
      statut: 'PLANIFIEE',
      heuresTotal: 5,
      creeLe: '2025-12-27T10:00:00Z',
      traducteur: { nom: 'Dupont' },
      client: { nom: 'Client ABC' },
    },
    {
      id: '2',
      numeroProjet: 'PRJ-002',
      description: 'Révision rapport',
      statut: 'EN_COURS',
      heuresTotal: 3,
      creeLe: '2025-12-26T09:00:00Z',
      traducteur: { nom: 'Martin' },
      client: { nom: 'Client XYZ' },
    },
    {
      id: '3',
      numeroProjet: 'PRJ-003',
      description: 'Correction finale',
      statut: 'TERMINEE',
      heuresTotal: 2,
      creeLe: '2025-12-25T08:00:00Z',
      traducteur: { nom: 'Dupont' },
      client: { nom: 'Client ABC' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (tacheService.obtenirTaches as Mock).mockResolvedValue(mockTaches);
  });

  describe('chargement initial', () => {
    it('charge les tâches au montage', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      // Loading initial
      expect(result.current.loading).toBe(true);
      
      // Attendre le chargement
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(tacheService.obtenirTaches).toHaveBeenCalledWith({});
      expect(result.current.loading).toBe(false);
      expect(result.current.taches).toHaveLength(3);
    });

    it('trie les tâches par date de création (plus récent d\'abord)', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // La tâche la plus récente (PRJ-001) devrait être en premier
      expect(result.current.taches[0].numeroProjet).toBe('PRJ-001');
      expect(result.current.taches[2].numeroProjet).toBe('PRJ-003');
    });

    it('gère les erreurs sans planter', async () => {
      (tacheService.obtenirTaches as Mock).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(result.current.loading).toBe(false);
      expect(result.current.taches).toEqual([]);
    });
  });

  describe('statistiques', () => {
    it('calcule les stats correctement', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(result.current.stats).toEqual({
        total: 3,
        planifiees: 1,
        enCours: 1,
        terminees: 1,
        heuresTotal: 10, // 5 + 3 + 2
      });
    });

    it('retourne 0 si aucune tâche', async () => {
      (tacheService.obtenirTaches as Mock).mockResolvedValue([]);
      
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(result.current.stats).toEqual({
        total: 0,
        planifiees: 0,
        enCours: 0,
        terminees: 0,
        heuresTotal: 0,
      });
    });
  });

  describe('filtrage par statut', () => {
    it('filtre par statut PLANIFIEE', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setFiltreStatut('PLANIFIEE');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(1);
      expect(result.current.tachesFiltered[0].statut).toBe('PLANIFIEE');
    });

    it('filtre par statut EN_COURS', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setFiltreStatut('EN_COURS');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(1);
      expect(result.current.tachesFiltered[0].statut).toBe('EN_COURS');
    });
  });

  describe('recherche', () => {
    it('recherche par numéro de projet', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setRecherche('PRJ-001');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(1);
      expect(result.current.tachesFiltered[0].numeroProjet).toBe('PRJ-001');
    });

    it('recherche par nom de traducteur', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setRecherche('Dupont');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(2);
    });

    it('recherche par nom de client', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setRecherche('XYZ');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(1);
      expect(result.current.tachesFiltered[0].client?.nom).toBe('Client XYZ');
    });

    it('recherche insensible à la casse', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setRecherche('dupont');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(2);
    });
  });

  describe('filtres combinés', () => {
    it('combine statut et recherche', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      act(() => {
        result.current.setFiltreStatut('PLANIFIEE');
        result.current.setRecherche('Dupont');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      expect(result.current.tachesFiltered).toHaveLength(1);
      expect(result.current.tachesFiltered[0].numeroProjet).toBe('PRJ-001');
    });
  });

  describe('réinitialisation', () => {
    it('réinitialise les filtres et affiche toutes les tâches', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // Appliquer des filtres
      act(() => {
        result.current.setFiltreStatut('PLANIFIEE');
        result.current.setRecherche('test');
      });
      
      act(() => {
        result.current.appliquerFiltres();
      });
      
      // Réinitialiser
      act(() => {
        result.current.reinitialiserFiltres();
      });
      
      expect(result.current.filtreStatut).toBe('');
      expect(result.current.recherche).toBe('');
      expect(result.current.tachesFiltered).toHaveLength(3);
    });
  });

  describe('rechargerTaches', () => {
    it('recharge les données depuis l\'API', async () => {
      const { result } = renderHook(() => useDashboardConseiller());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      expect(tacheService.obtenirTaches).toHaveBeenCalledTimes(1);
      
      // Recharger
      await act(async () => {
        await result.current.rechargerTaches();
      });
      
      expect(tacheService.obtenirTaches).toHaveBeenCalledTimes(2);
    });
  });
});
