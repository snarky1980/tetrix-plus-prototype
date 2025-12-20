import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { DateTimeInput } from '../components/ui/DateTimeInput';
import { Modal } from '../components/ui/Modal';
import { TetrixMasterDisplay } from '../components/tetrixmaster/TetrixMasterDisplay';
import { TetrixOrionDisplay } from '../components/orion/TetrixOrionDisplay';
import BoutonPlanificationTraducteur from '../components/BoutonPlanificationTraducteur';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { useAutoRefresh, formatTimeAgo } from '../hooks/useAutoRefresh';
import { clientService } from '../services/clientService';
import { sousDomaineService } from '../services/sousDomaineService';
import { traducteurService } from '../services/traducteurService';
import { tacheService } from '../services/tacheService';
import { repartitionService } from '../services/repartitionService';
import optimisationService from '../services/optimisationService';
import { nowOttawa, todayOttawa, formatOttawaISO, parseOttawaDateISO, parseOttawaTimestamp, addDaysOttawa, subDaysOttawa, isWeekendOttawa, differenceInDaysOttawa, formatDateTimeDisplay, getNextBusinessDay } from '../utils/dateTimeOttawa';
import { formatNumeroProjet, formatDateAvecJour } from '../utils/formatters';
import type { Traducteur, Client, SousDomaine, PaireLinguistique } from '../types';
import { useAuth } from '../contexts/AuthContext';

