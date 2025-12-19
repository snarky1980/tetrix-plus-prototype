import api from './api';

export interface Conflict {
  type: string;
  allocationId: string;
  blocageId?: string;
  traducteurId: string;
  tacheId?: string;
  dateConflict: string;
  heureDebut: string;
  heureFin: string;
  heuresAllouees: number;
  explication: string;
}

export interface ScoreImpact {
  total: number;
  niveau: 'FAIBLE' | 'MODERE' | 'ELEVE';
  decomposition: {
    heuresDeplacees: number;
    nombreTachesAffectees: number;
    changementTraducteur: number;
    risqueEcheance: number;
    morcellement: number;
  };
  justification: string;
}

export interface PlageDisponible {
  date: string;
  heureDebut: string;
  heureFin: string;
  heuresDisponibles: number;
}

export interface CandidatReattribution {
  traducteurId: string;
  traducteurNom: string;
  heuresDisponiblesTotal: number;
  plagesDisponibles: PlageDisponible[];
  peutCompleterAvantEcheance: boolean;
  score: number;
}

export interface Suggestion {
  id: string;
  type: 'REPARATION_LOCALE' | 'REATTRIBUTION' | 'IMPOSSIBLE';
  conflitsResolus: string[];
  tacheId: string;
  traducteurActuel: string;
  traducteurPropose?: string;
  plagesProposees: PlageDisponible[];
  candidatsAlternatifs?: CandidatReattribution[];
  scoreImpact: ScoreImpact;
  description: string;
  creeA: string;
}

export interface ConflictAnalysisResult {
  allocationId: string;
  conflits: Conflict[];
  suggestions: Suggestion[];
  hasConflicts: boolean;
  conflictCount: number;
  suggestionCount: number;
}

/**
 * Service de détection de conflits
 */
class ConflictService {
  /**
   * Détecte les conflits pour une allocation
   */
  async detectAllocationConflicts(allocationId: string): Promise<{ conflits: Conflict[]; count: number }> {
    const response = await api.post(`/conflicts/detect/allocation/${allocationId}`);
    return response.data;
  }

  /**
   * Détecte les conflits causés par un blocage
   */
  async detectBlocageConflicts(blocageId: string): Promise<{ conflits: Conflict[]; count: number }> {
    const response = await api.post(`/conflicts/detect/blocage/${blocageId}`);
    return response.data;
  }

  /**
   * Génère des suggestions de résolution pour des conflits
   */
  async generateSuggestions(conflits: Conflict[]): Promise<{ suggestions: Suggestion[]; count: number }> {
    const response = await api.post('/conflicts/suggest', { conflits });
    return response.data;
  }

  /**
   * Génère un rapport complet pour un blocage
   */
  async generateBlocageReport(blocageId: string): Promise<any> {
    const response = await api.post(`/conflicts/report/blocage/${blocageId}`);
    return response.data;
  }

  /**
   * Analyse complète d'une allocation (conflits + suggestions)
   * Optimisé pour le frontend
   */
  async analyzeAllocation(allocationId: string): Promise<ConflictAnalysisResult> {
    const response = await api.get(`/conflicts/allocation/${allocationId}/full`);
    return response.data;
  }

  /**
   * Vérifie rapidement si une allocation a des conflits
   */
  async hasConflicts(allocationId: string): Promise<boolean> {
    try {
      const result = await this.analyzeAllocation(allocationId);
      return result.hasConflicts;
    } catch (error) {
      console.error('Erreur vérification conflits:', error);
      return false;
    }
  }
}

export const conflictService = new ConflictService();
