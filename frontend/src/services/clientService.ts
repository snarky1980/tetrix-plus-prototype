import api from './api';
import { Client } from '../types';

export const clientService = {
  /**
   * Récupérer tous les clients
   */
  async obtenirClients(actif?: boolean): Promise<Client[]> {
    const params = actif !== undefined ? { actif } : {};
    const { data } = await api.get<Client[]>('/clients', { params });
    return data;
  },

  /**
   * Récupérer un client par ID
   */
  async obtenirClient(id: string): Promise<Client> {
    const { data } = await api.get<Client>(`/clients/${id}`);
    return data;
  },

  /**
   * Créer un client
   */
  async creerClient(client: { nom: string; sousDomaines?: string[] }): Promise<Client> {
    const { data } = await api.post<Client>('/clients', client);
    return data;
  },

  /**
   * Mettre à jour un client
   */
  async mettreAJourClient(id: string, client: Partial<Client>): Promise<Client> {
    const { data } = await api.put<Client>(`/clients/${id}`, client);
    return data;
  },

  /**
   * Supprimer un client
   */
  async supprimerClient(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },
};
