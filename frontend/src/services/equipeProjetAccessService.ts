import axios from 'axios';
import { getAuthHeaders } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface EquipeProjetPermission {
  id: string;
  utilisateurId: string;
  equipeProjetId: string;
  peutLire: boolean;
  peutEcrire: boolean;
  peutGerer: boolean;
  equipeProjet: {
    id: string;
    nom: string;
    code: string;
  };
}

export const equipeProjetAccessService = {
  async obtenirPermissions(utilisateurId: string): Promise<EquipeProjetPermission[]> {
    const response = await axios.get(
      `${API_URL}/equipe-projet-access/${utilisateurId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  async definirPermissions(
    utilisateurId: string,
    permissions: Array<{
      equipeProjetId: string;
      peutLire?: boolean;
      peutEcrire?: boolean;
      peutGerer?: boolean;
    }>
  ): Promise<EquipeProjetPermission[]> {
    const response = await axios.put(
      `${API_URL}/equipe-projet-access/${utilisateurId}`,
      { permissions },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};
