import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanningGlobal } from '../hooks/usePlanning';
import { tacheService } from '../services/tacheService';
import { Tache } from '../types';

/**
 * Dashboard Conseiller - Gestion des tâches et planification
 */
const DashboardConseiller: React.FC = () => {
  usePageTitle('Tetrix PLUS Conseiller', 'Créez et gérez les tâches de traduction');
  const navigate = useNavigate();
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planningGlobal, loading: loadingPlanning, error } = usePlanningGlobal({ 
    dateDebut: dateISO(aujourdHui), 
    dateFin: dateISO(fin) 
  });

  const [taches, setTaches] = useState<Tache[]>([]);
  const [loadingTaches, setLoadingTaches] = useState(true);

  useEffect(() => {
    chargerTaches();
  }, []);

  const chargerTaches = async () => {
    setLoadingTaches(true);
    try {
      const data = await tacheService.obtenirTaches({
        dateDebut: dateISO(aujourdHui),
        dateFin: dateISO(new Date(aujourdHui.getTime() + 30 * 86400000)),
      });
      setTaches(data);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoadingTaches(false);
    }
  };

  const handleSupprimerTache = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    try {
      await tacheService.supprimerTache(id);
      await chargerTaches();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const statutBadges: Record<string, 'info' | 'warning' | 'success'> = {
    PLANIFIEE: 'info',
    EN_COURS: 'warning',
    TERMINEE: 'success',
  };

  const colonnesTaches = [
    {
      header: 'Description',
      accessor: 'description',
      render: (val: string, row: Tache) => (
        <div>
          <div className="font-medium text-sm">{val}</div>
          <div className="text-xs text-muted">
            {row.traducteur?.nom} - {row.paireLinguistique?.langueSource} → {row.paireLinguistique?.langueCible}
          </div>
        </div>
      ),
    },
    {
      header: 'Client',
      accessor: 'client',
      render: (val: any) => val?.nom || '-',
    },
    {
      header: 'Heures',
      accessor: 'heuresTotal',
      render: (val: number) => `${val}h`,
    },
    {
      header: 'Échéance',
      accessor: 'dateEcheance',
      render: (val: string) => new Date(val).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Statut',
      accessor: 'statut',
      render: (val: string) => (
        <Badge variant={statutBadges[val] || 'default'}>{val.replace('_', ' ')}</Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: Tache) => (
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            handleSupprimerTache(row.id);
          }}
          className="py-1 px-2 text-xs"
        >
          Supprimer
        </Button>
      ),
    },
  ];
  return (
    <AppLayout titre="Gestion de la planification">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créer une tâche</CardTitle>
              <Button 
                variant="primaire" 
                onClick={() => navigate('/conseiller/creation-tache')}
              >
                + Nouvelle tâche
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              Créez et assignez des tâches aux traducteurs avec répartition automatique (Juste-à-temps) ou manuelle.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tâches récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTaches ? (
              <LoadingSpinner message="Chargement des tâches..." />
            ) : (
              <>
                <div className="mb-2 text-sm text-muted">
                  {taches.length} tâche(s) - 30 prochains jours
                </div>
                <DataTable
                  data={taches}
                  columns={colonnesTaches}
                  emptyMessage="Aucune tâche"
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Planning global (7 jours)</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => navigate('/conseiller/planning-global')}
              >
                Vue détaillée
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-3 text-xs">
              <span className="px-2 py-1 rounded-md bg-green-500 text-white">Libre</span>
              <span className="px-2 py-1 rounded-md bg-orange-500 text-white">Presque plein</span>
              <span className="px-2 py-1 rounded-md bg-red-600 text-white">Plein</span>
            </div>
            {loadingPlanning ? (
              <LoadingSpinner message="Chargement du planning..." />
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <div className="overflow-auto">
                <div className="grid gap-2 grid-cols-[140px_repeat(7,_minmax(0,1fr))] min-w-[720px]">
                  <div className="text-xs font-semibold">Traducteur</div>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="text-xs font-semibold text-center">{`J${i + 1}`}</div>
                  ))}
                  {planningGlobal?.planning.slice(0, 10).map(ligne => {
                    const entries = Object.entries(ligne.dates);
                    return (
                      <React.Fragment key={ligne.traducteur.id}>
                        <div className="text-xs truncate" title={ligne.traducteur.nom}>
                          {ligne.traducteur.nom}
                        </div>
                        {entries.map(([date, info]) => {
                          const couleurMap: Record<string, string> = {
                            'libre': 'bg-green-100',
                            'presque-plein': 'bg-orange-100',
                            'plein': 'bg-red-100'
                          };
                          return (
                            <div 
                              key={date} 
                              className={`rounded-md h-8 flex items-center justify-center text-[10px] border border-border ${couleurMap[info.couleur]}`}
                              title={`${ligne.traducteur.nom} - ${date}\n${info.heures.toFixed(2)}h / ${ligne.traducteur.capaciteHeuresParJour.toFixed(2)}h`}
                            >
                              {info.heures.toFixed(1)}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
                {planningGlobal && planningGlobal.planning.length > 10 && (
                  <p className="text-xs text-muted mt-2">
                    Affichage de 10 traducteurs sur {planningGlobal.planning.length}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DashboardConseiller;
