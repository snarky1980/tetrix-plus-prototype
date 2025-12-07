import api from './api';
import { Utilisateur } from '../types';

export const utilisateurService = {
  /**
   * Récupérer tous les utilisateurs
   */
  async obtenirUtilisateurs(): Promise<Utilisateur[]> {
    const { data } = await api.get<Utilisateur[]>('/utilisateurs');
    return data;
  },

  /**
   * Créer un utilisateur
   */
  async creerUtilisateur(utilisateur: {
    email: string;
    motDePasse: string;
    role: 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR';
    traducteurId?: string;
  }): Promise<Utilisateur> {
    const { data } = await api.post<Utilisateur>('/auth/inscription', utilisateur);
    return data;
  },

  /**
   * Mettre à jour un utilisateur
   */
  async mettreAJourUtilisateur(
    id: string,
    utilisateur: Partial<Utilisateur>
  ): Promise<Utilisateur> {
    const { data } = await api.put<Utilisateur>(`/utilisateurs/${id}`, utilisateur);
    return data;
  },

  /**
   * Désactiver un utilisateur
   */
  async desactiverUtilisateur(id: string): Promise<void> {
    await api.delete(`/utilisateurs/${id}`);
  },
};
