import api from './api';

export interface EquipeConseiller {
  id: string;
  nom: string;
  code: string;
  description?: string;
  couleur: string;
  actif: boolean;
  creePar: string;
  creeLe: string;
  modifiePar?: string;
  modifieLe: string;
  membres: EquipeConseillerMembre[];
}

export interface EquipeConseillerMembre {
  id: string;
  equipeConseillerId: string;
  utilisateurId: string;
  role: 'CHEF' | 'MEMBRE';
  dateAjout: string;
  dateRetrait?: string;
  actif: boolean;
  ajoutePar: string;
  notes?: string;
  utilisateur: {
    id: string;
    email: string;
    nom?: string;
    prenom?: string;
    role: string;
    actif: boolean;
  };
}

export interface CreerEquipeConseillerDTO {
  nom: string;
  code: string;
  description?: string;
  couleur?: string;
}

export interface ModifierEquipeConseillerDTO {
  nom?: string;
  code?: string;
  description?: string;
  couleur?: string;
  actif?: boolean;
}

export interface AjouterMembreDTO {
  utilisateurId: string;
  role?: 'CHEF' | 'MEMBRE';
  notes?: string;
}

// ============================================
// API Équipes Conseillers
// ============================================

export async function listerEquipesConseiller(includeInactif = false): Promise<EquipeConseiller[]> {
  const params = includeInactif ? { includeInactif: 'true' } : {};
  const { data } = await api.get('/equipes-conseiller', { params });
  return data;
}

export async function obtenirEquipeConseiller(id: string): Promise<EquipeConseiller> {
  const { data } = await api.get(`/equipes-conseiller/${id}`);
  return data;
}

export async function mesEquipesConseiller(): Promise<EquipeConseiller[]> {
  const { data } = await api.get('/equipes-conseiller/mes-equipes');
  return data;
}

export async function creerEquipeConseiller(dto: CreerEquipeConseillerDTO): Promise<EquipeConseiller> {
  const { data } = await api.post('/equipes-conseiller', dto);
  return data;
}

export async function modifierEquipeConseiller(id: string, dto: ModifierEquipeConseillerDTO): Promise<EquipeConseiller> {
  const { data } = await api.put(`/equipes-conseiller/${id}`, dto);
  return data;
}

export async function supprimerEquipeConseiller(id: string): Promise<void> {
  await api.delete(`/equipes-conseiller/${id}`);
}

// ============================================
// API Membres
// ============================================

export async function listerMembresEquipe(equipeId: string): Promise<EquipeConseillerMembre[]> {
  const { data } = await api.get(`/equipes-conseiller/${equipeId}/membres`);
  return data;
}

export async function ajouterMembreEquipe(equipeId: string, dto: AjouterMembreDTO): Promise<EquipeConseillerMembre> {
  const { data } = await api.post(`/equipes-conseiller/${equipeId}/membres`, dto);
  return data;
}

export async function retirerMembreEquipe(equipeId: string, utilisateurId: string): Promise<void> {
  await api.delete(`/equipes-conseiller/${equipeId}/membres/${utilisateurId}`);
}

export async function modifierRoleMembre(
  equipeId: string, 
  utilisateurId: string, 
  role: 'CHEF' | 'MEMBRE'
): Promise<EquipeConseillerMembre> {
  const { data } = await api.patch(`/equipes-conseiller/${equipeId}/membres/${utilisateurId}/role`, { role });
  return data;
}

export async function utilisateursDisponibles(equipeId: string): Promise<Array<{
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
  role: string;
}>> {
  const { data } = await api.get(`/equipes-conseiller/${equipeId}/utilisateurs-disponibles`);
  return data;
}
