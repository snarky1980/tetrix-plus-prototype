import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TagInput } from '../components/ui/TagInput';
import { Select } from '../components/ui/Select';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanningGlobal } from '../hooks/usePlanning';
import { formatHeures } from '../lib/format';
import { clientService } from '../services/clientService';
import { sousDomaineService } from '../services/sousDomaineService';
import { traducteurService } from '../services/traducteurService';
// import { useAuth } from '../contexts/AuthContext';

const PlanningGlobal: React.FC = () => {
  usePageTitle('Tetrix PLUS Planning', 'Consultez le planning global des traductions');
  const navigate = useNavigate();
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

  const [options, setOptions] = useState({
    divisions: [] as string[],
    clients: [] as string[],
    domaines: [] as string[],
    languesSource: [] as string[],
    languesCible: [] as string[],
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

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

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [clients, sousDomaines, traducteurs] = await Promise.all([
          clientService.obtenirClients(true),
          sousDomaineService.obtenirSousDomaines(true),
          traducteurService.obtenirTraducteurs({ actif: true }),
        ]);

        const divisions = Array.from(new Set(traducteurs.map(t => t.division))).sort();
        const domaines = Array.from(new Set([
          ...traducteurs.flatMap(t => t.domaines || []),
          ...sousDomaines.map(sd => sd.nom),
        ])).sort();
        const languesSource = Array.from(new Set(traducteurs.flatMap(t => t.pairesLinguistiques?.map(p => p.langueSource) || []))).sort();
        const languesCible = Array.from(new Set(traducteurs.flatMap(t => t.pairesLinguistiques?.map(p => p.langueCible) || []))).sort();
        const clientNoms = clients.map(c => c.nom).sort();

        setOptions({ divisions, domaines, languesSource, languesCible, clients: clientNoms });
      } catch (e: any) {
        setOptionsError(e?.message || 'Erreur chargement listes');
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  return (
    <AppLayout titre="Planning global">
      <div className="space-y-4">
        {/* Filtres compacts */}
        <div className="bg-white border border-border rounded-lg p-3 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Presets période */}
            <div className="flex gap-1">
              {[7, 14, 30].map((val) => (
                <Button
                  key={val}
                  variant={pending.range === val ? 'primaire' : 'outline'}
                  onClick={() => updateField('range', val as 7 | 14 | 30)}
                  className="px-2.5 py-1.5 text-xs"
                >
                  {val}j
                </Button>
              ))}
              <Button variant="ghost" onClick={() => updateField('start', today)} className="px-2.5 py-1.5 text-xs" title="Aujourd'hui">
                📅
              </Button>
            </div>

            <div className="h-6 w-px bg-border"></div>

            <Select
              value={pending.division}
              onChange={(e) => updateField('division', e.target.value)}
              disabled={loadingOptions}
              className="text-xs py-1.5 px-2 w-auto min-w-[110px]"
            >
              <option value="">Toutes divisions</option>
              {options.divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>

            <Select
              value={pending.client}
              onChange={(e) => updateField('client', e.target.value)}
              disabled={loadingOptions}
              className="text-xs py-1.5 px-2 w-auto min-w-[110px]"
            >
              <option value="">Tous clients</option>
              {options.clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>

            <Input
              type="date"
              value={pending.start}
              onChange={(e) => updateField('start', e.target.value)}
              max="9999-12-31"
              className="text-xs py-1.5 px-2 w-auto"
            />

            <div className="h-6 w-px bg-border"></div>

            <Button variant="primaire" onClick={handleApply} loading={loading} className="px-3 py-1.5 text-xs">
              Appliquer
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading} className="px-3 py-1.5 text-xs">
              Réinitialiser
            </Button>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted">
              {loadingOptions && <span>Chargement…</span>}
              {optionsError && <span className="text-red-600">{optionsError}</span>}
              {error && <span className="text-red-600">{error}</span>}
              {!loading && !error && <span>Du {formatJour(applied.start)} au {formatJour(endDate)}</span>}
            </div>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted hover:text-primary">Filtres avancés (domaines, langues)</summary>
            <div className="grid gap-2 md:grid-cols-3 mt-2 pt-2 border-t border-border">
              <div>
                <label className="text-xs font-medium">Domaines</label>
                <TagInput value={pending.domaines} onChange={(vals) => updateField('domaines', vals)} placeholder="Ajouter..." />
              </div>
              <div>
                <label className="text-xs font-medium">Langues source</label>
                <TagInput value={pending.languesSource} onChange={(vals) => updateField('languesSource', vals)} placeholder="Ajouter..." />
              </div>
              <div>
                <label className="text-xs font-medium">Langues cible</label>
                <TagInput value={pending.languesCible} onChange={(vals) => updateField('languesCible', vals)} placeholder="Ajouter..." />
              </div>
            </div>
          </details>
        </div>
      <Card>
        <CardHeader><CardTitle style={{ display: 'none' }}>Filtres</CardTitle></CardHeader>
        <CardContent style={{ display: 'none' }}>
          <p className="text-muted text-sm">Affinez par division, client ou langues, et choisissez la période (7 / 14 / 30 jours). Aujourd'hui est surligné en bleu.</p>
          <div className="grid gap-3 md:grid-cols-3 mt-4" aria-label="Filtres planning">
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="division">Division</label>
              <Select
                id="division"
                value={pending.division}
                onChange={(e) => updateField('division', e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">Toutes</option>
                {options.divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="client">Client</label>
              <Select
                id="client"
                value={pending.client}
                onChange={(e) => updateField('client', e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">Tous</option>
                {options.clients.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="domaine">Domaine / Sous-domaine</label>
              <TagInput
                value={pending.domaines}
                onChange={(vals) => updateField('domaines', vals)}
                placeholder={loadingOptions ? 'Chargement...' : 'Choisir ou saisir'}
              />
              {options.domaines.length > 0 && (
                <div className="text-[11px] text-muted">
                  Suggestions : {options.domaines.slice(0, 6).join(', ')}{options.domaines.length > 6 ? '…' : ''}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="langueSource">Langue source</label>
              <TagInput
                value={pending.languesSource}
                onChange={(vals) => updateField('languesSource', vals)}
                placeholder="Choisir ou saisir"
              />
              {options.languesSource.length > 0 && (
                <div className="text-[11px] text-muted">Suggestions : {options.languesSource.slice(0,6).join(', ')}{options.languesSource.length > 6 ? '…' : ''}</div>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="langueCible">Langue cible</label>
              <TagInput
                value={pending.languesCible}
                onChange={(vals) => updateField('languesCible', vals)}
                placeholder="Choisir ou saisir"
              />
              {options.languesCible.length > 0 && (
                <div className="text-[11px] text-muted">Suggestions : {options.languesCible.slice(0,6).join(', ')}{options.languesCible.length > 6 ? '…' : ''}</div>
              )}
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

        </CardContent>
      </Card>

      {/* Planning principal */}
      <Card>
        <CardHeader>
          <CardTitle>Planning des traducteurs ({planningGlobal?.planning.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3 text-xs items-center">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 border border-green-300">
              <span className="w-3 h-3 rounded bg-green-500"></span>
              Libre
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 border border-orange-300">
              <span className="w-3 h-3 rounded bg-orange-500"></span>
              Presque plein
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 border border-red-300">
              <span className="w-3 h-3 rounded bg-red-600"></span>
              Plein
            </span>
          </div>
          <div className="overflow-auto border border-border rounded-lg" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border-r border-border px-3 py-2 text-left font-semibold sticky left-0 bg-gray-50 z-20 min-w-[160px]">
                    Traducteur
                  </th>
                  {days.map((iso) => {
                    const d = new Date(iso);
                    const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d);
                    const dayNum = d.getDate();
                    const month = d.getMonth() + 1;
                    const isTodayCol = isToday(iso);
                    return (
                      <th
                        key={iso}
                        className={`border-r border-border px-2 py-2 text-center font-semibold min-w-[70px] ${isTodayCol ? 'bg-blue-50' : ''}`}
                      >
                        <div className={`${isTodayCol ? 'text-blue-700 font-bold' : ''}`}>
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                        </div>
                        <div className={`text-[10px] ${isTodayCol ? 'text-blue-600' : 'text-muted'}`}>
                          {dayNum}/{month}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {planningGlobal?.planning.map((ligne, idx) => {
                  return (
                    <tr key={ligne.traducteur.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="border-r border-b border-border px-3 py-2 font-medium sticky left-0 bg-inherit z-10">
                        <button
                          onClick={() => navigate(`/admin/traducteurs/${ligne.traducteur.id}`)}
                          className="text-left w-full hover:text-primary transition-colors cursor-pointer"
                          title={`Voir la fiche de ${ligne.traducteur.nom}`}
                        >
                          <div className="truncate font-medium">
                            {ligne.traducteur.nom}
                          </div>
                          <div className="text-[10px] text-muted">{ligne.traducteur.division}</div>
                        </button>
                      </td>
                      {days.map((iso) => {
                        const info = ligne.dates[iso];
                        const isTodayCol = isToday(iso);
                        let bgClass = 'bg-gray-100';
                        let textClass = 'text-gray-600';
                        if (info) {
                          if (info.couleur === 'libre') {
                            bgClass = 'bg-green-50';
                            textClass = 'text-green-800';
                          } else if (info.couleur === 'presque-plein') {
                            bgClass = 'bg-orange-50';
                            textClass = 'text-orange-800';
                          } else if (info.couleur === 'plein') {
                            bgClass = 'bg-red-50';
                            textClass = 'text-red-800';
                          }
                        }
                        const heures = info ? info.heures : 0;
                        const capacite = info ? (info.capacite ?? ligne.traducteur.capaciteHeuresParJour) : ligne.traducteur.capaciteHeuresParJour;
                        return (
                          <td
                            key={iso}
                            className={`border-r border-b border-border text-center px-1 py-2 ${bgClass} ${isTodayCol ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                          >
                            <button
                              onClick={() => {
                                // Navigate to tasks filtered by traducteur and date
                                const params = new URLSearchParams({
                                  traducteurId: ligne.traducteur.id,
                                  date: iso,
                                });
                                navigate(`/conseiller/taches?${params.toString()}`);
                              }}
                              className="w-full h-full hover:opacity-80 transition-opacity cursor-pointer"
                              title={`${ligne.traducteur.nom}\n${iso}\n${heures.toFixed(1)}h / ${capacite.toFixed(1)}h\nCliquer pour voir les tâches`}
                            >
                              <div className={`font-semibold ${textClass}`}>
                                {heures.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-muted">
                                / {capacite.toFixed(1)}h
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {(!planningGlobal || planningGlobal.planning.length === 0) && !loading && (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center py-8 text-muted">
                      Aucun traducteur trouvé avec ces critères
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {loading && <p className="text-xs text-muted mt-2">Chargement du planning...</p>}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
};

export default PlanningGlobal;
