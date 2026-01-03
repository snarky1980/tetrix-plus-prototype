import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sessionService } from '../services/sessionService';
import { auditService } from '../services/auditService';
import type { ActionAudit } from '@prisma/client';

/**
 * Récupérer les sessions actives
 * GET /api/admin/sessions
 */
export const getSessionsActives = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const utilisateurId = req.query.utilisateurId as string | undefined;

    const result = await sessionService.getSessionsActives({
      utilisateurId,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('[SessionsController] Erreur getSessionsActives:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des sessions' });
  }
};

/**
 * Récupérer l'historique des sessions
 * GET /api/admin/sessions/historique
 */
export const getHistoriqueSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const utilisateurId = req.query.utilisateurId as string | undefined;
    const actif = req.query.actif !== undefined 
      ? req.query.actif === 'true' 
      : undefined;
    const dateDebut = req.query.dateDebut 
      ? new Date(req.query.dateDebut as string) 
      : undefined;
    const dateFin = req.query.dateFin 
      ? new Date(req.query.dateFin as string) 
      : undefined;

    const result = await sessionService.getHistoriqueSessions({
      utilisateurId,
      actif,
      dateDebut,
      dateFin,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('[SessionsController] Erreur getHistoriqueSessions:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération de l\'historique' });
  }
};

/**
 * Forcer la déconnexion d'une session
 * DELETE /api/admin/sessions/:sessionId
 */
export const forcerDeconnexion = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const adminId = req.utilisateur!.id;

    const session = await sessionService.invaliderSessionParId(sessionId);

    if (!session) {
      res.status(404).json({ erreur: 'Session non trouvée' });
      return;
    }

    // Logger l'action d'audit
    await auditService.logSessionForcee(adminId, session.utilisateurId, sessionId);

    res.json({ message: 'Session déconnectée avec succès' });
  } catch (error) {
    console.error('[SessionsController] Erreur forcerDeconnexion:', error);
    res.status(500).json({ erreur: 'Erreur lors de la déconnexion forcée' });
  }
};

/**
 * Forcer la déconnexion de toutes les sessions d'un utilisateur
 * DELETE /api/admin/sessions/utilisateur/:utilisateurId
 */
export const forcerDeconnexionUtilisateur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { utilisateurId } = req.params;
    const adminId = req.utilisateur!.id;

    const count = await sessionService.invaliderToutesSessionsUtilisateur(utilisateurId);

    // Logger l'action d'audit
    await auditService.log({
      utilisateurId: adminId,
      action: 'SESSION_FORCEE',
      entite: 'Utilisateur',
      entiteId: utilisateurId,
      details: { sessionsDeconnectees: count, type: 'toutes_sessions' },
    });

    res.json({ 
      message: `${count} session(s) déconnectée(s) avec succès`,
      sessionsDeconnectees: count,
    });
  } catch (error) {
    console.error('[SessionsController] Erreur forcerDeconnexionUtilisateur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la déconnexion forcée' });
  }
};

/**
 * Obtenir les statistiques des sessions
 * GET /api/admin/sessions/statistiques
 */
export const getStatistiquesSessions = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await sessionService.getStatistiques();
    res.json(stats);
  } catch (error) {
    console.error('[SessionsController] Erreur getStatistiquesSessions:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des statistiques' });
  }
};

/**
 * Nettoyer les sessions expirées
 * POST /api/admin/sessions/nettoyer
 */
export const nettoyerSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const count = await sessionService.nettoyerSessionsExpirees();
    
    // Logger l'action
    await auditService.log({
      utilisateurId: req.utilisateur!.id,
      action: 'REFERENTIEL_MODIFIE',
      entite: 'Session',
      details: { action: 'nettoyage', sessionsNettoyees: count },
    });

    res.json({ 
      message: `${count} session(s) nettoyée(s)`,
      sessionsNettoyees: count,
    });
  } catch (error) {
    console.error('[SessionsController] Erreur nettoyerSessions:', error);
    res.status(500).json({ erreur: 'Erreur lors du nettoyage des sessions' });
  }
};

// ========================
// AUDIT LOGS
// ========================

/**
 * Récupérer les logs d'audit
 * GET /api/admin/audit
 */
