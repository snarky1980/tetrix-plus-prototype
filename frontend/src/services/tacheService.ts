import api from './api';
import { Tache, CreerTacheForm } from '../types';

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
      repartition?: { date: string; heures: number }[] 
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
};
