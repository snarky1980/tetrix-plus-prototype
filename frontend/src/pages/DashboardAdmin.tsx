import React, { useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePlanningGlobal } from '../hooks/usePlanning';

/**
 * Dashboard Admin - Structure de base
 * Agent 2 appliquera le design
 * Agent 3 implémentera la logique métier
 */
const DashboardAdmin: React.FC = () => {
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planningGlobal, loading } = usePlanningGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });
  const stats = useMemo(() => {
    if (!planningGlobal) return { total: 0, libre: 0, presque: 0, plein: 0 };
    let libre=0, presque=0, plein=0;
    planningGlobal.planning.forEach(l => {
      Object.values(l.dates).forEach(d => {
        if (d.couleur === 'libre') libre++; else if (d.couleur === 'presque-plein') presque++; else if (d.couleur === 'plein') plein++;
      });
    });
    return { total: libre+presque+plein, libre, presque, plein };
  }, [planningGlobal]);
  return (
    <AppLayout titre="Administration">
      <Card>
        <CardHeader><CardTitle>Gestion des traducteurs</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted mb-4">Création, modification, activation/désactivation des traducteurs.</p>
          <div className="flex gap-2">
            <Button variant="primaire" aria-label="Créer traducteur">Nouveau traducteur</Button>
            <Button variant="outline" aria-label="Importer liste">Importer</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Clients & Domaines</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted mb-4">Gestion des divisions, domaines, sous-domaines, clients.</p>
          <div className="flex gap-2">
            <Button variant="secondaire" aria-label="Nouveau client">Nouveau client</Button>
            <Button variant="outline" aria-label="Nouveau domaine">Nouveau domaine</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Utilisateurs & Rôles</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted mb-4">Gestion des comptes (ADMIN, CONSEILLER, TRADUCTEUR).</p>
          <Button variant="ghost" aria-label="Créer utilisateur">Créer utilisateur</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Charge globale (7 jours)</CardTitle></CardHeader>
        <CardContent>
          {loading && <p className="text-xs text-muted">Chargement…</p>}
          {!loading && (
            <div className="flex gap-4 text-xs">
              <div className="flex flex-col"><span className="font-medium">Cellules</span><span>{stats.total}</span></div>
              <div className="flex flex-col"><span className="font-medium text-green-700">Libre</span><span>{stats.libre}</span></div>
              <div className="flex flex-col"><span className="font-medium text-orange-700">Presque</span><span>{stats.presque}</span></div>
              <div className="flex flex-col"><span className="font-medium text-red-700">Plein</span><span>{stats.plein}</span></div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default DashboardAdmin;
