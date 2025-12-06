import api from './api';
import { SousDomaine } from '../types';

export const sousDomaineService = {
  /**
   * Récupérer tous les sous-domaines
   */
  async obtenirSousDomaines(actif?: boolean): Promise<SousDomaine[]> {
    const params = actif !== undefined ? { actif } : {};
    const { data } = await api.get<SousDomaine[]>('/sous-domaines', { params });
    return data;
  },

  /**
   * Récupérer un sous-domaine par ID
   */
  async obtenirSousDomaine(id: string): Promise<SousDomaine> {
    const { data } = await api.get<SousDomaine>(`/sous-domaines/${id}`);
    return data;
  },

  /**
   * Créer un sous-domaine
   */
  async creerSousDomaine(sousDomaine: { 
    nom: string; 
    domaineParent?: string;
  }): Promise<SousDomaine> {
    const { data } = await api.post<SousDomaine>('/sous-domaines', sousDomaine);
    return data;
  },

  /**
   * Mettre à jour un sous-domaine
   */
  async mettreAJourSousDomaine(
    id: string, 
    sousDomaine: Partial<SousDomaine>
  ): Promise<SousDomaine> {
    const { data } = await api.put<SousDomaine>(`/sous-domaines/${id}`, sousDomaine);
    return data;
  },

  /**
   * Supprimer un sous-domaine
   */
  async supprimerSousDomaine(id: string): Promise<void> {
    await api.delete(`/sous-domaines/${id}`);
  },
};
