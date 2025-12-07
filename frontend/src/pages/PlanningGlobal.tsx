import React, { useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TagInput } from '../components/ui/TagInput';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanningGlobal } from '../hooks/usePlanning';
import { formatHeures } from '../lib/format';
// import { useAuth } from '../contexts/AuthContext';

const PlanningGlobal: React.FC = () => {
  usePageTitle('Tetrix PLUS Planning', 'Consultez le planning global des traductions');
  // const { utilisateur } = useAuth(); // réservé pour filtres par rôle
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const today = useMemo(() => dateISO(new Date()), []);

  type Filters = {
    start: string;
    range: 7 | 14 | 30;
    division: string;
    client: string;
    domaines: string[];
    languesSource: string[];
    languesCible: string[];
  };

  const [pending, setPending] = useState<Filters>({
    start: today,
    range: 7,
    division: '',
    client: '',
    domaines: [],
    languesSource: [],
    languesCible: [],
  });

  const [applied, setApplied] = useState<Filters>(pending);

  const endDate = useMemo(() => {
    const base = new Date(applied.start || today);
    const end = new Date(base);
    end.setDate(end.getDate() + applied.range - 1);
    return dateISO(end);
  }, [applied.start, applied.range, today]);

  const params = useMemo(
    () => ({
      dateDebut: applied.start,
      dateFin: endDate,
      division: applied.division || undefined,
      client: applied.client || undefined,
      domaine: applied.domaines.length ? applied.domaines.join(',') : undefined,
      langueSource: applied.languesSource.length ? applied.languesSource.join(',') : undefined,
      langueCible: applied.languesCible.length ? applied.languesCible.join(',') : undefined,
    }),
    [applied, endDate]
  );

  const { planningGlobal, loading, error, refresh } = usePlanningGlobal(params);

  const days = useMemo(() => {
    const base = new Date(applied.start || today);
    return Array.from({ length: applied.range }).map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return dateISO(d);
    });
  }, [applied.start, applied.range, today]);

  const formatJour = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(d);
  };

  const isToday = (iso: string) => iso === today;

  const handleApply = () => setApplied(pending);

  const handleReset = () => {
    const next = { ...pending, start: today, range: 7, division: '', client: '', domaines: [], languesSource: [], languesCible: [] } as Filters;
    setPending(next);
    setApplied(next);
  };

  const updateField = (key: keyof Filters, value: Filters[keyof Filters]) => {
    setPending((prev) => ({ ...prev, [key]: value } as Filters));
  };

  return (
    <AppLayout titre="Planning global">
      <Card>
        <CardHeader><CardTitle>Filtres</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Affinez par division, client ou langues, et choisissez la période (7 / 14 / 30 jours). Aujourd’hui est surligné en bleu.</p>
          <div className="grid gap-3 md:grid-cols-3 mt-4" aria-label="Filtres planning">
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="division">Division</label>
              <Input id="division" value={pending.division} placeholder="Ex: EMTC, EMTD" onChange={(e) => updateField('division', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="client">Client</label>
              <Input id="client" value={pending.client} placeholder="Nom client" onChange={(e) => updateField('client', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="domaine">Domaine / Sous-domaine</label>
              <TagInput
                value={pending.domaines}
                onChange={(vals) => updateField('domaines', vals)}
                placeholder="Ex: IMM, CRIM, Tech"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="langueSource">Langue source</label>
              <TagInput
                value={pending.languesSource}
                onChange={(vals) => updateField('languesSource', vals)}
                placeholder="Ex: EN"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="langueCible">Langue cible</label>
              <TagInput
                value={pending.languesCible}
                onChange={(vals) => updateField('languesCible', vals)}
                placeholder="Ex: FR"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="start">Date de début</label>
              <Input
                id="start"
                type="date"
                value={pending.start}
                onChange={(e) => updateField('start', e.target.value)}
                max="9999-12-31"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 items-center">
            {[7, 14, 30].map((val) => (
              <Button
                key={val}
                variant={pending.range === val ? 'primaire' : 'outline'}
                onClick={() => updateField('range', val as 7 | 14 | 30)}
                className="px-3 py-2 text-sm"
                aria-pressed={pending.range === val}
              >
                {val} jours
              </Button>
            ))}
            <Button variant="ghost" onClick={() => updateField('start', today)} className="px-3 py-2 text-sm">
              Aujourd'hui
            </Button>
            <div className="text-xs text-muted">
              Du {formatJour(applied.start)} au {formatJour(endDate)}
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <Button variant="primaire" onClick={handleApply} loading={loading} aria-label="Appliquer filtres">Appliquer</Button>
            <Button variant="outline" onClick={handleReset} disabled={loading} aria-label="Réinitialiser filtres">Réinitialiser</Button>
            <Button variant="ghost" onClick={refresh} loading={loading} aria-label="Rafraîchir">Rafraîchir</Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
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
            <div className={`grid gap-2 grid-cols-[180px_repeat(${applied.range},_minmax(0,1fr))] min-w-[780px]`}>
              <div className="text-xs font-semibold" aria-hidden>Traducteur</div>
              {days.map((iso) => (
                <div
                  key={iso}
                  className={`text-xs font-semibold text-center ${isToday(iso) ? 'bg-primary/10 rounded-md' : ''}`}
                  aria-hidden
                >
                  {formatJour(iso)}
                </div>
              ))}
              {planningGlobal?.planning.map((ligne) => {
                return (
                  <React.Fragment key={ligne.traducteur.id}>
                    <div className="text-xs font-medium truncate" title={ligne.traducteur.nom}>{ligne.traducteur.nom}</div>
                    {days.map((iso) => {
                      const info = ligne.dates[iso];
                      const couleurMap: Record<string, string> = {
                        libre: 'bg-green-100',
                        'presque-plein': 'bg-orange-100',
                        plein: 'bg-red-100',
                      };
                      const couleur = info ? couleurMap[info.couleur] : 'bg-muted';
                      const heures = info ? formatHeures(info.heures) : '0';
                      const capacite = info ? formatHeures(info.capacite ?? ligne.traducteur.capaciteHeuresParJour) : formatHeures(ligne.traducteur.capaciteHeuresParJour);
                      return (
                        <div
                          key={iso}
                          className={`relative rounded-md border border-border text-xs h-10 flex flex-col items-center justify-center ${couleur} ${isToday(iso) ? 'ring-1 ring-primary/60' : ''}`}
                          aria-label={`Traducteur ${ligne.traducteur.nom} ${iso} (${heures} / ${capacite} h)`}
                          title={`${ligne.traducteur.nom} - ${iso}\n${heures} / ${capacite} h`}
                        >
                          <span>{heures} / {capacite}</span>
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
                    {days.map((iso, col) => (
                      <div key={col} className={`relative rounded-md border border-border bg-muted text-xs h-10 flex items-center justify-center ${isToday(iso) ? 'ring-1 ring-primary/60' : ''}`} aria-label={`Traducteur ${row + 1} ${iso}`}>—</div>
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
