import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Domaine {
  nom: string;
  sousDomainesCount?: number;
}

export const domaineService = {
  /**
   * Obtenir la liste de tous les domaines (uniques à partir des sous-domaines)
   */
  async obtenirDomaines(): Promise<Domaine[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/domaines`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
