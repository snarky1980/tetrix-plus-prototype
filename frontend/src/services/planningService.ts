import api from './api';
import { Planning, PlanningGlobal, AjustementTemps } from '../types';

export const planningService = {
  /**
   * Récupérer le planning d'un traducteur
   */
  async obtenirPlanning(
    traducteurId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Planning> {
    const { data } = await api.get<Planning>(
      `/traducteurs/${traducteurId}/planning`,
      {
        params: { dateDebut, dateFin },
      }
    );
    return data;
  },

  /**
   * Récupérer le planning global
   */
  async obtenirPlanningGlobal(params: {
    dateDebut: string;
    dateFin: string;
    division?: string;
    client?: string;
    domaine?: string;
    langueSource?: string;
    langueCible?: string;
  }): Promise<PlanningGlobal> {
    const { data } = await api.get<PlanningGlobal>('/planning-global', {
      params,
    });
    return data;
  },

  /**
   * Créer un blocage
   */
  async creerBlocage(blocage: {
    traducteurId: string;
    date: string;
    heures: number;
  }): Promise<AjustementTemps> {
    const { data } = await api.post<AjustementTemps>('/ajustements', blocage);
    return data;
  },

  /**
   * Supprimer un blocage
   */
  async supprimerBlocage(id: string): Promise<void> {
    await api.delete(`/ajustements/${id}`);
  },
};
