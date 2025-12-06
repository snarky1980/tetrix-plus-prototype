import React, { useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanningGlobal } from '../hooks/usePlanning';
import { formatHeures } from '../lib/format';
// import { useAuth } from '../contexts/AuthContext';

const PlanningGlobal: React.FC = () => {
  usePageTitle('Tetrix PLUS Planning', 'Consultez le planning global des traductions');
  // const { utilisateur } = useAuth(); // réservé pour filtres par rôle
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planningGlobal, loading, error } = usePlanningGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });

  return (
    <AppLayout titre="Planning global">
      <Card>
        <CardHeader><CardTitle>Filtres</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Sélectionnez les critères pour limiter les traducteurs affichés.</p>
          <div className="grid gap-3 md:grid-cols-3 mt-4" aria-label="Filtres planning">
            <div className="flex flex-col gap-1 text-sm"><label>Division</label><select disabled className="border border-border rounded-md px-2 py-2 text-sm bg-muted" aria-label="Division"><option>—</option></select></div>
            <div className="flex flex-col gap-1 text-sm"><label>Client</label><select disabled className="border border-border rounded-md px-2 py-2 text-sm bg-muted" aria-label="Client"><option>—</option></select></div>
            <div className="flex flex-col gap-1 text-sm"><label>Domaine / Sous-domaine</label><select disabled className="border border-border rounded-md px-2 py-2 text-sm bg-muted" aria-label="Domaine"><option>—</option></select></div>
            <div className="flex flex-col gap-1 text-sm"><label>Langue source</label><select disabled className="border border-border rounded-md px-2 py-2 text-sm bg-muted" aria-label="Langue source"><option>—</option></select></div>
            <div className="flex flex-col gap-1 text-sm"><label>Langue cible</label><select disabled className="border border-border rounded-md px-2 py-2 text-sm bg-muted" aria-label="Langue cible"><option>—</option></select></div>
            <div className="flex flex-col gap-1 text-sm"><label>Période</label><input disabled className="border border-border rounded-md px-2 py-2 text-sm bg-muted" aria-label="Période" placeholder="YYYY-MM-DD → YYYY-MM-DD" /> </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="primaire" disabled aria-label="Appliquer filtres">Appliquer</Button><Button variant="outline" aria-label="Réinitialiser filtres" disabled>Réinitialiser</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grille multi-traducteurs</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Chaque cellule: heures réservées / capacité (couleur = état de disponibilité).</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="px-2 py-1 rounded-md bg-green-500 text-white" aria-label="Libre">Libre</span>
            <span className="px-2 py-1 rounded-md bg-orange-500 text-white" aria-label="Presque plein">Presque plein</span>
            <span className="px-2 py-1 rounded-md bg-red-600 text-white" aria-label="Plein ou surcharge">Plein</span>
          </div>
          <div className="mt-4 overflow-auto" aria-label="Grille planning">
            <div className="grid gap-2 grid-cols-[180px_repeat(7,_minmax(0,1fr))] min-w-[780px]">
              <div className="text-xs font-semibold" aria-hidden>Traducteur</div>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="text-xs font-semibold text-center" aria-hidden>{`J${i + 1}`}</div>
              ))}
              {planningGlobal?.planning.map((ligne) => {
                const dates = Object.entries(ligne.dates);
                return (
                  <React.Fragment key={ligne.traducteur.id}>
                    <div className="text-xs font-medium truncate" title={ligne.traducteur.nom}>{ligne.traducteur.nom}</div>
                    {dates.map(([date, info]) => {
                      const couleurMap: Record<string, string> = {
                        'libre': 'bg-green-100',
                        'presque-plein': 'bg-orange-100',
                        'plein': 'bg-red-100'
                      };
                      return (
                        <div
                          key={date}
                          className={`relative rounded-md border border-border text-xs h-10 flex flex-col items-center justify-center ${couleurMap[info.couleur]}`}
                          aria-label={`Traducteur ${ligne.traducteur.nom} ${date} (${formatHeures(info.heures)} / ${formatHeures(ligne.traducteur.capaciteHeuresParJour)} h)`}
                        >
                          <span>{formatHeures(info.heures)} / {formatHeures(ligne.traducteur.capaciteHeuresParJour)}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {(!planningGlobal || planningGlobal.planning.length === 0) && !loading && (
                Array.from({ length: 5 }).map((_, row) => (
                  <React.Fragment key={row}>
                    <div className="text-xs font-medium truncate">Traducteur {row + 1}</div>
                    {Array.from({ length: 7 }).map((_, col) => (
                      <div key={col} className="relative rounded-md border border-border bg-muted text-xs h-10 flex items-center justify-center" aria-label={`Traducteur ${row + 1} jour ${col + 1}`}>—</div>
                    ))}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
          {loading && <p className="text-xs text-muted mt-2">Chargement...</p>}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <p className="text-xs text-muted mt-3">Pagination à ajouter si &gt; 150 traducteurs (Agent 3).</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PlanningGlobal;
