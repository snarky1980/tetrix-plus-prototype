import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { clientService } from '../services/clientService';
import { sousDomaineService } from '../services/sousDomaineService';
import { traducteurService } from '../services/traducteurService';

const PlanificationGlobale: React.FC = () => {
  usePageTitle('Tetrix PLUS Planification', 'Consultez le planification globale des traductions');
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
    const stored = localStorage.getItem('planification-saved-views');
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

  // Modal ajout de tâche
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    numeroProjet: '',
    description: '',
    heuresRequises: '',
    typeTache: '',
    notes: '',
    dateDebut: today,
    dateFin: today,
  });

  const typesTaskes = [
    'Traduction',
    'Révision',
    'Relecture',
    'Correction d\'épreuves',
    'Traduction + Révision',
    'Mise en page',
    'Terminologie',
    'Recherche',
    'Autre',
  ];

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

  const { planificationGlobale, loading, error } = usePlanificationGlobal(params);

  // Fonction utilitaire pour détecter les weekends
  const isWeekend = (iso: string) => {
    const d = new Date(iso);
    const day = d.getDay();
    return day === 0 || day === 6; // dimanche ou samedi
  };

  const isToday = (iso: string) => iso === today;

  // Enrichir planificationGlobale pour inclure les weekends avec données vides
  const planificationEnrichie = useMemo(() => {
    if (!planificationGlobale) return null;
    
    return {
      ...planificationGlobale,
      planification: planificationGlobale.planification.map((ligne) => {
        const datesCopy = { ...ligne.dates };
        
        // Ajouter les weekends manquants avec des données vides
        const base = new Date(applied.start || today);
        for (let i = 0; i < applied.range; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const dateStr = dateISO(d);
          
          if (isWeekend(dateStr) && !datesCopy[dateStr]) {
            datesCopy[dateStr] = {
              heures: 0,
              couleur: 'libre' as const,
              capacite: 0,
              disponible: 0,
              estWeekend: true,
            };
          }
        }
        
        return {
          ...ligne,
          dates: datesCopy,
        };
      }),
    };
  }, [planificationGlobale, applied.start, applied.range, today]);

  const days = useMemo(() => {
    const base = new Date(applied.start || today);
    return Array.from({ length: applied.range }).map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return dateISO(d);
    });
  }, [applied.start, applied.range, today]);

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
    localStorage.setItem('planification-saved-views', JSON.stringify(updated));
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
    localStorage.setItem('planification-saved-views', JSON.stringify(updated));
  };

  // Recherche de disponibilité
  const searchAvailability = () => {
    if (!searchCriteria.heuresRequises || !planificationEnrichie) {
      setSearchResults([]);
      return;
    }

    const heuresRequises = parseFloat(searchCriteria.heuresRequises);
    const results: string[] = [];

    planificationEnrichie.planification.forEach((ligne) => {
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

  // Gestion du modal d'ajout de tâche
  const resetNewTask = () => {
    setNewTask({
      numeroProjet: '',
      description: '',
      heuresRequises: '',
      typeTache: '',
      notes: '',
      dateDebut: today,
      dateFin: today,
    });
  };

  const handleAddTask = () => {
    // TODO: Appeler l'API pour créer la tâche
    console.log('Nouvelle tâche:', newTask);
    // La date d'attribution sera enregistrée par le backend avec new Date()
    setShowAddTaskModal(false);
    resetNewTask();
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
    <AppLayout titre="Planification globale">
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Panneau latéral gauche - Contrôles */}
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-3">
          {/* Filtres compacts */}
          <div className="bg-white border border-border rounded-lg shadow-sm">
            <details open>
              <summary className="cursor-pointer text-sm font-semibold p-3 hover:bg-gray-50 flex items-center gap-2">
                🔍 Affichage
              </summary>
              <div className="border-t border-border">
              {/* Accordéon - Divisions */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-2 hover:bg-gray-50">
                  Divisions {pending.divisions.length > 0 && <span className="text-primary text-[10px]">: {pending.divisions.join(', ')}</span>}
                </summary>
                <div className="p-2 pt-0 space-y-1">
                  {options.divisions.map((div) => (
                    <label key={div} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={pending.divisions.includes(div)}
                        onChange={() => toggleDivision(div)}
                        className="w-3 h-3"
                      />
                      <span className="truncate">{div}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Client */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-2 hover:bg-gray-50">
                  Client {pending.client && <span className="text-primary">✓</span>}
                </summary>
                <div className="p-2 pt-0">
                  <Select
                    value={pending.client}
                    onChange={(e) => updateField('client', e.target.value)}
                    disabled={loadingOptions}
                    className="text-xs py-1 px-2 w-full"
                  >
                    <option value="">Tous</option>
                    {options.clients.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
              </details>

              {/* Accordéon - Domaines */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-2 hover:bg-gray-50">
                  Domaines {pending.domaines.length > 0 && <span className="text-primary text-[10px]">: {pending.domaines.join(', ')}</span>}
                </summary>
                <div className="p-2 pt-0 space-y-1">
                  {options.domaines.map((dom) => (
                    <label key={dom} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={pending.domaines.includes(dom)}
                        onChange={() => toggleDomaine(dom)}
                        className="w-3 h-3"
                      />
                      <span className="truncate">{dom}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Langues source */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-2 hover:bg-gray-50">
                  Langues source {pending.languesSource.length > 0 && <span className="text-primary text-[10px]">: {pending.languesSource.join(', ')}</span>}
                </summary>
                <div className="p-2 pt-0 space-y-1">
                  {options.languesSource.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={pending.languesSource.includes(lang)}
                        onChange={() => toggleLangueSource(lang)}
                        className="w-3 h-3"
                      />
                      <span className="truncate">{lang}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Langues cible */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium p-2 hover:bg-gray-50">
                  Langues cible {pending.languesCible.length > 0 && <span className="text-primary text-[10px]">: {pending.languesCible.join(', ')}</span>}
                </summary>
                <div className="p-2 pt-0 space-y-1">
                  {options.languesCible.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={pending.languesCible.includes(lang)}
                        onChange={() => toggleLangueCible(lang)}
                        className="w-3 h-3"
                      />
                      <span className="truncate">{lang}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Boutons d'action */}
              <div className="p-2 space-y-2">
                <Button variant="primaire" onClick={handleApply} loading={loading} className="w-full px-3 py-2 text-xs">
                  ✓ Appliquer
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={loading} className="w-full px-3 py-2 text-xs">
                  ↺ Réinitialiser
                </Button>
                {loadingOptions && <p className="text-[10px] text-muted">Chargement…</p>}
                {optionsError && <p className="text-[10px] text-red-600">{optionsError}</p>}
                {error && <p className="text-[10px] text-red-600">{error}</p>}
              </div>
            </div>
          </details>
        </div>

        {/* Vues sauvegardées */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-2">
          <details>
            <summary className="cursor-pointer text-sm font-semibold mb-2 hover:bg-gray-50 p-1 rounded flex items-center gap-2">
              📌 Vues sauvegardées
            </summary>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                className="w-full px-3 py-1.5 text-xs"
              >
                {showSaveDialog ? '✕ Annuler' : '💾 Nouvelle vue'}
              </Button>

              {showSaveDialog && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded space-y-2">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="Nom de la vue..."
                    className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyPress={(e) => e.key === 'Enter' && saveCurrentView()}
                  />
                  <Button
                    variant="primaire"
                    onClick={saveCurrentView}
                    disabled={!newViewName.trim()}
                    className="w-full px-3 py-1 text-xs"
                  >
                    ✓ Enregistrer
                  </Button>
                </div>
              )}

              {savedViews.length > 0 ? (
                <div className="space-y-1">
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="border border-border rounded p-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <button
                          onClick={() => loadView(view)}
                          className="flex-1 text-left text-xs font-medium hover:text-primary transition-colors truncate"
                          title={view.nom}
                        >
                          {view.nom}
                        </button>
                        <button
                          onClick={() => deleteView(view.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 truncate">
                        {view.filtres.range}j{view.filtres.divisions.length > 0 && ` · ${view.filtres.divisions.length} div`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted text-center py-2">
                  Aucune vue sauvegardée
                </p>
              )}
            </div>
          </details>
        </div>

        {/* Recherche de disponibilité */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-2">
          <details>
            <summary className="cursor-pointer text-sm font-semibold mb-2 hover:bg-gray-50 p-1 rounded flex items-center gap-2">
              🔎 Recherche
            </summary>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSearchDialog(!showSearchDialog);
                  if (showSearchDialog) resetSearch();
                }}
                className="w-full px-3 py-1.5 text-xs"
              >
                {showSearchDialog ? '✕ Annuler' : '🔍 Nouvelle recherche'}
              </Button>

              {showSearchDialog && (
                <div className="p-2 bg-green-50 border border-green-200 rounded space-y-2">
                  <div>
                    <label className="text-[10px] font-medium block mb-1">Date</label>
                    <input
                      type="date"
                      value={searchCriteria.date}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, date: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium block mb-1">Heures *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={searchCriteria.heuresRequises}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, heuresRequises: e.target.value })}
                      placeholder="Ex: 4"
                      className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium block mb-1">Langue source</label>
                    <Select
                      value={searchCriteria.langueSource}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, langueSource: e.target.value })}
                      className="text-xs py-1 px-2 w-full"
                    >
                      <option value="">Toutes</option>
                      {options.languesSource.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium block mb-1">Langue cible</label>
                    <Select
                      value={searchCriteria.langueCible}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, langueCible: e.target.value })}
                      className="text-xs py-1 px-2 w-full"
                    >
                      <option value="">Toutes</option>
                      {options.languesCible.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1 pt-1">
                    <Button
                      variant="primaire"
                      onClick={searchAvailability}
                      disabled={!searchCriteria.heuresRequises}
                      className="w-full px-3 py-1.5 text-xs"
                    >
                      🔍 Rechercher
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetSearch}
                      className="w-full px-3 py-1.5 text-xs"
                    >
                      ↺ Réinitialiser
                    </Button>
                  </div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs font-medium">
                    ✅ {searchResults.length} trouvé(s)
                  </p>
                  <p className="text-[10px] text-muted mt-1">
                    Surlignés en jaune →
                  </p>
                </div>
              )}

              {showSearchDialog && searchResults.length === 0 && searchCriteria.heuresRequises && (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-800">
                    ❌ Aucun disponible
                  </p>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* Bouton flottant Ajouter une tâche */}
      <Button
        variant="primaire"
        onClick={() => setShowAddTaskModal(true)}
        className="fixed bottom-6 right-6 z-50 px-6 py-3 text-base shadow-lg hover:shadow-xl transition-shadow"
        title="Ajouter une nouvelle tâche"
      >
        ➕ Ajouter une tâche
      </Button>

      {/* Modal Ajouter une tâche */}
      <Modal
        titre="Ajouter une tâche"
        ouvert={showAddTaskModal}
        onFermer={() => {
          setShowAddTaskModal(false);
          resetNewTask();
        }}
        ariaDescription="Formulaire pour créer une nouvelle tâche de traduction"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Numéro de projet *</label>
            <Input
              type="text"
              value={newTask.numeroProjet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, numeroProjet: e.target.value })}
              placeholder="Ex: PRJ-2025-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type de tâche *</label>
            <Select
              value={newTask.typeTache}
              onChange={(e) => setNewTask({ ...newTask, typeTache: e.target.value })}
              required
            >
              <option value="">Sélectionner...</option>
              {typesTaskes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Heures requises *</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={newTask.heuresRequises}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, heuresRequises: e.target.value })}
              placeholder="Ex: 4"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date de début *</label>
              <Input
                type="date"
                value={newTask.dateDebut}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, dateDebut: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin *</label>
              <Input
                type="date"
                value={newTask.dateFin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, dateFin: e.target.value })}
                min={newTask.dateDebut}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Décrivez brièvement la tâche..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
            <textarea
              value={newTask.notes}
              onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
              placeholder="Notes additionnelles sur la distribution des heures, priorités, etc."
              rows={2}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-muted">
            ℹ️ Le moment de l'attribution sera automatiquement enregistré lors de la création de la tâche.
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTaskModal(false);
                resetNewTask();
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primaire"
              onClick={handleAddTask}
              disabled={!newTask.numeroProjet || !newTask.typeTache || !newTask.heuresRequises || !newTask.dateDebut || !newTask.dateFin}
            >
              Créer la tâche
            </Button>
          </div>
        </div>
      </Modal>

      {/* Panneau principal à droite - Tableau de planification */}
      <div className="flex-1 bg-white border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
        {/* En-tête compact avec contrôles de plage */}
        <div className="border-b border-border px-3 py-2 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">
              Planification ({planificationEnrichie?.planification.length || 0} traducteurs)
            </h2>
            {/* Boutons de plage */}
            <div className="flex gap-1 items-center">
              {[7, 14, 30].map((val) => (
                <Button
                  key={val}
                  variant={applied.range === val ? 'primaire' : 'outline'}
                  onClick={() => {
                    setPending((prev) => ({ ...prev, range: val as 7 | 14 | 30 }));
                    setApplied((prev) => ({ ...prev, range: val as 7 | 14 | 30 }));
                  }}
                  className="px-2 py-1 text-xs"
                >
                  {val}j
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setPending((prev) => ({ ...prev, start: today }));
                  setApplied((prev) => ({ ...prev, start: today }));
                }}
                className="px-2 py-1 text-xs"
                title="Aujourd'hui"
              >
                📅
              </Button>
            </div>
          </div>

          {/* Légende des couleurs - compacte */}
          <div className="flex gap-2 text-[10px] items-center">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100">
              <span className="w-2 h-2 rounded bg-green-500"></span>
              Libre
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100">
              <span className="w-2 h-2 rounded bg-orange-500"></span>
              ≈Plein
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100">
              <span className="w-2 h-2 rounded bg-red-600"></span>
              Plein
            </span>
          </div>
        </div>

        {/* Zone de tableau avec défilement */}
        <div className="flex-1 overflow-auto">
          {loading && <p className="text-xs text-muted text-center py-4">Chargement...</p>}
          {error && <p className="text-xs text-red-600 text-center py-4">{error}</p>}
          {!loading && !error && (
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
                {planificationEnrichie?.planification.map((ligne, idx) => {
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
                            {isWeekendCol ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className={`font-semibold ${textClass}`}>—</div>
                              </div>
                            ) : (
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
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {(!planificationEnrichie || planificationEnrichie.planification.length === 0) && (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center py-8 text-muted text-xs">
                      Aucun traducteur trouvé avec ces critères
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
};

export default PlanificationGlobale;
