import api from './api';
import { Planification, PlanificationGlobale, AjustementTemps } from '../types';

export const planificationService = {
  /**
   * Récupérer la planification d'un traducteur
   */
  async obtenirPlanification(
    traducteurId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Planification> {
    const { data } = await api.get<Planification>(
      `/traducteurs/${traducteurId}/planification`,
      {
        params: { dateDebut, dateFin },
      }
    );
    return data;
  },

  /**
   * Récupérer le planification globale
   */
  async obtenirPlanificationGlobale(params: {
    dateDebut: string;
    dateFin: string;
    division?: string;
    client?: string;
    domaine?: string;
    langueSource?: string;
    langueCible?: string;
  }): Promise<PlanificationGlobale> {
    const { data } = await api.get<PlanificationGlobale>('/planification-globale', {
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
