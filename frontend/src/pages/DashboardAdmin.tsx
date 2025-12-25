import React, { useMemo, useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Spinner';
import { InfoTooltip } from '../components/ui/Tooltip';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { TraducteurManagement } from '../components/admin/TraducteurManagement';
import { ClientDomaineManagement } from '../components/admin/ClientDomaineManagementV2';
import { UserManagement } from '../components/admin/UserManagement';
import { EquipeProjetManagement } from '../components/admin/EquipeProjetManagement';
import { traducteurService } from '../services/traducteurService';
import { utilisateurService } from '../services/utilisateurService';
import { divisionService } from '../services/divisionService';
import { tacheService } from '../services/tacheService';
import type { Traducteur, Utilisateur } from '../types';

type Section = 'overview' | 'traducteurs' | 'equipes-projet' | 'clients-domaines' | 'utilisateurs' | 'systeme';

interface SystemStats {
  traducteurs: { total: number; actifs: number; inactifs: number };
  utilisateurs: { total: number; parRole: Record<string, number> };
  divisions: number;
  taches: { total: number; enCours: number; terminees: number };
}

/**
 * Dashboard Admin - Interface complète et moderne de gestion
 * Inspiré du portail conseiller avec forte emphase UI/UX
 */
const DashboardAdmin: React.FC = () => {
  usePageTitle('Administration Tetrix PLUS', 'Gérez les utilisateurs, traducteurs et système');
  
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    traducteurs: { total: 0, actifs: 0, inactifs: 0 },
    utilisateurs: { total: 0, parRole: {} },
    divisions: 0,
    taches: { total: 0, enCours: 0, terminees: 0 }
  });
  const [traducteursDispo, setTraducteursDispo] = useState<Traducteur[]>([]);

  // Planification des 7 prochains jours
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planificationGlobale } = usePlanificationGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });

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

  // Chargement des stats système
  useEffect(() => {
    const chargerStats = async () => {
      setLoading(true);
      try {
        const [traducteurs, utilisateurs, divisions, taches] = await Promise.all([
          traducteurService.obtenirTraducteurs({}).catch(() => []),
          utilisateurService.obtenirUtilisateurs().catch(() => []),
          divisionService.obtenirDivisions().catch(() => []),
          tacheService.obtenirTaches({}).catch(() => [])
        ]);

        // Stats traducteurs
        const tradActifs = (traducteurs as Traducteur[]).filter(t => t.actif).length;
        const tradsDispo = (traducteurs as Traducteur[]).filter(t => t.disponiblePourTravail);
        setTraducteursDispo(tradsDispo);

        // Stats utilisateurs par rôle
        const parRole: Record<string, number> = {};
        (utilisateurs as Utilisateur[]).forEach(u => {
          parRole[u.role] = (parRole[u.role] || 0) + 1;
        });

        // Stats tâches
        const tachesEnCours = (taches as any[]).filter(t => t.statut === 'EN_COURS' || t.statut === 'PLANIFIEE').length;
        const tachesTerminees = (taches as any[]).filter(t => t.statut === 'TERMINEE').length;

        setSystemStats({
          traducteurs: {
            total: traducteurs.length,
            actifs: tradActifs,
            inactifs: traducteurs.length - tradActifs
          },
          utilisateurs: {
            total: utilisateurs.length,
            parRole
          },
          divisions: divisions.length,
          taches: {
            total: taches.length,
            enCours: tachesEnCours,
            terminees: tachesTerminees
          }
        });
      } catch (err) {
        console.error('Erreur chargement stats:', err);
      } finally {
        setLoading(false);
      }
    };
    chargerStats();
  }, []);

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Stats compactes en ligne */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Traducteurs', value: systemStats.traducteurs.total, sub: `${systemStats.traducteurs.actifs} actifs`, color: 'blue', tooltip: 'Nombre total de profils traducteurs dans le système. Les traducteurs actifs peuvent recevoir des tâches.' },
          { label: 'Utilisateurs', value: systemStats.utilisateurs.total, sub: `${Object.keys(systemStats.utilisateurs.parRole).length} rôles`, color: 'gray', tooltip: 'Comptes utilisateurs (Admin, Conseiller, Gestionnaire, Traducteur) pouvant se connecter au système.' },
          { label: 'Divisions', value: systemStats.divisions, color: 'gray', tooltip: 'Unités organisationnelles (ex: CISR, Droit, Finance). Les traducteurs sont assignés à une ou plusieurs divisions.' },
          { label: 'Tâches', value: systemStats.taches.total, sub: `${systemStats.taches.enCours} en cours`, color: 'amber', tooltip: 'Travaux de traduction planifiés. Inclut les tâches en attente, en cours et terminées.' },
          { label: 'Dispo.', value: capaciteStats.libre, sub: '7 jours', color: 'green', tooltip: 'Créneaux de disponibilité sur les 7 prochains jours. Indique la capacité restante pour nouvelles tâches.' },
          { label: 'Saturé', value: capaciteStats.plein, color: 'red', tooltip: 'Créneaux complètement occupés. Ces traducteurs ne peuvent pas accepter de travail supplémentaire.' },
        ].map((stat, i) => (
          <div key={i} className={`p-2 rounded border bg-${stat.color}-50 border-${stat.color}-200`}>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {stat.label}
              {stat.tooltip && <InfoTooltip content={stat.tooltip} size="sm" />}
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
            {stat.sub && <div className="text-xs text-gray-400">{stat.sub}</div>}
          </div>
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
          {Object.entries(systemStats.utilisateurs.parRole).map(([role, count]) => {
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

  const renderContent = () => {
    switch (section) {
      case 'traducteurs':
        return <TraducteurManagement />;
      case 'equipes-projet':
        return <EquipeProjetManagement />;
      case 'clients-domaines':
        return <ClientDomaineManagement />;
      case 'utilisateurs':
        return <UserManagement />;
      case 'systeme':
        return (
          <Card>
            <CardHeader>
              <CardTitle>🔧 Configuration système</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon="🔧"
                title="Configuration avancée"
                description="Les paramètres système avancés seront disponibles prochainement"
              />
            </CardContent>
          </Card>
        );
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
    <AppLayout titre="">
      <div className="space-y-4">
        {/* En-tête compact avec navigation */}
        <div className="bg-white border-b border-gray-200 -mx-4 -mt-4 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Administration</h1>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                ● En ligne
              </span>
            </div>
          </div>
          
          {/* Menu de navigation horizontal compact */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { id: 'overview' as const, icon: '🏠', label: 'Vue d\'ensemble', tooltip: 'Aperçu général du système avec statistiques et état en temps réel' },
              { id: 'traducteurs' as const, icon: '👥', label: 'Traducteurs', tooltip: 'Gérer les profils traducteurs : compétences, divisions, disponibilités' },
              { id: 'equipes-projet' as const, icon: '🎯', label: 'Équipes-projet', tooltip: 'Groupes temporaires pour projets spéciaux (ex: backlog SATG)' },
              { id: 'utilisateurs' as const, icon: '🔐', label: 'Utilisateurs', tooltip: 'Comptes de connexion et gestion des accès (Admin, Conseiller, etc.)' },
              { id: 'clients-domaines' as const, icon: '🏢', label: 'Référentiel', tooltip: 'Clients, domaines, divisions et données de référence' },
              { id: 'systeme' as const, icon: '⚙️', label: 'Système', tooltip: 'Configuration avancée et paramètres système' },
            ].map(item => (
            <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  section === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={item.tooltip}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liens rapides compacts */}
        {section === 'overview' && (
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => window.location.href = '/tetrix-plus-prototype/admin/gestion-profils'}
              className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span>🔑</span>
              <span className="text-sm font-medium text-purple-700">Profils & Accès</span>
              <span className="text-purple-400">→</span>
            </button>
            <button
              onClick={() => window.location.href = '/tetrix-plus-prototype/statistiques-productivite'}
              className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <span>📊</span>
              <span className="text-sm font-medium text-orange-700">Statistiques</span>
              <span className="text-orange-400">→</span>
            </button>
          </div>
        )}

        {/* Contenu de la section */}
        {renderContent()}
      </div>
    </AppLayout>
  );
};

export default DashboardAdmin;
