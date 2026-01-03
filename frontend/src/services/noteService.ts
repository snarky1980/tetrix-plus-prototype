import api from './api';

// ============================================
// TYPES
// ============================================

export type TypeEntiteNote = 
  | 'CLIENT' 
  | 'TRADUCTEUR' 
  | 'DIVISION' 
  | 'EQUIPE_PROJET' 
  | 'TACHE' 
  | 'SOUS_DOMAINE';

export type CategorieNote = 
  | 'GENERALE' 
  | 'CONTACT' 
  | 'PROCEDURE' 
  | 'TERMINOLOGIE' 
  | 'PREFERENCE' 
  | 'HISTORIQUE' 
  | 'ALERTE';

export type VisibiliteNote = 
  | 'PRIVE' 
  | 'EQUIPE' 
  | 'TRADUCTEUR' 
  | 'PUBLIC';

export interface PieceJointe {
  id: string;
  nom: string;
  nomOriginal: string;
  typeMime: string;
  taille: number;
  chemin: string;
  noteId?: string;
  entiteType?: TypeEntiteNote;
  entiteId?: string;
  creeParId: string;
  creePar: string;
  creeLe: string;
}

export interface Note {
  id: string;
  titre: string;
  contenu: string;
  categorie: CategorieNote;
  visibilite: VisibiliteNote;
  entiteType: TypeEntiteNote;
  entiteId: string;
  epingle: boolean;
  tags: string[];
  ordre: number;
  creeParId: string;
  creePar: string;
  modifieParId?: string;
  modifiePar?: string;
  creeLe: string;
  modifieLe: string;
  piecesJointes: PieceJointe[];
}

export interface CreerNoteInput {
  titre: string;
  contenu: string;
  categorie?: CategorieNote;
  visibilite?: VisibiliteNote;
  entiteType: TypeEntiteNote;
  entiteId: string;
  epingle?: boolean;
  tags?: string[];
}

export interface ModifierNoteInput {
  titre?: string;
  contenu?: string;
  categorie?: CategorieNote;
  visibilite?: VisibiliteNote;
  epingle?: boolean;
  tags?: string[];
}

export interface FiltresNotes {
  entiteType?: TypeEntiteNote;
  entiteId?: string;
  categorie?: CategorieNote;
  tags?: string[];
  epingleSeulement?: boolean;
  recherche?: string;
}

export interface StatistiquesNotes {
  total: number;
  parCategorie: Record<CategorieNote, number>;
  parVisibilite: Record<VisibiliteNote, number>;
  epinglees: number;
  piecesJointes: number;
}

export interface Referentiels {
  typesEntite: TypeEntiteNote[];
  categories: CategorieNote[];
  visibilites: VisibiliteNote[];
  categoriesLabels: Record<CategorieNote, string>;
  visibilitesLabels: Record<VisibiliteNote, string>;
  typesEntiteLabels: Record<TypeEntiteNote, string>;
}

// ============================================
// API NOTES
// ============================================

/**
 * Obtenir les référentiels (types, catégories, visibilités)
 */
export async function obtenirReferentiels(): Promise<Referentiels> {
  const response = await api.get<Referentiels>('/notes/referentiels');
  return response.data;
}

/**
 * Créer une nouvelle note
 */
export async function creerNote(data: CreerNoteInput): Promise<Note> {
  const response = await api.post<Note>('/notes', data);
  return response.data;
}

/**
 * Obtenir une note par ID
 */
export async function obtenirNote(id: string): Promise<Note> {
  const response = await api.get<Note>(`/notes/${id}`);
  return response.data;
}

/**
 * Obtenir les notes d'une entité
 */