const PlanificationGlobale: React.FC = () => {
  usePageTitle('Tetrix PLUS Planification', 'Consultez le planification globale des traductions');
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  
  // Utiliser les fonctions timezone-aware d'Ottawa
  const dateISO = formatOttawaISO;
  const parseISODate = parseOttawaDateISO;
  
  // Fonction helper pour convertir "9h", "13h30" en "09:00", "13:30"
  const convertirHeureVersFomatHTML = (heure: string | undefined): string => {
    if (!heure) return '09:00';
    // Si déjà au bon format (HH:MM), retourner tel quel
    if (/^\d{2}:\d{2}$/.test(heure)) return heure;
    
    // Convertir "9h", "13h30", "9h00" etc. en "09:00", "13:30"
    const match = heure.match(/^(\d{1,2})h(\d{2})?$/);
    if (match) {
      const heures = match[1].padStart(2, '0');
      const minutes = match[2] || '00';
      return `${heures}:${minutes}`;
    }
    return '09:00'; // Fallback
  };
  
  // Fonction pour calculer l'heure de fin en fonction du début et de la durée
  const calculerHeureFin = (heureDebut: string, heures: number): string => {
    // Convertir l'heure de début en nombre décimal (ex: "09:30" -> 9.5)
    const [h, m] = heureDebut.split(':').map(Number);
    let debut = h + m / 60;
    
    // Calculer la fin
    let fin = debut + heures;
    
    // Si on traverse la pause midi (12h-13h), ajouter 1h
    if (debut < 12 && fin > 12) {
      fin += 1;
    }
    
    // Convertir en format HH:MM
    const heuresFin = Math.floor(fin);
    const minutesFin = Math.round((fin - heuresFin) * 60);
    
    return `${heuresFin.toString().padStart(2, '0')}:${minutesFin.toString().padStart(2, '0')}`;
  };
  
  // Calculer la date actuelle à Ottawa (pas en cache pour avoir l'heure exacte)
  const now = nowOttawa();
  const today = formatOttawaISO(todayOttawa());
  console.log('[PlanificationGlobale] Date actuelle Ottawa:', now.toString());
  console.log('[PlanificationGlobale] Today ISO Ottawa:', today);
  console.log('[PlanificationGlobale] Jour de la semaine:', now.getDay(), ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][now.getDay()]);

  type Filters = {
    start: string;
    range: 7 | 14 | 30;
    divisions: string[];
    clients: string[];
    domaines: string[];
    languesSource: string[];
    languesCible: string[];
  };

  const [pending, setPending] = useState<Filters>({
    start: today,
    range: 7,
    divisions: [],
    clients: [],
    domaines: [],
    languesSource: [],
    languesCible: [],
  });

  const [applied, setApplied] = useState<Filters>({
    start: today,
    range: 7,
    divisions: [],
    clients: [],
    domaines: [],
    languesSource: [],
    languesCible: [],
  });

  const [options, setOptions] = useState({
    divisions: [] as string[],
    clients: [] as string[],
    domaines: [] as string[],
    languesSource: [] as string[],
    languesCible: [] as string[],
    traducteurs: [] as { id: string; nom: string }[],
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
  const [showCustomRangeDialog, setShowCustomRangeDialog] = useState(false);
  const [customRangeStart, setCustomRangeStart] = useState(today);
  const [customRangeEnd, setCustomRangeEnd] = useState(formatOttawaISO(addDaysOttawa(todayOttawa(), 30)));
  const [searchCriteria, setSearchCriteria] = useState({
    dateDebut: today,
    dateFin: formatOttawaISO(addDaysOttawa(todayOttawa(), 14)), // +14 jours par défaut
    heuresRequises: '',
    client: '',
    domaine: '',
    langueSource: '',
    langueCible: '',
    disponiblesUniquement: false,
  });
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<'availability' | 'immediate' | null>(null);

  // Modal statistiques Tetrix Orion
  const [showOrionModal, setShowOrionModal] = useState(false);
  const [rapportOrion, setRapportOrion] = useState<any>(null);
  const [chargementOrion, setChargementOrion] = useState(false);
  const [erreurOrion, setErreurOrion] = useState<string | null>(null);

  // Référence pour le scroll horizontal
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Toggle pour afficher heures disponibles vs occupées
  const [showAvailable, setShowAvailable] = useState(true);

  // Recherche de traducteur pour éviter le défilement
  const [searchTraducteur, setSearchTraducteur] = useState('');

  // Modal ajout de tâche - État complet
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [etapeCreation, setEtapeCreation] = useState(1); // 1 = infos, 2 = répartition
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sousDomaines, setSousDomaines] = useState<SousDomaine[]>([]);
  const [pairesDisponibles, setPairesDisponibles] = useState<PaireLinguistique[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [erreurCreation, setErreurCreation] = useState('');

  const [formTache, setFormTache] = useState({
    numeroProjet: '',
    traducteurId: '',
    clientId: '',
    sousDomaineId: '',
    paireLinguistiqueId: '',
    typeTache: 'TRADUCTION' as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE',
    specialisation: '',
    description: '',
    heuresTotal: '',
    compteMots: '' as string | number,
    dateEcheance: '',
    heureEcheance: '17:00',
    priorite: 'REGULIER' as 'URGENT' | 'REGULIER',
    typeRepartition: 'JUSTE_TEMPS' as 'JUSTE_TEMPS' | 'EQUILIBRE' | 'PEPS' | 'MANUEL',
    dateDebut: today,
    dateFin: '',
    repartitionAuto: true,
    repartitionManuelle: [] as { date: string; heures: number }[],
  });

  // Preview de répartition
  const [previewRepartition, setPreviewRepartition] = useState<{ date: string; heures: number; heureDebut?: string; heureFin?: string }[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [erreurPreview, setErreurPreview] = useState('');

  // Modal édition de tâche
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [tacheEnEdition, setTacheEnEdition] = useState<string | null>(null);
  const [etapeEdition, setEtapeEdition] = useState(1);
  const [formEdition, setFormEdition] = useState({
    numeroProjet: '',
    traducteurId: '',
    clientId: '',
    sousDomaineId: '',
    paireLinguistiqueId: '',
    typeTache: 'TRADUCTION' as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE',
    specialisation: '',
    description: '',
    heuresTotal: 0,
    compteMots: 0,
    dateEcheance: '',
    heureEcheance: '17:00',
    priorite: 'REGULIER' as 'URGENT' | 'REGULIER',
    typeRepartition: 'JUSTE_TEMPS' as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL',
    dateDebut: '',
    dateFin: '',
    repartitionAuto: true,
    repartitionManuelle: [] as { date: string; heures: number }[],
  });
  const [previewJATEdit, setPreviewJATEdit] = useState<{ date: string; heures: number }[] | null>(null);
  const [loadingPreviewEdit, setLoadingPreviewEdit] = useState(false);
  const [erreurEdition, setErreurEdition] = useState('');

  // État pour le panneau gauche collapsible
  const [panneauOuvert, setPanneauOuvert] = useState(true);

  // État pour afficher les tâches d'une cellule sélectionnée
  const [celluleSelectionnee, setCelluleSelectionnee] = useState<{
    traducteurId: string;
    traducteurNom: string;
    date: string;
    taches: any[];
  } | null>(null);
  const [loadingTaches, setLoadingTaches] = useState(false);
  const [tacheDetaillee, setTacheDetaillee] = useState<any | null>(null);

  // État pour la modal de blocage de temps
  const [showBlocageModal, setShowBlocageModal] = useState(false);
  const [formBlocage, setFormBlocage] = useState({
    traducteurId: '',
    date: today,
    heureDebut: '09:00',
    heureFin: '17:00',
    motif: ''
  });
  const [submittingBlocage, setSubmittingBlocage] = useState(false);
  const [erreurBlocage, setErreurBlocage] = useState('');

  // État pour la modal des tâches du conseiller
  const [showMesTachesModal, setShowMesTachesModal] = useState(false);
  const [mesTaches, setMesTaches] = useState<any[]>([]);
  const [mesTachesFiltered, setMesTachesFiltered] = useState<any[]>([]);
  const [loadingMesTaches, setLoadingMesTaches] = useState(false);
  const [filtresMesTaches, setFiltresMesTaches] = useState({
    statut: '',
    traducteur: '',
    recherche: '',
  });

  // État pour Tetrix Master (optimisation)
  const [showTetrixMaster, setShowTetrixMaster] = useState(false);
  const [analyseOptimisation, setAnalyseOptimisation] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingOptimisation, setLoadingOptimisation] = useState(false);
  const [erreurOptimisation, setErreurOptimisation] = useState<string>('');
  const [etapeOptimisation, setEtapeOptimisation] = useState<'analyse' | 'suggestions'>('analyse');

  // État pour afficher le détail de charge de travail d'un traducteur
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeTraducteur, setChargeTraducteur] = useState<{
    traducteur: any;
    tachesTotales: any[];
    heuresTotal: number;
    tachesParStatut: any;
  } | null>(null);
  const [loadingCharge, setLoadingCharge] = useState(false);

  const endDate = useMemo(() => {
    const base = parseISODate(applied.start || today);
    const end = addDaysOttawa(base, applied.range - 1);
    return formatOttawaISO(end);
  }, [applied.start, applied.range, today]);

  const params = useMemo(
    () => ({
      dateDebut: applied.start,
      dateFin: endDate,
      division: applied.divisions.length ? applied.divisions.join(',') : undefined,
      client: applied.clients.length ? applied.clients.join(',') : undefined,
      domaine: applied.domaines.length ? applied.domaines.join(',') : undefined,
      langueSource: applied.languesSource.length ? applied.languesSource.join(',') : undefined,
      langueCible: applied.languesCible.length ? applied.languesCible.join(',') : undefined,
    }),
    [applied, endDate]
  );

  const { planificationGlobale, loading, error, refresh } = usePlanificationGlobal(params);

  // Auto-refresh toutes les 2 minutes (modifiable par l'utilisateur)
  const { lastRefresh, isRefreshing, isEnabled, toggleEnabled } = useAutoRefresh({
    enabled: true,
    intervalMs: 120000, // 2 minutes
    onRefresh: refresh,
    pauseWhenHidden: true,
  });

  // Fonction utilitaire pour détecter les weekends (timezone Ottawa)
  const isWeekend = (iso: string) => {
    return isWeekendOttawa(parseISODate(iso));
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
        const base = parseISODate(applied.start || today);
        for (let i = 0; i < applied.range; i++) {
          const d = addDaysOttawa(base, i);
          const dateStr = formatOttawaISO(d);
          
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
    const base = parseISODate(applied.start || today);
    return Array.from({ length: applied.range }).map((_, i) => {
      return formatOttawaISO(addDaysOttawa(base, i));
    });
  }, [applied.start, applied.range, today]);

  const handleApplyCustomRange = () => {
    const start = parseISODate(customRangeStart);
    const end = parseISODate(customRangeEnd);
    const range = differenceInDaysOttawa(end, start) + 1; // +1 pour inclure le dernier jour
    
    setPending((prev) => ({
      ...prev,
      start: customRangeStart,
      range: range as 7 | 14 | 30,
    }));
    setApplied((prev) => ({
      ...prev,
      start: customRangeStart,
      range: range as 7 | 14 | 30,
    }));
    setShowCustomRangeDialog(false);
  };

  const handleApply = () => setApplied(pending);

  const handleReset = () => {
    const next = { ...pending, start: today, range: 7, divisions: [], clients: [], domaines: [], languesSource: [], languesCible: [] } as Filters;
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

  const toggleClient = (client: string) => {
    setPending((prev) => ({
      ...prev,
      clients: prev.clients.includes(client)
        ? prev.clients.filter((c) => c !== client)
        : [...prev.clients, client],
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

    // Calculer le nombre de jours ouvrables dans la plage de recherche
    const dateDebut = parseISODate(searchCriteria.dateDebut);
    const dateFin = parseISODate(searchCriteria.dateFin);
    let joursOuvrables = 0;
    const nbJours = differenceInDaysOttawa(dateFin, dateDebut) + 1;
    for (let i = 0; i < nbJours; i++) {
      const d = addDaysOttawa(dateDebut, i);
      if (!isWeekendOttawa(d)) {
        joursOuvrables++;
      }
    }

    planificationEnrichie.planification.forEach((ligne) => {
      const trad = ligne.traducteur as any;
      
      // Filtrer par client (si spécifié)
      if (searchCriteria.client) {
        const clientsHabituels = trad.clientsHabituels || [];
        if (!clientsHabituels.includes(searchCriteria.client)) {
          return; // Ce traducteur ne fait pas ce client
        }
      }
      
      // Filtrer par domaine (si spécifié)
      if (searchCriteria.domaine) {
        const domaines = trad.domaines || [];
        if (!domaines.includes(searchCriteria.domaine)) {
          return; // Ce traducteur ne fait pas ce domaine
        }
      }
      
      // Filtrer par langue source (si spécifié)
      if (searchCriteria.langueSource) {
        const paires = trad.pairesLinguistiques || [];
        const hasLangueSource = paires.some((p: any) => p.langueSource === searchCriteria.langueSource);
        if (!hasLangueSource) {
          return; // Ce traducteur ne fait pas cette langue source
        }
      }
      
      // Filtrer par langue cible (si spécifié)
      if (searchCriteria.langueCible) {
        const paires = trad.pairesLinguistiques || [];
        const hasLangueCible = paires.some((p: any) => p.langueCible === searchCriteria.langueCible);
        if (!hasLangueCible) {
          return; // Ce traducteur ne fait pas cette langue cible
        }
      }
      
      // Filtrer par statut disponible (si activé)
      if (searchCriteria.disponiblesUniquement && !trad.disponiblePourTravail) {
        return; // Ce traducteur n'a pas signalé être disponible
      }
      
      // Calculer la disponibilité basée sur la capacité du traducteur
      const capaciteParJour = trad.capaciteHeuresParJour || 7;
      
      // Calculer les heures déjà assignées dans la période
      let heuresAssignees = 0;
      Object.entries(ligne.dates).forEach(([dateStr, info]) => {
        if (dateStr >= searchCriteria.dateDebut && dateStr <= searchCriteria.dateFin) {
          const estWeekend = info.estWeekend ?? isWeekend(dateStr);
          if (!estWeekend) {
            heuresAssignees += info.heures ?? 0;
          }
        }
      });
      
      // Disponibilité = (capacité par jour * jours ouvrables) - heures déjà assignées
      const disponibleTotal = (capaciteParJour * joursOuvrables) - heuresAssignees;
      
      // Vérifier si le traducteur a la disponibilité requise sur la période
      if (disponibleTotal >= heuresRequises) {
        results.push(trad.id);
      }
    });

    setSearchResults(results);
    setSearchType('availability');
  };

  const resetSearch = () => {
    setSearchCriteria({
      dateDebut: today,
      dateFin: formatOttawaISO(addDaysOttawa(todayOttawa(), 14)),
      heuresRequises: '',
      client: '',
      domaine: '',
      langueSource: '',
      langueCible: '',
      disponiblesUniquement: false,
    });
    setSearchResults([]);
    setSearchType(null);
  };

  // Gestion du modal d'ajout de tâche
  const resetFormTache = () => {
    setFormTache({
      numeroProjet: '',
      traducteurId: '',
      clientId: '',
      sousDomaineId: '',
      paireLinguistiqueId: '',
      typeTache: 'TRADUCTION',
      specialisation: '',
      description: '',
      heuresTotal: '',
      compteMots: '',
      dateEcheance: '',
      heureEcheance: '17:00',
      priorite: 'REGULIER',
      typeRepartition: 'JUSTE_TEMPS',
      dateDebut: today,
      dateFin: '',
      repartitionAuto: true,
      repartitionManuelle: [],
    });
    setPairesDisponibles([]);
    setPreviewRepartition(null);
    setEtapeCreation(1);
    setErreurCreation('');
  };

  // Charger les paires linguistiques quand le traducteur change
  useEffect(() => {
    if (formTache.traducteurId) {
      const trad = traducteurs.find(t => t.id === formTache.traducteurId);
      setPairesDisponibles(trad?.pairesLinguistiques || []);
      setFormTache(prev => ({ ...prev, paireLinguistiqueId: '' }));
    }
  }, [formTache.traducteurId, traducteurs]);

  // Auto-remplir les dates pour le mode ÉQUILIBRÉ
  useEffect(() => {
    if (formTache.typeRepartition === 'EQUILIBRE' && formTache.dateEcheance) {
      // Extraire la date seule si timestamp
      const dateEcheanceStr = formTache.dateEcheance.includes('T') 
        ? formTache.dateEcheance.split('T')[0] 
        : formTache.dateEcheance;
      
      try {
        // Date de début: Prochain jour ouvrable à 9h00
        const nextBusinessDay = getNextBusinessDay();
        const dateDebutStr = formatOttawaISO(nextBusinessDay) + 'T09:00';
        
        // Date de fin: Échéance - 1 jour à 17h00
        const dateEcheance = parseOttawaDateISO(dateEcheanceStr);
        const dateFinObj = subDaysOttawa(dateEcheance, 1);
        const dateFinStr = formatOttawaISO(dateFinObj) + 'T17:00';
        
        setFormTache(prev => ({
          ...prev,
          dateDebut: dateDebutStr,
          dateFin: dateFinStr
        }));
      } catch (error) {
        console.error('Erreur calcul dates ÉQUILIBRÉ:', error);
      }
    }
  }, [formTache.typeRepartition, formTache.dateEcheance]);

  // Auto-remplir la date de début pour le mode PEPS
  useEffect(() => {
    if (formTache.typeRepartition === 'PEPS' && !formTache.dateDebut) {
      try {
        // PEPS: Date courante avec prochaine heure arrondie
        const maintenant = nowOttawa();
        const heureActuelle = maintenant.getHours();
        const minuteActuelle = maintenant.getMinutes();
        
        // Arrondir à la prochaine heure
        let prochaineHeure = heureActuelle;
        if (minuteActuelle > 0) {
          prochaineHeure = heureActuelle + 1;
        }
        
        // Si on est après 17h, passer au lendemain à 9h
        let dateDebut: Date;
        if (prochaineHeure >= 17) {
          dateDebut = getNextBusinessDay();
          prochaineHeure = 9;
        } else {
          dateDebut = maintenant;
          // Si on est avant 9h, commencer à 9h
          if (prochaineHeure < 9) {
            prochaineHeure = 9;
          }
        }
        
        const dateDebutStr = formatOttawaISO(dateDebut) + 'T' + String(prochaineHeure).padStart(2, '0') + ':00';
        
        setFormTache(prev => ({
          ...prev,
          dateDebut: dateDebutStr
        }));
      } catch (error) {
        console.error('Erreur calcul date début PEPS:', error);
      }
    }
  }, [formTache.typeRepartition]);

  const chargerPreviewRepartition = async () => {
    const heures = parseFloat(formTache.heuresTotal as string);
    if (heures <= 0) return;
    
    setLoadingPreview(true);
    setErreurPreview('');
    try {
      let result: { date: string; heures: number; heureDebut?: string; heureFin?: string }[] = [];
      
      if (formTache.typeRepartition === 'JUSTE_TEMPS') {
        if (!formTache.traducteurId || !formTache.dateEcheance) return;
        result = await repartitionService.previewJAT({
          traducteurId: formTache.traducteurId,
          heuresTotal: heures,
          dateEcheance: formTache.dateEcheance,
        });
      } else if (formTache.typeRepartition === 'EQUILIBRE') {
        if (!formTache.dateDebut || !formTache.dateFin) {
          setErreurPreview('Veuillez sélectionner une date de début et de fin');
          return;
        }
        if (!formTache.traducteurId) {
          setErreurPreview('Veuillez sélectionner un traducteur');
          return;
        }
        result = await repartitionService.calculerRepartitionEquilibree({
          traducteurId: formTache.traducteurId,
          heuresTotal: heures,
          dateDebut: formTache.dateDebut,
          dateFin: formTache.dateFin,
        });
      } else if (formTache.typeRepartition === 'PEPS') {
        if (!formTache.dateDebut || !formTache.dateEcheance) {
          setErreurPreview('Veuillez sélectionner une date de début');
          return;
        }
        if (!formTache.traducteurId) {
          setErreurPreview('Veuillez sélectionner un traducteur');
          return;
        }
        result = await repartitionService.calculerRepartitionPEPS({
          traducteurId: formTache.traducteurId,
          heuresTotal: heures,
          dateDebut: formTache.dateDebut,
          dateEcheance: formTache.dateEcheance,
        });
      } else if (formTache.typeRepartition === 'MANUEL') {
        // Mode manuel : utiliser la répartition saisie par l'utilisateur
        result = formTache.repartitionManuelle as any;
      }
      
      // S'assurer que tous les items ont des heures par défaut si non fournies par le backend
      const resultWithDefaults = result.map(item => ({
        ...item,
        heureDebut: item.heureDebut || '09:00',
        heureFin: item.heureFin || '17:00'
      }));
      
      setPreviewRepartition(resultWithDefaults);
    } catch (err: any) {
      console.error('Erreur preview répartition:', err);
      setErreurPreview('Erreur : ' + (err.message || 'Calcul impossible'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const validerEtape1 = () => {
    if (!formTache.numeroProjet.trim()) {
      setErreurCreation('Veuillez saisir un numéro de projet');
      return false;
    }
    if (!formTache.traducteurId) {
      setErreurCreation('Veuillez sélectionner un traducteur');
      return false;
    }
    if (!formTache.typeTache) {
      setErreurCreation('Veuillez sélectionner un type de tâche');
      return false;
    }
    const heures = parseFloat(formTache.heuresTotal as string);
    if (!formTache.heuresTotal || isNaN(heures) || heures <= 0) {
      setErreurCreation('Les heures doivent être supérieures à 0');
      return false;
    }
    if (!formTache.dateEcheance) {
      setErreurCreation('Veuillez sélectionner une date d\'échéance');
      return false;
    }
    if (formTache.typeRepartition === 'EQUILIBRE') {
      if (!formTache.dateDebut) {
        setErreurCreation('Veuillez saisir une date de début');
        return false;
      }
      if (!formTache.dateFin) {
        setErreurCreation('Veuillez saisir une date de fin');
        return false;
      }
      if (formTache.dateDebut > formTache.dateFin) {
        setErreurCreation('La date de début doit être avant la date de fin');
        return false;
      }
    }
    setErreurCreation('');
    return true;
  };

  const handleEtape1Suivant = () => {
    if (validerEtape1()) {
      // Calculer la prévisualisation pour tous les modes sauf MANUEL
      if (formTache.typeRepartition !== 'MANUEL') {
        chargerPreviewRepartition();
      }
      setEtapeCreation(2);
    }
  };

  const handleSubmitTache = async (forcerCreation = false) => {
    setSubmitting(true);
    setErreurCreation('');

    try {
      // Validation des champs requis
      if (!formTache.dateEcheance || formTache.dateEcheance.trim() === '') {
        setErreurCreation('La date d\'échéance est requise');
        setSubmitting(false);
        return;
      }

      if (!formTache.numeroProjet || !formTache.traducteurId || !formTache.heuresTotal) {
        setErreurCreation('Veuillez remplir tous les champs obligatoires');
        setSubmitting(false);
        return;
      }

      // Validation pour répartition manuelle
      if (formTache.typeRepartition === 'MANUEL') {
        const totalHeuresManuel = formTache.repartitionManuelle.reduce((s, r) => s + r.heures, 0);
        const heuresAttendu = parseFloat(formTache.heuresTotal as string);
        
        if (Math.abs(totalHeuresManuel - heuresAttendu) > 0.01) {
          setErreurCreation(`Le total des heures (${totalHeuresManuel.toFixed(2)}h) ne correspond pas au total attendu (${heuresAttendu}h)`);
          setSubmitting(false);
          return;
        }
      }

      const tache: any = {
        numeroProjet: formTache.numeroProjet,
        traducteurId: formTache.traducteurId,
        typeTache: formTache.typeTache,
        heuresTotal: parseFloat(formTache.heuresTotal as string),
        dateEcheance: formTache.dateEcheance,
      };

      if (formTache.paireLinguistiqueId) tache.paireLinguistiqueId = formTache.paireLinguistiqueId;
      if (formTache.clientId) tache.clientId = formTache.clientId;
      if (formTache.sousDomaineId) tache.sousDomaineId = formTache.sousDomaineId;
      if (formTache.specialisation.trim()) tache.specialisation = formTache.specialisation;
      if (formTache.description.trim()) tache.description = formTache.description;
      if (formTache.compteMots) tache.compteMots = parseInt(formTache.compteMots as string);

      // Gérer les différentes méthodes de répartition
      if (formTache.typeRepartition === 'JUSTE_TEMPS') {
        tache.repartitionAuto = true;
      } else if (formTache.typeRepartition === 'MANUEL') {
        tache.repartition = formTache.repartitionManuelle;
        tache.repartitionAuto = false;
        // Ajouter le flag forcer si demandé
        if (forcerCreation) {
          tache.forcer = true;
        }
      } else {
        // Pour EQUILIBRE et PEPS, utiliser la prévisualisation calculée
        if (previewRepartition && previewRepartition.length > 0) {
          tache.repartition = previewRepartition;
        } else {
          setErreurCreation('Aucune répartition générée. Veuillez recalculer.');
          setSubmitting(false);
          return;
        }
      }

      await tacheService.creerTache(tache);
      
      setShowAddTaskModal(false);
      resetFormTache();
      setPreviewRepartition(null);
      
      // Rafraîchir la planification
      window.location.reload();
    } catch (err: any) {
      console.error('Erreur complète:', err);
      console.error('Response data:', err.response?.data);
      
      // Gestion du conflit de disponibilité en mode manuel
      if (err.response?.status === 409 && err.response?.data?.erreur === 'CONFLIT_DISPONIBILITE') {
        const data = err.response.data;
        const confirmer = window.confirm(
          `⚠️ AVERTISSEMENT DE DISPONIBILITÉ\n\n` +
          `${data.message}\n` +
          `Commentaire: ${data.details}\n\n` +
          `Voulez-vous quand même créer cette tâche?\n` +
          `(La tâche sera assignée même si le traducteur est actuellement indisponible)`
        );
        
        if (confirmer) {
          // Réessayer avec le flag forcer
          await handleSubmitTache(true);
          return;
        } else {
          setSubmitting(false);
          return;
        }
      }
      
      const messageErreur = err.response?.data?.erreur || err.message || 'Erreur lors de la création de la tâche';
      const detailsErreur = err.response?.data?.details ? `\nDétails: ${JSON.stringify(err.response.data.details)}` : '';
      setErreurCreation(messageErreur + detailsErreur);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ Fonctions de blocage de temps ============

  const handleSubmitBlocage = async () => {
    setSubmittingBlocage(true);
    setErreurBlocage('');

    try {
      // Validation
      if (!formBlocage.traducteurId || !formBlocage.date || !formBlocage.heureDebut || !formBlocage.heureFin) {
        setErreurBlocage('Veuillez remplir tous les champs obligatoires');
        setSubmittingBlocage(false);
        return;
      }

      if (!formBlocage.motif.trim()) {
        setErreurBlocage('Veuillez indiquer le motif du blocage');
        setSubmittingBlocage(false);
        return;
      }

      // Appel au service
      await traducteurService.bloquerTemps(formBlocage.traducteurId, {
        date: formBlocage.date,
        heureDebut: formBlocage.heureDebut,
        heureFin: formBlocage.heureFin,
        motif: formBlocage.motif
      });

      // Réinitialiser et fermer
      setShowBlocageModal(false);
      setFormBlocage({
        traducteurId: '',
        date: today,
        heureDebut: '09:00',
        heureFin: '17:00',
        motif: ''
      });

      // Rafraîchir la planification
      window.location.reload();
    } catch (err: any) {
      console.error('Erreur blocage:', err);
      const messageErreur = err.response?.data?.erreur || err.message || 'Erreur lors du blocage de temps';
      setErreurBlocage(messageErreur);
    } finally {
      setSubmittingBlocage(false);
    }
  };

  // ============ Fonctions d'édition de tâche ============

  const chargerTachesCellule = async (traducteurId: string, traducteurNom: string, date: string) => {
    setLoadingTaches(true);
    setCelluleSelectionnee({ traducteurId, traducteurNom, date, taches: [] });
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(
        `${API_URL}/taches?traducteurId=${traducteurId}&date=${date}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const taches = await response.json();
      setCelluleSelectionnee({ traducteurId, traducteurNom, date, taches });
    } catch (err: any) {
      console.error('Erreur de chargement des tâches:', err);
      setCelluleSelectionnee(prev => prev ? { ...prev, taches: [] } : null);
    } finally {
      setLoadingTaches(false);
    }
  };

  const chargerChargeTraducteur = async (traducteur: any) => {
    setLoadingCharge(true);
    setShowChargeModal(true);
    setChargeTraducteur({ traducteur, tachesTotales: [], heuresTotal: 0, tachesParStatut: {} });
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(
        `${API_URL}/taches?traducteurId=${traducteur.id}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const taches = await response.json();
      const heuresTotal = taches.reduce((sum: number, t: any) => sum + (t.heuresTotal || 0), 0);
      const tachesParStatut = taches.reduce((acc: any, t: any) => {
        const statut = t.statut || 'PLANIFIEE';
        if (!acc[statut]) acc[statut] = [];
        acc[statut].push(t);
        return acc;
      }, {});

      setChargeTraducteur({ traducteur, tachesTotales: taches, heuresTotal, tachesParStatut });
    } catch (err: any) {
      console.error('Erreur de chargement de la charge:', err);
      setChargeTraducteur(prev => prev || { traducteur, tachesTotales: [], heuresTotal: 0, tachesParStatut: {} });
    } finally {
      setLoadingCharge(false);
    }
  };

  const chargerMesTaches = async () => {
    setLoadingMesTaches(true);
    setShowMesTachesModal(true);
    
    try {
      // Filtrer par traducteur si l'utilisateur est un traducteur
      const traducteurId = utilisateur?.role === 'TRADUCTEUR' && utilisateur?.traducteur?.id 
        ? utilisateur.traducteur.id 
        : undefined;

      const taches = await tacheService.obtenirTaches(
        traducteurId ? { traducteurId } : {}
      );
      
      // Trier par date de création (plus récent d'abord)
      const tachesTries = taches.sort((a, b) => 
        new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime()
      );
      
      setMesTaches(tachesTries);
      setMesTachesFiltered(tachesTries);
      setFiltresMesTaches({ statut: '', traducteur: '', recherche: '' });
    } catch (err: any) {
      console.error('Erreur de chargement des tâches:', err);
      setMesTaches([]);
      setMesTachesFiltered([]);
    } finally {
      setLoadingMesTaches(false);
    }
  };

  const appliquerFiltresMesTaches = () => {
    let filtered = [...mesTaches];

    if (filtresMesTaches.statut) {
      filtered = filtered.filter(t => t.statut === filtresMesTaches.statut);
    }

    if (filtresMesTaches.traducteur) {
      filtered = filtered.filter(t => 
        t.traducteur?.nom.toLowerCase().includes(filtresMesTaches.traducteur.toLowerCase())
      );
    }

    if (filtresMesTaches.recherche) {
      const recherche = filtresMesTaches.recherche.toLowerCase();
      filtered = filtered.filter(t => 
        t.numeroProjet.toLowerCase().includes(recherche) ||
        t.description?.toLowerCase().includes(recherche) ||
        t.client?.nom.toLowerCase().includes(recherche)
      );
    }

    setMesTachesFiltered(filtered);
  };

  const chargerAnalyseOptimisation = async () => {
    setLoadingOptimisation(true);
    setShowTetrixMaster(true);
    setEtapeOptimisation('analyse');
    setErreurOptimisation('');
    
    try {
      // Utiliser la nouvelle analyse Tetrix Master
      const analyse = await optimisationService.analyserTetrixMaster(applied.start, endDate);
      setAnalyseOptimisation(analyse);
      setErreurOptimisation('');
    } catch (err: any) {
      console.error('Erreur d\'analyse Tetrix Master:', err);
      console.error('Response:', err.response?.data);
      const messageErreur = err.response?.data?.erreur || err.message || 'Erreur lors de l\'analyse';
      setErreurOptimisation(messageErreur);
      setAnalyseOptimisation(null);
    } finally {
      setLoadingOptimisation(false);
    }
  };

  const chargerRapportOrion = async () => {
    setChargementOrion(true);
    setShowOrionModal(true);
    setErreurOrion(null);
    
    try {
      const rapport = await optimisationService.genererRapportOrion(applied.start, endDate);
      setRapportOrion(rapport);
      setErreurOrion(null);
    } catch (err: any) {
      console.error('Erreur génération Rapport Orion:', err);
      console.error('Response:', err.response?.data);
      const messageErreur = err.response?.data?.erreur || err.message || 'Erreur lors de la génération du rapport';
      setErreurOrion(messageErreur);
      setRapportOrion(null);
    } finally {
      setChargementOrion(false);
    }
  };

  const chargerSuggestions = async () => {
    setLoadingOptimisation(true);
    setEtapeOptimisation('suggestions');
    
    try {
      const sug = await optimisationService.suggerer(applied.start, endDate);
      setSuggestions(sug);
    } catch (err: any) {
      console.error('Erreur suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoadingOptimisation(false);
    }
  };

  const appliquerSuggestion = async (suggestion: any) => {
    try {
      await optimisationService.appliquer(suggestion.tacheId, suggestion.traducteurCibleId);
      // Recharger l'analyse
      await chargerAnalyseOptimisation();
      // Rafraîchir la planification
      window.location.reload();
    } catch (err: any) {
      console.error('Erreur application:', err);
      alert('Erreur lors de l\'application de la suggestion');
    }
  };
  
  const resetFormEdition = () => {
    setFormEdition({
      numeroProjet: '',
      traducteurId: '',
      clientId: '',
      sousDomaineId: '',
      paireLinguistiqueId: '',
      typeTache: 'TRADUCTION',
      specialisation: '',
      description: '',
      heuresTotal: 0,
      compteMots: 0,
      dateEcheance: '',
      heureEcheance: '17:00',
      priorite: 'REGULIER',
      typeRepartition: 'JUSTE_TEMPS',
      dateDebut: '',
      dateFin: '',
      repartitionAuto: true,
      repartitionManuelle: [],
    });
    setPreviewJATEdit(null);
    setEtapeEdition(1);
    setErreurEdition('');
    setTacheEnEdition(null);
  };

  const handleEditTache = async (tacheId: string) => {
    try {
      // Charger la tâche depuis l'API
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/taches/${tacheId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const tache = await response.json();
      
      // Charger les paires linguistiques du traducteur
      if (tache.traducteurId) {
        const trad = traducteurs.find(t => t.id === tache.traducteurId);
        if (trad) {
          setPairesDisponibles(trad.pairesLinguistiques || []);
        }
      }
      
      // Mapper le mode de distribution de l'API vers le format du formulaire
      // API: JAT/PEPS/EQUILIBRE/MANUEL → Formulaire: JUSTE_TEMPS/PEPS/EQUILIBRE/MANUEL
      const modeDistributionAPI = tache.modeDistribution || 'JAT';
      const typeRepartitionForm = modeDistributionAPI === 'JAT' ? 'JUSTE_TEMPS' : modeDistributionAPI;
      const estModeAuto = ['JAT', 'PEPS', 'EQUILIBRE'].includes(modeDistributionAPI);
      
      // Extraire la date et l'heure d'échéance
      const dateEcheanceParts = tache.dateEcheance?.split('T') || [];
      const dateEcheanceStr = dateEcheanceParts[0] || '';
      const heureEcheanceStr = dateEcheanceParts[1] 
        ? dateEcheanceParts[1].substring(0, 5) // Format HH:MM
        : '17:00';
      
      // Pré-remplir le formulaire
      setFormEdition({
        numeroProjet: tache.numeroProjet || '',
        traducteurId: tache.traducteurId || '',
        clientId: tache.clientId || '',
        sousDomaineId: tache.sousDomaineId || '',
        paireLinguistiqueId: tache.paireLinguistiqueId || '',
        typeTache: tache.typeTache || 'TRADUCTION',
        specialisation: tache.specialisation || '',
        description: tache.description || '',
        heuresTotal: tache.heuresTotal || 0,
        compteMots: tache.compteMots || 0,
        dateEcheance: dateEcheanceStr,
        heureEcheance: heureEcheanceStr,
        priorite: tache.priorite || 'REGULIER',
        typeRepartition: typeRepartitionForm as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL',
        dateDebut: today,
        dateFin: dateEcheanceStr,
        repartitionAuto: estModeAuto,
        repartitionManuelle: tache.ajustementsTemps?.map((ajustement: any) => ({
          date: ajustement.date.split('T')[0],
          heures: ajustement.heures
        })) || [],
      });
      
      setTacheEnEdition(tacheId);
      setShowEditTaskModal(true);
    } catch (err: any) {
      console.error('Erreur de chargement de la tâche:', err);
      alert('Erreur lors du chargement de la tâche');
    }
  };

  const chargerPreviewJATEdit = async () => {
    setLoadingPreviewEdit(true);
    setErreurEdition('');
    
    try {
      const result = await repartitionService.previewJAT({
        traducteurId: formEdition.traducteurId,
        heuresTotal: formEdition.heuresTotal,
        dateEcheance: formEdition.dateEcheance,
      });
      setPreviewJATEdit(result);
    } catch (err: any) {
      console.error('Erreur preview JAT:', err);
      setErreurEdition('Erreur lors du calcul JAT: ' + (err.response?.data?.erreur || err.message));
    } finally {
      setLoadingPreviewEdit(false);
    }
  };

  const validerEtape1Edit = () => {
    if (!formEdition.numeroProjet.trim()) {
      setErreurEdition('Veuillez saisir un numéro de projet');
      return false;
    }
    if (!formEdition.traducteurId) {
      setErreurEdition('Veuillez sélectionner un traducteur');
      return false;
    }
    if (formEdition.heuresTotal <= 0) {
      setErreurEdition('Les heures doivent être supérieures à 0');
      return false;
    }
    if (!formEdition.dateEcheance) {
      setErreurEdition('Veuillez sélectionner une date d\'échéance');
      return false;
    }
    setErreurEdition('');
    return true;
  };

  const handleEtape1SuivantEdit = () => {
    if (validerEtape1Edit()) {
      if (formEdition.repartitionAuto) {
        chargerPreviewJATEdit();
      }
      setEtapeEdition(2);
    }
  };

  const handleUpdateTache = async () => {
    if (!tacheEnEdition) return;
    
    setSubmitting(true);
    setErreurEdition('');

    try {
      const tache: any = {
        numeroProjet: formEdition.numeroProjet,
        traducteurId: formEdition.traducteurId,
        paireLinguistiqueId: formEdition.paireLinguistiqueId,
        typeTache: formEdition.typeTache,
        description: formEdition.description,
        heuresTotal: formEdition.heuresTotal,
        dateEcheance: formEdition.dateEcheance,
      };

      if (formEdition.clientId) tache.clientId = formEdition.clientId;
      if (formEdition.sousDomaineId) tache.sousDomaineId = formEdition.sousDomaineId;
      if (formEdition.specialisation.trim()) tache.specialisation = formEdition.specialisation;
      if (formEdition.compteMots) tache.compteMots = formEdition.compteMots;

      // Gérer la répartition selon le mode choisi
      if (formEdition.typeRepartition === 'JUSTE_TEMPS') {
        tache.repartitionAuto = true;
      } else if (formEdition.typeRepartition === 'EQUILIBRE') {
        // Calculer la répartition équilibrée
        if (!formEdition.traducteurId) {
          throw new Error('Traducteur requis pour la répartition équilibrée');
        }
        const repartition = await repartitionService.calculerRepartitionEquilibree({
          traducteurId: formEdition.traducteurId,
          heuresTotal: formEdition.heuresTotal,
          dateDebut: formEdition.dateDebut,
          dateFin: formEdition.dateFin,
        });
        tache.repartition = repartition;
      } else if (formEdition.typeRepartition === 'PEPS') {
        // Calculer la répartition PEPS avec la capacité du traducteur
        if (!formEdition.traducteurId) {
          throw new Error('Traducteur requis pour la répartition PEPS');
        }
        const repartition = await repartitionService.calculerRepartitionPEPS({
          traducteurId: formEdition.traducteurId,
          heuresTotal: formEdition.heuresTotal,
          dateDebut: formEdition.dateDebut,
          dateEcheance: formEdition.dateEcheance,
        });
        tache.repartition = repartition;
      } else {
        tache.repartition = formEdition.repartitionManuelle;
        tache.repartitionAuto = false;
      }

      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/taches/${tacheEnEdition}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(tache)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erreur || 'Erreur lors de la mise à jour');
      }
      
      setShowEditTaskModal(false);
      resetFormEdition();
      
      // Rafraîchir la planification
      window.location.reload();
    } catch (err: any) {
      setErreurEdition(err.message || 'Erreur lors de la mise à jour de la tâche');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [clientsData, sousDomainesData, traducteursData] = await Promise.all([
          clientService.obtenirClients(true),
          sousDomaineService.obtenirSousDomaines(true),
          traducteurService.obtenirTraducteurs({ actif: true }),
        ]);

        // Stocker pour le formulaire de création
        setClients(clientsData);
        setSousDomaines(sousDomainesData);
        setTraducteurs(traducteursData);

        const divisions = Array.from(new Set(traducteursData.map(t => t.division))).sort();
        const domaines = Array.from(new Set([
          ...traducteursData.flatMap(t => t.domaines || []),
          ...sousDomainesData.map(sd => sd.nom),
        ])).sort();
        const languesSource = Array.from(new Set(traducteursData.flatMap(t => t.pairesLinguistiques?.map(p => p.langueSource) || []))).sort();
        const languesCible = Array.from(new Set(traducteursData.flatMap(t => t.pairesLinguistiques?.map(p => p.langueCible) || []))).sort();
        const clientNoms = clientsData.map(c => c.nom).sort();
        const traducteursListe = traducteursData.map(t => ({ id: t.id, nom: t.nom })).sort((a, b) => a.nom.localeCompare(b.nom));

        setOptions({ divisions, domaines, languesSource, languesCible, clients: clientNoms, traducteurs: traducteursListe });
      } catch (e: any) {
        setOptionsError(e?.message || 'Erreur chargement listes');
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  // Activer le scroll horizontal avec la molette de souris
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Si on scrolle verticalement mais qu'on est au bout, ou si on utilise Shift+molette
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Forcer la synchronisation de la date au montage du composant
  useEffect(() => {
    const currentDate = formatOttawaISO(nowOttawa());
    console.log('[PlanificationGlobale] Synchronisation de la date au montage:', currentDate);
    setPending(prev => ({ ...prev, start: currentDate }));
    setApplied(prev => ({ ...prev, start: currentDate }));
  }, []); // Exécuté une seule fois au montage

  return (
    <AppLayout titre="Planification globale" compact>
      {/* Barre de navigation - Affiché uniquement pour les conseillers */}
      {utilisateur?.role === 'CONSEILLER' && (
        <div className="mb-2 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg px-4 py-2">
          <Button
            variant="outline"
            onClick={() => navigate('/conseiller')}
            className="flex items-center gap-2 text-sm py-1"
          >
            ← Portail Conseiller
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/conseiller/creation-tache')} className="text-sm py-1">
              ➕ Nouvelle tâche
            </Button>
            <Button variant="ghost" onClick={() => navigate('/liaisons')} className="text-sm py-1">
              🔗 Liaisons
            </Button>
            <Button variant="ghost" onClick={() => navigate('/statistiques-productivite')} className="text-sm py-1">
              📊 Statistiques
            </Button>
            <Button variant="ghost" onClick={() => navigate('/conflict-resolution')} className="text-sm py-1">
              ⚠️ Conflits
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-0.5 h-[calc(100vh-3rem)]">
        {/* Bouton pour toggle le panneau */}
        <button
          onClick={() => setPanneauOuvert(!panneauOuvert)}
          className="flex-shrink-0 w-4 bg-gray-100 hover:bg-gray-200 border-r border-border flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-[10px]"
          title={panneauOuvert ? 'Masquer les filtres' : 'Afficher les filtres'}
        >
          {panneauOuvert ? '◀' : '▶'}
        </button>

        {/* Panneau latéral gauche - Contrôles */}
        {panneauOuvert && (
        <div className="w-56 flex-shrink-0 overflow-y-auto space-y-0.5 text-xs">
          {/* Filtres compacts */}
          <div className="bg-white border border-border rounded shadow-sm">
            <details open>
              <summary className="cursor-pointer text-xs font-semibold px-1.5 py-0.5 hover:bg-gray-50 flex items-center gap-0.5">
                🔍 Affichage
              </summary>
              <div className="border-t border-border">
              {/* Accordéon - Divisions */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium px-1.5 py-0.5 hover:bg-gray-50">
                  Divisions {pending.divisions.length > 0 && <span className="text-primary">({pending.divisions.length})</span>}
                </summary>
                <div className="px-1.5 pb-0.5 space-y-0">
                  {options.divisions.map((div) => (
                    <label key={div} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 py-0 rounded">
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
                <summary className="cursor-pointer text-xs font-medium px-1.5 py-0.5 hover:bg-gray-50">
                  Clients {pending.clients.length > 0 && <span className="text-primary">({pending.clients.length})</span>}
                </summary>
                <div className="px-1.5 pb-0.5 space-y-0 max-h-24 overflow-y-auto">
                  {options.clients.map((client) => (
                    <label key={client} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 py-0 rounded">
                      <input
                        type="checkbox"
                        checked={pending.clients.includes(client)}
                        onChange={() => toggleClient(client)}
                        className="w-2.5 h-2.5"
                      />
                      <span className="truncate">{client}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Domaines */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium px-1.5 py-0.5 hover:bg-gray-50">
                  Domaines {pending.domaines.length > 0 && <span className="text-primary">({pending.domaines.length})</span>}
                </summary>
                <div className="px-1.5 pb-0.5 space-y-0">
                  {options.domaines.map((dom) => (
                    <label key={dom} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 py-0 rounded">
                      <input
                        type="checkbox"
                        checked={pending.domaines.includes(dom)}
                        onChange={() => toggleDomaine(dom)}
                        className="w-2.5 h-2.5"
                      />
                      <span className="truncate">{dom}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Langues source */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium px-1.5 py-0.5 hover:bg-gray-50">
                  Langue source {pending.languesSource.length > 0 && <span className="text-primary">({pending.languesSource.length})</span>}
                </summary>
                <div className="px-1.5 pb-0.5 space-y-0">
                  {options.languesSource.map((lang) => (
                    <label key={lang} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 py-0 rounded">
                      <input
                        type="checkbox"
                        checked={pending.languesSource.includes(lang)}
                        onChange={() => toggleLangueSource(lang)}
                        className="w-2.5 h-2.5"
                      />
                      <span className="truncate">{lang}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Accordéon - Langues cible */}
              <details className="border-b border-border">
                <summary className="cursor-pointer text-xs font-medium px-1.5 py-0.5 hover:bg-gray-50">
                  Langue cible {pending.languesCible.length > 0 && <span className="text-primary">({pending.languesCible.length})</span>}
                </summary>
                <div className="px-1.5 pb-0.5 space-y-0">
                  {options.languesCible.map((lang) => (
                    <label key={lang} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 py-0 rounded">
                      <input
                        type="checkbox"
                        checked={pending.languesCible.includes(lang)}
                        onChange={() => toggleLangueCible(lang)}
                        className="w-2.5 h-2.5"
                      />
                      <span className="truncate">{lang}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Boutons d'action */}
              <div className="px-1.5 py-0.5 flex gap-0.5">
                <Button variant="primaire" onClick={handleApply} loading={loading} className="flex-1 px-1 py-0.5 text-xs">
                  ✓ OK
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={loading} className="flex-1 px-1 py-0.5 text-xs">
                  ↺
                </Button>
              </div>
              {loadingOptions && <p className="text-[8px] text-muted px-1.5">Chargement…</p>}
              {optionsError && <p className="text-[8px] text-red-600 px-1.5">{optionsError}</p>}
              {error && <p className="text-[8px] text-red-600 px-1.5">{error}</p>}
            </div>
          </details>
        </div>

        {/* Portraits sauvegardés */}
        <div className="bg-white border border-border rounded shadow-sm">
          <details>
            <summary className="cursor-pointer text-xs font-semibold px-1.5 py-0.5 hover:bg-gray-50 flex items-center gap-0.5">
              📌 Portraits ({savedViews.length})
            </summary>
            <div className="px-1.5 pb-1 space-y-0.5 border-t border-border pt-0.5">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                className="w-full px-1.5 py-0.5 text-xs"
              >
                {showSaveDialog ? '✕' : '💾 Sauvegarder'}
              </Button>

              {showSaveDialog && (
                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded space-y-1">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="Nom du portrait..."
                    className="w-full px-1.5 py-0.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyPress={(e) => e.key === 'Enter' && saveCurrentView()}
                  />
                  <Button
                    variant="primaire"
                    onClick={saveCurrentView}
                    disabled={!newViewName.trim()}
                    className="w-full px-2 py-0.5 text-xs"
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
                      className="border border-border rounded p-1 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-0.5">
                        <button
                          onClick={() => loadView(view)}
                          className="flex-1 text-left text-xs font-medium hover:text-primary transition-colors truncate"
                          title={view.nom}
                        >
                          {view.nom}
                        </button>
                        <button
                          onClick={() => deleteView(view.id)}
                          className="text-red-600 hover:text-red-800 text-[10px]"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-[9px] text-muted mt-0.5 truncate">
                        {view.filtres.range}j{view.filtres.divisions.length > 0 && ` · ${view.filtres.divisions.length} div`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted text-center py-2">
                  Aucun portrait sauvegardé
                </p>
              )}
            </div>
          </details>
        </div>

        {/* Recherche de disponibilité */}
        <div className="bg-white border border-border rounded shadow-sm">
          <details>
            <summary className="cursor-pointer text-xs font-semibold px-2 py-1 hover:bg-gray-50 flex items-center gap-1">
              🔎 Recherche {searchResults.length > 0 && <span className="text-green-600">({searchResults.length})</span>}
            </summary>
            <div className="px-1.5 pb-1 space-y-0.5 border-t border-border pt-0.5">
              <div className="p-1.5 bg-green-50 border border-green-200 rounded space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="text-[9px] font-medium block mb-0.5">Du</label>
                      <input
                        type="date"
                        value={searchCriteria.dateDebut}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchCriteria({ ...searchCriteria, dateDebut: e.target.value })}
                        className="w-full px-1 py-0.5 text-[10px] border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium block mb-0.5">Au</label>
                      <input
                        type="date"
                        value={searchCriteria.dateFin}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchCriteria({ ...searchCriteria, dateFin: e.target.value })}
                        min={searchCriteria.dateDebut}
                        className="w-full px-1 py-0.5 text-[10px] border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-medium block mb-0.5">Heures requises *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={searchCriteria.heuresRequises}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchCriteria({ ...searchCriteria, heuresRequises: e.target.value })}
                      placeholder="Ex: 4"
                      className="w-full px-1 py-0.5 text-[10px] border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-medium block mb-0.5">Client</label>
                    <Select
                      value={searchCriteria.client}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, client: e.target.value })}
                      className="text-[9px] py-0.5 px-1 w-full"
                    >
                      <option value="">Tous</option>
                      {options.clients.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] font-medium block mb-0.5">Domaine</label>
                    <Select
                      value={searchCriteria.domaine}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, domaine: e.target.value })}
                      className="text-[9px] py-0.5 px-1 w-full"
                    >
                      <option value="">Tous</option>
                      {options.domaines.map((dom) => (
                        <option key={dom} value={dom}>{dom}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] font-medium block mb-0.5">Langue source</label>
                    <Select
                      value={searchCriteria.langueSource}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, langueSource: e.target.value })}
                      className="text-[9px] py-0.5 px-1 w-full"
                    >
                      <option value="">Toutes</option>
                      {options.languesSource.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] font-medium block mb-0.5">Langue cible</label>
                    <Select
                      value={searchCriteria.langueCible}
                      onChange={(e) => setSearchCriteria({ ...searchCriteria, langueCible: e.target.value })}
                      className="text-[9px] py-0.5 px-1 w-full"
                    >
                      <option value="">Toutes</option>
                      {options.languesCible.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="flex items-center text-[9px] font-medium mb-0.5">
                      <input
                        type="checkbox"
                        checked={searchCriteria.disponiblesUniquement || false}
                        onChange={(e) => setSearchCriteria({ ...searchCriteria, disponiblesUniquement: e.target.checked })}
                        className="mr-1"
                      />
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Disponibles uniquement
                    </label>
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <Button
                      variant="primaire"
                      onClick={searchAvailability}
                      disabled={!searchCriteria.heuresRequises}
                      className="w-full px-2 py-0.5 text-xs"
                    >
                      🔍 Rechercher
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetSearch}
                      className="w-full px-2 py-0.5 text-xs"
                    >
                      ↺ Réinitialiser
                    </Button>
                    <Button
                      variant="primaire"
                      onClick={() => {
                        if (!planificationEnrichie) return;
                        
                        // Filtrer les traducteurs qui ont disponiblePourTravail = true
                        const disponibles = planificationEnrichie.planification
                          .filter(ligne => (ligne.traducteur as any).disponiblePourTravail)
                          .map(ligne => ligne.traducteur.id);
                        
                        setSearchResults(disponibles);
                        setSearchType('immediate');
                        
                        // Optionnel: notifier l'utilisateur
                        if (disponibles.length === 0) {
                          alert('Aucun traducteur disponible immédiatement');
                        }
                      }}
                      className="w-full px-2 py-0.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      🟢 Disponibles immédiatement
                    </Button>
                  </div>
                </div>

              {searchResults.length > 0 && (
                <div className={`p-1.5 rounded ${searchType === 'immediate' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className="text-[10px] font-medium">
                    {searchType === 'immediate' ? '🟢' : '✅'} {searchResults.length} trouvé(s)
                  </p>
                  <p className="text-[9px] text-muted mt-0.5">
                    {searchType === 'immediate' 
                      ? 'Traducteurs cherchant du travail' 
                      : 'Traducteurs avec disponibilité suffisante'}
                  </p>
                  <p className="text-[9px] text-muted">
                    Surlignés en jaune →
                  </p>
                </div>
              )}

              {searchResults.length === 0 && searchCriteria.heuresRequises && (
                <div className="p-1.5 bg-red-50 border border-red-200 rounded">
                  <p className="text-[10px] text-red-800">
                    ❌ Aucun disponible
                  </p>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
        )}

      {/* Indicateur de rafraîchissement automatique - Coin supérieur droit */}
      <div className="fixed top-20 right-6 z-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleEnabled}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                isEnabled 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={isEnabled ? 'Désactiver le rafraîchissement automatique' : 'Activer le rafraîchissement automatique'}
            >
              {isEnabled ? '🟢' : '⚪'} Auto-refresh
            </button>
            <div className="flex items-center gap-1 text-gray-600">
              {isRefreshing ? (
                <>
                  <span className="animate-spin">↻</span>
                  <span>Actualisation...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>{formatTimeAgo(lastRefresh)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Groupe de boutons flottants - Coin inférieur droit */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* Bouton Tetrix Orion - Statistiques Avancées */}
        <Button
          variant="outline"
          onClick={chargerRapportOrion}
          className="px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-none"
          title="Analyse statistique avancée du planning"
        >
          🔭 Tetrix Orion
        </Button>

        {/* Bouton Tetrix Master */}
        <Button
          variant="outline"
          onClick={chargerAnalyseOptimisation}
          className="px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-none"
          title="Optimiser la charge de travail"
        >
          🎯 Tetrix Master
        </Button>

        {/* Bouton Créer une tâche */}
        <Button
          variant="primaire"
          onClick={() => setShowAddTaskModal(true)}
          className="px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105"
          title="Créer une nouvelle tâche"
        >
          ➕ Créer une tâche
        </Button>

        {/* Bouton Bloquer du temps */}
        <Button
          variant="outline"
          onClick={() => setShowBlocageModal(true)}
          className="px-4 py-2 text-sm shadow hover:shadow-lg transition-all"
          title="Bloquer du temps pour un traducteur"
        >
          🔒 Bloquer du temps
        </Button>

        {/* Bouton Statistiques de productivité */}
        <Button
          variant="outline"
          onClick={() => navigate('/statistiques-productivite')}
          className="px-4 py-2 text-sm shadow hover:shadow-lg transition-all"
          title="Voir les statistiques de productivité"
        >
          📊 Productivité
        </Button>
      </div>

      {/* Modal Ajouter une tâche */}
      <Modal
        titre={`Formulaire de création de tâches - Étape ${etapeCreation}/2`}
        ouvert={showAddTaskModal}
        onFermer={() => {
          setShowAddTaskModal(false);
          resetFormTache();
        }}
        ariaDescription="Formulaire de création de tâches"
      >
        <div className="space-y-4">
          {/* Étape 1 : Informations de base */}
          {etapeCreation === 1 && (
            <div className="space-y-4">
              {/* Section Champs obligatoires */}
              <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-300 rounded">
                <h3 className="text-sm font-bold text-blue-900 mb-2">📝 Informations obligatoires</h3>
                
                {/* Numéro de projet */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Numéro de projet <span className="text-red-600">*</span></label>
                  <Input
                    type="text"
                    value={formTache.numeroProjet}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatNumeroProjet(e.target.value);
                      setFormTache({ ...formTache, numeroProjet: formatted });
                    }}
                    placeholder="123-4567-001"
                    maxLength={12}
                    required
                    className="border-2 border-blue-300"
                  />
                </div>

                {/* Traducteur */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Traducteur <span className="text-red-600">*</span></label>
                  <Select
                    value={formTache.traducteurId}
                    onChange={(e) => setFormTache({ ...formTache, traducteurId: e.target.value })}
                    required
                    className="border-2 border-blue-300"
                  >
                    <option value="">Rechercher ou sélectionner un traducteur...</option>
                    {traducteurs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.disponiblePourTravail ? '🟢 ' : ''}
                        {t.nom}
                        {t.horaire ? ` (${t.horaire} | 🍽️ 12h-13h)` : ''} - {t.division} ({t.capaciteHeuresParJour}h/jour)
                      </option>
                    ))}
                  </Select>
                  {formTache.traducteurId && (
                    <BoutonPlanificationTraducteur 
                      traducteurId={formTache.traducteurId}
                      className="mt-2 text-xs px-3 py-1.5 w-full hover:bg-blue-50"
                    />
                  )}
                </div>

                {/* Type de tâche */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Type de tâche <span className="text-red-600">*</span></label>
                  <Select
                    value={formTache.typeTache}
                    onChange={(e) => setFormTache({ ...formTache, typeTache: e.target.value as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE' })}
                    required
                    className="border-2 border-blue-300"
                  >
                    <option value="TRADUCTION">Traduction</option>
                    <option value="REVISION">Révision</option>
                    <option value="RELECTURE">Relecture</option>
                    <option value="ENCADREMENT">Encadrement</option>
                    <option value="AUTRE">Autre</option>
                  </Select>
                </div>

                {/* Heures totales */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Heures totales <span className="text-red-600">*</span></label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formTache.heuresTotal}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, heuresTotal: e.target.value })}
                    placeholder="Ex: 4.5"
                    required
                    className="border-2 border-blue-300"
                  />
                </div>

                {/* Date d'échéance */}
                <DateTimeInput
                  label="Date d'échéance"
                  value={formTache.dateEcheance}
                  onChange={(value) => setFormTache({ ...formTache, dateEcheance: value })}
                  includeTime={true}
                  required
                />

                {/* Priorité */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Priorité <span className="text-red-600">*</span></label>
                  <Select
                    value={formTache.priorite}
                    onChange={(e) => setFormTache({ ...formTache, priorite: e.target.value as 'URGENT' | 'REGULIER' })}
                    required
                    className="border-2 border-blue-300"
                  >
                    <option value="REGULIER">Régulier</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                </div>
              </div>

              {/* Section Champs optionnels */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">📎 Informations optionnelles</h3>
                
                {/* Paire linguistique (optionnel) */}
                {formTache.traducteurId && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Paire linguistique <span className="text-gray-500 text-xs">(optionnel)</span></label>
                    <Select
                      value={formTache.paireLinguistiqueId}
                      onChange={(e) => setFormTache({ ...formTache, paireLinguistiqueId: e.target.value })}
                    >
                      <option value="">Aucune paire linguistique</option>
                      {pairesDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.langueSource} → {p.langueCible}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Compte de mots (optionnel) */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Compte de mots <span className="text-gray-500 text-xs">(optionnel)</span></label>
                  <Input
                    type="number"
                    min="0"
                    value={formTache.compteMots}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, compteMots: e.target.value })}
                    placeholder="Ex: 5000"
                  />
                </div>

                {/* Client (optionnel) */}
              <div>
                <label className="block text-sm font-medium mb-1">Client <span className="text-gray-500 text-xs">(optionnel)</span></label>
                <Select
                  value={formTache.clientId}
                  onChange={(e) => setFormTache({ ...formTache, clientId: e.target.value })}
                >
                  <option value="">Aucun client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </Select>
              </div>

              {/* Sous-domaine (optionnel) */}
              <div>
                <label className="block text-sm font-medium mb-1">Sous-domaine <span className="text-gray-500 text-xs">(optionnel)</span></label>
                <Select
                  value={formTache.sousDomaineId}
                  onChange={(e) => setFormTache({ ...formTache, sousDomaineId: e.target.value })}
                >
                  <option value="">Aucun sous-domaine</option>
                  {sousDomaines.map((sd) => (
                    <option key={sd.id} value={sd.id}>{sd.nom}</option>
                  ))}
                </Select>
              </div>

              {/* Spécialisation (optionnel) */}
              <div>
                <label className="block text-sm font-medium mb-1">Spécialisation <span className="text-gray-500 text-xs">(optionnel)</span></label>
                <Input
                  type="text"
                  value={formTache.specialisation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, specialisation: e.target.value })}
                  placeholder="Ex: Médical, Juridique, Technique..."
                />
              </div>

                {/* Commentaire (optionnel) */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Commentaire <span className="text-gray-500 text-xs">(optionnel)</span></label>
                  <textarea
                    value={formTache.description}
                    onChange={(e) => setFormTache({ ...formTache, description: e.target.value })}
                    placeholder="Ajoutez un commentaire ou des détails..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              {/* Mode de répartition */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 mb-2">⚙️ Mode de répartition <span className="text-red-600">*</span></h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formTache.typeRepartition === 'JUSTE_TEMPS' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartition"
                      value="JUSTE_TEMPS"
                      checked={formTache.typeRepartition === 'JUSTE_TEMPS'}
                      onChange={(e) => setFormTache({ ...formTache, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">📊 Juste à temps (JAT)</div>
                      <div className="text-xs text-gray-600 mt-1">Alloue les heures le plus TARD possible, en remontant depuis l'échéance. Optimise pour terminer juste à temps.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formTache.typeRepartition === 'PEPS' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartition"
                      value="PEPS"
                      checked={formTache.typeRepartition === 'PEPS'}
                      onChange={(e) => setFormTache({ ...formTache, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">🔄 Premier Entré, Premier Sorti (PEPS)</div>
                      <div className="text-xs text-gray-600 mt-1">Alloue les heures le plus TÔT possible, en partant d'aujourd'hui. Commence immédiatement et remplit vers l'avant jusqu'à l'échéance.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formTache.typeRepartition === 'EQUILIBRE' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartition"
                      value="EQUILIBRE"
                      checked={formTache.typeRepartition === 'EQUILIBRE'}
                      onChange={(e) => setFormTache({ ...formTache, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">⚖️ Équilibré sur le temps</div>
                      <div className="text-xs text-gray-600 mt-1">Répartit uniformément les heures entre une date de début et de fin. Idéal pour une charge de travail constante.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formTache.typeRepartition === 'MANUEL' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartition"
                      value="MANUEL"
                      checked={formTache.typeRepartition === 'MANUEL'}
                      onChange={(e) => setFormTache({ ...formTache, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">✍️ Manuel</div>
                      <div className="text-xs text-gray-600 mt-1">Vous définissez vous-même les heures pour chaque jour. Contrôle total de la répartition.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Messages d'erreur - visibles après les modes */}
              {erreurCreation && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 sticky top-0 z-10 shadow-md">
                  {erreurCreation}
                </div>
              )}
              
              {/* Champs spécifiques selon le mode */}
              {formTache.typeRepartition === 'PEPS' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <DateTimeInput
                    label="Date de début"
                    value={formTache.dateDebut}
                    onChange={(value) => setFormTache({ ...formTache, dateDebut: value })}
                    includeTime={true}
                    required
                  />
                </div>
              )}
              
              {formTache.typeRepartition === 'EQUILIBRE' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                  <DateTimeInput
                    label="Date de début"
                    value={formTache.dateDebut}
                    onChange={(value) => setFormTache({ ...formTache, dateDebut: value })}
                    includeTime={true}
                    required
                  />
                  <DateTimeInput
                    label="Date de fin"
                    value={formTache.dateFin}
                    onChange={(value) => setFormTache({ ...formTache, dateFin: value })}
                    includeTime={true}
                    required
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddTaskModal(false);
                    resetFormTache();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primaire"
                  onClick={handleEtape1Suivant}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          )}

          {/* Étape 2 : Répartition */}
          {etapeCreation === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium mb-2 text-sm">📋 Résumé de la tâche</h3>
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">Projet:</span> {formTache.numeroProjet}</p>
                      <p><span className="font-medium">Traducteur:</span> {traducteurs.find(t => t.id === formTache.traducteurId)?.nom}</p>
                      <p><span className="font-medium">Type:</span> {formTache.typeTache}</p>
                      <p><span className="font-medium">Heures:</span> {formTache.heuresTotal}h</p>
                      <p><span className="font-medium">Échéance:</span> {formTache.dateEcheance ? (
                        formTache.dateEcheance.includes('T') 
                          ? formatDateAvecJour(formTache.dateEcheance.split('T')[0]) + ' à ' + formTache.dateEcheance.split('T')[1].substring(0, 5)
                          : formatDateAvecJour(formTache.dateEcheance) + ' (fin de journée)'
                      ) : 'Non définie'}</p>
                      <p><span className="font-medium">Répartition:</span> {
                        {
                          'JUSTE_TEMPS': 'Juste à temps (JAT)',
                          'EQUILIBRE': 'Équilibré',
                          'PEPS': 'PEPS',
                          'MANUEL': 'Manuelle'
                        }[formTache.typeRepartition] || 'Non définie'
                      }</p>
                      {formTache.typeRepartition === 'EQUILIBRE' && formTache.dateDebut && formTache.dateFin && (
                        <p><span className="font-medium">Période:</span> {
                          formatDateAvecJour(formTache.dateDebut.split('T')[0]) + ' à ' + formTache.dateDebut.split('T')[1]?.substring(0, 5)
                        } → {
                          formatDateAvecJour(formTache.dateFin.split('T')[0]) + ' à ' + formTache.dateFin.split('T')[1]?.substring(0, 5)
                        }</p>
                      )}
                      {formTache.typeRepartition === 'PEPS' && formTache.dateDebut && (
                        <p><span className="font-medium">Date de début:</span> {
                          formTache.dateDebut.includes('T')
                            ? formatDateAvecJour(formTache.dateDebut.split('T')[0]) + ' à ' + formTache.dateDebut.split('T')[1]?.substring(0, 5)
                            : formatDateAvecJour(formTache.dateDebut)
                        }</p>
                      )}
                    </div>
                  </div>
                  {formTache.traducteurId && (
                    <div className="flex-shrink-0">
                      <BoutonPlanificationTraducteur 
                        traducteurId={formTache.traducteurId}
                        className="text-xs px-3 py-2 whitespace-nowrap"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Prévisualisation de la répartition */}
              {erreurPreview && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {erreurPreview}
                </div>
              )}

              {formTache.typeRepartition === 'MANUEL' ? (
                <div className="space-y-3 p-4 bg-purple-50 border-2 border-purple-300 rounded">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-900">📅 Distribution des heures par jour</h3>
                    <Button
                      variant="primaire"
                      onClick={() => {
                        const lastDate = formTache.repartitionManuelle.length > 0
                          ? formTache.repartitionManuelle[formTache.repartitionManuelle.length - 1].date
                          : today;
                        const nextDate = addDaysOttawa(parseISODate(lastDate), 1);
                        setFormTache({
                          ...formTache,
                          repartitionManuelle: [
                            ...formTache.repartitionManuelle,
                            { date: dateISO(nextDate), heures: 0 }
                          ]
                        });
                      }}
                      className="text-xs px-3 py-1.5"
                    >
                      ➕ Ajouter un jour
                    </Button>
                  </div>

                  {(() => {
                    const totalManuel = formTache.repartitionManuelle.reduce((s, r) => s + r.heures, 0);
                    const heuresAttendu = parseFloat(formTache.heuresTotal as string) || 0;
                    const correspondance = Math.abs(totalManuel - heuresAttendu) < 0.01;
                    const restant = heuresAttendu - totalManuel;
                    
                    return (
                      <div className={`p-3 rounded font-medium text-sm ${correspondance ? 'bg-green-100 border-2 border-green-500 text-green-900' : restant > 0 ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-900' : 'bg-red-100 border-2 border-red-500 text-red-900'}`}>
                        <div className="flex justify-between items-center">
                          <span>Total distribué: <strong>{totalManuel.toFixed(2)}h</strong> / {heuresAttendu.toFixed(2)}h</span>
                          {correspondance ? (
                            <span className="text-green-700 text-lg">✅ Complet</span>
                          ) : restant > 0 ? (
                            <span className="text-yellow-700">⚠️ Reste {restant.toFixed(2)}h à distribuer</span>
                          ) : (
                            <span className="text-red-700">❌ Dépassement de {Math.abs(restant).toFixed(2)}h</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="max-h-80 overflow-y-auto space-y-2 bg-white p-3 rounded border border-purple-200">
                    {formTache.repartitionManuelle.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 mb-3">Aucun jour défini</p>
                        <p className="text-xs text-gray-400">Cliquez sur "➕ Ajouter un jour" pour commencer</p>
                      </div>
                    ) : (
                      formTache.repartitionManuelle.map((item, idx) => {
                        const dateObj = parseISODate(item.date);
                        const jourSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dateObj.getDay()];
                        return (
                          <div key={idx} className="flex gap-2 items-center p-3 rounded border-2 border-gray-200 hover:border-purple-300 transition-colors bg-gray-50">
                            <div className="flex-1 flex gap-2 items-center">
                              <span className="text-xs font-semibold text-gray-600 w-8">{jourSemaine}</span>
                              <Input
                                type="date"
                                value={item.date}
                                onChange={(e) => {
                                  const newRep = [...formTache.repartitionManuelle];
                                  newRep[idx].date = e.target.value;
                                  setFormTache({ ...formTache, repartitionManuelle: newRep });
                                }}
                                className="text-sm flex-1"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={item.heures}
                                onChange={(e) => {
                                  const newRep = [...formTache.repartitionManuelle];
                                  newRep[idx].heures = parseFloat(e.target.value) || 0;
                                  setFormTache({ ...formTache, repartitionManuelle: newRep });
                                }}
                                className="text-sm w-20 text-center font-semibold"
                                placeholder="0.0"
                              />
                              <span className="text-xs text-gray-500">h</span>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const newRep = formTache.repartitionManuelle.filter((_, i) => i !== idx);
                                setFormTache({ ...formTache, repartitionManuelle: newRep });
                              }}
                              className="text-sm px-2 py-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              title="Supprimer ce jour"
                            >
                              🗑️
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {loadingPreview ? (
                    <div className="text-center py-4 text-sm text-muted">
                      ⏳ Calcul de la répartition...
                    </div>
                  ) : previewRepartition && previewRepartition.length > 0 ? (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <h3 className="text-sm font-semibold text-gray-800">
                            Répartition calculée 
                            <span className="ml-2 text-xs font-normal text-gray-600">
                              ({
                                {
                                  'JUSTE_TEMPS': 'JAT',
                                  'EQUILIBRE': 'Équilibré',
                                  'PEPS': 'PEPS',
                                  'MANUEL': 'Manuel'
                                }[formTache.typeRepartition]
                              })
                            </span>
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          onClick={chargerPreviewRepartition}
                          className="text-xs px-3 py-1.5 hover:bg-gray-200"
                        >
                          🔄 Recalculer
                        </Button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="divide-y divide-gray-200">
                          {previewRepartition.map((r, idx) => (
                            <div 
                              key={r.date} 
                              className={`px-4 py-3 transition-colors hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800">
                                    {formatDateAvecJour(r.date)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={r.heures}
                                    onChange={(e) => {
                                      const nouvellesDuree = parseFloat(e.target.value) || 0;
                                      const newPreview = [...previewRepartition];
                                      newPreview[idx].heures = nouvellesDuree;
                                      
                                      // Recalculer l'heure de fin en fonction de la nouvelle durée
                                      const heureDebut = convertirHeureVersFomatHTML(newPreview[idx].heureDebut);
                                      newPreview[idx].heureFin = calculerHeureFin(heureDebut, nouvellesDuree);
                                      
                                      setPreviewRepartition(newPreview);
                                    }}
                                    className="text-sm w-16 text-center font-semibold"
                                  />
                                  <span className="text-xs text-gray-600">h</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm pl-0">
                                <span className="text-xs text-gray-600 w-12">Plage:</span>
                                <Input
                                  type="time"
                                  value={convertirHeureVersFomatHTML(r.heureDebut)}
                                  onChange={(e) => {
                                    const newPreview = [...previewRepartition];
                                    newPreview[idx].heureDebut = e.target.value;
                                    setPreviewRepartition(newPreview);
                                  }}
                                  className="text-sm w-24"
                                />
                                <span className="text-gray-400">→</span>
                                <Input
                                  type="time"
                                  value={convertirHeureVersFomatHTML(r.heureFin)}
                                  onChange={(e) => {
                                    const newPreview = [...previewRepartition];
                                    newPreview[idx].heureFin = e.target.value;
                                    setPreviewRepartition(newPreview);
                                  }}
                                  className="text-sm w-24"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-100 px-4 py-3 border-t border-gray-300">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Total</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">{previewRepartition.length} jours</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-600">
                                {previewRepartition.reduce((s, r) => s + r.heures, 0).toFixed(2)}h
                              </span>
                              <span className="text-xs text-gray-500">/</span>
                              <span className="text-sm text-gray-600">
                                {parseFloat(formTache.heuresTotal as string || '0').toFixed(2)}h
                              </span>
                              {Math.abs(previewRepartition.reduce((s, r) => s + r.heures, 0) - parseFloat(formTache.heuresTotal as string || '0')) > 0.01 && (
                                <span className={`text-xs font-medium ml-2 ${
                                  previewRepartition.reduce((s, r) => s + r.heures, 0) < parseFloat(formTache.heuresTotal as string || '0')
                                    ? 'text-orange-600'
                                    : 'text-red-600'
                                }`}>
                                  {previewRepartition.reduce((s, r) => s + r.heures, 0) < parseFloat(formTache.heuresTotal as string || '0')
                                    ? `(reste ${(parseFloat(formTache.heuresTotal as string || '0') - previewRepartition.reduce((s, r) => s + r.heures, 0)).toFixed(2)}h)`
                                    : `(excès ${(previewRepartition.reduce((s, r) => s + r.heures, 0) - parseFloat(formTache.heuresTotal as string || '0')).toFixed(2)}h)`
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted border border-dashed border-gray-300 rounded">
                      Aucune répartition générée
                    </div>
                  )}
                </>
              )}

              {erreurCreation && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {erreurCreation}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEtapeCreation(1)}
                >
                  ← Retour
                </Button>
                <Button
                  variant="primaire"
                  onClick={() => handleSubmitTache()}
                  disabled={
                    submitting || 
                    (formTache.typeRepartition === 'MANUEL' && formTache.repartitionManuelle.length === 0) ||
                    (formTache.typeRepartition !== 'MANUEL' && (!previewRepartition || previewRepartition.length === 0))
                  }
                >
                  {submitting ? 'Création...' : 'Créer la tâche'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Bloquer du temps */}
      <Modal
        titre="Bloquer du temps pour un traducteur"
        ouvert={showBlocageModal}
        onFermer={() => {
          setShowBlocageModal(false);
          setFormBlocage({
            traducteurId: '',
            date: today,
            heureDebut: '09:00',
            heureFin: '17:00',
            motif: ''
          });
          setErreurBlocage('');
        }}
        ariaDescription="Formulaire de blocage de temps"
      >
        <div className="space-y-4">
          {erreurBlocage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreurBlocage}
            </div>
          )}

          <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-300 rounded">
            <h3 className="text-sm font-bold text-blue-900 mb-2">🔒 Informations du blocage</h3>
            
            {/* Traducteur */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">Traducteur <span className="text-red-600">*</span></label>
              <Select
                value={formBlocage.traducteurId}
                onChange={(e) => setFormBlocage({ ...formBlocage, traducteurId: e.target.value })}
                required
                className="border-2 border-blue-300"
              >
                <option value="">Sélectionner un traducteur...</option>
                {traducteurs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} - {t.division} ({t.horaire || '9h-17h'})
                  </option>
                ))}
              </Select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">Date <span className="text-red-600">*</span></label>
              <Input
                type="date"
                value={formBlocage.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormBlocage({ ...formBlocage, date: e.target.value })}
                min={today}
                required
                className="border-2 border-blue-300"
              />
            </div>

            {/* Heure de début */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">Heure de début <span className="text-red-600">*</span></label>
              <Input
                type="time"
                value={formBlocage.heureDebut}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormBlocage({ ...formBlocage, heureDebut: e.target.value })}
                required
                className="border-2 border-blue-300"
              />
            </div>

            {/* Heure de fin */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">Heure de fin <span className="text-red-600">*</span></label>
              <Input
                type="time"
                value={formBlocage.heureFin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormBlocage({ ...formBlocage, heureFin: e.target.value })}
                required
                className="border-2 border-blue-300"
              />
            </div>

            {/* Motif */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">Motif <span className="text-red-600">*</span></label>
              <Select
                value={formBlocage.motif}
                onChange={(e) => setFormBlocage({ ...formBlocage, motif: e.target.value })}
                required
                className="border-2 border-blue-300"
              >
                <option value="">Sélectionner un motif...</option>
                <option value="Formation">Formation</option>
                <option value="Réunion">Réunion</option>
                <option value="Congé">Congé</option>
                <option value="Défalcage">Défalcage</option>
                <option value="Autre">Autre</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowBlocageModal(false);
                setFormBlocage({
                  traducteurId: '',
                  date: today,
                  heureDebut: '09:00',
                  heureFin: '17:00',
                  motif: ''
                });
                setErreurBlocage('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primaire"
              onClick={handleSubmitBlocage}
              disabled={submittingBlocage}
            >
              {submittingBlocage ? 'Blocage en cours...' : 'Bloquer le temps'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Éditer une tâche */}
      <Modal
        titre={`Éditer la tâche - Étape ${etapeEdition}/2`}
        ouvert={showEditTaskModal}
        onFermer={() => {
          setShowEditTaskModal(false);
          resetFormEdition();
        }}
        ariaDescription="Formulaire pour éditer une tâche existante"
      >
        <div className="space-y-4">
          {erreurEdition && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreurEdition}
            </div>
          )}

          {/* Étape 1 : Informations de base */}
          {etapeEdition === 1 && (
            <div className="space-y-4">
              {/* Section Champs obligatoires */}
              <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-300 rounded">
                <h3 className="text-sm font-bold text-blue-900 mb-2">📝 Informations obligatoires</h3>
                
                {/* Numéro de projet */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Numéro de projet <span className="text-red-600">*</span></label>
                  <Input
                    type="text"
                    value={formEdition.numeroProjet}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatNumeroProjet(e.target.value);
                      setFormEdition({ ...formEdition, numeroProjet: formatted });
                    }}
                    placeholder="123-4567-001"
                    maxLength={12}
                    required
                    className="border-2 border-blue-300"
                  />
                </div>

                {/* Traducteur */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Traducteur <span className="text-red-600">*</span></label>
                  <Select
                    value={formEdition.traducteurId}
                    onChange={(e) => setFormEdition({ ...formEdition, traducteurId: e.target.value })}
                    required
                    className="border-2 border-blue-300"
                  >
                    <option value="">Rechercher ou sélectionner un traducteur...</option>
                    {traducteurs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.disponiblePourTravail ? '🟢 ' : ''}
                        {t.nom}
                        {t.horaire ? ` (${t.horaire} | 🍽️ 12h-13h)` : ''} - {t.division} ({t.capaciteHeuresParJour}h/jour)
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Type de tâche */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Type de tâche <span className="text-red-600">*</span></label>
                  <Select
                    value={formEdition.typeTache}
                    onChange={(e) => setFormEdition({ ...formEdition, typeTache: e.target.value as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE' })}
                    required
                    className="border-2 border-blue-300"
                  >
                    <option value="TRADUCTION">Traduction</option>
                    <option value="REVISION">Révision</option>
                    <option value="RELECTURE">Relecture</option>
                    <option value="ENCADREMENT">Encadrement</option>
                    <option value="AUTRE">Autre</option>
                  </Select>
                </div>

                {/* Heures totales */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Heures totales <span className="text-red-600">*</span></label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formEdition.heuresTotal || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, heuresTotal: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 4.5"
                    required
                    className="border-2 border-blue-300"
                  />
                </div>

                {/* Compte de mots */}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900">Compte de mots</label>
                  <Input
                    type="number"
                    min="0"
                    value={formEdition.compteMots || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, compteMots: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 5000"
                    className="border-2 border-blue-300"
                  />
                </div>

                {/* Date d'échéance */}
                <div>
                  <DateTimeInput
                    label="Date d'échéance"
                    value={formEdition.dateEcheance}
                    onChange={(value) => setFormEdition({ ...formEdition, dateEcheance: value })}
                    includeTime={true}
                    required
                  />
                </div>
              </div>

              {/* Section Champs optionnels */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">📎 Informations optionnelles</h3>
                
                {/* Paire linguistique (optionnel) */}
                {formEdition.traducteurId && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Paire linguistique <span className="text-gray-500 text-xs">(optionnel)</span></label>
                    <Select
                      value={formEdition.paireLinguistiqueId}
                      onChange={(e) => setFormEdition({ ...formEdition, paireLinguistiqueId: e.target.value })}
                    >
                      <option value="">Aucune paire linguistique</option>
                      {pairesDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.langueSource} → {p.langueCible}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Client (optionnel) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Client</label>
                  <Select
                    value={formEdition.clientId}
                    onChange={(e) => setFormEdition({ ...formEdition, clientId: e.target.value })}
                  >
                    <option value="">Aucun client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </Select>
                </div>

                {/* Sous-domaine (optionnel) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Sous-domaine</label>
                  <Select
                    value={formEdition.sousDomaineId}
                    onChange={(e) => setFormEdition({ ...formEdition, sousDomaineId: e.target.value })}
                  >
                    <option value="">Aucun sous-domaine</option>
                    {sousDomaines.map((sd) => (
                      <option key={sd.id} value={sd.id}>{sd.nom}</option>
                    ))}
                  </Select>
                </div>

                {/* Spécialisation (optionnel) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Spécialisation</label>
                  <Input
                    type="text"
                    value={formEdition.specialisation}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, specialisation: e.target.value })}
                    placeholder="Ex: Médical, Juridique, Technique..."
                  />
                </div>

                {/* Commentaire (optionnel) */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Commentaire <span className="text-gray-500 text-xs">(optionnel)</span></label>
                  <textarea
                    value={formEdition.description}
                    onChange={(e) => setFormEdition({ ...formEdition, description: e.target.value })}
                    placeholder="Ajoutez un commentaire ou des détails..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              {/* Mode de répartition */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 mb-2">⚙️ Mode de répartition <span className="text-red-600">*</span></h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formEdition.typeRepartition === 'JUSTE_TEMPS' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartitionEdit"
                      value="JUSTE_TEMPS"
                      checked={formEdition.typeRepartition === 'JUSTE_TEMPS'}
                      onChange={(e) => setFormEdition({ ...formEdition, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">📊 Juste à temps (JAT)</div>
                      <div className="text-xs text-gray-600 mt-1">Optimise en fonction de la charge actuelle. Les heures sont réparties intelligemment pour maximiser l'utilisation de la capacité disponible jusqu'à l'échéance.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formEdition.typeRepartition === 'PEPS' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartitionEdit"
                      value="PEPS"
                      checked={formEdition.typeRepartition === 'PEPS'}
                      onChange={(e) => setFormEdition({ ...formEdition, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">🔄 Première entrée, première sortie (PEPS)</div>
                      <div className="text-xs text-gray-600 mt-1">Commence dès que possible et termine à l'échéance. Les heures sont affectées dans l'ordre chronologique.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formEdition.typeRepartition === 'EQUILIBRE' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartitionEdit"
                      value="EQUILIBRE"
                      checked={formEdition.typeRepartition === 'EQUILIBRE'}
                      onChange={(e) => setFormEdition({ ...formEdition, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">⚖️ Équilibré sur le temps</div>
                      <div className="text-xs text-gray-600 mt-1">Répartit uniformément les heures entre une date de début et de fin. Idéal pour une charge de travail constante.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: formEdition.typeRepartition === 'MANUEL' ? '#3b82f6' : '#d1d5db' }}>
                    <input
                      type="radio"
                      name="typeRepartitionEdit"
                      value="MANUEL"
                      checked={formEdition.typeRepartition === 'MANUEL'}
                      onChange={(e) => setFormEdition({ ...formEdition, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">✍️ Manuel</div>
                      <div className="text-xs text-gray-600 mt-1">Vous définissez vous-même les heures pour chaque jour. Contrôle total de la répartition.</div>
                    </div>
                  </label>
                </div>
              </div>

              {formEdition.typeRepartition === 'PEPS' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Date de début</label>
                  <Input
                    type="date"
                    value={formEdition.dateDebut}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, dateDebut: e.target.value })}
                    required
                  />
                </div>
              )}

              {formEdition.typeRepartition === 'EQUILIBRE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de début</label>
                    <Input
                      type="date"
                      value={formEdition.dateDebut}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, dateDebut: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de fin</label>
                    <Input
                      type="date"
                      value={formEdition.dateFin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, dateFin: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditTaskModal(false);
                    resetFormEdition();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primaire"
                  onClick={handleEtape1SuivantEdit}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          )}

          {/* Étape 2 : Répartition */}
          {etapeEdition === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium mb-2 text-sm">📋 Résumé de la tâche</h3>
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">Traducteur:</span> {traducteurs.find(t => t.id === formEdition.traducteurId)?.nom}</p>
                    </div>
                  </div>
                  {formEdition.traducteurId && (
                    <div className="flex-shrink-0">
                      <BoutonPlanificationTraducteur 
                        traducteurId={formEdition.traducteurId}
                        className="text-xs px-3 py-2 whitespace-nowrap"
                      />
                    </div>
                  )}
                </div>
              </div>

              {formEdition.repartitionAuto ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Prévisualisation JAT</h3>
                  
                  {loadingPreviewEdit ? (
                    <p className="text-sm text-muted">Calcul en cours...</p>
                  ) : previewJATEdit && previewJATEdit.length > 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-64 overflow-y-auto">
                      <div className="space-y-1.5">
                        {previewJATEdit.map((r, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-white px-2 py-1 rounded">
                            <span className="font-medium">{formatDateAvecJour(r.date)}</span>
                            <span className="text-primary font-semibold">{r.heures}h</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted mt-2">
                        Total: {previewJATEdit.reduce((sum, r) => sum + r.heures, 0)}h sur {previewJATEdit.length} jours
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">Impossible de générer la répartition JAT</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-purple-50 border-2 border-purple-300 rounded">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-900">📅 Distribution des heures par jour</h3>
                    <Button
                      variant="primaire"
                      onClick={() => {
                        const lastDate = formEdition.repartitionManuelle.length > 0
                          ? formEdition.repartitionManuelle[formEdition.repartitionManuelle.length - 1].date
                          : today;
                        const nextDate = addDaysOttawa(parseISODate(lastDate), 1);
                        setFormEdition({
                          ...formEdition,
                          repartitionManuelle: [
                            ...formEdition.repartitionManuelle,
                            { date: dateISO(nextDate), heures: 0 }
                          ]
                        });
                      }}
                      className="text-xs px-3 py-1.5"
                    >
                      ➕ Ajouter un jour
                    </Button>
                  </div>

                  {(() => {
                    const totalManuel = formEdition.repartitionManuelle.reduce((s, r) => s + r.heures, 0);
                    const heuresAttendu = Number(formEdition.heuresTotal) || 0;
                    const correspondance = Math.abs(totalManuel - heuresAttendu) < 0.01;
                    const restant = heuresAttendu - totalManuel;
                    
                    return (
                      <div className={`p-3 rounded font-medium text-sm ${correspondance ? 'bg-green-100 border-2 border-green-500 text-green-900' : restant > 0 ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-900' : 'bg-red-100 border-2 border-red-500 text-red-900'}`}>
                        <div className="flex justify-between items-center">
                          <span>Total distribué: <strong>{totalManuel.toFixed(2)}h</strong> / {heuresAttendu.toFixed(2)}h</span>
                          {correspondance ? (
                            <span className="text-green-700 text-lg">✅ Complet</span>
                          ) : restant > 0 ? (
                            <span className="text-yellow-700">⚠️ Reste {restant.toFixed(2)}h à distribuer</span>
                          ) : (
                            <span className="text-red-700">❌ Dépassement de {Math.abs(restant).toFixed(2)}h</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="max-h-80 overflow-y-auto space-y-2 bg-white p-3 rounded border border-purple-200">
                    {formEdition.repartitionManuelle.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 mb-3">Aucun jour défini</p>
                        <p className="text-xs text-gray-400">Cliquez sur "➕ Ajouter un jour" pour commencer</p>
                      </div>
                    ) : (
                      formEdition.repartitionManuelle.map((item, idx) => {
                        const dateObj = parseISODate(item.date);
                        const jourSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dateObj.getDay()];
                        return (
                          <div key={idx} className="flex gap-2 items-center p-3 rounded border-2 border-gray-200 hover:border-purple-300 transition-colors bg-gray-50">
                            <div className="flex-1 flex gap-2 items-center">
                              <span className="text-xs font-semibold text-gray-600 w-8">{jourSemaine}</span>
                              <Input
                                type="date"
                                value={item.date}
                                onChange={(e) => {
                                  const newRep = [...formEdition.repartitionManuelle];
                                  newRep[idx].date = e.target.value;
                                  setFormEdition({ ...formEdition, repartitionManuelle: newRep });
                                }}
                                className="text-sm flex-1"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={item.heures}
                                onChange={(e) => {
                                  const newRep = [...formEdition.repartitionManuelle];
                                  newRep[idx].heures = parseFloat(e.target.value) || 0;
                                  setFormEdition({ ...formEdition, repartitionManuelle: newRep });
                                }}
                                className="text-sm w-20 text-center font-semibold"
                                placeholder="0.0"
                              />
                              <span className="text-xs text-gray-500">h</span>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const newRep = formEdition.repartitionManuelle.filter((_, i) => i !== idx);
                                setFormEdition({ ...formEdition, repartitionManuelle: newRep });
                              }}
                              className="text-sm px-2 py-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              title="Supprimer ce jour"
                            >
                              🗑️
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={async () => {
                    if (tacheEnEdition && confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                      try {
                        await tacheService.supprimerTache(tacheEnEdition);
                        setShowEditTaskModal(false);
                        resetFormEdition();
                        window.location.reload();
                      } catch (err: any) {
                        setErreurEdition(err.message || 'Erreur lors de la suppression');
                      }
                    }
                  }}
                >
                  🗑️ Supprimer
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEtapeEdition(1)}
                  >
                    ← Retour
                  </Button>
                  <Button
                    variant="primaire"
                    onClick={handleUpdateTache}
                    disabled={submitting || (formEdition.repartitionAuto && (!previewJATEdit || previewJATEdit.length === 0))}
                  >
                    {submitting ? 'Mise à jour...' : 'Mettre à jour la tâche'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Charge de travail d'un traducteur */}
      <Modal
        titre={`📋 Charge de travail - ${chargeTraducteur?.traducteur.nom || ''}`}
        ouvert={showChargeModal}
        onFermer={() => {
          setShowChargeModal(false);
          setChargeTraducteur(null);
        }}
        ariaDescription="Détail de la charge de travail du traducteur"
      >
        {loadingCharge ? (
          <p className="text-sm text-muted">Chargement...</p>
        ) : chargeTraducteur ? (
          <div className="space-y-4">
            {/* Informations du traducteur */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted text-xs">Division</p>
                  <p className="font-semibold">{chargeTraducteur.traducteur.division}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Horaire</p>
                  <p className="font-semibold">{(chargeTraducteur.traducteur as any).horaire || '9h-17h'} <span className="text-gray-500 font-normal text-xs">| 🍽️ 12h-13h</span></p>
                </div>
                <div>
                  <p className="text-muted text-xs">Capacité quotidienne</p>
                  <p className="font-semibold">{chargeTraducteur.traducteur.capaciteHeuresParJour}h/jour</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Total heures planifiées</p>
                  <p className="font-bold text-lg text-primary">{chargeTraducteur.heuresTotal.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Nombre de tâches</p>
                  <p className="font-bold text-lg">{chargeTraducteur.tachesTotales.length}</p>
                </div>
              </div>
            </div>

            {/* Tâches par statut */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Répartition par statut</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
                  <p className="text-xs text-muted">Planifiées</p>
                  <p className="font-bold text-blue-700">{chargeTraducteur.tachesParStatut.PLANIFIEE?.length || 0}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
                  <p className="text-xs text-muted">En cours</p>
                  <p className="font-bold text-yellow-700">{chargeTraducteur.tachesParStatut.EN_COURS?.length || 0}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                  <p className="text-xs text-muted">Terminées</p>
                  <p className="font-bold text-green-700">{chargeTraducteur.tachesParStatut.TERMINEE?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Liste des tâches */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Détail des tâches</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {chargeTraducteur.tachesTotales.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">Aucune tâche assignée</p>
                ) : (
                  chargeTraducteur.tachesTotales.map((tache: any) => (
                    <div
                      key={tache.id}
                      className="bg-white border border-border rounded p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-primary">
                              {tache.numeroProjet}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              tache.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                              tache.statut === 'EN_COURS' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {tache.statut === 'TERMINEE' ? 'Terminée' :
                               tache.statut === 'EN_COURS' ? 'En cours' : 'Planifiée'}
                            </span>
                            {tache.priorite === 'URGENT' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                🔥 URGENT
                              </span>
                            )}
                            <span className="text-xs text-muted">
                              {tache.typeTache || 'TRADUCTION'}
                            </span>
                          </div>
                          {tache.description && <p className="text-sm mb-1">{tache.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                            {tache.paireLinguistique && (
                              <span>🌐 {tache.paireLinguistique.langueSource} → {tache.paireLinguistique.langueCible}</span>
                            )}
                            {tache.client && <span>👤 {tache.client.nom}</span>}
                            <span className="font-semibold">⏱️ {tache.heuresTotal}h</span>
                            {tache.compteMots && <span className="font-semibold">📝 {tache.compteMots} mots</span>}
                            <span className="font-semibold">📅 {tache.dateEcheance ? formatDateAvecJour(tache.dateEcheance.split('T')[0]) : 'Non définie'} à {tache.heureEcheance || '17:00'}</span>
                          </div>
                          {tache.traducteur && (
                            <div className="mt-1 text-xs text-muted">
                              👤 {tache.traducteur.nom} • Horaire: {tache.traducteur.horaire || '9h-17h'}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowChargeModal(false);
                            handleEditTache(tache.id);
                          }}
                          className="text-xs px-2 py-1 shrink-0"
                        >
                          ✏️
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="primaire"
                onClick={() => {
                  setShowChargeModal(false);
                  setFormTache(prev => ({
                    ...prev,
                    traducteurId: chargeTraducteur?.traducteur.id || ''
                  }));
                  setShowAddTaskModal(true);
                }}
              >
                ➕ Créer une tâche
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowChargeModal(false);
                  setChargeTraducteur(null);
                }}
              >
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucune donnée disponible</p>
        )}
      </Modal>

      {/* Modal Tetrix Orion */}
      <Modal
        titre="🔭 Tetrix Orion - Analyse Statistique Avancée"
        ouvert={showOrionModal}
        onFermer={() => setShowOrionModal(false)}
        ariaDescription="Rapport statistique avancé du planning"
      >
        {chargementOrion ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted">Génération du rapport Orion...</p>
            <p className="text-xs text-muted mt-2">Analyse en cours</p>
          </div>
        ) : erreurOrion ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800 font-medium mb-2">❌ Erreur</p>
            <p className="text-xs text-red-700">{erreurOrion}</p>
            <Button
              variant="outline"
              onClick={chargerRapportOrion}
              className="mt-3 text-xs"
            >
              Réessayer
            </Button>
          </div>
        ) : rapportOrion ? (
          <TetrixOrionDisplay rapport={rapportOrion} />
        ) : (
          <p className="text-sm text-muted text-center py-8">Aucun rapport disponible</p>
        )}
      </Modal>

      {/* Panneau principal à droite - Tableau de planification */}
      <div className="flex-1 bg-white border border-border rounded shadow-sm overflow-hidden flex flex-col">
        {/* En-tête compact avec contrôles de plage */}
        <div className="border-b border-border px-2 py-1 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold">
              Planification ({planificationEnrichie?.planification.length || 0})
            </h2>
            {/* Boutons de plage */}
            <div className="flex gap-0.5 items-center">
              <Button
                variant={applied.start === today && applied.range === 7 ? 'primaire' : 'outline'}
                onClick={() => {
                  setPending((prev) => ({ ...prev, start: today, range: 7 }));
                  setApplied((prev) => ({ ...prev, start: today, range: 7 }));
                }}
                className="px-2 py-0.5 text-xs"
                title="Aujourd'hui"
              >
                Aujourd'hui
              </Button>
              {[7, 14, 30].map((val) => (
                <Button
                  key={val}
                  variant={applied.range === val ? 'primaire' : 'outline'}
                  onClick={() => {
                    setPending((prev) => ({ ...prev, range: val as 7 | 14 | 30 }));
                    setApplied((prev) => ({ ...prev, range: val as 7 | 14 | 30 }));
                  }}
                  className="px-2 py-0.5 text-xs"
                >
                  {val}j
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => setShowCustomRangeDialog(!showCustomRangeDialog)}
                className="px-2 py-0.5 text-xs"
                title="Plage personnalisée"
              >
                📋 Plage
              </Button>
              {showCustomRangeDialog && (
                <div className="absolute top-10 left-20 bg-white border border-border rounded shadow-lg p-3 z-50 w-64">
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium block mb-0.5">Du</label>
                      <input
                        type="date"
                        value={customRangeStart}
                        onChange={(e) => setCustomRangeStart(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-0.5">Au</label>
                      <input
                        type="date"
                        value={customRangeEnd}
                        onChange={(e) => setCustomRangeEnd(e.target.value)}
                        min={customRangeStart}
                        className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        variant="primaire"
                        onClick={handleApplyCustomRange}
                        className="flex-1 px-2 py-1 text-xs"
                      >
                        ✓ OK
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCustomRangeDialog(false)}
                        className="flex-1 px-2 py-1 text-xs"
                      >
                        ✕ Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Légende des couleurs et bouton rafraîchir */}
          <div className="flex gap-2 text-[10px] items-center">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100">
              <span className="w-2 h-2 rounded bg-green-400"></span>
              Libre
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100">
              <span className="w-2 h-2 rounded bg-yellow-400"></span>
              ≈Plein
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100">
              <span className="w-2 h-2 rounded bg-red-400"></span>
              Plein
            </span>
            <Button
              variant="outline"
              onClick={() => setShowAvailable(!showAvailable)}
              className={`px-2 py-1 text-xs ml-2 ${showAvailable ? 'bg-green-50' : 'bg-blue-50'}`}
              title={showAvailable ? "Afficher la charge" : "Afficher la disponibilité"}
            >
              {showAvailable ? '✓ Disponibilité' : '📊 Charge'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={loading}
              className="px-2 py-1 text-xs"
              title="Rafraîchir les données"
            >
              🔄 Rafraîchir
            </Button>
          </div>
        </div>

        {/* Zone de tableau avec défilement */}
        <div className="relative flex-1 overflow-hidden">
          {/* Barre de recherche de traducteur */}
          <div className="bg-gray-50 border-b border-border p-2">
            <input
              type="text"
              placeholder="🔍 Rechercher un traducteur par nom..."
              value={searchTraducteur}
              onChange={(e) => setSearchTraducteur(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchTraducteur && (
              <button
                onClick={() => setSearchTraducteur('')}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                title="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
          <div ref={tableContainerRef} className="overflow-auto h-full w-full">
            {loading && <p className="text-xs text-muted text-center py-2">Chargement...</p>}
            {error && <p className="text-xs text-red-600 text-center py-2">{error}</p>}
            {!loading && !error && (
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border-r border-border px-2 py-1.5 text-left font-semibold sticky left-0 bg-gray-50 z-20 min-w-[200px]">
                    Traducteur
                  </th>
                  {days.map((iso) => {
                    const d = parseISODate(iso);
                    const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d);
                    const dayNum = d.getDate();
                    const month = d.getMonth() + 1;
                    const isTodayCol = isToday(iso);
                    const isWeekendCol = isWeekend(iso);
                    return (
                      <th
                        key={iso}
                        className={`border-r border-border px-1 py-1.5 text-center font-semibold min-w-[52px] ${
                          isTodayCol ? 'bg-blue-50' : isWeekendCol ? 'bg-gray-200' : ''
                        }`}
                      >
                        <div className={`text-[10px] ${
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
                {planificationEnrichie?.planification
                  .filter(ligne => {
                    if (!searchTraducteur) return true;
                    return ligne.traducteur.nom.toLowerCase().includes(searchTraducteur.toLowerCase());
                  })
                  .map((ligne, idx) => {
                  const isSearchResult = searchResults.includes(ligne.traducteur.id);
                  return (
                    <tr key={ligne.traducteur.id} className={`group transition-all duration-200 ${isSearchResult ? 'ring-2 ring-yellow-400 ring-inset' : ''} ${idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-100 hover:bg-blue-50'} hover:shadow-lg hover:relative hover:z-[5]`}>
                      <td className={`border-r border-b border-border px-2 py-1 font-medium sticky left-0 z-10 transition-colors ${isSearchResult ? 'bg-yellow-200 group-hover:bg-yellow-100' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-100')} group-hover:bg-blue-50`}>
                        <button
                          onClick={() => chargerChargeTraducteur(ligne.traducteur)}
                          className="text-left w-full hover:text-primary transition-colors cursor-pointer"
                          title={`Voir la charge de travail de ${ligne.traducteur.nom}`}
                        >
                          <div className={`truncate font-medium text-xs leading-tight ${isSearchResult ? 'text-yellow-900' : ''}`}>
                            {isSearchResult && '⭐ '}
                            {(ligne.traducteur as any).disponiblePourTravail && (
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1" title="Cherche du travail"></span>
                            )}
                            {ligne.traducteur.nom} • <span className="font-normal text-[9px]">
                              {ligne.traducteur.division} • {ligne.traducteur.classification}
                              {' • 🕐 '}
                              {(ligne.traducteur as any).horaire || <span className="text-gray-400 italic">non défini</span>}
                            </span>
                          </div>
                          {(ligne.traducteur as any).specialisations && (ligne.traducteur as any).specialisations.length > 0 && (
                            <div className="text-[9px] text-orange-600 leading-tight mt-0.5">
                              📝 {(ligne.traducteur as any).specialisations.join(', ')}
                            </div>
                          )}
                          <div className="text-[8px] text-muted truncate leading-tight mt-0.5">
                            {ligne.traducteur.domaines && ligne.traducteur.domaines.length > 0 && (
                              <span className="text-blue-600">
                                📂 {ligne.traducteur.domaines.join(', ')}
                              </span>
                            )}
                            {ligne.traducteur.clientsHabituels && ligne.traducteur.clientsHabituels.length > 0 && (
                              <span className="text-green-600">
                                {ligne.traducteur.domaines && ligne.traducteur.domaines.length > 0 ? ' | ' : ''}👤 {ligne.traducteur.clientsHabituels.join(', ')}
                              </span>
                            )}
                            {ligne.traducteur.pairesLinguistiques && ligne.traducteur.pairesLinguistiques.length > 0 && (
                              <span className="text-purple-600">
                                {(ligne.traducteur.domaines && ligne.traducteur.domaines.length > 0) || (ligne.traducteur.clientsHabituels && ligne.traducteur.clientsHabituels.length > 0) ? ' | ' : ''}🌐 {ligne.traducteur.pairesLinguistiques.map(p => `${p.langueSource}→${p.langueCible}`).join(', ')}
                              </span>
                            )}
                          </div>
                        </button>
                      </td>
                      {days.map((iso) => {
                        const info = ligne.dates[iso];
                        const isTodayCol = isToday(iso);
                        const isWeekendCol = isWeekend(iso);
                        let bgClass = 'bg-gray-100';
                        let textClass = 'text-gray-600';
                        
                        const heures = info ? info.heures : 0;
                        const capacite = info ? (info.capacite ?? ligne.traducteur.capaciteHeuresParJour) : ligne.traducteur.capaciteHeuresParJour;
                        const disponible = capacite - heures;
                        
                        if (isWeekendCol) {
                          bgClass = 'bg-gray-300';
                          textClass = 'text-gray-500';
                        } else {
                          // Calculer la couleur basée sur la disponibilité
                          if (disponible >= capacite * 0.8) {
                            bgClass = 'bg-green-100';
                            textClass = 'text-green-700';
                          } else if (disponible > 0) {
                            bgClass = 'bg-yellow-100';
                            textClass = 'text-yellow-700';
                          } else {
                            bgClass = 'bg-red-100';
                            textClass = 'text-red-700';
                          }
                        }
                        return (
                          <td
                            key={iso}
                            className={`border-r border-b border-border text-center px-1 py-1.5 ${bgClass} ${isTodayCol ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                          >
                            {isWeekendCol ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className={`font-semibold text-xs ${textClass}`}>—</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  chargerTachesCellule(ligne.traducteur.id, ligne.traducteur.nom, iso);
                                }}
                                className="w-full h-full hover:opacity-80 transition-opacity cursor-pointer"
                                title={`${ligne.traducteur.nom}\n${iso}\n${disponible.toFixed(1)}h disponibles / ${heures.toFixed(1)}h occupées sur ${capacite.toFixed(1)}h\nCliquer pour voir les tâches`}
                              >
                                <div className={`font-semibold text-xs ${textClass}`}>
                                  {showAvailable ? disponible.toFixed(1) : heures.toFixed(1)}
                                </div>
                                <div className="text-[9px] text-muted">
                                  /{capacite.toFixed(0)}h
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

      {/* Modal Tâches d'une cellule */}
      {celluleSelectionnee && (
        <Modal
          titre={`📋 ${celluleSelectionnee.traducteurNom} - ${formatDateAvecJour(celluleSelectionnee.date)}`}
          ouvert={!!celluleSelectionnee}
          onFermer={() => setCelluleSelectionnee(null)}
          ariaDescription="Liste des tâches pour ce traducteur à cette date"
        >
          {loadingTaches ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted">Chargement des tâches...</p>
            </div>
          ) : celluleSelectionnee.taches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted">Aucune tâche planifiée pour cette date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Résumé en en-tête */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                      {celluleSelectionnee.taches.length} tâche(s) ce jour
                    </h4>
                    <p className="text-xs text-blue-700">
                      {parseISODate(celluleSelectionnee.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        timeZone: 'America/Toronto'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted mb-1">Total ce jour</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {celluleSelectionnee.taches.reduce((sum, t) => {
                        const aj = t.ajustementsTemps?.find((a: any) => a.date.split('T')[0] === celluleSelectionnee.date);
                        return sum + (aj ? aj.heures : 0);
                      }, 0).toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline de la journée */}
              {(() => {
                const traducteur = traducteurs.find(t => t.nom === celluleSelectionnee.traducteurNom);
                const horaire = traducteur?.horaire || '9h-17h';
                
                // Récupérer les données du jour
                const ligneTraducteur = planificationEnrichie?.planification
                  .find(p => p.traducteur.id === traducteur?.id);
                const dateData = ligneTraducteur?.dates[celluleSelectionnee.date];
                
                const heuresTotal = celluleSelectionnee.taches.reduce((sum, t) => {
                  const aj = t.ajustementsTemps?.find((a: any) => a.date.split('T')[0] === celluleSelectionnee.date);
                  return sum + (aj ? aj.heures : 0);
                }, 0);
                
                const capaciteJour = dateData?.capacite || 7.5;
                const disponible = dateData?.disponible || 0;
                const tempsUtilise = capaciteJour - disponible;
                const tempsDisponible = disponible;
                
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      ⏰ Aperçu de la journée
                      <span className="text-xs font-normal text-muted">({horaire})</span>
                    </h4>
                    
                    {/* Barres de capacité */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-xs text-muted">Capacité:</div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden flex">
                          {heuresTotal > 0 && (
                            <div 
                              className="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold"
                              style={{ width: `${(heuresTotal / capaciteJour) * 100}%` }}
                              title={`Tâches: ${heuresTotal.toFixed(1)}h`}
                            >
                              {heuresTotal > 0.5 ? `${heuresTotal.toFixed(1)}h` : ''}
                            </div>
                          )}
                          {tempsUtilise > heuresTotal && (
                            <div 
                              className="bg-orange-400 flex items-center justify-center text-white text-xs font-semibold"
                              style={{ width: `${((tempsUtilise - heuresTotal) / capaciteJour) * 100}%` }}
                              title={`Temps bloqué: ${(tempsUtilise - heuresTotal).toFixed(1)}h`}
                            >
                              {(tempsUtilise - heuresTotal) > 0.5 ? `${(tempsUtilise - heuresTotal).toFixed(1)}h` : ''}
                            </div>
                          )}
                          {tempsDisponible > 0 && (
                            <div 
                              className="bg-green-200 flex items-center justify-center text-green-800 text-xs font-semibold"
                              style={{ width: `${(tempsDisponible / capaciteJour) * 100}%` }}
                              title={`Disponible: ${tempsDisponible.toFixed(1)}h`}
                            >
                              {tempsDisponible > 0.5 ? `${tempsDisponible.toFixed(1)}h` : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted whitespace-nowrap">{capaciteJour}h</div>
                      </div>
                      
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span>Tâches ({heuresTotal.toFixed(1)}h)</span>
                        </div>
                        {tempsUtilise > heuresTotal && (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-orange-400 rounded"></div>
                            <span>Bloqué ({(tempsUtilise - heuresTotal).toFixed(1)}h)</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-200 rounded"></div>
                          <span>Disponible ({tempsDisponible.toFixed(1)}h)</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted mt-2">
                        💡 Taux d'utilisation: {((tempsUtilise / capaciteJour) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Liste des tâches */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {celluleSelectionnee.taches.map((tache: any) => {
                  const ajustementCeJour = tache.ajustementsTemps?.find(
                    (aj: any) => aj.date.split('T')[0] === celluleSelectionnee.date
                  );
                  const heuresCeJour = ajustementCeJour ? ajustementCeJour.heures : 0;
                  
                  return (
                    <button
                      key={tache.id}
                      onClick={() => {
                        setCelluleSelectionnee(null);
                        setTacheDetaillee(tache);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-primary">
                              {tache.numeroProjet}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              tache.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                              tache.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {tache.statut || 'PLANIFIEE'}
                            </span>
                            {tache.priorite === 'URGENT' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                🔥 URGENT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mb-1">
                            {tache.typeTache || 'TRADUCTION'}
                          </p>
                          {tache.compteMots && (
                            <p className="text-xs font-semibold text-gray-700">
                              📝 {tache.compteMots} mots
                            </p>
                          )}
                          {tache.client && (
                            <p className="text-xs text-muted">
                              Client: {tache.client.nom}
                            </p>
                          )}
                          {tache.paireLinguistique && (
                            <p className="text-xs text-muted">
                              {tache.paireLinguistique.langueSource} → {tache.paireLinguistique.langueCible}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-700">
                            {heuresCeJour.toFixed(1)}h
                          </div>
                          <div className="text-xs text-muted">
                            sur {tache.heuresTotal}h total
                          </div>
                        </div>
                      </div>
                      {tache.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {tache.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-muted font-semibold">
                          📅 Échéance: {tache.dateEcheance ? formatDateAvecJour(tache.dateEcheance.split('T')[0]) : 'Non définie'} à {tache.heureEcheance || '17:00'}
                        </span>
                        <span className="text-xs text-primary font-medium">
                          Voir détails →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal Détail de tâche */}
      {tacheDetaillee && (
        <Modal
          titre={`Détails - ${tacheDetaillee.numeroProjet}`}
          ouvert={!!tacheDetaillee}
          onFermer={() => setTacheDetaillee(null)}
          ariaDescription="Détails complets de la tâche sélectionnée"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted">Numéro de projet:</span>
                <p className="font-semibold text-primary">{tacheDetaillee.numeroProjet}</p>
              </div>
              <div>
                <span className="font-medium text-muted">Type:</span>
                <p>{tacheDetaillee.typeTache || 'TRADUCTION'}</p>
              </div>
              <div>
                <span className="font-medium text-muted">Traducteur:</span>
                <p>
                  {tacheDetaillee.traducteur?.nom || 'N/A'}
                  {tacheDetaillee.traducteur?.horaire && (
                    <span className="text-xs text-gray-500 block">
                      {tacheDetaillee.traducteur.horaire} | 🍽️ 12h-13h
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted">Heures totales:</span>
                <p className="font-bold">{tacheDetaillee.heuresTotal}h</p>
              </div>
              <div>
                <span className="font-medium text-muted">Date échéance:</span>
                <p>{tacheDetaillee.dateEcheance ? 
                  (tacheDetaillee.dateEcheance.includes('T') 
                    ? formatDateTimeDisplay(parseOttawaTimestamp(tacheDetaillee.dateEcheance))
                    : formatDateAvecJour(tacheDetaillee.dateEcheance.split('T')[0]) + ' à ' + (tacheDetaillee.heureEcheance || '17:00')
                  ) : 'Non définie'}</p>
              </div>
              <div>
                <span className="font-medium text-muted">Statut:</span>
                <p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    tacheDetaillee.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                    tacheDetaillee.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {tacheDetaillee.statut || 'PLANIFIEE'}
                  </span>
                </p>
              </div>
              <div>
                <span className="font-medium text-muted">Mode de distribution:</span>
                <p>{
                  tacheDetaillee.modeDistribution === 'PEPS' ? 'PEPS (Priorité échéance)' :
                  tacheDetaillee.modeDistribution === 'EQUILIBRE' ? 'Équilibré' :
                  tacheDetaillee.modeDistribution === 'MANUEL' ? 'Manuel' :
                  'Juste à temps (JAT)'
                }</p>
              </div>
              <div>
                <span className="font-medium text-muted">Nombre de mots:</span>
                <p>{tacheDetaillee.compteMots ? tacheDetaillee.compteMots.toLocaleString() : 's.o.'}</p>
              </div>
              {tacheDetaillee.client && (
                <div>
                  <span className="font-medium text-muted">Client:</span>
                  <p>{tacheDetaillee.client.nom}</p>
                </div>
              )}
              {tacheDetaillee.sousDomaine && (
                <div>
                  <span className="font-medium text-muted">Domaine:</span>
                  <p>{tacheDetaillee.sousDomaine.nom}</p>
                </div>
              )}
              {tacheDetaillee.paireLinguistique && (
                <div className="col-span-2">
                  <span className="font-medium text-muted">Paire linguistique:</span>
                  <p>{tacheDetaillee.paireLinguistique.langueSource} → {tacheDetaillee.paireLinguistique.langueCible}</p>
                </div>
              )}
            </div>

            {tacheDetaillee.description && (
              <div>
                <span className="font-medium text-muted text-sm">Description:</span>
                <p className="mt-1 text-sm bg-gray-50 p-3 rounded border border-gray-200">{tacheDetaillee.description}</p>
              </div>
            )}

            {tacheDetaillee.specialisation && (
              <div>
                <span className="font-medium text-muted text-sm">Spécialisation:</span>
                <p className="mt-1 text-sm">{tacheDetaillee.specialisation}</p>
              </div>
            )}

            {/* Répartition des heures */}
            {tacheDetaillee.ajustementsTemps && tacheDetaillee.ajustementsTemps.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">📅 Répartition des heures</h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Date</th>
                        <th className="text-right px-3 py-2 font-semibold">Heures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tacheDetaillee.ajustementsTemps
                        .sort((a: any, b: any) => parseOttawaTimestamp(a.date).getTime() - parseOttawaTimestamp(b.date).getTime())
                        .map((aj: any, idx: number) => {
                          // Calcul de l'intervalle basé sur l'horaire du traducteur
                          const horaire = tacheDetaillee.traducteur?.horaire || '9h-17h';
                          let startHour = 9;
                          const match = horaire.match(/^(\d{1,2})/);
                          if (match) startHour = parseInt(match[1]);
                          
                          let endHour = startHour + aj.heures;
                          
                          // Si la plage couvre la pause de midi (12h-13h), on décale la fin d'une heure
                          if (startHour < 12 && (startHour + aj.heures) > 12) {
                            endHour += 1;
                          }
                          
                          const formatTime = (h: number) => {
                            const hour = Math.floor(h);
                            const minutes = Math.round((h - hour) * 60);
                            return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                          };
                          
                          const intervalle = `${formatTime(startHour)} - ${formatTime(endHour)}`;

                          return (
                            <tr key={idx} className={`border-t border-gray-200 transition-colors hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-3 py-2">
                                <div>{formatDateAvecJour(aj.date.split('T')[0])}</div>
                                <div className="text-xs text-gray-500 font-medium">{intervalle}</div>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">{aj.heures.toFixed(2)}h</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-4 border-t">
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-sm hover:shadow-lg hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all duration-200 font-medium text-sm"
                onClick={() => {
                  setTacheDetaillee(null);
                  handleEditTache(tacheDetaillee.id);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Éditer
              </button>
              
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-sm hover:shadow-lg hover:from-red-600 hover:to-red-700 active:scale-95 transition-all duration-200 font-medium text-sm"
                onClick={async () => {
                  if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                    try {
                      await tacheService.supprimerTache(tacheDetaillee.id);
                      setTacheDetaillee(null);
                      window.location.reload();
                    } catch (err: any) {
                      alert('Erreur lors de la suppression: ' + (err.message || 'Erreur inconnue'));
                    }
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Mes tâches créées */}
      <Modal
        titre={utilisateur?.role === 'TRADUCTEUR' ? '📋 Mes tâches assignées' : '📋 Toutes les tâches'}
        ouvert={showMesTachesModal}
        onFermer={() => setShowMesTachesModal(false)}
        ariaDescription={utilisateur?.role === 'TRADUCTEUR' ? 'Liste de vos tâches assignées' : 'Liste de toutes les tâches'}
      >
        <div className="space-y-4">
          {loadingMesTaches ? (
            <p className="text-sm text-muted text-center py-8">Chargement...</p>
          ) : mesTaches.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune tâche créée</p>
          ) : (
            <>
              {/* Filtres */}
              <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-3">
                <h4 className="text-sm font-semibold">🔍 Filtres</h4>
                <div className={`grid gap-2 ${utilisateur?.role === 'TRADUCTEUR' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <div>
                    <label className="text-xs text-muted block mb-1">Statut</label>
                    <Select
                      value={filtresMesTaches.statut}
                      onChange={(e) => {
                        setFiltresMesTaches({ ...filtresMesTaches, statut: e.target.value });
                      }}
                      className="text-xs"
                    >
                      <option value="">Tous</option>
                      <option value="PLANIFIEE">Planifiée</option>
                      <option value="EN_COURS">En cours</option>
                      <option value="TERMINEE">Terminée</option>
                    </Select>
                  </div>
                  {utilisateur?.role !== 'TRADUCTEUR' && (
                    <div>
                      <label className="text-xs text-muted block mb-1">Traducteur</label>
                      <Input
                        type="text"
                        value={filtresMesTaches.traducteur}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setFiltresMesTaches({ ...filtresMesTaches, traducteur: e.target.value });
                        }}
                        placeholder="Nom..."
                        className="text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted block mb-1">Recherche</label>
                    <Input
                      type="text"
                      value={filtresMesTaches.recherche}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFiltresMesTaches({ ...filtresMesTaches, recherche: e.target.value });
                      }}
                      placeholder="Projet, client..."
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primaire"
                    onClick={appliquerFiltresMesTaches}
                    className="text-xs px-3 py-1"
                  >
                    Appliquer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFiltresMesTaches({ statut: '', traducteur: '', recherche: '' });
                      setMesTachesFiltered(mesTaches);
                    }}
                    className="text-xs px-3 py-1"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {mesTachesFiltered.length} tâche(s) affichée(s) sur {mesTaches.length}
                </span>
                <span className="text-muted">
                  {mesTachesFiltered.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(0)}h au total
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {mesTachesFiltered.map((tache: any) => (
                  <div
                    key={tache.id}
                    className="bg-white border border-border rounded p-3 hover:shadow-md hover:border-primary transition-all cursor-pointer"
                    onClick={() => {
                      setShowMesTachesModal(false);
                      setTacheDetaillee(tache);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-primary">
                            {tache.numeroProjet}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            tache.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                            tache.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {tache.statut || 'PLANIFIEE'}
                          </span>
                          {tache.priorite === 'URGENT' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                              🔥 URGENT
                            </span>
                          )}
                          <span className="text-xs text-muted">
                            {tache.typeTache || 'TRADUCTION'}
                          </span>
                        </div>
                        {tache.description && (
                          <p className="text-sm mb-1 line-clamp-1">
                            {tache.description}
                          </p>
                        )}
                        <p className="text-xs text-muted mb-1">
                          👤 {tache.traducteur?.nom || 'Traducteur non assigné'} • Horaire: {tache.traducteur?.horaire || '9h-17h'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                          {tache.client && <span>📋 {tache.client.nom}</span>}
                          {tache.paireLinguistique && (
                            <span>🌐 {tache.paireLinguistique.langueSource} → {tache.paireLinguistique.langueCible}</span>
                          )}
                          {tache.compteMots && <span className="font-semibold">📝 {tache.compteMots.toLocaleString()} mots</span>}
                          <span className="font-semibold">⏱️ {tache.heuresTotal}h</span>
                          <span className="font-semibold">📅 {tache.dateEcheance ? formatDateAvecJour(tache.dateEcheance.split('T')[0]) : 'Non définie'} à {tache.heureEcheance || '17:00'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Tetrix Master - Optimisation */}
      <Modal
        titre="🎯 Tetrix Master - Optimiseur de charge"
        ouvert={showTetrixMaster}
        onFermer={() => setShowTetrixMaster(false)}
        ariaDescription="Analyseur et optimiseur de la charge de travail"
      >
        <div className="space-y-4">
          {/* Onglets */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setEtapeOptimisation('analyse');
                if (!analyseOptimisation && !loadingOptimisation) {
                  chargerAnalyseOptimisation();
                }
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                etapeOptimisation === 'analyse'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-gray-700'
              }`}
            >
              📊 Analyse
            </button>
            <button
              onClick={chargerSuggestions}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                etapeOptimisation === 'suggestions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-gray-700'
              }`}
              disabled={!analyseOptimisation}
            >
              💡 Suggestions
            </button>
          </div>

          {loadingOptimisation ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-muted">Analyse en cours...</p>
            </div>
          ) : etapeOptimisation === 'analyse' && analyseOptimisation ? (
            <TetrixMasterDisplay analyse={analyseOptimisation} />
          ) : etapeOptimisation === 'suggestions' && suggestions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">{suggestions.length} suggestion(s) d'amélioration</p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {suggestions.map((sug: any) => (
                  <div key={sug.id} className="bg-white border border-gray-200 rounded p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-primary">{sug.tacheNumero}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {sug.heuresTotal}h
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {sug.type === 'REASSIGNER' ? 'Réassignation' : 'Redistribution'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">De:</span> {sug.traducteurSourceNom} 
                            <span className="mx-2">→</span>
                            <span className="font-medium">À:</span> {sug.traducteurCibleNom}
                          </p>
                          <p className="text-xs text-muted">📝 {sug.raison}</p>
                          <div className="flex gap-4 text-xs mt-2">
                            <div>
                              <span className="text-muted">Impact {sug.traducteurSourceNom}:</span>
                              <span className="ml-1 font-semibold text-green-600">{sug.impactSource}</span>
                            </div>
                            <div>
                              <span className="text-muted">Impact {sug.traducteurCibleNom}:</span>
                              <span className="ml-1 font-semibold text-green-600">{sug.impactCible}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="primaire"
                        onClick={() => appliquerSuggestion(sug)}
                        className="text-xs px-3 py-1 shrink-0"
                      >
                        ✓ Appliquer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : etapeOptimisation === 'suggestions' ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Aucune suggestion disponible</p>
              <p className="text-xs text-muted mt-2">La planification semble déjà bien équilibrée</p>
            </div>
          ) : erreurOptimisation ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-sm font-semibold text-red-600 mb-2">Erreur lors de l'analyse</p>
              <p className="text-sm text-muted">{erreurOptimisation}</p>
              <button
                onClick={chargerAnalyseOptimisation}
                className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Aucune analyse disponible</p>
              <p className="text-xs text-muted mt-2">Cliquez sur "📊 Analyse" pour analyser la planification</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Bouton flottant pour voir toutes les tâches */}
      <button
        onClick={chargerMesTaches}
        className="fixed bottom-4 left-4 bg-primary text-white rounded-full p-2.5 shadow-lg hover:shadow-xl hover:scale-110 transition-all z-50 flex items-center gap-1.5"
        title="Voir toutes mes tâches créées"
      >
        <span className="text-lg">📋</span>
        <span className="text-xs font-semibold">Mes tâches</span>
      </button>
      </div>
    </AppLayout>
  );
};

export default PlanificationGlobale;
