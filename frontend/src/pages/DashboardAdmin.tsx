import React, { useMemo, useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { TraducteurManagement } from '../components/admin/TraducteurManagement';
import { ClientDomaineManagement } from '../components/admin/ClientDomaineManagement';
import { UserManagement } from '../components/admin/UserManagement';
import { traducteurService } from '../services/traducteurService';
import { utilisateurService } from '../services/utilisateurService';
import { divisionService } from '../services/divisionService';
import { tacheService } from '../services/tacheService';
import type { Traducteur, Utilisateur } from '../types';

type Section = 'overview' | 'traducteurs' | 'clients-domaines' | 'utilisateurs' | 'systeme';

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
    <div className="space-y-6">
      {/* Stats principales du système */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Traducteurs"
          value={systemStats.traducteurs.total}
          icon="👥"
          variant="info"
          subtitle={`${systemStats.traducteurs.actifs} actifs`}
        />
        <StatCard
          title="Utilisateurs"
          value={systemStats.utilisateurs.total}
          icon="🔐"
          variant="default"
          subtitle={`${Object.keys(systemStats.utilisateurs.parRole).length} rôles`}
        />
        <StatCard
          title="Divisions"
          value={systemStats.divisions}
          icon="🏢"
          variant="default"
        />
        <StatCard
          title="Tâches totales"
          value={systemStats.taches.total}
          icon="📋"
          variant="warning"
          subtitle={`${systemStats.taches.enCours} en cours`}
        />
        <StatCard
          title="Capacité libre"
          value={capaciteStats.libre}
          icon="✅"
          variant="success"
          subtitle="7 prochains jours"
        />
        <StatCard
          title="Capacité pleine"
          value={capaciteStats.plein}
          icon="🔴"
          variant="danger"
          subtitle="slots saturés"
        />
      </div>

      {/* Alertes et notifications */}
      {traducteursDispo.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle>✋ {traducteursDispo.length} traducteur(s) cherche(nt) du travail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {traducteursDispo.slice(0, 8).map(tr => (
                <div key={tr.id} className="p-3 bg-white rounded-lg border border-green-200 flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {tr.nom.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tr.nom}</div>
                    <div className="text-xs text-muted">{tr.divisions?.join(', ') || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
            {traducteursDispo.length > 8 && (
              <p className="text-center text-sm text-muted mt-3">
                + {traducteursDispo.length - 8} autres traducteurs disponibles
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distribution des rôles */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Distribution des utilisateurs par rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(systemStats.utilisateurs.parRole).map(([role, count]) => {
              const icons: Record<string, string> = {
                ADMIN: '🛡️',
                CONSEILLER: '📝',
                GESTIONNAIRE: '👔',
                TRADUCTEUR: '🌐'
              };
              const colors: Record<string, string> = {
                ADMIN: 'bg-red-100 border-red-200 text-red-700',
                CONSEILLER: 'bg-blue-100 border-blue-200 text-blue-700',
                GESTIONNAIRE: 'bg-purple-100 border-purple-200 text-purple-700',
                TRADUCTEUR: 'bg-green-100 border-green-200 text-green-700'
              };
              return (
                <div 
                  key={role} 
                  className={`p-4 rounded-lg border-2 ${colors[role] || 'bg-gray-100 border-gray-200'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{icons[role] || '👤'}</span>
                    <span className="font-medium">{role}</span>
                  </div>
                  <div className="text-3xl font-bold">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Carte d'état du système */}
      <Card>
        <CardHeader>
          <CardTitle>🖥️ État du système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-medium text-green-700">Système opérationnel</span>
              </div>
              <p className="text-sm text-green-600 mt-1">Tous les services fonctionnent normalement</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-700">Base de données</div>
              <p className="text-sm text-blue-600 mt-1">Connectée • PostgreSQL</p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="font-medium text-gray-700">Version</div>
              <p className="text-sm text-gray-600 mt-1">Tetrix PLUS v2.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'traducteurs':
        return <TraducteurManagement />;
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
      <div className="space-y-6">
        {/* En-tête avec navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Administration 🛡️</h1>
              <p className="text-muted mt-1">
                Gestion complète du système Tetrix PLUS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ● Système en ligne
              </span>
            </div>
          </div>
          
          {/* Menu de navigation */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button 
              variant={section === 'overview' ? 'primaire' : 'outline'}
              onClick={() => setSection('overview')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🏠</span>
              <span className="text-sm">Vue d'ensemble</span>
            </Button>
            <Button 
              variant={section === 'traducteurs' ? 'primaire' : 'outline'}
              onClick={() => setSection('traducteurs')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">👥</span>
              <span className="text-sm">Traducteurs</span>
            </Button>
            <Button 
              variant={section === 'utilisateurs' ? 'primaire' : 'outline'}
              onClick={() => setSection('utilisateurs')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🔐</span>
              <span className="text-sm">Utilisateurs</span>
            </Button>
            <Button 
              variant={section === 'clients-domaines' ? 'primaire' : 'outline'}
              onClick={() => setSection('clients-domaines')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🏢</span>
              <span className="text-sm">Clients & Domaines</span>
            </Button>
            <Button 
              variant={section === 'systeme' ? 'primaire' : 'outline'}
              onClick={() => setSection('systeme')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-sm">Système</span>
            </Button>
          </div>
        </div>

        {/* Lien rapide vers Profils & Accès */}
        {section === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🔑</span>
                    </div>
                    <div>
                      <h3 className="font-bold">Profils & Accès divisions</h3>
                      <p className="text-sm text-muted">
                        Gérer les accès des conseillers et gestionnaires aux divisions
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/tetrix-plus-prototype/admin/gestion-profils'}
                  >
                    Gérer →
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <h3 className="font-bold">Statistiques globales</h3>
                      <p className="text-sm text-muted">
                        Consultez les statistiques de productivité de toutes les équipes
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="secondaire"
                    onClick={() => window.location.href = '/tetrix-plus-prototype/statistiques-productivite'}
                  >
                    Consulter →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenu de la section */}
        {renderContent()}
      </div>
    </AppLayout>
  );
};

export default DashboardAdmin;
