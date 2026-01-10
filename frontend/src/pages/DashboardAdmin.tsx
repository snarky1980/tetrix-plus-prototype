import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/Spinner';
import { InfoTooltip } from '../components/ui/Tooltip';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { TraducteurManagement } from '../components/admin/TraducteurManagement';
import { ClientDomaineManagement } from '../components/admin/ClientDomaineManagementV2';
import { UserManagement } from '../components/admin/UserManagement';
import { EquipeProjetManagement } from '../components/admin/EquipeProjetManagement';
import { DivisionManagement } from '../components/admin/DivisionManagement';
import JoursFeriesManagement from '../components/admin/JoursFeriesManagement';
import SessionsAuditManagement from '../components/admin/SessionsAuditManagement';
import BackupManagement from '../components/admin/BackupManagement';
import EquipesConseillerPage from '../components/admin/EquipesConseillerPage';
import { AdminSearchBar } from '../components/admin/AdminSearchBar';
import { ActivityLog } from '../components/admin/ActivityLog';
import { SystemAlerts } from '../components/admin/SystemAlerts';
import { SystemSettings } from '../components/admin/SystemSettings';
import { ImportBatchModal } from '../components/admin/ImportBatchModal';
import statistiquesService from '../services/statistiquesService';
import type { AdminOverviewStats } from '../services/statistiquesService';

type Section = 'overview' | 'traducteurs' | 'equipes-projet' | 'equipes-conseiller' | 'clients-domaines' | 'utilisateurs' | 'divisions' | 'jours-feries' | 'sessions-audit' | 'backup' | 'systeme';

/** Type local pour les traducteurs disponibles (léger) */
interface TraducteurDispo {
  id: string;
  nom: string;
  divisions: string[];
  commentaireDisponibilite?: string;
  disponibleDepuis?: string;
}

/**
 * Dashboard Admin - Interface complète et moderne de gestion
 * Style harmonisé avec les portails Conseiller et Gestionnaire
 */
