/**
 * Hook useDashboardTraducteur
 * 
 * Gère la logique métier du dashboard traducteur:
 * - Données du traducteur connecté
 * - Tâches assignées
 * - Blocages de temps
 * - Disponibilité pour travail
 * - Paramètres horaires
 * - Terminaison de tâches
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { traducteurService } from '../services/traducteurService';
import { tacheService } from '../services/tacheService';
import type { Traducteur, Tache } from '../types';
import { formatOttawaISO, todayOttawa, addDaysOttawa } from '../utils/dateTimeOttawa';

// ============ Types ============

export type ViewMode = '1' | '7' | '14' | '30' | 'custom';

interface BlocageData {
  date: string;
  heureDebut: string;
  heureFin: string;
  motif: string;
  journeeComplete: boolean;
}

interface ParametresForm {
  horaireDebut: string;
  horaireFin: string;
  pauseMidiDebut: string;
  pauseMidiFin: string;
}

interface ConfirmDialog<T = string> {
  isOpen: boolean;
  id: T | null;
}

interface ConfirmTerminerTache {
  isOpen: boolean;
  tacheId: string | null;
  tacheStatut?: string;
}

interface DashboardTraducteurStats {
  /** Nombre total de tâches */
  nbTaches: number;
  /** Tâches planifiées */
  tachesPlanifiees: number;
  /** Tâches en cours */
  tachesEnCours: number;
  /** Tâches en retard */
  tachesEnRetard: number;
  /** Tâches terminées */
  tachesTerminees: number;
}

interface UseDashboardTraducteurResult {
  // Données
  traducteur: Traducteur | null;
  mesTaches: Tache[];
  blocages: any[];
  
  // États de chargement
  loadingTraducteur: boolean;
  loadingTaches: boolean;
  
  // Disponibilité
  disponibiliteActive: boolean;
  commentaireDisponibilite: string;
  savingDisponibilite: boolean;
  setCommentaireDisponibilite: (comment: string) => void;
  toggleDisponibilite: () => Promise<void>;
  sauvegarderCommentaireDisponibilite: () => Promise<void>;
  
  // Blocages
  ouvrirBlocage: boolean;
  blocageData: BlocageData;
  submittingBlocage: boolean;
  erreurBlocage: string;
  confirmDeleteBlocage: ConfirmDialog;
  setOuvrirBlocage: (open: boolean) => void;
  setBlocageData: (data: BlocageData) => void;
  creerBlocage: (e: React.FormEvent) => Promise<void>;
  supprimerBlocage: (id: string) => void;
  executerSuppressionBlocage: () => Promise<void>;
  fermerConfirmDeleteBlocage: () => void;
  
  // Terminaison tâche
  confirmTerminerTache: ConfirmTerminerTache;
  terminerLoading: boolean;
  commentaireTerminaison: string;
  setCommentaireTerminaison: (comment: string) => void;
  demanderTerminerTache: (tacheId: string, tacheStatut?: string) => void;
  confirmerTerminerTache: () => Promise<void>;
  annulerTerminerTache: () => void;
  
  // Paramètres
  parametresForm: ParametresForm;
  savingParametres: boolean;
  setParametresForm: (form: ParametresForm | ((prev: ParametresForm) => ParametresForm)) => void;
  sauvegarderParametres: () => Promise<void>;
  
  // Statistiques
  stats: DashboardTraducteurStats;
  
  // Période
  periodeActuelle: { debut: string; fin: string };
  
  // Actions
  chargerBlocages: () => Promise<void>;
  chargerMesTaches: () => Promise<void>;
  refreshAll: () => void;
}

interface UseDashboardTraducteurOptions {
  traducteurId?: string;
  viewMode: ViewMode;
  customStartDate?: string;
  customEndDate?: string;
  onRefresh?: () => void;
}

