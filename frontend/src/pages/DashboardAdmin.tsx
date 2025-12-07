import React, { useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanningGlobal } from '../hooks/usePlanning';
import { TraducteurManagement } from '../components/admin/TraducteurManagement';
import { ClientDomaineManagement } from '../components/admin/ClientDomaineManagement';
import { UserManagement } from '../components/admin/UserManagement';

type Section = 'overview' | 'traducteurs' | 'clients-domaines' | 'utilisateurs';

/**
 * Dashboard Admin - Interface complète de gestion
 */
const DashboardAdmin: React.FC = () => {
  usePageTitle('admin Tetrix PLUS', 'Gérez les utilisateurs, traducteurs et planifications');
  const [section, setSection] = useState<Section>('overview');
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planningGlobal } = usePlanningGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });
  const stats = useMemo(() => {
    if (!planningGlobal) return { total: 0, libre: 0, presque: 0, plein: 0 };
    let libre = 0, presque = 0, plein = 0;
    planningGlobal.planning.forEach(l => {
      Object.values(l.dates).forEach(d => {
        if (d.couleur === 'libre') libre++;
        else if (d.couleur === 'presque-plein') presque++;
        else if (d.couleur === 'plein') plein++;
      });
    });
    return { total: libre + presque + plein, libre, presque, plein };
  }, [planningGlobal]);

  const renderContent = () => {
    switch (section) {
      case 'traducteurs':
        return <TraducteurManagement />;
      case 'clients-domaines':
        return <ClientDomaineManagement />;
      case 'utilisateurs':
        return <UserManagement />;
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Capacité Libre"
                value={stats.libre}
                icon="📊"
                variant="success"
                subtitle="slots disponibles"
              />
              <StatCard
                title="Capacité Presque Pleine"
                value={stats.presque}
                icon="⚠️"
                variant="warning"
                subtitle="slots à surveiller"
              />
              <StatCard
                title="Capacité Pleine"
                value={stats.plein}
                icon="🔴"
                variant="danger"
                subtitle="slots saturés"
              />
              <StatCard
                title="Total Cellules"
                value={stats.total}
                icon="📈"
                variant="info"
                subtitle="7 prochains jours"
              />
            </div>

            {/* Management Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle>Gestion des traducteurs</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted mb-4">Création, modification, activation/désactivation des traducteurs.</p>
                  <Button 
                    variant="primaire" 
                    aria-label="Gérer traducteurs"
                    onClick={() => setSection('traducteurs')}
                    full
                  >
                    Gérer les traducteurs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Clients & Domaines</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted mb-4">Gestion des divisions, domaines, sous-domaines, clients.</p>
                  <Button 
                    variant="secondaire" 
                    aria-label="Gérer clients et domaines"
                    onClick={() => setSection('clients-domaines')}
                    full
                  >
                    Gérer clients & domaines
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Utilisateurs & Rôles</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted mb-4">Gestion des comptes (ADMIN, CONSEILLER, GESTIONNAIRE, TRADUCTEUR).</p>
                  <Button 
                    variant="ghost" 
                    aria-label="Gérer utilisateurs"
                    onClick={() => setSection('utilisateurs')}
                    full
                  >
                    Gérer les utilisateurs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout titre={section === 'overview' ? 'Administration' : ''}>
      {section !== 'overview' && (
        <div className="mb-4">
          <Button variant="outline" onClick={() => setSection('overview')}>
            ← Retour au tableau de bord
          </Button>
        </div>
      )}
      {renderContent()}
    </AppLayout>
  );
};

export default DashboardAdmin;
