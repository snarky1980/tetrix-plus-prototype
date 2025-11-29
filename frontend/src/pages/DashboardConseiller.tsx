import React, { useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePlanningGlobal } from '../hooks/usePlanning';

/**
 * Dashboard Conseiller - Structure de base
 * Agent 2 appliquera le design
 * Agent 3 implémentera la logique métier
 */
const DashboardConseiller: React.FC = () => {
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planningGlobal, loading, error } = usePlanningGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });
  return (
    <AppLayout titre="Gestion de la planification">
      <Card>
        <CardHeader>
          <CardTitle>Recherche de traducteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">Filtres (division, client, domaine, sous-domaine, langues, période) – à implémenter.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondaire" aria-label="Ouvrir filtres">Filtres</Button>
            <Button variant="outline" aria-label="Réinitialiser les filtres">Réinitialiser</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planning global</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">Vue multi-traducteurs (codes couleur disponibilité) – à venir.</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="px-2 py-1 rounded-md bg-green-500 text-white" aria-label="Libre">Libre</span>
            <span className="px-2 py-1 rounded-md bg-orange-500 text-white" aria-label="Presque plein">Presque plein</span>
            <span className="px-2 py-1 rounded-md bg-red-600 text-white" aria-label="Plein ou surcharge">Plein</span>
          </div>
          <div className="mt-4 overflow-auto">
            <div className="grid gap-2 grid-cols-[140px_repeat(7,_minmax(0,1fr))] min-w-[720px]" aria-label="Mini grille disponibilité">
              <div className="text-xs font-semibold" aria-hidden>Traducteur</div>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="text-xs font-semibold text-center" aria-hidden>{`J${i + 1}`}</div>
              ))}
              {planningGlobal?.planning.map(ligne => {
                const entries = Object.entries(ligne.dates);
                return (
                  <React.Fragment key={ligne.traducteur.id}>
                    <div className="text-xs truncate" title={ligne.traducteur.nom}>{ligne.traducteur.nom}</div>
                    {entries.map(([date, info]) => {
                      const couleurMap: Record<string, string> = {
                        'libre': 'bg-green-100',
                        'presque-plein': 'bg-orange-100',
                        'plein': 'bg-red-100'
                      };
                      return (
                        <div key={date} className={`rounded-md h-8 flex items-center justify-center text-[10px] border border-border ${couleurMap[info.couleur]}`} aria-label={`Traducteur ${ligne.traducteur.nom} ${date} ${info.heures.toFixed(2)}h / ${ligne.traducteur.capaciteHeuresParJour.toFixed(2)}h`}>
                          {info.heures.toFixed(1)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
            {loading && <p className="text-xs text-muted mt-2">Chargement...</p>}
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
          <Button className="mt-4" variant="primaire" aria-label="Voir planning global détaillé">Vue détaillée</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Créer une tâche</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">Étape 1 (métadonnées) puis répartition automatique ou manuelle.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="primaire" aria-label="Commencer création tâche">Nouvelle tâche</Button>
            <Button variant="outline" aria-label="Accéder aux répartitions">Répartitions</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default DashboardConseiller;
