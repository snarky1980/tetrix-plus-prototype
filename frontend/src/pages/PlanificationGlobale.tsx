import React, { useEffect, useMemo, useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Reserved for future navigation
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
import { tacheService } from '../services/tacheService';
import { repartitionService } from '../services/repartitionService';
import type { Traducteur, Client, SousDomaine, PaireLinguistique } from '../types';

const PlanificationGlobale: React.FC = () => {
  usePageTitle('Tetrix PLUS Planification', 'Consultez le planification globale des traductions');
  // const navigate = useNavigate(); // Reserved for future navigation
  // const { utilisateur } = useAuth(); // réservé pour filtres par rôle
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const today = useMemo(() => dateISO(new Date()), []);

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

  const [applied, setApplied] = useState<Filters>(pending);

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
  const [customRangeEnd, setCustomRangeEnd] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [searchCriteria, setSearchCriteria] = useState({
    dateDebut: today,
    dateFin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 jours par défaut
    heuresRequises: '',
    client: '',
    domaine: '',
    langueSource: '',
    langueCible: '',
    disponiblesUniquement: false,
  });
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<'availability' | 'immediate' | null>(null);

  // Modal statistiques
  const [showStatsModal, setShowStatsModal] = useState(false);

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
    typeTache: 'TRADUCTION' as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'AUTRE',
    specialisation: '',
    description: '',
    heuresTotal: '',
    dateEcheance: '',
    typeRepartition: 'JUSTE_TEMPS' as 'JUSTE_TEMPS' | 'EQUILIBRE' | 'PEPS',
    dateDebut: today,
    dateFin: '',
    repartitionAuto: true,
    repartitionManuelle: [] as { date: string; heures: number }[],
  });

  // Preview JAT
  const [previewJAT, setPreviewJAT] = useState<{ date: string; heures: number }[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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
    typeTache: 'TRADUCTION' as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'AUTRE',
    specialisation: '',
    description: '',
    heuresTotal: 0,
    dateEcheance: '',
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
      client: applied.clients.length ? applied.clients.join(',') : undefined,
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

  const handleApplyCustomRange = () => {
    setPending((prev) => ({
      ...prev,
      start: customRangeStart,
      range: Math.ceil((new Date(customRangeEnd).getTime() - new Date(customRangeStart).getTime()) / (1000 * 60 * 60 * 24)) as 7 | 14 | 30,
    }));
    setApplied((prev) => ({
      ...prev,
      start: customRangeStart,
      range: Math.ceil((new Date(customRangeEnd).getTime() - new Date(customRangeStart).getTime()) / (1000 * 60 * 60 * 24)) as 7 | 14 | 30,
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
    const dateDebut = new Date(searchCriteria.dateDebut);
    const dateFin = new Date(searchCriteria.dateFin);
    let joursOuvrables = 0;
    for (let d = new Date(dateDebut); d <= dateFin; d.setDate(d.getDate() + 1)) {
      const jour = d.getDay();
      if (jour !== 0 && jour !== 6) { // Pas weekend
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
      dateFin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      dateEcheance: '',
      typeRepartition: 'JUSTE_TEMPS',
      dateDebut: today,
      dateFin: '',
      repartitionAuto: true,
      repartitionManuelle: [],
    });
    setPairesDisponibles([]);
    setPreviewJAT(null);
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

  const chargerPreviewJAT = async () => {
    const heures = parseFloat(formTache.heuresTotal as string);
    if (!formTache.traducteurId || heures <= 0 || !formTache.dateEcheance) return;
    
    setLoadingPreview(true);
    try {
      const result = await repartitionService.previewJAT({
        traducteurId: formTache.traducteurId,
        heuresTotal: heures,
        dateEcheance: formTache.dateEcheance,
      });
      setPreviewJAT(result);
    } catch (err: any) {
      console.error('Erreur preview JAT:', err);
      setErreurCreation('Erreur lors du calcul JAT: ' + (err.response?.data?.erreur || err.message));
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
      if (formTache.repartitionAuto) {
        chargerPreviewJAT();
      }
      setEtapeCreation(2);
    }
  };

  const handleSubmitTache = async () => {
    setSubmitting(true);
    setErreurCreation('');

    try {
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

      // Gérer les différentes méthodes de répartition
      if (formTache.typeRepartition === 'JUSTE_TEMPS') {
        tache.repartitionAuto = true;
      } else if (formTache.typeRepartition === 'EQUILIBRE') {
        // Calculer la répartition équilibrée
        const repartition = await repartitionService.calculerRepartitionEquilibree({
          heuresTotal: parseFloat(formTache.heuresTotal as string),
          dateDebut: formTache.dateDebut,
          dateFin: formTache.dateFin,
        });
        tache.repartition = repartition;
      } else if (formTache.typeRepartition === 'PEPS') {
        // Calculer la répartition PEPS
        const repartition = await repartitionService.calculerRepartitionPEPS({
          heuresTotal: parseFloat(formTache.heuresTotal as string),
          dateDebut: formTache.dateDebut,
          dateEcheance: formTache.dateEcheance,
        });
        tache.repartition = repartition;
      } else {
        tache.repartitionManuelle = formTache.repartitionManuelle;
      }

      await tacheService.creerTache(tache);
      
      setShowAddTaskModal(false);
      resetFormTache();
      
      // Rafraîchir la planification
      window.location.reload();
    } catch (err: any) {
      setErreurCreation(err.response?.data?.erreur || 'Erreur lors de la création de la tâche');
    } finally {
      setSubmitting(false);
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
      dateEcheance: '',
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
        dateEcheance: tache.dateEcheance?.split('T')[0] || '',
        repartitionAuto: false,
        repartitionManuelle: tache.repartitions?.map((r: any) => ({
          date: r.date.split('T')[0],
          heures: r.heuresPrevues
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
    if (!formEdition.paireLinguistiqueId) {
      setErreurEdition('Veuillez sélectionner une paire linguistique');
      return false;
    }
    if (!formEdition.description.trim()) {
      setErreurEdition('Veuillez saisir une description');
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

      if (formEdition.repartitionAuto) {
        tache.repartitionAuto = true;
      } else {
        tache.repartitionManuelle = formEdition.repartitionManuelle;
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

  // Calculer les statistiques de disponibilité basées sur la vue actuelle
  const calculerStatistiques = () => {
    if (!planificationEnrichie) return null;

    // Utiliser uniquement les dates visibles (days) et les traducteurs affichés
    const joursOuvrablesVisibles = days.filter(d => !isWeekend(d));
    
    let totalTraducteurs = planificationEnrichie.planification.length;
    let heuresCapaciteTotale = 0;
    let heuresUtilisees = 0;
    let heuresDisponiblesTotales = 0; // Somme des heures affichées dans les cellules
    let traducteursDisponibles = 0;
    let traducteursSurcharges = 0;
    let traducteursOccupes = 0;
    
    const statsByDivision: Record<string, { count: number; tauxOccupation: number }> = {};

    planificationEnrichie.planification.forEach((ligne) => {
      const division = ligne.traducteur.division;
      if (!statsByDivision[division]) {
        statsByDivision[division] = { count: 0, tauxOccupation: 0 };
      }
      statsByDivision[division].count++;

      let heuresTraducteur = 0;
      let capaciteTraducteur = 0;

      // Parcourir TOUS les jours ouvrables visibles, pas seulement ceux avec des données
      joursOuvrablesVisibles.forEach((dateStr) => {
        const info = ligne.dates[dateStr];
        const heures = info ? info.heures : 0;
        const capacite = info ? (info.capacite ?? ligne.traducteur.capaciteHeuresParJour) : ligne.traducteur.capaciteHeuresParJour;
        const disponible = capacite - heures; // Ce qui est affiché dans la cellule
        
        heuresTraducteur += heures;
        capaciteTraducteur += capacite;
        heuresDisponiblesTotales += disponible;
      });

      heuresCapaciteTotale += capaciteTraducteur;
      heuresUtilisees += heuresTraducteur;

      const tauxOccupation = capaciteTraducteur > 0 ? (heuresTraducteur / capaciteTraducteur) * 100 : 0;
      statsByDivision[division].tauxOccupation += tauxOccupation;

      if (tauxOccupation < 50) {
        traducteursDisponibles++;
      } else if (tauxOccupation >= 80) {
        traducteursSurcharges++;
      } else {
        traducteursOccupes++;
      }
    });

    // Calculer moyenne par division
    Object.keys(statsByDivision).forEach((div) => {
      statsByDivision[div].tauxOccupation = statsByDivision[div].tauxOccupation / statsByDivision[div].count;
    });

    const tauxOccupationMoyen = heuresCapaciteTotale > 0 ? (heuresUtilisees / heuresCapaciteTotale) * 100 : 0;
    const heuresDisponibles = heuresDisponiblesTotales; // Utiliser la vraie somme des cellules

    return {
      totalTraducteurs,
      tauxOccupationMoyen,
      traducteursDisponibles,
      traducteursOccupes,
      traducteursSurcharges,
      heuresCapaciteTotale,
      heuresUtilisees,
      heuresDisponibles,
      statsByDivision,
    };
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

  return (
    <AppLayout titre="Planification globale" compact>
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

        {/* Vues sauvegardées */}
        <div className="bg-white border border-border rounded shadow-sm">
          <details>
            <summary className="cursor-pointer text-xs font-semibold px-1.5 py-0.5 hover:bg-gray-50 flex items-center gap-0.5">
              📌 Vues ({savedViews.length})
            </summary>
            <div className="px-1.5 pb-1 space-y-0.5 border-t border-border pt-0.5">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                className="w-full px-1.5 py-0.5 text-xs"
              >
                {showSaveDialog ? '✕' : '💾 Sauv.'}
              </Button>

              {showSaveDialog && (
                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded space-y-1">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="Nom de la vue..."
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
                  Aucune vue sauvegardée
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

      {/* Bouton flottant Statistiques */}
      <Button
        variant="outline"
        onClick={() => setShowStatsModal(true)}
        className="fixed bottom-4 right-32 z-50 px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-shadow bg-white"
        title="Voir les statistiques de disponibilité"
      >
        📊 Stats
      </Button>

      {/* Bouton flottant Ajouter une tâche */}
      <Button
        variant="primaire"
        onClick={() => setShowAddTaskModal(true)}
        className="fixed bottom-4 right-4 z-50 px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-shadow"
        title="Ajouter une nouvelle tâche"
      >
        ➕ Ajouter
      </Button>

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
          {erreurCreation && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreurCreation}
            </div>
          )}

          {/* Étape 1 : Informations de base */}
          {etapeCreation === 1 && (
            <div className="space-y-4">
              {/* Numéro de projet */}
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de projet *</label>
                <Input
                  type="text"
                  value={formTache.numeroProjet}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, numeroProjet: e.target.value })}
                  placeholder="Ex: PROJ-2024-001"
                  required
                />
              </div>

              {/* Traducteur avec recherche */}
              <div>
                <label className="block text-sm font-medium mb-1">Traducteur *</label>
                <Select
                  value={formTache.traducteurId}
                  onChange={(e) => setFormTache({ ...formTache, traducteurId: e.target.value })}
                  required
                >
                  <option value="">Rechercher ou sélectionner un traducteur...</option>
                  {traducteurs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.disponiblePourTravail ? '🟢 ' : ''}{t.nom} - {t.division} ({t.capaciteHeuresParJour}h/jour)
                    </option>
                  ))}
                </Select>
              </div>

              {/* Type de tâche */}
              <div>
                <label className="block text-sm font-medium mb-1">Type de tâche *</label>
                <Select
                  value={formTache.typeTache}
                  onChange={(e) => setFormTache({ ...formTache, typeTache: e.target.value as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'AUTRE' })}
                  required
                >
                  <option value="TRADUCTION">Traduction</option>
                  <option value="REVISION">Révision</option>
                  <option value="RELECTURE">Relecture</option>
                  <option value="AUTRE">Autre</option>
                </Select>
              </div>

              {/* Paire linguistique (optionnel) */}
              {formTache.traducteurId && (
                <div>
                  <label className="block text-sm font-medium mb-1">Paire linguistique</label>
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

              {/* Client (optionnel) */}
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
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
                <label className="block text-sm font-medium mb-1">Sous-domaine</label>
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
                <label className="block text-sm font-medium mb-1">Spécialisation</label>
                <Input
                  type="text"
                  value={formTache.specialisation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, specialisation: e.target.value })}
                  placeholder="Ex: Médical, Juridique, Technique..."
                />
              </div>

              {/* Commentaire (optionnel) */}
              <div>
                <label className="block text-sm font-medium mb-1">Commentaire</label>
                <textarea
                  value={formTache.description}
                  onChange={(e) => setFormTache({ ...formTache, description: e.target.value })}
                  placeholder="Ajoutez un commentaire ou des détails..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              {/* Heures totales */}
              <div>
                <label className="block text-sm font-medium mb-1">Heures totales *</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formTache.heuresTotal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, heuresTotal: e.target.value })}
                  placeholder="Ex: 4.5"
                  required
                />
              </div>

              {/* Date d'échéance */}
              <div>
                <label className="block text-sm font-medium mb-1">Date d'échéance *</label>
                <Input
                  type="date"
                  value={formTache.dateEcheance}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, dateEcheance: e.target.value })}
                  min={today}
                  required
                />
              </div>

              {/* Type de répartition */}
              <div>
                <label className="block text-sm font-medium mb-1">Répartition *</label>
                <Select
                  value={formTache.typeRepartition}
                  onChange={(e) => setFormTache({ ...formTache, typeRepartition: e.target.value as 'JUSTE_TEMPS' | 'EQUILIBRE' | 'PEPS' })}
                  required
                >
                  <option value="JUSTE_TEMPS">Juste à temps (JAT)</option>
                  <option value="EQUILIBRE">Équilibrer sur le temps</option>
                  <option value="PEPS">Première entrée, première sortie (PEPS)</option>
                </Select>
              </div>

              {/* Dates pour répartition équilibrée */}
              {formTache.typeRepartition === 'EQUILIBRE' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de début *</label>
                    <Input
                      type="date"
                      value={formTache.dateDebut}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, dateDebut: e.target.value })}
                      min={today}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de fin *</label>
                    <Input
                      type="date"
                      value={formTache.dateFin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, dateFin: e.target.value })}
                      min={formTache.dateDebut}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Date de début pour répartition PEPS */}
              {formTache.typeRepartition === 'PEPS' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de début *</label>
                    <Input
                      type="date"
                      value={formTache.dateDebut}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTache({ ...formTache, dateDebut: e.target.value })}
                      min={today}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Description du type de répartition */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                {formTache.typeRepartition === 'JUSTE_TEMPS' && (
                  <p>📊 <strong>Juste à temps (JAT) :</strong> Optimise en fonction de la charge actuelle du traducteur. Les heures sont réparties de manière intelligente pour maximiser l'utilisation de la capacité disponible.</p>
                )}
                {formTache.typeRepartition === 'EQUILIBRE' && (
                  <p>⚖️ <strong>Équilibré :</strong> Répartit uniformément les heures entre la date de début et la date de fin. Idéal pour une charge de travail constante sur une période définie.</p>
                )}
                {formTache.typeRepartition === 'PEPS' && (
                  <p>🔄 <strong>Première entrée, première sortie (PEPS) :</strong> Commence à la date de début spécifiée et termine à l'échéance. Les heures sont affectées dans l'ordre chronologique.</p>
                )}
              </div>

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
                <h3 className="font-medium mb-2 text-sm">📋 Résumé de la tâche</h3>
                <div className="text-xs space-y-1">
                  <p><span className="font-medium">Projet:</span> {formTache.numeroProjet}</p>
                  <p><span className="font-medium">Traducteur:</span> {traducteurs.find(t => t.id === formTache.traducteurId)?.nom}</p>
                  <p><span className="font-medium">Type:</span> {formTache.typeTache}</p>
                  <p><span className="font-medium">Heures:</span> {formTache.heuresTotal}h</p>
                  <p><span className="font-medium">Échéance:</span> {new Date(formTache.dateEcheance).toLocaleDateString('fr-CA')}</p>
                  <p><span className="font-medium">Répartition:</span> {
                    formTache.typeRepartition === 'JUSTE_TEMPS' ? 'Juste à temps (JAT)' :
                    formTache.typeRepartition === 'EQUILIBRE' ? 'Équilibré' : 'PEPS'
                  }</p>
                  {formTache.typeRepartition === 'EQUILIBRE' && (
                    <p><span className="font-medium">Période:</span> {new Date(formTache.dateDebut).toLocaleDateString('fr-CA')} → {new Date(formTache.dateFin).toLocaleDateString('fr-CA')}</p>
                  )}
                </div>
              </div>

              {formTache.repartitionAuto && (
                <>
                  {loadingPreview ? (
                    <div className="text-center py-4 text-sm text-muted">
                      ⏳ Calcul de la répartition JAT...
                    </div>
                  ) : previewJAT && previewJAT.length > 0 ? (
                    <div className="border border-border rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-3 py-2">Date</th>
                            <th className="text-right px-3 py-2">Heures</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewJAT.map((r) => (
                            <tr key={r.date} className="border-t border-border">
                              <td className="px-3 py-2">{r.date}</td>
                              <td className="text-right px-3 py-2">{r.heures.toFixed(2)}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted">
                      Aucune répartition générée
                    </div>
                  )}
                </>
              )}

              {!formTache.repartitionAuto && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  ⚠️ Répartition manuelle non encore implémentée dans ce modal. Utilisez la répartition automatique.
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
                  onClick={handleSubmitTache}
                  disabled={submitting || (formTache.repartitionAuto && (!previewJAT || previewJAT.length === 0))}
                >
                  {submitting ? 'Création...' : 'Créer la tâche'}
                </Button>
              </div>
            </div>
          )}
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
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de projet *</label>
                <Input
                  type="text"
                  value={formEdition.numeroProjet}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, numeroProjet: e.target.value })}
                  placeholder="Ex: PROJ-2024-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Traducteur *</label>
                <Select
                  value={formEdition.traducteurId}
                  onChange={(e) => setFormEdition({ ...formEdition, traducteurId: e.target.value })}
                  required
                >
                  <option value="">Sélectionner un traducteur...</option>
                  {traducteurs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.disponiblePourTravail ? '🟢 ' : ''}{t.nom} - {t.division} ({t.capaciteHeuresParJour}h/jour)
                    </option>
                  ))}
                </Select>
              </div>

              {formEdition.traducteurId && (
                <div>
                  <label className="block text-sm font-medium mb-1">Paire linguistique *</label>
                  <Select
                    value={formEdition.paireLinguistiqueId}
                    onChange={(e) => setFormEdition({ ...formEdition, paireLinguistiqueId: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner une paire...</option>
                    {pairesDisponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.langueSource} → {p.langueCible}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Type de tâche *</label>
                <Select
                  value={formEdition.typeTache}
                  onChange={(e) => setFormEdition({ ...formEdition, typeTache: e.target.value as 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'AUTRE' })}
                  required
                >
                  <option value="TRADUCTION">Traduction</option>
                  <option value="REVISION">Révision</option>
                  <option value="RELECTURE">Relecture</option>
                  <option value="AUTRE">Autre</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Client (optionnel)</label>
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

              <div>
                <label className="block text-sm font-medium mb-1">Sous-domaine (optionnel)</label>
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

              <div>
                <label className="block text-sm font-medium mb-1">Spécialisation (optionnel)</label>
                <Input
                  type="text"
                  value={formEdition.specialisation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, specialisation: e.target.value })}
                  placeholder="Ex: Médical, Juridique, Technique..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  value={formEdition.description}
                  onChange={(e) => setFormEdition({ ...formEdition, description: e.target.value })}
                  placeholder="Décrivez la tâche..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Heures totales *</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formEdition.heuresTotal || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, heuresTotal: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date d'échéance *</label>
                  <Input
                    type="date"
                    value={formEdition.dateEcheance}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEdition({ ...formEdition, dateEcheance: e.target.value })}
                    min={today}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formEdition.repartitionAuto}
                    onChange={(e) => setFormEdition({ ...formEdition, repartitionAuto: e.target.checked })}
                  />
                  Utiliser l'algorithme JAT (Juste-à-temps)
                </label>
                <p className="text-xs text-muted mt-1">
                  L'algorithme répartira automatiquement les heures de manière optimale
                </p>
              </div>

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
                            <span className="font-medium">{new Date(r.date).toLocaleDateString('fr-CA')}</span>
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
                <div>
                  <h3 className="text-sm font-semibold mb-2">Répartition manuelle</h3>
                  <p className="text-xs text-muted mb-3">
                    Vous pourrez ajuster la répartition après création de la tâche
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
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
                          <div className="flex items-center gap-2 mb-1">
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
                            <span className="text-xs text-muted">
                              {tache.typeTache || 'TRADUCTION'}
                            </span>
                          </div>
                          <p className="text-sm mb-1">{tache.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            {tache.paireLinguistique && (
                              <span>🌐 {tache.paireLinguistique.langueSource} → {tache.paireLinguistique.langueCible}</span>
                            )}
                            {tache.client && <span>👤 {tache.client.nom}</span>}
                            <span>⏱️ {tache.heuresTotal}h</span>
                            <span>📅 {new Date(tache.dateEcheance).toLocaleDateString('fr-CA')}</span>
                          </div>
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

            <div className="flex justify-end pt-2 border-t">
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

      {/* Modal Statistiques */}
      <Modal
        titre=" Statistiques de disponibilité"
        ouvert={showStatsModal}
        onFermer={() => setShowStatsModal(false)}
        ariaDescription="Statistiques sur la disponibilité des traducteurs"
      >
        {(() => {
          const stats = calculerStatistiques();
          if (!stats) return <p className="text-sm text-muted">Aucune donnée disponible</p>;

          return (
            <div className="space-y-4">
              {/* Avertissement sur la période */}
              <div className="bg-blue-50 border border-blue-300 rounded p-3">
                <p className="text-xs text-blue-700">
                  ℹ️ <strong>Statistiques basées sur la vue actuelle :</strong> du {applied.start} sur {applied.range} jours
                  {(applied.divisions.length > 0 || applied.domaines.length > 0 || applied.clients.length > 0 || applied.languesSource.length > 0 || applied.languesCible.length > 0) && (
                    <span> (avec filtres appliqués)</span>
                  )}
                </p>
              </div>

              {/* Vue d'ensemble */}
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-semibold text-sm mb-3">📈 Vue d'ensemble</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted text-xs">Traducteurs affichés</p>
                    <p className="font-bold text-lg">{stats.totalTraducteurs}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">Taux d'occupation moyen</p>
                    <p className="font-bold text-lg">{stats.tauxOccupationMoyen.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Disponibilité */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-700 text-xs font-medium mb-1">✅ Disponibles</p>
                  <p className="text-green-900 font-bold text-2xl">{stats.traducteursDisponibles}</p>
                  <p className="text-green-600 text-xs mt-1">&lt; 50% occupés</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-yellow-700 text-xs font-medium mb-1">⚠️ Occupés</p>
                  <p className="text-yellow-900 font-bold text-2xl">{stats.traducteursOccupes}</p>
                  <p className="text-yellow-600 text-xs mt-1">50-80% occupés</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-xs font-medium mb-1">🔴 Surchargés</p>
                  <p className="text-red-900 font-bold text-2xl">{stats.traducteursSurcharges}</p>
                  <p className="text-red-600 text-xs mt-1">&gt; 80% occupés</p>
                </div>
              </div>

              {/* Heures */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <h3 className="font-semibold text-sm mb-3">⏰ Capacité (période affichée)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Capacité maximale</span>
                    <span className="font-semibold">{stats.heuresCapaciteTotale.toFixed(1)}h</span>
                  </div>
                  <p className="text-xs text-muted italic">
                    Somme des capacités maximales de tous les traducteurs sur la période visible
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted">Heures assignées (tâches)</span>
                    <span className="font-semibold text-orange-600">{stats.heuresUtilisees.toFixed(1)}h</span>
                  </div>
                  <p className="text-xs text-muted italic">
                    Heures de tâches déjà attribuées
                  </p>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-green-700 font-medium">Heures disponibles (libres)</span>
                    <span className="font-bold text-green-700">{stats.heuresDisponibles.toFixed(1)}h</span>
                  </div>
                  <p className="text-xs text-muted italic">
                    Somme des heures affichées dans les cellules vertes/jaunes du calendrier
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all" 
                      style={{ width: `${stats.tauxOccupationMoyen}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Par division */}
              <div className="bg-purple-50 border border-purple-200 rounded p-4">
                <h3 className="font-semibold text-sm mb-3">🏢 Par division</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(stats.statsByDivision).map(([division, stat]) => (
                    <div key={division} className="flex justify-between items-center">
                      <span className="text-muted truncate flex-1">{division}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">({stat.count})</span>
                        <span className="font-semibold min-w-[50px] text-right">{stat.tauxOccupation.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStatsModal(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          );
        })()}
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

          {/* Légende des couleurs - compacte */}
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
          </div>
        </div>

        {/* Zone de tableau avec défilement */}
        <div className="flex-1 overflow-auto">
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
                    const d = new Date(iso);
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
                {planificationEnrichie?.planification.map((ligne, idx) => {
                  const isSearchResult = searchResults.includes(ligne.traducteur.id);
                  return (
                    <tr key={ligne.traducteur.id} className={`${isSearchResult ? 'ring-2 ring-yellow-400 ring-inset' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className={`border-r border-b border-border px-2 py-1 font-medium sticky left-0 z-10 ${isSearchResult ? 'bg-yellow-200' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`}>
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
                            {ligne.traducteur.nom} • <span className="font-normal text-[9px]">{ligne.traducteur.division} • {ligne.traducteur.classification}</span>
                          </div>
                          <div className="text-[8px] text-muted truncate leading-tight">
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
                                title={`${ligne.traducteur.nom}\n${iso}\n${disponible.toFixed(1)}h disponibles sur ${capacite.toFixed(1)}h\nCliquer pour voir les tâches`}
                              >
                                <div className={`font-semibold text-xs ${textClass}`}>
                                  {disponible.toFixed(1)}
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

        {/* Section d'affichage des tâches d'une cellule sélectionnée */}
        {celluleSelectionnee && (
          <div className="border-t border-border p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                Tâches de {celluleSelectionnee.traducteurNom} le {new Date(celluleSelectionnee.date).toLocaleDateString('fr-CA')}
              </h3>
              <Button
                variant="outline"
                onClick={() => setCelluleSelectionnee(null)}
                className="text-xs px-2 py-1"
              >
                ✕ Fermer
              </Button>
            </div>

            {loadingTaches ? (
              <p className="text-sm text-muted">Chargement...</p>
            ) : celluleSelectionnee.taches.length === 0 ? (
              <p className="text-sm text-muted">Aucune tâche pour cette date</p>
            ) : (
              <div className="space-y-2">
                {celluleSelectionnee.taches.map((tache: any) => {
                  // Trouver les heures pour cette date spécifique
                  const ajustementCeJour = tache.ajustementsTemps?.find(
                    (aj: any) => aj.date.split('T')[0] === celluleSelectionnee.date
                  );
                  const heuresCeJour = ajustementCeJour ? ajustementCeJour.heures : 0;
                  
                  return (
                    <div
                      key={tache.id}
                      className="bg-white border border-border rounded p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary">
                              {tache.numeroProjet}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                              {heuresCeJour}h ce jour
                            </span>
                            <span className="text-xs text-muted">
                              {tache.typeTache || 'TRADUCTION'}
                            </span>
                            <span className="text-xs text-muted">
                              {tache.paireLinguistique?.langueSource} → {tache.paireLinguistique?.langueCible}
                            </span>
                          </div>
                          <p className="text-sm mb-1">{tache.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            {tache.client && <span>Client: {tache.client.nom}</span>}
                            {tache.sousDomaine && <span>Domaine: {tache.sousDomaine.nom}</span>}
                            <span>Total tâche: {tache.heuresTotal}h</span>
                            <span>Échéance: {new Date(tache.dateEcheance).toLocaleDateString('fr-CA')}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleEditTache(tache.id)}
                          className="text-xs px-3 py-1 shrink-0"
                        >
                          ✏️ Éditer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
};

export default PlanificationGlobale;
