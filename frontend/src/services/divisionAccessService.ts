import axios from 'axios';
import { getAuthHeaders } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface DivisionPermission {
  id: string;
  utilisateurId: string;
  divisionId: string;
  peutLire: boolean;
  peutEcrire: boolean;
  peutGerer: boolean;
  division: {
    id: string;
    nom: string;
  };
}

export const divisionAccessService = {
  async obtenirPermissions(utilisateurId: string): Promise<DivisionPermission[]> {
    const response = await axios.get(
      `${API_URL}/division-access/${utilisateurId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  async definirPermissions(
    utilisateurId: string,
    permissions: Array<{
      divisionId: string;
      peutLire?: boolean;
      peutEcrire?: boolean;
      peutGerer?: boolean;
    }>
  ): Promise<DivisionPermission[]> {
    const response = await axios.put(
      `${API_URL}/division-access/${utilisateurId}`,
      { permissions },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};
