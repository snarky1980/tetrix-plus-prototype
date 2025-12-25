import api from './api';
import { Tache, CreerTacheForm } from '../types';

export interface HistoriqueTacheEntry {
  id: string;
  tacheId: string;
  action: 'CREATION' | 'MODIFICATION' | 'REASSIGNATION' | 'STATUT_CHANGE' | 'REPARTITION_CHANGE' | 'SUPPRESSION';
  champModifie?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  utilisateurId: string;
  utilisateur: string;
  details?: string;
  creeLe: string;
}

export interface HistoriqueTacheResponse {
  tacheId: string;
  creation: {
    par: string;
    le: string;
  };
  derniereModification: {
    par: string;
    le: string;
  } | null;
  historique: HistoriqueTacheEntry[];
}

export const tacheService = {
  /**
   * Récupérer toutes les tâches avec filtres
   */
  async obtenirTaches(params?: {
    traducteurId?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<Tache[]> {
    const { data } = await api.get<Tache[]>('/taches', { params });
    return data;
  },

  /**
   * Récupérer une tâche par ID
   */
  async obtenirTache(id: string): Promise<Tache> {
    const { data } = await api.get<Tache>(`/taches/${id}`);
    return data;
  },

  /**
   * Récupérer l'historique d'une tâche
   */
  async obtenirHistorique(id: string): Promise<HistoriqueTacheResponse> {
    const { data } = await api.get<HistoriqueTacheResponse>(`/taches/${id}/historique`);
    return data;
  },

  /**
   * Créer une tâche
   */
  async creerTache(tache: CreerTacheForm): Promise<Tache> {
    const { data } = await api.post<Tache>('/taches', tache);
    return data;
  },

  /**
   * Mettre à jour une tâche
   */
  async mettreAJourTache(
    id: string,
    tache: Partial<Tache> & {
      repartition?: { date: string; heures: number }[];
      repartitionAuto?: boolean;
    }
  ): Promise<Tache> {
    const { data } = await api.put<Tache>(`/taches/${id}`, tache);
    return data;
  },

  /**
   * Supprimer une tâche
   */
  async supprimerTache(id: string): Promise<void> {
    await api.delete(`/taches/${id}`);
  },

  /**
   * Terminer une tâche manuellement
   * Libère les heures futures du calendrier mais garde la tâche dans le système
   */
  async terminerTache(id: string, commentaire?: string): Promise<{
    tache: Tache;
    message: string;
    heuresLiberees: number;
    joursLiberes: number;
    enRetard?: boolean;
  }> {
    const { data } = await api.post<{
      tache: Tache;
      message: string;
      heuresLiberees: number;
      joursLiberes: number;
      enRetard?: boolean;
    }>(`/taches/${id}/terminer`, { commentaire });
    return data;
  },
};
