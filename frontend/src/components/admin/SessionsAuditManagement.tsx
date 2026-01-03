import { useState, useEffect, useCallback } from 'react';
import {
  getSessionsActives,
  getHistoriqueSessions,
  getStatistiquesSessions,
  forcerDeconnexion,
  forcerDeconnexionUtilisateur,
  nettoyerSessions,
  getAuditLogs,
  getStatistiquesAudit,
  getActionsDisponibles,
  SessionInfo,
  AuditLog,
  ActionAuditOption,
  SessionStats,
  AuditStats,
} from '../../services/sessionsAuditService';

type Onglet = 'sessions' | 'audit';

export default function SessionsAuditManagement() {
  const [ongletActif, setOngletActif] = useState<Onglet>('sessions');
  
  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showHistorique, setShowHistorique] = useState(false);
  
  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [actionsDisponibles, setActionsDisponibles] = useState<ActionAuditOption[]>([]);
  const [filtreAction, setFiltreAction] = useState('');
  const [filtreEntite, setFiltreEntite] = useState('');
  
  // Common state
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  // Charger les sessions
  const chargerSessions = useCallback(async () => {
    try {
      setChargement(true);
      const [sessionsData, stats] = await Promise.all([
        showHistorique 
          ? getHistoriqueSessions({ page: sessionPage, limit: 20 })
          : getSessionsActives({ page: sessionPage, limit: 20 }),
        getStatistiquesSessions(),
      ]);
      
      setSessions(sessionsData.sessions || []);
      setSessionTotalPages(sessionsData.totalPages);
      setSessionTotal(sessionsData.total);
      setSessionStats(stats);
    } catch (err) {
      console.error('Erreur chargement sessions:', err);
      setErreur('Erreur lors du chargement des sessions');
    } finally {
      setChargement(false);
    }
  }, [sessionPage, showHistorique]);

  // Charger les logs d'audit
  const chargerAuditLogs = useCallback(async () => {
    try {
      setChargement(true);
      const params: Record<string, unknown> = { page: auditPage, limit: 20 };
      if (filtreAction) params.action = filtreAction;
      if (filtreEntite) params.entite = filtreEntite;
      
      const [logsData, stats, actions] = await Promise.all([
        getAuditLogs(params as Parameters<typeof getAuditLogs>[0]),
        getStatistiquesAudit(30),
        actionsDisponibles.length === 0 ? getActionsDisponibles() : Promise.resolve(actionsDisponibles),
      ]);
      
      setAuditLogs(logsData.logs || []);
      setAuditTotalPages(logsData.totalPages);
      setAuditTotal(logsData.total);
      setAuditStats(stats);
      if (actionsDisponibles.length === 0) {
        setActionsDisponibles(actions);
      }
    } catch (err) {
      console.error('Erreur chargement audit:', err);
      setErreur('Erreur lors du chargement des logs d\'audit');
    } finally {
      setChargement(false);
    }
  }, [auditPage, filtreAction, filtreEntite, actionsDisponibles.length]);

  // Charger les données selon l'onglet actif
  useEffect(() => {
    setErreur(null);
    if (ongletActif === 'sessions') {
      chargerSessions();
    } else {
      chargerAuditLogs();
    }
  }, [ongletActif, chargerSessions, chargerAuditLogs]);

  // Forcer déconnexion d'une session
  const handleForcerDeconnexion = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir forcer la déconnexion de cette session ?')) return;
    
    try {
      setActionEnCours(true);
      await forcerDeconnexion(sessionId);
      await chargerSessions();
    } catch (err) {
      console.error('Erreur déconnexion forcée:', err);
      setErreur('Erreur lors de la déconnexion forcée');
    } finally {
      setActionEnCours(false);
    }
  };

  // Forcer déconnexion de toutes les sessions d'un utilisateur
  const handleForcerDeconnexionUtilisateur = async (utilisateurId: string, email: string) => {
    if (!confirm(`Déconnecter toutes les sessions de ${email} ?`)) return;
    
    try {
      setActionEnCours(true);
      const result = await forcerDeconnexionUtilisateur(utilisateurId);
      alert(result.message);
      await chargerSessions();
    } catch (err) {
      console.error('Erreur déconnexion utilisateur:', err);
      setErreur('Erreur lors de la déconnexion');
    } finally {
      setActionEnCours(false);
    }
  };

  // Nettoyer les sessions expirées
  const handleNettoyerSessions = async () => {
    if (!confirm('Nettoyer toutes les sessions expirées ?')) return;
    
    try {
      setActionEnCours(true);
      const result = await nettoyerSessions();
      alert(result.message);
      await chargerSessions();
    } catch (err) {
      console.error('Erreur nettoyage:', err);
      setErreur('Erreur lors du nettoyage');
    } finally {
      setActionEnCours(false);
    }
  };

  // Formater la date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Extraire le navigateur du User-Agent
  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Inconnu';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Autre';
  };

  // Grouper les actions par catégorie
  const actionsParCategorie = actionsDisponibles.reduce((acc, action) => {
    if (!acc[action.categorie]) acc[action.categorie] = [];
    acc[action.categorie].push(action);
    return acc;
  }, {} as Record<string, ActionAuditOption[]>);

  // Liste des entités uniques
  const entitesUniques = ['Utilisateur', 'Tache', 'Traducteur', 'Session', 'JourFerie'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions & Audit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des sessions utilisateurs et historique des actions
          </p>
        </div>
      </div>

      {/* Erreur */}
      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {erreur}
          <button 
            onClick={() => setErreur(null)}
            className="float-right text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setOngletActif('sessions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              ongletActif === 'sessions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔐 Sessions actives
            {sessionStats && (
              <span className="ml-2 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs">
                {sessionStats.sessionsActives}
              </span>
            )}
          </button>
          <button
            onClick={() => setOngletActif('audit')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              ongletActif === 'audit'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Logs d'audit
            {auditTotal > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                {auditTotal}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Contenu Sessions */}
      {ongletActif === 'sessions' && (
        <div className="space-y-6">
          {/* Stats Sessions */}
          {sessionStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-indigo-600">{sessionStats.sessionsActives}</div>
                <div className="text-sm text-gray-500">Sessions actives</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{sessionStats.utilisateursConnectes}</div>
                <div className="text-sm text-gray-500">Utilisateurs connectés</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{sessionStats.sessionsAujourdHui}</div>
                <div className="text-sm text-gray-500">Connexions aujourd'hui</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">{sessionStats.sessionsSemaine}</div>
                <div className="text-sm text-gray-500">Connexions cette semaine</div>
              </div>
            </div>
          )}

          {/* Actions Sessions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHistorique}
                  onChange={(e) => {
                    setShowHistorique(e.target.checked);
                    setSessionPage(1);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Afficher l'historique</span>
              </label>
            </div>
            <button
              onClick={handleNettoyerSessions}
              disabled={actionEnCours}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              🧹 Nettoyer sessions expirées
            </button>
          </div>

          {/* Table Sessions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {chargement ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Aucune session trouvée</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP / Navigateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernier accès
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {session.utilisateur.prenom?.[0] || session.utilisateur.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {session.utilisateur.prenom} {session.utilisateur.nom}
                            </div>
                            <div className="text-sm text-gray-500">{session.utilisateur.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{session.adresseIp || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{parseUserAgent(session.userAgent)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(session.dernierAcces)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.actif ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Expirée
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {session.actif && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleForcerDeconnexion(session.id)}
                              disabled={actionEnCours}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Déconnecter cette session"
                            >
                              ⏏️
                            </button>
                            <button
                              onClick={() => handleForcerDeconnexionUtilisateur(
                                session.utilisateurId,
                                session.utilisateur.email
                              )}
                              disabled={actionEnCours}
                              className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                              title="Déconnecter toutes les sessions"
                            >
                              🚫
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {/* Pagination Sessions */}
            {sessionTotalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {sessionPage} sur {sessionTotalPages} ({sessionTotal} sessions)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSessionPage(p => Math.max(1, p - 1))}
                    disabled={sessionPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => setSessionPage(p => Math.min(sessionTotalPages, p + 1))}
                    disabled={sessionPage === sessionTotalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenu Audit */}
      {ongletActif === 'audit' && (
        <div className="space-y-6">
          {/* Stats Audit */}
          {auditStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{auditStats.totalConnexions}</div>
                <div className="text-sm text-gray-500">Connexions (30j)</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-red-600">{auditStats.connexionsEchouees}</div>
                <div className="text-sm text-gray-500">Échecs connexion</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{auditStats.utilisateursActifs}</div>
                <div className="text-sm text-gray-500">Utilisateurs actifs</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">
                  {auditStats.actionsParType.reduce((sum, a) => sum + a.count, 0)}
                </div>
                <div className="text-sm text-gray-500">Total actions</div>
              </div>
            </div>
          )}

          {/* Filtres Audit */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'action</label>
                <select
                  value={filtreAction}
                  onChange={(e) => {
                    setFiltreAction(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Toutes les actions</option>
                  {Object.entries(actionsParCategorie).map(([categorie, actions]) => (
                    <optgroup key={categorie} label={categorie}>
                      {actions.map((action) => (
                        <option key={action.value} value={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Entité</label>
                <select
                  value={filtreEntite}
                  onChange={(e) => {
                    setFiltreEntite(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Toutes les entités</option>
                  {entitesUniques.map((entite) => (
                    <option key={entite} value={entite}>{entite}</option>
                  ))}
                </select>
              </div>
              {(filtreAction || filtreEntite) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFiltreAction('');
                      setFiltreEntite('');
                      setAuditPage(1);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Audit */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {chargement ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Aucun log trouvé</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Détails
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => {
                    const actionInfo = actionsDisponibles.find(a => a.value === log.action);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.creeLe)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.utilisateur ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {log.utilisateur.prenom} {log.utilisateur.nom}
                              </div>
                              <div className="text-sm text-gray-500">{log.utilisateur.email}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Système</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.action.includes('ECHOUEE') || log.action.includes('SUPPRIME')
                              ? 'bg-red-100 text-red-800'
                              : log.action.includes('CREE')
                              ? 'bg-green-100 text-green-800'
                              : log.action.includes('MODIFIE')
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {actionInfo?.label || log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.entite}
                          {log.entiteId && (
                            <span className="text-gray-400 text-xs ml-1">
                              #{log.entiteId.slice(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {log.details ? (
                            <span title={JSON.stringify(log.details, null, 2)}>
                              {JSON.stringify(log.details).slice(0, 50)}
                              {JSON.stringify(log.details).length > 50 && '...'}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {log.succes ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            
            {/* Pagination Audit */}
            {auditTotalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {auditPage} sur {auditTotalPages} ({auditTotal} logs)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                    disabled={auditPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                    disabled={auditPage === auditTotalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
