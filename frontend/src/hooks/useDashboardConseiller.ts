/**
 * Hook useDashboardConseiller
 * 
 * Gère la logique métier du dashboard conseiller:
 * - Chargement des tâches
 * - Filtrage par statut et recherche
 * - Calcul des statistiques
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { tacheService } from '../services/tacheService';
import type { Tache } from '../types';

interface DashboardConseillerStats {
  /** Nombre total de tâches */
  total: number;
  /** Tâches planifiées */
  planifiees: number;
  /** Tâches en cours */
  enCours: number;
  /** Tâches terminées */
  terminees: number;
  /** Heures totales */
  heuresTotal: number;
}

interface UseDashboardConseillerResult {
  /** Toutes les tâches chargées */
  taches: Tache[];
  /** Tâches après application des filtres */
  tachesFiltered: Tache[];
  /** Indicateur de chargement */
  loading: boolean;
  /** Statistiques calculées */
  stats: DashboardConseillerStats;
  /** Filtre par statut actuel */
  filtreStatut: string;
  /** Terme de recherche actuel */
  recherche: string;
  /** Change le filtre statut */
  setFiltreStatut: (statut: string) => void;
  /** Change le terme de recherche */
  setRecherche: (terme: string) => void;
  /** Applique les filtres */
  appliquerFiltres: () => void;
  /** Réinitialise tous les filtres */
  reinitialiserFiltres: () => void;
  /** Recharge les tâches depuis l'API */
  rechargerTaches: () => Promise<void>;
}

export function useDashboardConseiller(): UseDashboardConseillerResult {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [tachesFiltered, setTachesFiltered] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [recherche, setRecherche] = useState('');

  /**
   * Charge les tâches depuis l'API
   */
  const chargerTaches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tacheService.obtenirTaches({});
      // Trier par date de création (plus récent d'abord)
      const tachesTries = data.sort((a, b) => 
        new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime()
      );
      setTaches(tachesTries);
      setTachesFiltered(tachesTries);
    } catch (err) {
      console.error('[DashboardConseiller] Erreur chargement tâches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Chargement initial
   */
  useEffect(() => {
    chargerTaches();
  }, [chargerTaches]);

  /**
   * Applique les filtres de statut et de recherche
   */
  const appliquerFiltres = useCallback(() => {
    let filtered = [...taches];

    if (filtreStatut) {
      filtered = filtered.filter(t => t.statut === filtreStatut);
    }

    if (recherche) {
      const rech = recherche.toLowerCase();
      filtered = filtered.filter(t => 
        t.numeroProjet.toLowerCase().includes(rech) ||
        t.description?.toLowerCase().includes(rech) ||
        t.traducteur?.nom.toLowerCase().includes(rech) ||
        t.client?.nom.toLowerCase().includes(rech)
      );
    }

    setTachesFiltered(filtered);
  }, [taches, filtreStatut, recherche]);

  /**
   * Réinitialise les filtres
   */
  const reinitialiserFiltres = useCallback(() => {
    setFiltreStatut('');
    setRecherche('');
    setTachesFiltered(taches);
  }, [taches]);

  /**
   * Statistiques calculées
   */
  const stats = useMemo<DashboardConseillerStats>(() => ({
    total: taches.length,
    planifiees: taches.filter(t => t.statut === 'PLANIFIEE').length,
    enCours: taches.filter(t => t.statut === 'EN_COURS').length,
    terminees: taches.filter(t => t.statut === 'TERMINEE').length,
    heuresTotal: taches.reduce((sum, t) => sum + t.heuresTotal, 0),
  }), [taches]);

  return {
    taches,
    tachesFiltered,
    loading,
    stats,
    filtreStatut,
    recherche,
    setFiltreStatut,
    setRecherche,
    appliquerFiltres,
    reinitialiserFiltres,
    rechargerTaches: chargerTaches,
  };
}
