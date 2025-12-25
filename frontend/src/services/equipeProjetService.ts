import api from './api';

// Types
export interface EquipeProjet {
  id: string;
  nom: string;
  code: string;
  description?: string;
  couleur: string;
  clientId?: string;
  clientNom?: string;
  objectif?: string;
  dateDebut?: string;
  dateFin?: string;
  actif: boolean;
  archive: boolean;
  creeLe: string;
  membresCount: number;
  membres: EquipeProjetMembre[];
}

export interface EquipeProjetMembre {
  id: string;
  traducteurId: string;
  nom: string;
  classification: string;
  divisions: string[];
  role: 'RESPONSABLE' | 'MEMBRE' | 'REVISEUR';
  dateAjout: string;
  notes?: string;
}

export interface CreateEquipeProjetDTO {
  nom: string;
  code: string;
  description?: string;
  couleur?: string;
  clientId?: string;
  clientNom?: string;
  objectif?: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface UpdateEquipeProjetDTO extends Partial<CreateEquipeProjetDTO> {
  actif?: boolean;
  archive?: boolean;
}

export interface AddMembreDTO {
  traducteurId: string;
  role?: 'RESPONSABLE' | 'MEMBRE' | 'REVISEUR';
  notes?: string;
}

// Couleurs prédéfinies pour les équipes
export const COULEURS_EQUIPE = [
  { nom: 'Bleu', hex: '#3B82F6' },
  { nom: 'Vert', hex: '#10B981' },
  { nom: 'Rouge', hex: '#EF4444' },
  { nom: 'Orange', hex: '#F97316' },
  { nom: 'Violet', hex: '#8B5CF6' },
  { nom: 'Rose', hex: '#EC4899' },
  { nom: 'Cyan', hex: '#06B6D4' },
  { nom: 'Jaune', hex: '#EAB308' },
  { nom: 'Indigo', hex: '#6366F1' },
  { nom: 'Gris', hex: '#6B7280' },
];

// Service API
export const equipeProjetService = {
  // Liste des équipes
  async lister(filtres?: { actif?: boolean; archive?: boolean; clientId?: string }): Promise<EquipeProjet[]> {
    const params = new URLSearchParams();
    if (filtres?.actif !== undefined) params.append('actif', String(filtres.actif));
    if (filtres?.archive !== undefined) params.append('archive', String(filtres.archive));
    if (filtres?.clientId) params.append('clientId', filtres.clientId);
    
    const url = params.toString() ? `/equipes-projet?${params}` : '/equipes-projet';
    const response = await api.get(url);
    return response.data;
  },
  
  // Détail d'une équipe
  async obtenir(id: string): Promise<EquipeProjet> {
    const response = await api.get(`/equipes-projet/${id}`);
    return response.data;
  },
  
  // Créer une équipe
  async creer(data: CreateEquipeProjetDTO): Promise<EquipeProjet> {
    const response = await api.post('/equipes-projet', data);
    return response.data;
  },
  
  // Modifier une équipe
  async modifier(id: string, data: UpdateEquipeProjetDTO): Promise<EquipeProjet> {
    const response = await api.put(`/equipes-projet/${id}`, data);
    return response.data;
  },
  
  // Supprimer une équipe
  async supprimer(id: string): Promise<void> {
    await api.delete(`/equipes-projet/${id}`);
  },
  
  // Activer/désactiver une équipe
  async toggleActif(id: string, actif: boolean): Promise<EquipeProjet> {
    return this.modifier(id, { actif });
  },
  
  // Archiver une équipe
  async archiver(id: string): Promise<EquipeProjet> {
    return this.modifier(id, { actif: false, archive: true });
  },
  
  // Désarchiver une équipe
  async desarchiver(id: string): Promise<EquipeProjet> {
    return this.modifier(id, { archive: false });
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GESTION DES MEMBRES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Ajouter un membre
  async ajouterMembre(equipeId: string, data: AddMembreDTO): Promise<EquipeProjetMembre> {
    const response = await api.post(`/equipes-projet/${equipeId}/membres`, data);
    return response.data;
  },
  
  // Modifier le rôle d'un membre
  async modifierMembre(equipeId: string, membreId: string, data: { role?: string; notes?: string }): Promise<EquipeProjetMembre> {
    const response = await api.put(`/equipes-projet/${equipeId}/membres/${membreId}`, data);
    return response.data;
  },
  
  // Retirer un membre
  async retirerMembre(equipeId: string, membreId: string): Promise<void> {
    await api.delete(`/equipes-projet/${equipeId}/membres/${membreId}`);
  },
  
  // Obtenir les équipes d'un traducteur
  async equipesTraducteur(traducteurId: string): Promise<EquipeProjet[]> {
    const response = await api.get(`/equipes-projet/traducteur/${traducteurId}`);
    return response.data;
  },
};

export default equipeProjetService;
