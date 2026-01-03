import { Router } from 'express';
import { authentifier, verifierRole } from '../middleware/auth';
import {
  // Sessions
  getSessionsActives,
  getHistoriqueSessions,
  forcerDeconnexion,
  forcerDeconnexionUtilisateur,
  getStatistiquesSessions,
  nettoyerSessions,
  // Audit
  getAuditLogs,
  getStatistiquesAudit,
  getActionsDisponibles,
} from '../controllers/sessionsAuditController';

const router = Router();

// Toutes les routes nécessitent authentification + rôle ADMIN
router.use(authentifier);
router.use(verifierRole('ADMIN'));

// ========================
// SESSIONS
// ========================

/**
 * @route   GET /api/admin/sessions
 * @desc    Récupérer les sessions actives
 * @access  Admin
 */
router.get('/sessions', getSessionsActives);

/**
 * @route   GET /api/admin/sessions/statistiques
 * @desc    Obtenir les statistiques des sessions
 * @access  Admin
 */
router.get('/sessions/statistiques', getStatistiquesSessions);

/**
 * @route   GET /api/admin/sessions/historique
 * @desc    Récupérer l'historique des sessions
 * @access  Admin
 */
router.get('/sessions/historique', getHistoriqueSessions);

/**
 * @route   POST /api/admin/sessions/nettoyer
 * @desc    Nettoyer les sessions expirées
 * @access  Admin
 */
router.post('/sessions/nettoyer', nettoyerSessions);

/**
 * @route   DELETE /api/admin/sessions/utilisateur/:utilisateurId
 * @desc    Forcer la déconnexion de toutes les sessions d'un utilisateur
 * @access  Admin
 */
router.delete('/sessions/utilisateur/:utilisateurId', forcerDeconnexionUtilisateur);

/**
 * @route   DELETE /api/admin/sessions/:sessionId
 * @desc    Forcer la déconnexion d'une session spécifique
 * @access  Admin
 */
router.delete('/sessions/:sessionId', forcerDeconnexion);

// ========================
// AUDIT LOGS
// ========================

/**
 * @route   GET /api/admin/audit
 * @desc    Récupérer les logs d'audit
 * @access  Admin
 */
router.get('/audit', getAuditLogs);

/**
 * @route   GET /api/admin/audit/statistiques
 * @desc    Récupérer les statistiques d'audit
 * @access  Admin
 */
router.get('/audit/statistiques', getStatistiquesAudit);

/**
 * @route   GET /api/admin/audit/actions
 * @desc    Récupérer les types d'actions disponibles pour le filtrage
 * @access  Admin
 */
router.get('/audit/actions', getActionsDisponibles);

export default router;
