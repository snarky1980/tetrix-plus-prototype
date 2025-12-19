import api from './api';

/**
 * Types pour les liaisons Traducteur-Réviseur
 */
export type CategorieTraducteur = 'TR01' | 'TR02' | 'TR03';

export interface TraducteurInfo {
  id: string;
  nom: string;
  categorie: CategorieTraducteur;
  division: string;
  capaciteHeuresParJour: number;
  necessiteRevision: boolean;
  actif: boolean;
}

export interface LiaisonReviseur {
  id: string;
  traducteurId: string;
  reviseurId: string;
  estPrincipal: boolean;
  actif: boolean;
  notes?: string;
  creeLe: string;
  modifieLe: string;
  traducteur?: TraducteurInfo;
  reviseur?: TraducteurInfo;
}

export interface PlageHoraire {
  heureDebut: string;
  heureFin: string;
  duree: number;
}

export interface DisponibiliteJour {
  date: string;
  heuresDisponibles: number;
  heuresTaches: number;
  heuresBlocages: number;
  capacite: number;
  plagesLibres: PlageHoraire[];
}

export interface VerificationDisponibiliteResult {
  traducteurDisponible: boolean;
  reviseurDisponible: boolean;
  disponibiliteCombinee: boolean;
  delaiRespecte: boolean;
  traducteur: {
    id: string;
    nom: string;
    categorie: CategorieTraducteur;
    disponibilites: DisponibiliteJour[];
    heuresNecessaires: number;
    dateFin: string | null;
  };
  reviseur: {
    id: string;
    nom: string;
    estPrincipal: boolean;
    disponibilites: DisponibiliteJour[];
    heuresNecessaires: number;
    dateFin: string | null;
  } | null;
  echeance: string;
  alertes: string[];
  recommandations: string[];
  reviseurAlternatifs?: TraducteurInfo[];
}

export interface ResumeLiaisons {
  statistiques: {
    tr01: number;
    tr02NecessiteRevision: number;
    tr02Autonome: number;
    tr03: number;
    liaisonsActives: number;
    sansReviseur: number;
  };
  traducteursSansReviseur: { id: string; nom: string; categorie: CategorieTraducteur }[];
}

/**
 * Service de gestion des liaisons Traducteur-Réviseur
 */
class LiaisonService {
  /**
   * Récupère le résumé des liaisons (statistiques)
   */
  async obtenirResume(division?: string): Promise<ResumeLiaisons> {
    const params = division ? `?division=${encodeURIComponent(division)}` : '';
    const response = await api.get(`/liaisons/resume${params}`);
    return response.data.data;
  }

  /**
   * Liste les TR03 pouvant être réviseurs
   */
  async obtenirReviseursPotentiels(division?: string): Promise<TraducteurInfo[]> {
    const params = division ? `?division=${encodeURIComponent(division)}` : '';
    const response = await api.get(`/liaisons/reviseurs-potentiels${params}`);
    return response.data.data;
  }

  /**
   * Liste les traducteurs nécessitant révision
   */
  async obtenirTraducteursNecessitantRevision(): Promise<TraducteurInfo[]> {
    const response = await api.get('/liaisons/necessitant-revision');
    return response.data.data;
  }

  /**
   * Récupère les liaisons d'un traducteur
   */
  async obtenirLiaisonsTraducteur(traducteurId: string): Promise<LiaisonReviseur[]> {
    const response = await api.get(`/liaisons/traducteur/${traducteurId}`);
    return response.data.data;
  }

  /**
   * Récupère les traducteurs révisés par un TR03
   */
  async obtenirTraducteursRevises(reviseurId: string): Promise<LiaisonReviseur[]> {
    const response = await api.get(`/liaisons/reviseur/${reviseurId}`);
    return response.data.data;
  }

  /**
   * Récupère le réviseur principal d'un traducteur
   */
  async obtenirReviseurPrincipal(traducteurId: string): Promise<TraducteurInfo | null> {
    const response = await api.get(`/liaisons/traducteur/${traducteurId}/reviseur-principal`);
    return response.data.data;
  }

  /**
   * Crée une liaison traducteur-réviseur
   */
  async creerLiaison(params: {
    traducteurId: string;
    reviseurId: string;
    estPrincipal?: boolean;
    notes?: string;
  }): Promise<LiaisonReviseur> {
    const response = await api.post('/liaisons', params);
    return response.data.data;
  }

  /**
   * Supprime une liaison
   */
  async supprimerLiaison(liaisonId: string): Promise<void> {
    await api.delete(`/liaisons/${liaisonId}`);
  }

  /**
   * Vérifie la disponibilité combinée traducteur + réviseur
   */
  async verifierDisponibilite(params: {
    traducteurId: string;
    heuresTraduction: number;
    dateEcheance: string;
  }): Promise<VerificationDisponibiliteResult> {
    const response = await api.post('/liaisons/verifier-disponibilite', params);
    return response.data.data;
  }

  /**
   * Met à jour la catégorie d'un traducteur
   */
  async mettreAJourCategorie(
    traducteurId: string,
    categorie: CategorieTraducteur,
    necessiteRevision?: boolean
  ): Promise<TraducteurInfo> {
    const response = await api.put(`/liaisons/traducteur/${traducteurId}/categorie`, {
      categorie,
      necessiteRevision,
    });
    return response.data.data;
  }
}

export const liaisonService = new LiaisonService();
