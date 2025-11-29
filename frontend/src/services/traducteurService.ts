import api from './api';
import { Traducteur, PaireLinguistique } from '../types';

export const traducteurService = {
  /**
   * Récupérer tous les traducteurs avec filtres
   */
  async obtenirTraducteurs(params?: {
    division?: string;
    client?: string;
    domaine?: string;
    langueSource?: string;
    langueCible?: string;
    actif?: boolean;
  }): Promise<Traducteur[]> {
    const { data } = await api.get<Traducteur[]>('/traducteurs', { params });
    return data;
  },

  /**
   * Récupérer un traducteur par ID
   */
  async obtenirTraducteur(id: string): Promise<Traducteur> {
    const { data } = await api.get<Traducteur>(`/traducteurs/${id}`);
    return data;
  },

  /**
   * Créer un traducteur
   */
  async creerTraducteur(traducteur: Partial<Traducteur> & { 
    email: string; 
    motDePasse: string; 
  }): Promise<Traducteur> {
    const { data } = await api.post<Traducteur>('/traducteurs', traducteur);
    return data;
  },

  /**
   * Mettre à jour un traducteur
   */
  async mettreAJourTraducteur(
    id: string,
    traducteur: Partial<Traducteur>
  ): Promise<Traducteur> {
    const { data } = await api.put<Traducteur>(`/traducteurs/${id}`, traducteur);
    return data;
  },

  /**
   * Désactiver un traducteur
   */
  async desactiverTraducteur(id: string): Promise<void> {
    await api.delete(`/traducteurs/${id}`);
  },

  /**
   * Ajouter une paire linguistique
   */
  async ajouterPaireLinguistique(
    traducteurId: string,
    paire: { langueSource: string; langueCible: string }
  ): Promise<PaireLinguistique> {
    const { data } = await api.post<PaireLinguistique>(
      `/traducteurs/${traducteurId}/paires-linguistiques`,
      paire
    );
    return data;
  },

  /**
   * Supprimer une paire linguistique
   */
  async supprimerPaireLinguistique(id: string): Promise<void> {
    await api.delete(`/traducteurs/paires-linguistiques/${id}`);
  },
};
