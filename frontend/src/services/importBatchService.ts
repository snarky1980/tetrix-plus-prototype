/**
 * Service d'import batch pour traducteurs et tâches
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface TraducteurPreview {
  nom: string;
  email: string;
  division?: string;
  categorie?: string;
  capaciteHeuresParJour?: number;
  horaire?: string;
  domaines?: string;
  valid: boolean;
  errors: string[];
}

export interface TachePreview {
  traducteurNom: string;
  numeroProjet: string;
  typeTache: string;
  dateEcheance: string;
  dateDebut: string;
  priorite: string;
  modeDistribution: string;
  langueSource?: string;
  langueCible?: string;
  compteMots?: number;
  client?: string;
  domaine?: string;
  sousDomaine?: string;
  specialisation?: string;
  titre?: string;
  traducteurId?: string;
  valid: boolean;
  errors: string[];
}

export interface PreviewResult<T> {
  total: number;
  valid: number;
  invalid: number;
  traducteurs?: T[];
  taches?: T[];
}

export interface ImportResult {
  success: boolean;
  created: number;
  errors: string[];
  message: string;
}

/**
 * Prévisualiser l'import de traducteurs
 */
export async function previewTraducteurs(
  data: string,
  delimiter: string = '\t'
): Promise<PreviewResult<TraducteurPreview>> {
  const response = await axios.post(`${API_URL}/admin/import/preview-traducteurs`, {
    data,
    delimiter
  });
  return response.data;
}

/**
 * Importer les traducteurs validés
 */
export async function importTraducteurs(
  traducteurs: TraducteurPreview[]
): Promise<ImportResult> {
  const response = await axios.post(`${API_URL}/admin/import/traducteurs`, {
    traducteurs: traducteurs.filter(t => t.valid)
  });
  return response.data;
}

/**
 * Prévisualiser l'import de tâches
 */
export async function previewTaches(
  data: string,
  delimiter: string = '\t'
): Promise<PreviewResult<TachePreview>> {
  const response = await axios.post(`${API_URL}/admin/import/preview-taches`, {
    data,
    delimiter
  });
  return response.data;
}

/**
 * Importer les tâches validées
 */
export async function importTaches(
  taches: TachePreview[],
  utilisateurId: string
): Promise<ImportResult> {
  const response = await axios.post(`${API_URL}/admin/import/taches`, {
    taches: taches.filter(t => t.valid),
    utilisateurId
  });
  return response.data;
}

/**
 * Télécharger un template
 */
export function getTemplateUrl(type: 'traducteurs' | 'taches'): string {
  return `${API_URL}/admin/import/template/${type}`;
}

/**
 * Colonnes attendues pour l'import traducteurs
 */
export const COLONNES_TRADUCTEURS = [
  { nom: 'nom', description: 'Nom complet (ex: Dupont, Marie)', obligatoire: true },
  { nom: 'email', description: 'Adresse courriel (généré auto si vide)', obligatoire: false },
  { nom: 'division', description: 'Division (ex: CISR, Droit 1)', obligatoire: false },
  { nom: 'catégorie', description: 'TR-01, TR-02 ou TR-03', obligatoire: false },
  { nom: 'capacité', description: 'Heures par jour (défaut: 7)', obligatoire: false },
  { nom: 'horaire', description: 'Horaire de travail (ex: 9h-17h)', obligatoire: false },
  { nom: 'domaines', description: 'Domaines séparés par virgule', obligatoire: false },
];

/**
 * Colonnes attendues pour l'import tâches
 */
export const COLONNES_TACHES = [
  { nom: 'traducteur', description: 'Nom du traducteur assigné', obligatoire: true },
  { nom: 'numéro', description: 'Numéro de projet unique', obligatoire: true },
  { nom: 'type de tâche', description: 'TRADUCTION, REVISION, RELECTURE, ENCADREMENT, AUTRE', obligatoire: true },
  { nom: 'échéance', description: 'Date et heure d\'échéance (YYYY-MM-DD 00:00)', obligatoire: true },
  { nom: 'début tâche', description: 'Date et heure de début (YYYY-MM-DD 00:00)', obligatoire: true },
  { nom: 'priorité', description: 'REGULIER ou URGENT', obligatoire: true },
  { nom: 'mode', description: 'JAT, PEPS, ÉQUILIBRÉ ou MANUEL', obligatoire: true },
  { nom: 'source', description: 'Langue source (ex: EN)', obligatoire: false },
  { nom: 'cible', description: 'Langue cible (ex: FR)', obligatoire: false },
  { nom: 'compte de mots', description: 'Nombre de mots', obligatoire: false },
  { nom: 'client', description: 'Nom du client/ministère', obligatoire: false },
  { nom: 'domaine', description: 'Domaine de spécialisation', obligatoire: false },
  { nom: 'sous-domaine', description: 'Sous-domaine', obligatoire: false },
  { nom: 'spécialisation', description: 'Spécialisation détaillée', obligatoire: false },
  { nom: 'titre ou description', description: 'Titre ou description de la tâche', obligatoire: false },
];
