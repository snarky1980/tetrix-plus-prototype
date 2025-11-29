import api from './api';
import { LoginResponse } from '../types';

export const authService = {
  /**
   * Connexion
   */
  async connexion(email: string, motDePasse: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/connexion', {
      email,
      motDePasse,
    });
    
    // Stocker le token et l'utilisateur
    localStorage.setItem('token', data.token);
    localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
    
    return data;
  },

  /**
   * Déconnexion
   */
  deconnexion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
  },

  /**
   * Récupérer l'utilisateur courant
   */
  obtenirUtilisateurCourant() {
    const utilisateurStr = localStorage.getItem('utilisateur');
    return utilisateurStr ? JSON.parse(utilisateurStr) : null;
  },

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  estAuthentifie(): boolean {
    return !!localStorage.getItem('token');
  },
};
