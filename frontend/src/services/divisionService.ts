import axios from 'axios';
import { getAuthHeaders } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Division {
  id: string;
  nom: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const divisionService = {
  async obtenirDivisions(): Promise<Division[]> {
    const response = await axios.get(`${API_URL}/divisions`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  async creerDivision(data: { nom: string; description?: string }): Promise<Division> {
    const response = await axios.post(`${API_URL}/divisions`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  async mettreAJourDivision(id: string, data: { nom?: string; description?: string }): Promise<Division> {
    const response = await axios.put(`${API_URL}/divisions/${id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  async supprimerDivision(id: string): Promise<void> {
    await axios.delete(`${API_URL}/divisions/${id}`, {
      headers: getAuthHeaders(),
    });
  },
};
