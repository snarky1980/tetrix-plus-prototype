/**
 * Hook useDashboardGestionnaire
 * 
 * Gère la logique métier du dashboard gestionnaire:
 * - Chargement des divisions autorisées
 * - Chargement des traducteurs par division
 * - Chargement de la planification
 * - Gestion des blocages TR
 * - Calcul des statistiques
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { traducteurService } from '../services/traducteurService';
import { divisionService } from '../services/divisionService';
import { planificationService } from '../services/planificationService';
import { todayOttawa, formatOttawaISO, addDaysOttawa } from '../utils/dateTimeOttawa';
import type { Traducteur } from '../types';

type Section = 'overview' | 'planification' | 'traducteurs' | 'blocages' | 'statistiques';
type ViewMode = '1' | '7' | '14' | '30' | 'custom';

interface Division {
  id: string;
  nom: string;
  code?: string;
}

interface BlocageData {
  traducteurId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  motif: string;
  journeeComplete: boolean;
}

interface UseDashboardGestionnaireResult {
  // Navigation
  section: Section;
  setSection: React.Dispatch<React.SetStateAction<Section>>;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  customStartDate: string;
  setCustomStartDate: React.Dispatch<React.SetStateAction<string>>;
  customEndDate: string;
  setCustomEndDate: React.Dispatch<React.SetStateAction<string>>;
  
  // Données
  divisions: Division[];
  divisionSelectionnee: string;
  setDivisionSelectionnee: React.Dispatch<React.SetStateAction<string>>;
  traducteurs: Traducteur[];
  planificationData: any[];
  blocagesListe: any[];
  periodeActuelle: { debut: string; fin: string };
  
  // États de chargement
  loading: boolean;
  loadingPlanif: boolean;
  
  // Blocages
  ouvrirBlocage: boolean;
  setOuvrirBlocage: React.Dispatch<React.SetStateAction<boolean>>;
  blocageData: BlocageData;
  setBlocageData: React.Dispatch<React.SetStateAction<BlocageData>>;
  submittingBlocage: boolean;
  erreurBlocage: string;
  setErreurBlocage: React.Dispatch<React.SetStateAction<string>>;
  confirmDeleteBlocage: { isOpen: boolean; id: string | null };
  setConfirmDeleteBlocage: React.Dispatch<React.SetStateAction<{ isOpen: boolean; id: string | null }>>;
  
  // Statistiques calculées
  stats: {
    capacite: number;
    taches: number;
    blocages: number;
    disponible: number;
    nbTraducteurs: number;
    traducteurDisponibles: number;
    nbBlocages: number;
  };
  tauxUtilisation: number;
  
  // Actions
  chargerPlanification: () => Promise<void>;
  chargerBlocages: () => Promise<void>;
  handleCreerBlocage: (e: React.FormEvent) => Promise<void>;
  handleSupprimerBlocage: (id: string) => void;
  executerSuppressionBlocage: () => Promise<void>;
  
  // Helpers
  today: string;
}

export function useDashboardGestionnaire(): UseDashboardGestionnaireResult {
  const { utilisateur } = useAuth();
  const todayDate = todayOttawa();
  const today = formatOttawaISO(todayDate);
  
  // États de navigation
  const [section, setSection] = useState<Section>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // États de données
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionSelectionnee, setDivisionSelectionnee] = useState<string>('');
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [planificationData, setPlanificationData] = useState<any[]>([]);
  const [blocagesListe, setBlocagesListe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlanif, setLoadingPlanif] = useState(false);

  // États pour les blocages
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const [blocageData, setBlocageData] = useState<BlocageData>({
    traducteurId: '',
    date: today,
    heureDebut: '09:00',
    heureFin: '17:00',
    motif: '',
    journeeComplete: false
  });
  const [submittingBlocage, setSubmittingBlocage] = useState(false);
  const [erreurBlocage, setErreurBlocage] = useState('');
  const [confirmDeleteBlocage, setConfirmDeleteBlocage] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  // Calcul des dates de période
  const periodeActuelle = useMemo(() => {
    const baseDate = todayDate;
    let nbJours = 7;
    
    switch (viewMode) {
      case '1': nbJours = 1; break;
      case '7': nbJours = 7; break;
      case '14': nbJours = 14; break;
      case '30': nbJours = 30; break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { debut: customStartDate, fin: customEndDate };
        }
        nbJours = 7;
        break;
    }
    
    const fin = addDaysOttawa(baseDate, nbJours - 1);
    return { 
      debut: formatOttawaISO(baseDate), 
      fin: formatOttawaISO(fin) 
    };
  }, [todayDate, viewMode, customStartDate, customEndDate]);

  // Chargement des divisions autorisées
  useEffect(() => {
    const chargerDivisions = async () => {
      setLoading(true);
      try {
        const data = await divisionService.obtenirDivisions();
        if (utilisateur?.divisionAccess && utilisateur.divisionAccess.length > 0) {
          const divisionIds = utilisateur.divisionAccess.map(da => da.divisionId);
          const divisionsAutorisees = data.filter((d: any) => divisionIds.includes(d.id));
          setDivisions(divisionsAutorisees);
          if (divisionsAutorisees.length > 0) {
            setDivisionSelectionnee(divisionsAutorisees[0].id);
          }
        } else {
          setDivisions(data);
          if (data.length > 0) {
            setDivisionSelectionnee(data[0].id);
          }
        }
      } catch (err) {
        console.error('Erreur chargement divisions:', err);
      } finally {
        setLoading(false);
      }
    };
    chargerDivisions();
  }, [utilisateur]);

  // Chargement des traducteurs par division
  useEffect(() => {
    const chargerTraducteurs = async () => {
      if (!divisionSelectionnee) return;
      try {
        const data = await traducteurService.obtenirTraducteurs();
        const divisionObj = divisions.find(d => d.id === divisionSelectionnee);
        const filtres = divisionObj 
          ? data.filter(t => t.divisions?.includes(divisionObj.nom) || (divisionObj.code && t.divisions?.includes(divisionObj.code))) 
          : data;
        setTraducteurs(filtres);
      } catch (err) {
        console.error('Erreur chargement traducteurs:', err);
      }
    };
    chargerTraducteurs();
  }, [divisionSelectionnee, divisions]);

  // Chargement de la planification
  const chargerPlanification = useCallback(async () => {
    if (!divisionSelectionnee || traducteurs.length === 0) return;
    setLoadingPlanif(true);
    try {
      const planifPromises = traducteurs.map(tr =>
        planificationService.obtenirPlanification(tr.id, periodeActuelle.debut, periodeActuelle.fin)
          .then((planif: any) => ({ traducteur: tr, planification: planif }))
          .catch(() => ({ traducteur: tr, planification: null }))
      );
      const resultats = await Promise.all(planifPromises);
      setPlanificationData(resultats.filter((r: any) => r.planification !== null));
    } catch (err) {
      console.error('Erreur chargement planification:', err);
    } finally {
      setLoadingPlanif(false);
    }
  }, [divisionSelectionnee, traducteurs, periodeActuelle]);

  useEffect(() => {
    chargerPlanification();
  }, [chargerPlanification]);

  // Chargement des blocages
  const chargerBlocages = useCallback(async () => {
    if (traducteurs.length === 0) return;
    try {
      const blocagesPromises = traducteurs.map(tr =>
        traducteurService.obtenirBlocages(tr.id, { dateDebut: periodeActuelle.debut, dateFin: periodeActuelle.fin })
          .then(blocages => blocages.map((b: any) => ({ ...b, traducteur: tr })))
          .catch(() => [])
      );
      const resultats = await Promise.all(blocagesPromises);
      const allBlocages = resultats.flat().sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setBlocagesListe(allBlocages);
    } catch (err) {
      console.error('Erreur chargement blocages:', err);
    }
  }, [traducteurs, periodeActuelle]);

  useEffect(() => {
    chargerBlocages();
  }, [chargerBlocages]);

  // Statistiques globales
  const stats = useMemo(() => {
    const totaux = planificationData.reduce((acc, item) => {
      if (!item.planification?.planification) return acc;
      const joursTotaux = item.planification.planification.reduce((sum: any, jour: any) => ({
        capacite: sum.capacite + (jour.capacite || 0),
        taches: sum.taches + (jour.heuresTaches || 0),
        blocages: sum.blocages + (jour.heuresBlocages || 0),
        disponible: sum.disponible + (jour.disponible || 0),
      }), { capacite: 0, taches: 0, blocages: 0, disponible: 0 });
      return {
        capacite: acc.capacite + joursTotaux.capacite,
        taches: acc.taches + joursTotaux.taches,
        blocages: acc.blocages + joursTotaux.blocages,
        disponible: acc.disponible + joursTotaux.disponible,
      };
    }, { capacite: 0, taches: 0, blocages: 0, disponible: 0 });

    const disponibles = traducteurs.filter(t => t.disponiblePourTravail).length;
    
    return {
      ...totaux,
      nbTraducteurs: traducteurs.length,
      traducteurDisponibles: disponibles,
      nbBlocages: blocagesListe.length,
    };
  }, [planificationData, traducteurs, blocagesListe]);

  const tauxUtilisation = useMemo(() => {
    if (stats.capacite === 0) return 0;
    return ((stats.taches + stats.blocages) / stats.capacite) * 100;
  }, [stats]);

  // Handlers
  const handleCreerBlocage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocageData.traducteurId) {
      setErreurBlocage('Veuillez sélectionner un traducteur');
      return;
    }
    
    setSubmittingBlocage(true);
    setErreurBlocage('');

    try {
      const heureDebut = blocageData.journeeComplete ? '00:00' : blocageData.heureDebut;
      const heureFin = blocageData.journeeComplete ? '23:59' : blocageData.heureFin;
      
      await traducteurService.bloquerTemps(blocageData.traducteurId, {
        date: blocageData.date,
        heureDebut,
        heureFin,
        motif: blocageData.motif || 'Blocage gestionnaire',
      });
      setOuvrirBlocage(false);
      setBlocageData({
        traducteurId: '',
        date: today,
        heureDebut: '09:00',
        heureFin: '17:00',
        motif: '',
        journeeComplete: false
      });
      chargerBlocages();
      chargerPlanification();
    } catch (err: any) {
      setErreurBlocage(err.response?.data?.message || err.response?.data?.erreur || 'Erreur lors de la création du blocage');
    } finally {
      setSubmittingBlocage(false);
    }
  }, [blocageData, today, chargerBlocages, chargerPlanification]);

  const handleSupprimerBlocage = useCallback((id: string) => {
    setConfirmDeleteBlocage({ isOpen: true, id });
  }, []);

  const executerSuppressionBlocage = useCallback(async () => {
    if (!confirmDeleteBlocage.id) return;
    try {
      await traducteurService.supprimerBlocage(confirmDeleteBlocage.id);
      chargerBlocages();
      chargerPlanification();
    } catch (err) {
      console.error('Erreur suppression blocage:', err);
    } finally {
      setConfirmDeleteBlocage({ isOpen: false, id: null });
    }
  }, [confirmDeleteBlocage.id, chargerBlocages, chargerPlanification]);

  return {
    // Navigation
    section,
    setSection,
    viewMode,
    setViewMode,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    
    // Données
    divisions,
    divisionSelectionnee,
    setDivisionSelectionnee,
    traducteurs,
    planificationData,
    blocagesListe,
    periodeActuelle,
    
    // États de chargement
    loading,
    loadingPlanif,
    
    // Blocages
    ouvrirBlocage,
    setOuvrirBlocage,
    blocageData,
    setBlocageData,
    submittingBlocage,
    erreurBlocage,
    setErreurBlocage,
    confirmDeleteBlocage,
    setConfirmDeleteBlocage,
    
    // Statistiques
    stats,
    tauxUtilisation,
    
    // Actions
    chargerPlanification,
    chargerBlocages,
    handleCreerBlocage,
    handleSupprimerBlocage,
    executerSuppressionBlocage,
    
    // Helpers
    today,
  };
}
