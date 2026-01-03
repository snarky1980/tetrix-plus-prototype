import axios from 'axios';
import { getAuthHeaders } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Division {
  id: string;
  nom: string;
  code: string;
  description?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DivisionInput {
  nom?: string;
  code?: string;
  description?: string;
  actif?: boolean;
}

export const divisionService = {
  async obtenirDivisions(): Promise<Division[]> {
    const response = await axios.get(`${API_URL}/divisions`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  async creerDivision(data: { nom: string; code: string; description?: string }): Promise<Division> {
    const response = await axios.post(`${API_URL}/divisions`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  async modifierDivision(id: string, data: DivisionInput): Promise<Division> {
    const response = await axios.put(`${API_URL}/divisions/${id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  async mettreAJourDivision(id: string, data: { nom?: string; code?: string; description?: string }): Promise<Division> {
    return this.modifierDivision(id, data);
  },

  async supprimerDivision(id: string): Promise<void> {
    await axios.delete(`${API_URL}/divisions/${id}`, {
      headers: getAuthHeaders(),
    });
  },
};