const DashboardAdmin: React.FC = () => {
  usePageTitle('Administration Tetrix PLUS', 'Gérez les utilisateurs, traducteurs et système');
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [importModalType, setImportModalType] = useState<'traducteurs' | 'taches' | null>(null);
  const [systemStats, setSystemStats] = useState<AdminOverviewStats | null>(null);
  const [traducteursDispo, setTraducteursDispo] = useState<TraducteurDispo[]>([]);

  // Planification des 7 prochains jours - dates stables
  const planifParams = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getTime() + 6 * 86400000);
    return {
      dateDebut: today.toISOString().split('T')[0],
      dateFin: end.toISOString().split('T')[0]
    };
  }, []);
  const { planificationGlobale } = usePlanificationGlobal(planifParams);


  // Stats de capacité
  const capaciteStats = useMemo(() => {
    if (!planificationGlobale) return { total: 0, libre: 0, presque: 0, plein: 0 };
    let libre = 0, presque = 0, plein = 0;
    planificationGlobale.planification.forEach(l => {
      Object.values(l.dates).forEach(d => {
        if (d.couleur === 'libre') libre++;
        else if (d.couleur === 'presque-plein') presque++;
        else if (d.couleur === 'plein') plein++;
      });
    });
    return { total: libre + presque + plein, libre, presque, plein };
  }, [planificationGlobale]);

  // Chargement des stats système via endpoint optimisé (COUNT côté serveur)
  const chargerStats = async () => {
    setLoading(true);
    try {
      const stats = await statistiquesService.obtenirAdminOverview();
      setSystemStats(stats);
      setTraducteursDispo(stats.traducteursDisponibles);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial des stats système
  useEffect(() => {
    chargerStats();
  }, []);

  const renderOverview = () => {
    // Valeurs par défaut si stats pas encore chargées
    const stats = systemStats ?? {
      traducteurs: { total: 0, actifs: 0, inactifs: 0, disponibles: 0 },
      utilisateurs: { total: 0, parRole: {} },
      divisions: 0,
      taches: { total: 0, enCours: 0, terminees: 0 },
      traducteursDisponibles: []
    };

    return (
    <div className="space-y-4">
      {/* Stats compactes en ligne - cliquables */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Traducteurs', value: stats.traducteurs.total, sub: `${stats.traducteurs.actifs} actifs`, color: 'blue', tooltip: 'Nombre total de profils traducteurs dans le système. Les traducteurs actifs peuvent recevoir des tâches.', action: () => setSection('traducteurs') },
          { label: 'Utilisateurs', value: stats.utilisateurs.total, sub: `${Object.keys(stats.utilisateurs.parRole).length} rôles`, color: 'gray', tooltip: 'Comptes utilisateurs (Admin, Conseiller, Gestionnaire, Traducteur) pouvant se connecter au système.', action: () => setSection('utilisateurs') },
          { label: 'Divisions', value: stats.divisions, color: 'purple', tooltip: 'Unités organisationnelles (ex: CISR, Droit, Finance). Les traducteurs sont assignés à une ou plusieurs divisions.', action: () => setSection('divisions') },
          { label: 'Tâches', value: stats.taches.total, sub: `${stats.taches.enCours} en cours`, color: 'amber', tooltip: 'Travaux de traduction planifiés. Inclut les tâches en attente, en cours et terminées.', action: () => navigate('/conseiller') },
          { label: 'Dispo.', value: capaciteStats.libre, sub: '7 jours', color: 'green', tooltip: 'Créneaux de disponibilité sur les 7 prochains jours. Indique la capacité restante pour nouvelles tâches.', action: () => navigate('/planification-globale') },
          { label: 'Saturé', value: capaciteStats.plein, color: 'red', tooltip: 'Créneaux complètement occupés. Ces traducteurs ne peuvent pas accepter de travail supplémentaire.', action: () => navigate('/planification-globale') },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={stat.action}
            className={`p-2 rounded border bg-${stat.color}-50 border-${stat.color}-200 hover:bg-${stat.color}-100 hover:border-${stat.color}-300 transition-colors text-left cursor-pointer`}
          >
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {stat.label}
              {stat.tooltip && <InfoTooltip content={stat.tooltip} size="sm" />}
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
            {stat.sub && <div className="text-xs text-gray-400">{stat.sub}</div>}
          </button>
        ))}
      </div>

      {/* Alertes compactes */}
      {traducteursDispo.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">✋ {traducteursDispo.length} traducteur(s) disponible(s)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {traducteursDispo.slice(0, 8).map(tr => (
              <div key={tr.id} className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-green-200 text-xs">
                <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {tr.nom.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{tr.nom}</div>
                  {tr.divisions && tr.divisions.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {tr.divisions.slice(0, 2).map((d, i) => (
                        <span key={i} className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">{d}</span>
                      ))}
                      {tr.divisions.length > 2 && (
                        <span className="text-[10px] text-green-500">+{tr.divisions.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {traducteursDispo.length > 8 && (
              <span className="text-xs text-green-600 self-center">+{traducteursDispo.length - 8}</span>
            )}
          </div>
        </div>
      )}

      {/* Distribution des rôles - compact */}
      <div className="bg-white border rounded-lg p-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Utilisateurs par rôle</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.utilisateurs.parRole).map(([role, count]) => {
            const colors: Record<string, string> = {
              ADMIN: 'bg-red-100 text-red-700',
              CONSEILLER: 'bg-blue-100 text-blue-700',
              GESTIONNAIRE: 'bg-purple-100 text-purple-700',
              TRADUCTEUR: 'bg-green-100 text-green-700'
            };
            return (
              <span key={role} className={`px-2 py-1 rounded text-xs font-medium ${colors[role] || 'bg-gray-100'}`}>
                {role}: <strong>{count}</strong>
              </span>
            );
          })}
        </div>
      </div>

      {/* Journal d'activité et Alertes - nouvelle grille */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityLog maxItems={6} />
        <SystemAlerts />
      </div>

      {/* État système compact */}
      <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Système OK
        </span>
        <span>PostgreSQL ✓</span>
        <span>v2.0</span>
      </div>
    </div>
  );
  };

  const renderContent = () => {
    switch (section) {
      case 'traducteurs':
        return <TraducteurManagement />;
      case 'equipes-projet':
        return <EquipeProjetManagement />;
      case 'equipes-conseiller':
        return <EquipesConseillerPage peutGerer={true} />;
      case 'clients-domaines':
        return <ClientDomaineManagement />;
      case 'utilisateurs':
        return <UserManagement />;
      case 'divisions':
        return <DivisionManagement />;
      case 'jours-feries':
        return <JoursFeriesManagement />;
      case 'sessions-audit':
        return <SessionsAuditManagement />;
      case 'backup':
        return <BackupManagement />;
      case 'systeme':
        return <SystemSettings />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  if (loading && section === 'overview') {
    return (
      <AppLayout titre="Administration">
        <LoadingSpinner message="Chargement des données système..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout titre="Administration">
      <div className="space-y-4">
        {/* En-tête compact style Conseiller */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Bonjour, {utilisateur?.prenom || 'Admin'}</h1>
              <p className="text-sm text-muted">Console d'administration système</p>
            </div>
            
            {/* Recherche globale */}
            <div className="flex-1 max-w-md mx-4">
              <AdminSearchBar />
            </div>
            
            {/* Actions rapides */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setSection('utilisateurs')}
                size="sm"
                className="gap-1.5"
              >
                <span>➕</span> Nouvel utilisateur
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImportModalType('traducteurs')}
                className="gap-1.5"
              >
                <span>📥</span> Import traducteurs
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImportModalType('taches')}
                className="gap-1.5"
              >
                <span>📥</span> Import tâches
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/planification-globale')}
                className="gap-1.5"
              >
                <span>📅</span> Planification
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/mes-notes')}
                className="gap-1.5"
              >
                <span>📝</span> Mes notes
              </Button>
            </div>
          </div>
        </div>

        {/* Stats en barre horizontale style Conseiller */}
        <div className="bg-white border rounded-lg px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">{systemStats?.traducteurs?.total ?? '...'} traducteurs</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{systemStats?.traducteurs?.actifs ?? '...'} actifs</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{systemStats?.utilisateurs?.total ?? '...'} utilisateurs</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{systemStats?.divisions ?? '...'} divisions</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{systemStats?.taches?.enCours ?? '...'} tâches en cours</span>
          </div>
          <div className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Système en ligne
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1 overflow-x-auto">
            {[
              { id: 'overview' as const, icon: '🏠', label: 'Vue d\'ensemble' },
              { id: 'traducteurs' as const, icon: '👥', label: 'Traducteurs' },
              { id: 'equipes-projet' as const, icon: '🎯', label: 'Équipes-projet' },
              { id: 'equipes-conseiller' as const, icon: '👔', label: 'Équipes Conseillers' },
              { id: 'utilisateurs' as const, icon: '🔐', label: 'Utilisateurs' },
              { id: 'divisions' as const, icon: '🏛️', label: 'Divisions' },
              { id: 'clients-domaines' as const, icon: '🏢', label: 'Référentiel' },
              { id: 'jours-feries' as const, icon: '📅', label: 'Jours fériés' },
              { id: 'sessions-audit' as const, icon: '🔒', label: 'Sessions / Audit' },
              { id: 'backup' as const, icon: '💾', label: 'Sauvegarde' },
              { id: 'systeme' as const, icon: '⚙️', label: 'Système' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  section === item.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Contenu de la section */}
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modal d'import batch */}
      {importModalType && (
        <ImportBatchModal
          type={importModalType}
          ouvert={true}
          onFermer={() => setImportModalType(null)}
          onSuccess={() => {
            // Rafraîchir les stats après import
            chargerStats();
          }}
        />
      )}
    </AppLayout>
  );
};

export default DashboardAdmin;