export async function obtenirNotesEntite(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<Note[]> {
  const response = await api.get<Note[]>(`/notes/entite/${entiteType}/${entiteId}`);
  return response.data;
}

/**
 * Rechercher des notes avec filtres
 */
export async function rechercherNotes(filtres: FiltresNotes): Promise<Note[]> {
  const response = await api.get<Note[]>('/notes/recherche', { params: filtres });
  return response.data;
}

/**
 * Modifier une note
 */
export async function modifierNote(id: string, data: ModifierNoteInput): Promise<Note> {
  const response = await api.put<Note>(`/notes/${id}`, data);
  return response.data;
}

/**
 * Toggle l'épingle d'une note
 */
export async function toggleEpingle(id: string): Promise<Note> {
  const response = await api.patch<Note>(`/notes/${id}/epingle`);
  return response.data;
}

/**
 * Supprimer une note
 */
export async function supprimerNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`);
}

/**
 * Obtenir les statistiques des notes d'une entité
 */
export async function obtenirStatistiques(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<StatistiquesNotes> {
  const response = await api.get<StatistiquesNotes>(`/notes/stats/${entiteType}/${entiteId}`);
  return response.data;
}

// ============================================
// API PIÈCES JOINTES
// ============================================

/**
 * Upload une pièce jointe
 */
export async function uploadPieceJointe(
  fichier: File,
  options?: {
    noteId?: string;
    entiteType?: TypeEntiteNote;
    entiteId?: string;
  }
): Promise<PieceJointe> {
  const formData = new FormData();
  formData.append('fichier', fichier);
  
  if (options?.noteId) {
    formData.append('noteId', options.noteId);
  }
  if (options?.entiteType) {
    formData.append('entiteType', options.entiteType);
  }
  if (options?.entiteId) {
    formData.append('entiteId', options.entiteId);
  }

  const response = await api.post<PieceJointe>('/notes/pieces-jointes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Supprimer une pièce jointe
 */
export async function supprimerPieceJointe(id: string): Promise<void> {
  await api.delete(`/notes/pieces-jointes/${id}`);
}

/**
 * Télécharger une pièce jointe
 */
export async function telechargerPieceJointe(id: string, nomOriginal: string): Promise<void> {
  const response = await api.get(`/notes/pieces-jointes/${id}/download`, {
    responseType: 'blob',
  });
  
  // Créer un lien de téléchargement
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nomOriginal);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Obtenir les pièces jointes d'une entité (sans note)
 */
export async function obtenirPiecesJointesEntite(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<PieceJointe[]> {
  const response = await api.get<PieceJointe[]>(
    `/notes/pieces-jointes/entite/${entiteType}/${entiteId}`
  );
  return response.data;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formater la taille d'un fichier
 */
export function formatTailleFichier(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Obtenir l'icône pour un type MIME
 */
export function getIconeTypeMime(typeMime: string): string {
  if (typeMime.startsWith('image/')) return '🖼️';
  if (typeMime === 'application/pdf') return '📕';
  if (typeMime.includes('word')) return '📘';
  if (typeMime.includes('excel') || typeMime.includes('spreadsheet')) return '📗';
  if (typeMime.includes('zip') || typeMime.includes('compressed')) return '📦';
  if (typeMime.startsWith('text/')) return '📄';
  return '📎';
}

/**
 * Labels pour les catégories
 */
export const CATEGORIES_LABELS: Record<CategorieNote, string> = {
  GENERALE: 'Générale',
  CONTACT: 'Contact',
  PROCEDURE: 'Procédure',
  TERMINOLOGIE: 'Terminologie',
  PREFERENCE: 'Préférence',
  HISTORIQUE: 'Historique',
  ALERTE: 'Alerte',
};

/**
 * Icônes pour les catégories
 */
export const CATEGORIES_ICONES: Record<CategorieNote, string> = {
  GENERALE: '📝',
  CONTACT: '👤',
  PROCEDURE: '📋',
  TERMINOLOGIE: '📖',
  PREFERENCE: '⭐',
  HISTORIQUE: '📜',
  ALERTE: '⚠️',
};

/**
 * Labels pour les visibilités
 */
export const VISIBILITES_LABELS: Record<VisibiliteNote, string> = {
  PRIVE: 'Privé',
  EQUIPE: 'Équipe',
  TRADUCTEUR: 'Traducteurs',
  PUBLIC: 'Public',
};

/**
 * Icônes pour les visibilités
 */
export const VISIBILITES_ICONES: Record<VisibiliteNote, string> = {
  PRIVE: '🔒',
  EQUIPE: '👥',
  TRADUCTEUR: '📋',
  PUBLIC: '🌐',
};

/**
 * Labels pour les types d'entité
 */
export const TYPES_ENTITE_LABELS: Record<TypeEntiteNote, string> = {
  CLIENT: 'Client',
  TRADUCTEUR: 'Traducteur',
  DIVISION: 'Division',
  EQUIPE_PROJET: 'Équipe-projet',
  TACHE: 'Tâche',
  SOUS_DOMAINE: 'Sous-domaine',
};
