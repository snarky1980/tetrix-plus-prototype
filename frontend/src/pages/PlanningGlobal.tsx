import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanningGlobal } from '../hooks/usePlanning';
import { clientService } from '../services/clientService';
import { sousDomaineService } from '../services/sousDomaineService';
import { traducteurService } from '../services/traducteurService';

const PlanningGlobal: React.FC = () => {
  usePageTitle('Tetrix PLUS Planning', 'Consultez le planning global des traductions');
  const navigate = useNavigate();
  // const { utilisateur } = useAuth(); // réservé pour filtres par rôle
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const today = useMemo(() => dateISO(new Date()), []);

  type Filters = {
    start: string;
    range: 7 | 14 | 30;
    divisions: string[];
    client: string;
    domaines: string[];
    languesSource: string[];
    languesCible: string[];
  };

  const [pending, setPending] = useState<Filters>({
    start: today,
    range: 7,
    divisions: [],
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

  // Gestion des vues sauvegardées
  type SavedView = {
    id: string;
    nom: string;
    filtres: Filters;
  };

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const stored = localStorage.getItem('planning-saved-views');
    return stored ? JSON.parse(stored) : [];
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Recherche de disponibilité
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState({
    date: today,
    heuresRequises: '',
    langueSource: '',
    langueCible: '',
  });
  const [searchResults, setSearchResults] = useState<string[]>([]);

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
      division: applied.divisions.length ? applied.divisions.join(',') : undefined,
      client: applied.client || undefined,
      domaine: applied.domaines.length ? applied.domaines.join(',') : undefined,
      langueSource: applied.languesSource.length ? applied.languesSource.join(',') : undefined,
      langueCible: applied.languesCible.length ? applied.languesCible.join(',') : undefined,
    }),
    [applied, endDate]
  );

  const { planningGlobal, loading, error } = usePlanningGlobal(params);

  const days = useMemo(() => {
    const base = new Date(applied.start || today);
    return Array.from({ length: applied.range }).map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return dateISO(d);
    });
  }, [applied.start, applied.range, today]);

  const isToday = (iso: string) => iso === today;

  const isWeekend = (iso: string) => {
    const d = new Date(iso);
    const day = d.getDay();
    return day === 0 || day === 6; // dimanche ou samedi
  };

  const handleApply = () => setApplied(pending);

  const handleReset = () => {
    const next = { ...pending, start: today, range: 7, divisions: [], client: '', domaines: [], languesSource: [], languesCible: [] } as Filters;
    setPending(next);
    setApplied(next);
  };

  const toggleDivision = (div: string) => {
    setPending((prev) => ({
      ...prev,
      divisions: prev.divisions.includes(div)
        ? prev.divisions.filter((d) => d !== div)
        : [...prev.divisions, div],
    }));
  };

  const toggleDomaine = (dom: string) => {
    setPending((prev) => ({
      ...prev,
      domaines: prev.domaines.includes(dom)
        ? prev.domaines.filter((d) => d !== dom)
        : [...prev.domaines, dom],
    }));
  };

  const toggleLangueSource = (lang: string) => {
    setPending((prev) => ({
      ...prev,
      languesSource: prev.languesSource.includes(lang)
        ? prev.languesSource.filter((l) => l !== lang)
        : [...prev.languesSource, lang],
    }));
  };

  const toggleLangueCible = (lang: string) => {
    setPending((prev) => ({
      ...prev,
      languesCible: prev.languesCible.includes(lang)
        ? prev.languesCible.filter((l) => l !== lang)
        : [...prev.languesCible, lang],
    }));
  };

  const updateField = (key: keyof Filters, value: Filters[keyof Filters]) => {
    setPending((prev) => ({ ...prev, [key]: value } as Filters));
  };

  // Fonctions pour gérer les vues sauvegardées
  const saveCurrentView = () => {
    if (!newViewName.trim()) return;
    
    const newView: SavedView = {
      id: Date.now().toString(),
      nom: newViewName.trim(),
      filtres: { ...applied },
    };
    
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem('planning-saved-views', JSON.stringify(updated));
    setNewViewName('');
    setShowSaveDialog(false);
  };

  const loadView = (view: SavedView) => {
    setPending(view.filtres);
    setApplied(view.filtres);
  };

  const deleteView = (id: string) => {
    const updated = savedViews.filter(v => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem('planning-saved-views', JSON.stringify(updated));
  };

  // Recherche de disponibilité
  const searchAvailability = () => {
    if (!searchCriteria.heuresRequises || !planningGlobal) {
      setSearchResults([]);
      return;
    }

    const heuresRequises = parseFloat(searchCriteria.heuresRequises);
    const results: string[] = [];

    planningGlobal.planning.forEach((ligne) => {
      const info = ligne.dates[searchCriteria.date];
      if (!info) return;

      const disponible = info.capacite - info.heures;
      
      // Vérifier si le traducteur a la disponibilité requise
      if (disponible >= heuresRequises) {
        // Vérifier les langues si spécifiées
        if (searchCriteria.langueSource || searchCriteria.langueCible) {
          // On devrait vérifier les paires linguistiques du traducteur
          // Pour l'instant, on inclut le traducteur
          results.push(ligne.traducteur.id);
        } else {
          results.push(ligne.traducteur.id);
        }
      }
    });

    setSearchResults(results);
  };

  const resetSearch = () => {
    setSearchCriteria({
      date: today,
      heuresRequises: '',
      langueSource: '',
      langueCible: '',
    });
    setSearchResults([]);
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
        <div className="bg-white border border-border rounded-lg shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm font-semibold p-3 hover:bg-gray-50 flex items-center gap-2">
              🔍 Affichage
            </summary>
            <div className="border-t border-border">
              {/* Accordéon - Divisions */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-3 hover:bg-gray-50">
                  Divisions {pending.divisions.length > 0 && <span className="text-primary">({pending.divisions.length} sélectionnées)</span>}
                </summary>
                <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {options.divisions.map((div) => (
                    <label key={div} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={pending.divisions.includes(div)}
                        onChange={() => toggleDivision(div)}
                        className="w-3.5 h-3.5"
                      />
                      <span>{div}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Client */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-3 hover:bg-gray-50">
                  Client {pending.client && <span className="text-primary">({pending.client})</span>}
                </summary>
                <div className="p-3 pt-0">
                  <Select
                    value={pending.client}
                    onChange={(e) => updateField('client', e.target.value)}
                    disabled={loadingOptions}
                    className="text-xs py-1.5 px-2 w-full"
                  >
                    <option value="">Tous clients</option>
                    {options.clients.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
              </details>

              {/* Accordéon - Domaines */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-3 hover:bg-gray-50">
                  Domaines {pending.domaines.length > 0 && <span className="text-primary">({pending.domaines.length} sélectionnés)</span>}
                </summary>
                <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {options.domaines.map((dom) => (
                    <label key={dom} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={pending.domaines.includes(dom)}
                        onChange={() => toggleDomaine(dom)}
                        className="w-3.5 h-3.5"
                      />
                      <span>{dom}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Langues source */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-3 hover:bg-gray-50">
                  Langues source {pending.languesSource.length > 0 && <span className="text-primary">({pending.languesSource.length} sélectionnées)</span>}
                </summary>
                <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {options.languesSource.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={pending.languesSource.includes(lang)}
                        onChange={() => toggleLangueSource(lang)}
                        className="w-3.5 h-3.5"
                      />
                      <span>{lang}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Langues cible */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-3 hover:bg-gray-50">
                  Langues cible {pending.languesCible.length > 0 && <span className="text-primary">({pending.languesCible.length} sélectionnées)</span>}
                </summary>
                <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {options.languesCible.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={pending.languesCible.includes(lang)}
                        onChange={() => toggleLangueCible(lang)}
                        className="w-3.5 h-3.5"
                      />
                      <span>{lang}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Boutons d'action */}
              <div className="p-3 flex gap-2 items-center">
                <Button variant="primaire" onClick={handleApply} loading={loading} className="px-4 py-2 text-sm">
                  Appliquer les filtres
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={loading} className="px-4 py-2 text-sm">
                  Réinitialiser
                </Button>
                {loadingOptions && <span className="text-xs text-muted ml-2">Chargement…</span>}
                {optionsError && <span className="text-xs text-red-600 ml-2">{optionsError}</span>}
                {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
              </div>
            </div>
          </details>
        </div>

        {/* Vues sauvegardées */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">📌 Vues sauvegardées</h3>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="px-3 py-1.5 text-xs"
            >
              {showSaveDialog ? 'Annuler' : '💾 Sauvegarder la vue actuelle'}
            </Button>
          </div>

          {showSaveDialog && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded flex gap-2 items-center">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Nom de la vue (ex: Droit - Semaine complète)"
                className="flex-1 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyPress={(e) => e.key === 'Enter' && saveCurrentView()}
              />
              <Button
                variant="primaire"
                onClick={saveCurrentView}
                disabled={!newViewName.trim()}
                className="px-4 py-2 text-sm"
              >
                Enregistrer
              </Button>
            </div>
          )}

          {savedViews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="border border-border rounded p-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => loadView(view)}
                      className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
                      title="Charger cette vue"
                    >
                      {view.nom}
                    </button>
                    <button
                      onClick={() => deleteView(view.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-1"
                      title="Supprimer cette vue"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-[10px] text-muted mt-1">
                    {view.filtres.divisions.length > 0 && `${view.filtres.divisions.length} division(s)`}
                    {view.filtres.client && ` · ${view.filtres.client}`}
                    {` · ${view.filtres.range}j`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-4">
              Aucune vue sauvegardée. Configurez vos filtres et cliquez sur "Sauvegarder la vue actuelle" pour créer une vue.
            </p>
          )}
        </div>

        {/* Recherche de disponibilité */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">🔎 Recherche de disponibilité</h3>
            <Button
              variant="outline"
              onClick={() => {
                setShowSearchDialog(!showSearchDialog);
                if (showSearchDialog) resetSearch();
              }}
              className="px-3 py-1.5 text-xs"
            >
              {showSearchDialog ? 'Fermer' : 'Nouvelle recherche'}
            </Button>
          </div>

          {showSearchDialog && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Date</label>
                  <input
                    type="date"
                    value={searchCriteria.date}
                    onChange={(e) => setSearchCriteria({ ...searchCriteria, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Heures requises *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={searchCriteria.heuresRequises}
                    onChange={(e) => setSearchCriteria({ ...searchCriteria, heuresRequises: e.target.value })}
                    placeholder="Ex: 4"
                    className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Langue source (optionnel)</label>
                  <Select
                    value={searchCriteria.langueSource}
                    onChange={(e) => setSearchCriteria({ ...searchCriteria, langueSource: e.target.value })}
                    className="text-sm py-2 px-2 w-full"
                  >
                    <option value="">Toutes</option>
                    {options.languesSource.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Langue cible (optionnel)</label>
                  <Select
                    value={searchCriteria.langueCible}
                    onChange={(e) => setSearchCriteria({ ...searchCriteria, langueCible: e.target.value })}
                    className="text-sm py-2 px-2 w-full"
                  >
                    <option value="">Toutes</option>
                    {options.languesCible.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primaire"
                  onClick={searchAvailability}
                  disabled={!searchCriteria.heuresRequises}
                  className="px-4 py-2 text-sm"
                >
                  🔍 Rechercher
                </Button>
                <Button
                  variant="outline"
                  onClick={resetSearch}
                  className="px-4 py-2 text-sm"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium mb-2">
                ✅ {searchResults.length} traducteur(s) disponible(s) avec {searchCriteria.heuresRequises}h le {new Date(searchCriteria.date).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-xs text-muted">
                Les traducteurs correspondants sont surlignés en jaune dans le tableau ci-dessous.
              </p>
            </div>
          )}

          {showSearchDialog && searchResults.length === 0 && searchCriteria.heuresRequises && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                ❌ Aucun traducteur disponible avec {searchCriteria.heuresRequises}h le {new Date(searchCriteria.date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>

      {/* Bouton flottant Ajouter une tâche */}
      <Button
        variant="primaire"
        onClick={() => navigate('/conseiller/taches/nouveau')}
        className="fixed bottom-6 right-6 z-50 px-6 py-3 text-base shadow-lg hover:shadow-xl transition-shadow"
        title="Ajouter une nouvelle tâche"
      >
        ➥ Ajouter une tâche
      </Button>

      {/* Planning principal */}
      <Card>
        <CardHeader>
          <CardTitle>Planning des traducteurs ({planningGlobal?.planning.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            {/* Boutons de plage */}
            <div className="flex gap-1.5 items-center">
              <span className="text-xs font-medium text-muted mr-1">Plage :</span>
              {[7, 14, 30].map((val) => (
                <Button
                  key={val}
                  variant={applied.range === val ? 'primaire' : 'outline'}
                  onClick={() => {
                    setPending((prev) => ({ ...prev, range: val as 7 | 14 | 30 }));
                    setApplied((prev) => ({ ...prev, range: val as 7 | 14 | 30 }));
                  }}
                  className="px-3 py-1.5 text-xs"
                >
                  {val} jours
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setPending((prev) => ({ ...prev, start: today }));
                  setApplied((prev) => ({ ...prev, start: today }));
                }}
                className="px-3 py-1.5 text-xs ml-2"
                title="Revenir à aujourd'hui"
              >
                📅 Aujourd'hui
              </Button>
            </div>

            <div className="h-6 w-px bg-border"></div>

            {/* Légende des couleurs */}
            <div className="flex gap-2 text-xs items-center">
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
                    const isWeekendCol = isWeekend(iso);
                    return (
                      <th
                        key={iso}
                        className={`border-r border-border px-2 py-2 text-center font-semibold min-w-[70px] ${
                          isTodayCol ? 'bg-blue-50' : isWeekendCol ? 'bg-gray-200' : ''
                        }`}
                      >
                        <div className={`${
                          isTodayCol ? 'text-blue-700 font-bold' : isWeekendCol ? 'text-gray-500' : ''
                        }`}>
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                        </div>
                        <div className={`text-[10px] ${
                          isTodayCol ? 'text-blue-600' : isWeekendCol ? 'text-gray-400' : 'text-muted'
                        }`}>
                          {dayNum}/{month}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {planningGlobal?.planning.map((ligne, idx) => {
                  const isSearchResult = searchResults.includes(ligne.traducteur.id);
                  return (
                    <tr key={ligne.traducteur.id} className={isSearchResult ? 'bg-yellow-100' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                      <td className="border-r border-b border-border px-3 py-2 font-medium sticky left-0 z-10" style={{ backgroundColor: isSearchResult ? '#fef3c7' : 'inherit' }}>
                        <button
                          onClick={() => navigate(`/admin/traducteurs/${ligne.traducteur.id}`)}
                          className="text-left w-full hover:text-primary transition-colors cursor-pointer"
                          title={`Voir la fiche de ${ligne.traducteur.nom}`}
                        >
                          <div className="truncate font-medium">
                            {ligne.traducteur.nom}
                          </div>
                          <div className="text-[10px] text-muted">{ligne.traducteur.division} · {ligne.traducteur.classification}</div>
                        </button>
                      </td>
                      {days.map((iso) => {
                        const info = ligne.dates[iso];
                        const isTodayCol = isToday(iso);
                        const isWeekendCol = isWeekend(iso);
                        let bgClass = 'bg-gray-100';
                        let textClass = 'text-gray-600';
                        
                        if (isWeekendCol) {
                          bgClass = 'bg-gray-300';
                          textClass = 'text-gray-500';
                        } else if (info) {
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
