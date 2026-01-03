import api from './api';

// Types
export interface SessionInfo {
  id: string;
  utilisateurId: string;
  adresseIp: string | null;
  userAgent: string | null;
  actif: boolean;
  dernierAcces: string;
  expireA: string;
  creeLe: string;
  utilisateur: {
    email: string;
    nom: string | null;
    prenom: string | null;
    role: string;
  };
}

export interface AuditLog {
  id: string;
  utilisateurId: string | null;
  action: string;
  entite: string;
  entiteId: string | null;
  details: Record<string, unknown> | null;
  adresseIp: string | null;
  succes: boolean;
  creeLe: string;
  utilisateur: {
    email: string;
    nom: string | null;
    prenom: string | null;
  } | null;
}

export interface ActionAuditOption {
  value: string;
  label: string;
  categorie: string;
}

export interface PaginatedResponse<T> {
  sessions?: T[];
  logs?: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SessionStats {
  sessionsActives: number;
  utilisateursConnectes: number;
  sessionsAujourdHui: number;
  sessionsSemaine: number;
}

export interface AuditStats {
  totalConnexions: number;
  connexionsEchouees: number;
  actionsParType: Array<{ action: string; count: number }>;
  utilisateursActifs: number;
}

// =========================
// SESSIONS API
// =========================

export const getSessionsActives = async (params?: {
  page?: number;
  limit?: number;
  utilisateurId?: string;
}): Promise<PaginatedResponse<SessionInfo>> => {
  const response = await api.get('/admin/sessions', { params });
  return response.data;
};

export const getHistoriqueSessions = async (params?: {
  page?: number;
  limit?: number;
  utilisateurId?: string;
  actif?: boolean;
  dateDebut?: string;
  dateFin?: string;
}): Promise<PaginatedResponse<SessionInfo>> => {
  const response = await api.get('/admin/sessions/historique', { params });
  return response.data;
};

export const getStatistiquesSessions = async (): Promise<SessionStats> => {
  const response = await api.get('/admin/sessions/statistiques');
  return response.data;
};

export const forcerDeconnexion = async (sessionId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/admin/sessions/${sessionId}`);
  return response.data;
};

export const forcerDeconnexionUtilisateur = async (
  utilisateurId: string
): Promise<{ message: string; sessionsDeconnectees: number }> => {
  const response = await api.delete(`/admin/sessions/utilisateur/${utilisateurId}`);
  return response.data;
};

export const nettoyerSessions = async (): Promise<{ message: string; sessionsNettoyees: number }> => {
  const response = await api.post('/admin/sessions/nettoyer');
  return response.data;
};

// =========================
// AUDIT API
// =========================

export const getAuditLogs = async (params?: {
  page?: number;
  limit?: number;
  utilisateurId?: string;
  action?: string;
  entite?: string;
  dateDebut?: string;
  dateFin?: string;
}): Promise<PaginatedResponse<AuditLog>> => {
  const response = await api.get('/admin/audit', { params });
  return response.data;
};

export const getStatistiquesAudit = async (jours?: number): Promise<AuditStats> => {
  const response = await api.get('/admin/audit/statistiques', { params: { jours } });
  return response.data;
};

export const getActionsDisponibles = async (): Promise<ActionAuditOption[]> => {
  const response = await api.get('/admin/audit/actions');
  return response.data;
};