export function useDashboardTraducteur(options: UseDashboardTraducteurOptions): UseDashboardTraducteurResult {
  const { traducteurId, viewMode, customStartDate, customEndDate, onRefresh } = options;
  
  const todayDate = todayOttawa();
  const today = formatOttawaISO(todayDate);
  
  // ============ États pour les données ============
  const [traducteur, setTraducteur] = useState<Traducteur | null>(null);
  const [mesTaches, setMesTaches] = useState<Tache[]>([]);
  const [blocages, setBlocages] = useState<any[]>([]);
  const [loadingTaches, setLoadingTaches] = useState(false);
  const [loadingTraducteur, setLoadingTraducteur] = useState(true);
  
  // ============ États pour la disponibilité ============
  const [disponibiliteActive, setDisponibiliteActive] = useState(false);
  const [commentaireDisponibilite, setCommentaireDisponibilite] = useState('');
  const [savingDisponibilite, setSavingDisponibilite] = useState(false);
  
  // ============ États pour les blocages ============
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const [blocageData, setBlocageData] = useState<BlocageData>({ 
    date: today, 
    heureDebut: '09:00', 
    heureFin: '17:00', 
    motif: '',
    journeeComplete: false
  });
  const [submittingBlocage, setSubmittingBlocage] = useState(false);
  const [erreurBlocage, setErreurBlocage] = useState('');
  const [confirmDeleteBlocage, setConfirmDeleteBlocage] = useState<ConfirmDialog>({
    isOpen: false,
    id: null
  });
  
  // ============ États pour la terminaison de tâche ============
  const [confirmTerminerTache, setConfirmTerminerTache] = useState<ConfirmTerminerTache>({
    isOpen: false,
    tacheId: null,
    tacheStatut: undefined
  });
  const [terminerLoading, setTerminerLoading] = useState(false);
  const [commentaireTerminaison, setCommentaireTerminaison] = useState('');
  
  // ============ États pour les paramètres ============
  const [parametresForm, setParametresForm] = useState<ParametresForm>({
    horaireDebut: '09:00',
    horaireFin: '17:00',
    pauseMidiDebut: '12:00',
    pauseMidiFin: '13:00',
  });
  const [savingParametres, setSavingParametres] = useState(false);

  // ============ Calcul des dates de période ============
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

  // ============ Chargement du traducteur ============
  useEffect(() => {
    if (!traducteurId) {
      setLoadingTraducteur(false);
      return;
    }
    
    setLoadingTraducteur(true);
    traducteurService.obtenirTraducteur(traducteurId)
      .then(data => {
        setTraducteur(data);
        setDisponibiliteActive(data.disponiblePourTravail);
        setCommentaireDisponibilite(data.commentaireDisponibilite || '');
        
        // Parser l'horaire pour les paramètres
        if (data.horaire) {
          const match = data.horaire.match(/^(\d{1,2})h(\d{0,2})?\s*-\s*(\d{1,2})h(\d{0,2})?$/);
          if (match) {
            const hDebut = match[1].padStart(2, '0');
            const mDebut = match[2] || '00';
            const hFin = match[3].padStart(2, '0');
            const mFin = match[4] || '00';
            setParametresForm(prev => ({
              ...prev,
              horaireDebut: `${hDebut}:${mDebut}`,
              horaireFin: `${hFin}:${mFin}`,
            }));
          }
        }
      })
      .catch(err => console.error('[DashboardTraducteur] Erreur chargement traducteur:', err))
      .finally(() => setLoadingTraducteur(false));
  }, [traducteurId]);

  // ============ Chargement des tâches ============
  const chargerMesTaches = useCallback(async () => {
    if (!traducteurId) return;
    setLoadingTaches(true);
    try {
      const data = await tacheService.obtenirTaches({ traducteurId });
      const tachesTries = data.sort((a, b) => 
        new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime()
      );
      setMesTaches(tachesTries);
    } catch (err) {
      console.error('[DashboardTraducteur] Erreur chargement tâches:', err);
    } finally {
      setLoadingTaches(false);
    }
  }, [traducteurId]);

  useEffect(() => {
    chargerMesTaches();
  }, [chargerMesTaches]);

  // ============ Chargement des blocages ============
  const chargerBlocages = useCallback(async () => {
    if (!traducteurId) return;
    try {
      const data = await traducteurService.obtenirBlocages(traducteurId, { 
        dateDebut: periodeActuelle.debut, 
        dateFin: periodeActuelle.fin 
      });
      setBlocages(data);
    } catch (err) {
      console.error('[DashboardTraducteur] Erreur chargement blocages:', err);
    }
  }, [traducteurId, periodeActuelle]);

  useEffect(() => {
    chargerBlocages();
  }, [chargerBlocages]);

  // ============ Statistiques ============
  const stats = useMemo<DashboardTraducteurStats>(() => ({
    nbTaches: mesTaches.length,
    tachesPlanifiees: mesTaches.filter(t => t.statut === 'PLANIFIEE').length,
    tachesEnCours: mesTaches.filter(t => t.statut === 'EN_COURS').length,
    tachesEnRetard: mesTaches.filter(t => t.statut === 'EN_RETARD').length,
    tachesTerminees: mesTaches.filter(t => t.statut === 'TERMINEE').length,
  }), [mesTaches]);

  // ============ Handlers disponibilité ============
  const toggleDisponibilite = useCallback(async () => {
    if (!traducteurId) return;
    
    setSavingDisponibilite(true);
    const nouvelleValeur = !disponibiliteActive;

    try {
      await traducteurService.mettreAJourDisponibilite(traducteurId, {
        disponiblePourTravail: nouvelleValeur,
        commentaireDisponibilite: nouvelleValeur ? commentaireDisponibilite : undefined,
      });
      setDisponibiliteActive(nouvelleValeur);
      if (!nouvelleValeur) setCommentaireDisponibilite('');
    } catch (err: any) {
      alert(`Erreur: ${err.response?.data?.erreur || err.message || 'Erreur lors de la mise à jour'}`);
    } finally {
      setSavingDisponibilite(false);
    }
  }, [traducteurId, disponibiliteActive, commentaireDisponibilite]);

  const sauvegarderCommentaireDisponibilite = useCallback(async () => {
    if (!traducteurId) return;
    setSavingDisponibilite(true);
    try {
      await traducteurService.mettreAJourDisponibilite(traducteurId, {
        disponiblePourTravail: true,
        commentaireDisponibilite,
      });
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    } finally {
      setSavingDisponibilite(false);
    }
  }, [traducteurId, commentaireDisponibilite]);

  // ============ Handlers blocages ============
  const creerBlocage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traducteurId) return;
    
    setSubmittingBlocage(true);
    setErreurBlocage('');

    try {
      const heureDebut = blocageData.journeeComplete ? '00:00' : blocageData.heureDebut;
      const heureFin = blocageData.journeeComplete ? '23:59' : blocageData.heureFin;
      
      await traducteurService.bloquerTemps(traducteurId, {
        date: blocageData.date,
        heureDebut,
        heureFin,
        motif: blocageData.motif || 'Blocage personnel',
      });
      setOuvrirBlocage(false);
      setBlocageData({ 
        date: today, 
        heureDebut: '09:00', 
        heureFin: '17:00', 
        motif: '',
        journeeComplete: false
      });
      onRefresh?.();
      chargerBlocages();
    } catch (err: any) {
      setErreurBlocage(err.response?.data?.message || err.response?.data?.erreur || 'Erreur lors de la création du blocage');
    } finally {
      setSubmittingBlocage(false);
    }
  }, [traducteurId, blocageData, today, onRefresh, chargerBlocages]);

  const supprimerBlocage = useCallback((id: string) => {
    setConfirmDeleteBlocage({ isOpen: true, id });
  }, []);

  const executerSuppressionBlocage = useCallback(async () => {
    if (!confirmDeleteBlocage.id) return;
    try {
      await traducteurService.supprimerBlocage(confirmDeleteBlocage.id);
      chargerBlocages();
      onRefresh?.();
    } catch (err) {
      console.error('[DashboardTraducteur] Erreur suppression blocage:', err);
    } finally {
      setConfirmDeleteBlocage({ isOpen: false, id: null });
    }
  }, [confirmDeleteBlocage.id, chargerBlocages, onRefresh]);

  const fermerConfirmDeleteBlocage = useCallback(() => {
    setConfirmDeleteBlocage({ isOpen: false, id: null });
  }, []);

  // ============ Handlers terminaison tâche ============
  const demanderTerminerTache = useCallback((tacheId: string, tacheStatut?: string) => {
    setCommentaireTerminaison('');
    setConfirmTerminerTache({ isOpen: true, tacheId, tacheStatut });
  }, []);

  const confirmerTerminerTache = useCallback(async () => {
    if (!confirmTerminerTache.tacheId) return;
    
    setTerminerLoading(true);
    try {
      const result = await tacheService.terminerTache(confirmTerminerTache.tacheId, commentaireTerminaison || undefined);
      await chargerMesTaches();
      onRefresh?.();
      setConfirmTerminerTache({ isOpen: false, tacheId: null, tacheStatut: undefined });
      setCommentaireTerminaison('');
      
      if (result.heuresLiberees > 0) {
        alert(`✅ Tâche terminée ! ${result.heuresLiberees.toFixed(1)}h libérées sur ${result.joursLiberes} jour(s).`);
      } else {
        alert('✅ Tâche terminée !');
      }
    } catch (err: any) {
      console.error('[DashboardTraducteur] Erreur terminaison tâche:', err);
      alert('Erreur lors de la terminaison: ' + (err.response?.data?.erreur || err.message || 'Erreur inconnue'));
    } finally {
      setTerminerLoading(false);
    }
  }, [confirmTerminerTache.tacheId, commentaireTerminaison, chargerMesTaches, onRefresh]);

  const annulerTerminerTache = useCallback(() => {
    setConfirmTerminerTache({ isOpen: false, tacheId: null, tacheStatut: undefined });
    setCommentaireTerminaison('');
  }, []);

  // ============ Handlers paramètres ============
  const sauvegarderParametres = useCallback(async () => {
    if (!traducteurId) return;
    setSavingParametres(true);
    
    try {
      const formatHeure = (time: string) => {
        const [h, m] = time.split(':');
        return m === '00' ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`;
      };
      
      const horaire = `${formatHeure(parametresForm.horaireDebut)}-${formatHeure(parametresForm.horaireFin)}`;
      
      await traducteurService.mettreAJourTraducteur(traducteurId, { horaire });
      
      const data = await traducteurService.obtenirTraducteur(traducteurId);
      setTraducteur(data);
    } catch (err: any) {
      alert(`Erreur: ${err.response?.data?.erreur || 'Impossible de sauvegarder les paramètres'}`);
    } finally {
      setSavingParametres(false);
    }
  }, [traducteurId, parametresForm]);

  // ============ Refresh global ============
  const refreshAll = useCallback(() => {
    chargerMesTaches();
    chargerBlocages();
    onRefresh?.();
  }, [chargerMesTaches, chargerBlocages, onRefresh]);

  return {
    // Données
    traducteur,
    mesTaches,
    blocages,
    
    // États de chargement
    loadingTraducteur,
    loadingTaches,
    
    // Disponibilité
    disponibiliteActive,
    commentaireDisponibilite,
    savingDisponibilite,
    setCommentaireDisponibilite,
    toggleDisponibilite,
    sauvegarderCommentaireDisponibilite,
    
    // Blocages
    ouvrirBlocage,
    blocageData,
    submittingBlocage,
    erreurBlocage,
    confirmDeleteBlocage,
    setOuvrirBlocage,
    setBlocageData,
    creerBlocage,
    supprimerBlocage,
    executerSuppressionBlocage,
    fermerConfirmDeleteBlocage,
    
    // Terminaison tâche
    confirmTerminerTache,
    terminerLoading,
    commentaireTerminaison,
    setCommentaireTerminaison,
    demanderTerminerTache,
    confirmerTerminerTache,
    annulerTerminerTache,
    
    // Paramètres
    parametresForm,
    savingParametres,
    setParametresForm,
    sauvegarderParametres,
    
    // Statistiques
    stats,
    
    // Période
    periodeActuelle,
    
    // Actions
    chargerBlocages,
    chargerMesTaches,
    refreshAll,
  };
}
