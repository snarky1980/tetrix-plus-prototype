import api from './api';
import { Traducteur, PaireLinguistique } from '../types';

export const traducteurService = {
  /**
   * Récupérer tous les traducteurs avec filtres
   */
  async obtenirTraducteurs(params?: {
    division?: string;
    classification?: string;
    client?: string;
    domaine?: string;
    specialisation?: string;
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

  /**
   * Mettre à jour le statut de disponibilité d'un traducteur
   */
  async mettreAJourDisponibilite(
    id: string,
    disponibilite: {
      disponiblePourTravail: boolean;
      commentaireDisponibilite?: string;
      ciblageDisponibilite?: {
        divisions?: string[];
        categories?: string[];
        specialisations?: string[];
        domaines?: string[];
        equipeProjetId?: string | null;
      } | null;
    }
  ): Promise<Traducteur> {
    const { data } = await api.put<Traducteur>(
      `/traducteurs/${id}/disponibilite`,
      disponibilite
    );
    return data;
  },

  /**
   * Bloquer une plage horaire
   */
  async bloquerTemps(
    id: string,
    blocage: {
      date: string;
      heureDebut: string;
      heureFin: string;
      motif: string;
    }
  ): Promise<any> {
    const { data } = await api.post(`/traducteurs/${id}/bloquer-temps`, blocage);
    return data;
  },

  /**
   * Supprimer un blocage
   */
  async supprimerBlocage(blocageId: string): Promise<void> {
    await api.delete(`/traducteurs/blocages/${blocageId}`);
  },

  /**
   * Obtenir les blocages d'un traducteur
   */
  async obtenirBlocages(
    id: string,
    params?: { dateDebut?: string; dateFin?: string }
  ): Promise<any[]> {
    const { data } = await api.get(`/traducteurs/${id}/blocages`, { params });
    return data;
  },
};
