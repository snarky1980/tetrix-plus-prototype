import api from './api';
import { Utilisateur, Division } from '../types';

export interface CreateUtilisateurData {
  email: string;
  motDePasse: string;
  nom?: string;
  prenom?: string;
  role: 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR';
  divisions?: string[];
  actif?: boolean;
  isPlayground?: boolean;
  playgroundNote?: string;
}

export interface UpdateUtilisateurData {
  email?: string;
  nom?: string;
  prenom?: string;
  role?: 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR';
  actif?: boolean;
  motDePasse?: string;
  isPlayground?: boolean;
  playgroundNote?: string;
}

export interface DivisionAccessData {
  divisionId: string;
  peutLire: boolean;
  peutEcrire: boolean;
  peutGerer: boolean;
}

export const utilisateurService = {
  /**
   * Obtenir tous les utilisateurs
   */
  async obtenirUtilisateurs(params?: {
    role?: string;
    actif?: boolean;
    divisionId?: string;
  }): Promise<Utilisateur[]> {
    const response = await api.get('/utilisateurs', { params });
    return response.data;
  },

  /**
   * Obtenir un utilisateur par ID
   */
  async obtenirUtilisateurParId(id: string): Promise<Utilisateur> {
    const response = await api.get(`/utilisateurs/${id}`);
    return response.data;
  },

  /**
   * Créer un nouvel utilisateur
   */
  async creerUtilisateur(data: CreateUtilisateurData): Promise<Utilisateur> {
    const response = await api.post('/utilisateurs', data);
    return response.data;
  },

  /**
   * Mettre à jour un utilisateur
   */
  async mettreAJourUtilisateur(
    id: string,
    data: UpdateUtilisateurData
  ): Promise<Utilisateur> {
    const response = await api.put(`/utilisateurs/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un utilisateur
   */
  async supprimerUtilisateur(id: string): Promise<void> {
    await api.delete(`/utilisateurs/${id}`);
  },

  /**
   * Gérer les accès aux divisions
   */
  async gererAccesDivisions(
    id: string,
    acces: DivisionAccessData[]
  ): Promise<Utilisateur> {
    const response = await api.put(`/utilisateurs/${id}/divisions`, { acces });
    return response.data;
  },

  /**
   * Obtenir les divisions accessibles
   */
  async obtenirDivisionsAccessibles(
    id: string,
    typeAcces?: 'lire' | 'ecrire' | 'gerer'
  ): Promise<Division[]> {
    const response = await api.get(`/utilisateurs/${id}/divisions`, {
      params: { typeAcces },
    });
    return response.data;
  },
};

/**
 * Service pour la gestion des divisions
 */
export const divisionService = {
  /**
   * Obtenir toutes les divisions
   */
  async obtenirDivisions(actif?: boolean): Promise<Division[]> {
    const response = await api.get('/divisions', {
      params: actif !== undefined ? { actif } : {},
    });
    return response.data;
  },

  /**
   * Obtenir une division par ID
   */
  async obtenirDivisionParId(id: string): Promise<Division> {
    const response = await api.get(`/divisions/${id}`);
    return response.data;
  },

  /**
   * Créer une nouvelle division
   */
  async creerDivision(data: {
    nom: string;
    code: string;
    description?: string;
  }): Promise<Division> {
    const response = await api.post('/divisions', data);
    return response.data;
  },

  /**
   * Mettre à jour une division
   */
  async mettreAJourDivision(
    id: string,
    data: {
      nom?: string;
      code?: string;
      description?: string;
      actif?: boolean;
    }
  ): Promise<Division> {
    const response = await api.put(`/divisions/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer une division
   */
  async supprimerDivision(id: string): Promise<void> {
    await api.delete(`/divisions/${id}`);
  },

  /**
   * Obtenir les utilisateurs avec accès à une division
   */
  async obtenirUtilisateursAvecAcces(divisionId: string): Promise<Utilisateur[]> {
    const response = await api.get(`/divisions/${divisionId}/utilisateurs`);
    return response.data;
  },
};
