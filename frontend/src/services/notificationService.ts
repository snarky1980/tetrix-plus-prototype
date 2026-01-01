import api from './api';

export interface CompteursNotifications {
  traducteursCherchentTravail: number;
  demandesRessourcesActives: number;
}

export interface TraducteurDisponible {
  id: string;
  nom: string;
  divisions: string[];
  classification: string;
  categorie: string;
  capaciteHeuresParJour: number;
  commentaireDisponibilite?: string;
  pairesLinguistiques: Array<{
    langueSource: string;
    langueCible: string;
  }>;
}

export interface DemandeRessource {
  id: string;
  conseillerId: string;
  titre: string;
  description?: string;
  heuresEstimees?: number;
  langueSource?: string;
  langueCible?: string;
  division?: string; // DEPRECATED
  divisions: string[];
  categories: string[];
  specialisations: string[];
  domaines: string[];
  equipeProjetId?: string;
  urgence: 'FAIBLE' | 'NORMALE' | 'HAUTE' | 'CRITIQUE';
  actif: boolean;
  creeLe: string;
  modifieLe: string;
  expireLe?: string;
  conseiller?: {
    nom?: string;
    prenom?: string;
    email: string;
  };
}

export interface CreerDemandeRessourceDTO {
  titre: string;
  description?: string;
  heuresEstimees?: number;
  langueSource?: string;
  langueCible?: string;
  division?: string; // DEPRECATED
  divisions?: string[];
  categories?: string[];
  specialisations?: string[];
  domaines?: string[];
  equipeProjetId?: string;
  urgence?: 'FAIBLE' | 'NORMALE' | 'HAUTE' | 'CRITIQUE';
  expireLe?: string;
}

export const notificationService = {
  /**
   * Obtenir les compteurs de notifications
   */
  async obtenirCompteurs(): Promise<CompteursNotifications> {
    const response = await api.get('/notifications/compteurs');
    return response.data;
  },

  /**
   * Obtenir la liste des traducteurs cherchant du travail
   */
  async obtenirTraducteursDisponibles(): Promise<TraducteurDisponible[]> {
    const response = await api.get('/notifications/traducteurs-disponibles');
    return response.data;
  },

  /**
   * Obtenir les demandes de ressources actives
   */
  async obtenirDemandesRessources(): Promise<DemandeRessource[]> {
    const response = await api.get('/notifications/demandes-ressources');
    return response.data;
  },

  /**
   * Créer une demande de ressource
   */
  async creerDemandeRessource(data: CreerDemandeRessourceDTO): Promise<DemandeRessource> {
    const response = await api.post('/notifications/demandes-ressources', data);
    return response.data;
  },

  /**
   * Fermer une demande (trouvé un traducteur)
   */
  async fermerDemandeRessource(id: string): Promise<DemandeRessource> {
    const response = await api.put(`/notifications/demandes-ressources/${id}/fermer`);
    return response.data;
  },

  /**
   * Supprimer une demande
   */
  async supprimerDemandeRessource(id: string): Promise<void> {
    await api.delete(`/notifications/demandes-ressources/${id}`);
  },
};