export const getAuditLogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const utilisateurId = req.query.utilisateurId as string | undefined;
    const action = req.query.action as ActionAudit | undefined;
    const entite = req.query.entite as string | undefined;
    const dateDebut = req.query.dateDebut 
      ? new Date(req.query.dateDebut as string) 
      : undefined;
    const dateFin = req.query.dateFin 
      ? new Date(req.query.dateFin as string) 
      : undefined;

    const result = await auditService.getLogs({
      utilisateurId,
      action,
      entite,
      dateDebut,
      dateFin,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('[AuditController] Erreur getAuditLogs:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des logs' });
  }
};

/**
 * Récupérer les statistiques d'audit
 * GET /api/admin/audit/statistiques
 */
export const getStatistiquesAudit = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const jours = parseInt(req.query.jours as string) || 30;
    const stats = await auditService.getStatistiques(jours);
    res.json(stats);
  } catch (error) {
    console.error('[AuditController] Erreur getStatistiquesAudit:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des statistiques' });
  }
};

/**
 * Récupérer les types d'actions disponibles
 * GET /api/admin/audit/actions
 */
export const getActionsDisponibles = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  const actions: { value: ActionAudit; label: string; categorie: string }[] = [
    // Authentification
    { value: 'CONNEXION', label: 'Connexion', categorie: 'Authentification' },
    { value: 'DECONNEXION', label: 'Déconnexion', categorie: 'Authentification' },
    { value: 'CONNEXION_ECHOUEE', label: 'Connexion échouée', categorie: 'Authentification' },
    { value: 'SESSION_EXPIREE', label: 'Session expirée', categorie: 'Authentification' },
    { value: 'SESSION_FORCEE', label: 'Déconnexion forcée', categorie: 'Authentification' },
    
    // Utilisateurs
    { value: 'UTILISATEUR_CREE', label: 'Utilisateur créé', categorie: 'Utilisateurs' },
    { value: 'UTILISATEUR_MODIFIE', label: 'Utilisateur modifié', categorie: 'Utilisateurs' },
    { value: 'UTILISATEUR_SUPPRIME', label: 'Utilisateur supprimé', categorie: 'Utilisateurs' },
    { value: 'MOT_DE_PASSE_CHANGE', label: 'Mot de passe changé', categorie: 'Utilisateurs' },
    { value: 'ROLE_MODIFIE', label: 'Rôle modifié', categorie: 'Utilisateurs' },
    
    // Tâches
    { value: 'TACHE_CREEE', label: 'Tâche créée', categorie: 'Tâches' },
    { value: 'TACHE_MODIFIEE', label: 'Tâche modifiée', categorie: 'Tâches' },
    { value: 'TACHE_SUPPRIMEE', label: 'Tâche supprimée', categorie: 'Tâches' },
    { value: 'STATUT_TACHE_CHANGE', label: 'Statut tâche changé', categorie: 'Tâches' },
    { value: 'TACHE_ASSIGNEE', label: 'Tâche assignée', categorie: 'Tâches' },
    
    // Traducteurs
    { value: 'TRADUCTEUR_CREE', label: 'Traducteur créé', categorie: 'Traducteurs' },
    { value: 'TRADUCTEUR_MODIFIE', label: 'Traducteur modifié', categorie: 'Traducteurs' },
    { value: 'TRADUCTEUR_SUPPRIME', label: 'Traducteur supprimé', categorie: 'Traducteurs' },
    { value: 'CAPACITE_MODIFIEE', label: 'Capacité modifiée', categorie: 'Traducteurs' },
    
    // Administration
    { value: 'JOUR_FERIE_CREE', label: 'Jour férié créé', categorie: 'Administration' },
    { value: 'JOUR_FERIE_MODIFIE', label: 'Jour férié modifié', categorie: 'Administration' },
    { value: 'JOUR_FERIE_SUPPRIME', label: 'Jour férié supprimé', categorie: 'Administration' },
    { value: 'REFERENTIEL_MODIFIE', label: 'Référentiel modifié', categorie: 'Administration' },
    
    // Système
    { value: 'EXPORT_DONNEES', label: 'Export de données', categorie: 'Système' },
    { value: 'IMPORT_DONNEES', label: 'Import de données', categorie: 'Système' },
  ];

  res.json(actions);
};
