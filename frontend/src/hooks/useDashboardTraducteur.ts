/**
 * Hook useDashboardTraducteur
 * 
 * Centralise la logique métier du dashboard traducteur:
 * - Chargement des données (traducteur, tâches, blocages)
 * - Gestion de la disponibilité
 * - Gestion des blocages de temps
 * - Terminaison des tâches
 * - Paramètres horaires
 * 
 * Extrait de DashboardTraducteur.tsx pour améliorer la maintenabilité.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanification } from './usePlanification';
import { traducteurService } from '../services/traducteurService';
import { tacheService } from '../services/tacheService';
import type { Traducteur, Tache } from '../types';
import { todayOttawa, formatOttawaISO, addDaysOttawa } from '../utils/dateTimeOttawa';

// ============ Types ============

export type ViewMode = '1' | '7' | '14' | '30' | 'custom';

export interface BlocageData {
  date: string;
  heureDebut: string;
  heureFin: string;
  motif: string;
  journeeComplete: boolean;
}

export interface ParametresForm {
  horaireDebut: string;
  horaireFin: string;
  pauseMidiDebut: string;
  pauseMidiFin: string;
}

export interface Blocage {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  motif: string;
}

export interface TerminerTacheState {
  isOpen: boolean;
  tacheId: string | null;
  tacheStatut?: string;
}

export interface DeleteBlocageState {
  isOpen: boolean;
  id: string | null;
}

export interface DashboardStats {
  taches: number;
  blocages: number;
  libre: number;
  capacite: number;
  nbTaches: number;
  tachesPlanifiees: number;
  tachesEnCours: number;
  tachesEnRetard: number;
  tachesTerminees: number;
}

// ============ Hook ============

export function useDashboardTraducteur(traducteurIdOverride?: string) {
  const { utilisateur } = useAuth();
  // Permet à l'admin de voir le portail d'un autre traducteur
  const traducteurId = traducteurIdOverride || utilisateur?.traducteurId;
  const isViewingAsAdmin = !!traducteurIdOverride && utilisateur?.role === 'ADMIN';
  
  const todayDate = todayOttawa();
  const today = formatOttawaISO(todayDate);

  // ============ États de vue ============
  const [viewMode, setViewMode] = useState<ViewMode>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ============ États données ============
  const [traducteur, setTraducteur] = useState<Traducteur | null>(null);
  const [mesTaches, setMesTaches] = useState<Tache[]>([]);
  const [blocages, setBlocages] = useState<Blocage[]>([]);
  const [loadingTaches, setLoadingTaches] = useState(false);
  const [loadingTraducteur, setLoadingTraducteur] = useState(true);

  // ============ États disponibilité ============
  const [disponibiliteActive, setDisponibiliteActive] = useState(false);
  const [commentaireDisponibilite, setCommentaireDisponibilite] = useState('');
  const [ciblageDisponibilite, setCiblageDisponibilite] = useState<{
    divisions: string[];
    categories: string[];
    specialisations: string[];
    domaines: string[];
    equipeProjetId: string;
  }>({
    divisions: [],
    categories: [],
    specialisations: [],
    domaines: [],
    equipeProjetId: '',
  });
  const [savingDisponibilite, setSavingDisponibilite] = useState(false);

  // ============ États blocages ============
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const [blocageData, setBlocageData] = useState<BlocageData>({
    date: today,
    heureDebut: '09:00',
    heureFin: '17:00',
    motif: '',
    journeeComplete: false,
  });
  const [submittingBlocage, setSubmittingBlocage] = useState(false);
  const [erreurBlocage, setErreurBlocage] = useState('');
  const [confirmDeleteBlocage, setConfirmDeleteBlocage] = useState<DeleteBlocageState>({
    isOpen: false,
    id: null,
  });

  // ============ États terminaison tâche ============
  const [confirmTerminerTache, setConfirmTerminerTache] = useState<TerminerTacheState>({
    isOpen: false,
    tacheId: null,
    tacheStatut: undefined,
  });
  const [terminerLoading, setTerminerLoading] = useState(false);
  const [commentaireTerminaison, setCommentaireTerminaison] = useState('');

  // ============ États paramètres ============
  const [parametresForm, setParametresForm] = useState<ParametresForm>({
    horaireDebut: '09:00',
    horaireFin: '17:00',
    pauseMidiDebut: '12:00',
    pauseMidiFin: '13:00',
  });
  const [savingParametres, setSavingParametres] = useState(false);

  // ============ Calcul période ============
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
      fin: formatOttawaISO(fin),
    };
  }, [todayDate, viewMode, customStartDate, customEndDate]);

  // ============ Hook planification ============
  const {
    planification,
    loading: loadingPlanif,
    error: errorPlanif,
    refresh: refreshPlanification,
  } = usePlanification(traducteurId, {
    dateDebut: periodeActuelle.debut,
    dateFin: periodeActuelle.fin,
  });

  // ============ Chargement traducteur ============
  useEffect(() => {
    if (!traducteurId) {
      // Pas de traducteurId = pas de profil traducteur lié
      setLoadingTraducteur(false);
      return;
    }

    setLoadingTraducteur(true);
    traducteurService
      .obtenirTraducteur(traducteurId)
      .then((data) => {
        setTraducteur(data);
        setDisponibiliteActive(data.disponiblePourTravail);
        setCommentaireDisponibilite(data.commentaireDisponibilite || '');
        // Charger le ciblage existant
        const ciblage = (data as any).ciblageDisponibilite;
        if (ciblage) {
          setCiblageDisponibilite({
            divisions: ciblage.divisions || [],
            categories: ciblage.categories || [],
            specialisations: ciblage.specialisations || [],
            domaines: ciblage.domaines || [],
            equipeProjetId: ciblage.equipeProjetId || '',
          });
        }

        // Parser l'horaire pour les paramètres
        if (data.horaire) {
          const match = data.horaire.match(/^(\d{1,2})h(\d{0,2})?\s*-\s*(\d{1,2})h(\d{0,2})?$/);
          if (match) {
            const hDebut = match[1].padStart(2, '0');
            const mDebut = match[2] || '00';
            const hFin = match[3].padStart(2, '0');
            const mFin = match[4] || '00';
            setParametresForm((prev) => ({
              ...prev,
              horaireDebut: `${hDebut}:${mDebut}`,
              horaireFin: `${hFin}:${mFin}`,
            }));
          }
        }
      })
      .catch((err) => console.error('Erreur chargement traducteur:', err))
      .finally(() => setLoadingTraducteur(false));
  }, [traducteurId]);

  // ============ Chargement tâches ============
  const chargerMesTaches = useCallback(async () => {
    if (!traducteurId) return;
    setLoadingTaches(true);
    try {
      const data = await tacheService.obtenirTaches({ traducteurId });
      const tachesTries = data.sort(
        (a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime()
      );
      setMesTaches(tachesTries);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoadingTaches(false);
    }
  }, [traducteurId]);

  useEffect(() => {
    chargerMesTaches();
  }, [chargerMesTaches]);

  // ============ Chargement blocages ============
  const chargerBlocages = useCallback(async () => {
    if (!traducteurId) return;
    try {
      const data = await traducteurService.obtenirBlocages(traducteurId, {
        dateDebut: periodeActuelle.debut,
        dateFin: periodeActuelle.fin,
      });
      setBlocages(data);
    } catch (err) {
      console.error('Erreur chargement blocages:', err);
    }
  }, [traducteurId, periodeActuelle]);

  useEffect(() => {
    chargerBlocages();
  }, [chargerBlocages]);

  // ============ Statistiques ============
  const stats = useMemo<DashboardStats>(() => {
    const baseTaches = {
      nbTaches: mesTaches.length,
      tachesPlanifiees: mesTaches.filter((t) => t.statut === 'PLANIFIEE').length,
      tachesEnCours: mesTaches.filter((t) => t.statut === 'EN_COURS').length,
      tachesEnRetard: mesTaches.filter((t) => t.statut === 'EN_RETARD').length,
      tachesTerminees: mesTaches.filter((t) => t.statut === 'TERMINEE').length,
    };

    if (!planification) {
      return { taches: 0, blocages: 0, libre: 0, capacite: 0, ...baseTaches };
    }

    const totaux = planification.planification.reduce(
      (acc: any, jour: any) => ({
        taches: acc.taches + (jour.heuresTaches || 0),
        blocages: acc.blocages + (jour.heuresBlocages || 0),
        libre: acc.libre + (jour.disponible || 0),
        capacite: acc.capacite + (jour.capacite || 0),
      }),
      { taches: 0, blocages: 0, libre: 0, capacite: 0 }
    );

    return { ...totaux, ...baseTaches };
  }, [planification, mesTaches]);

  const percentageUtilise = useMemo(() => {
    if (stats.capacite === 0) return 0;
    return ((stats.taches + stats.blocages) / stats.capacite) * 100;
  }, [stats]);

  // ============ Actions disponibilité ============
  const toggleDisponibilite = useCallback(async () => {
    if (!traducteurId) return;

    setSavingDisponibilite(true);
    const nouvelleValeur = !disponibiliteActive;

    try {
      // Préparer le ciblage (null si tous les champs sont vides)
      const ciblageEffectif = nouvelleValeur ? {
        divisions: ciblageDisponibilite.divisions,
        categories: ciblageDisponibilite.categories,
        specialisations: ciblageDisponibilite.specialisations,
        domaines: ciblageDisponibilite.domaines,
        equipeProjetId: ciblageDisponibilite.equipeProjetId || null,
      } : null;
      
      const hasCiblage = ciblageEffectif && (
        ciblageEffectif.divisions.length > 0 ||
        ciblageEffectif.categories.length > 0 ||
        ciblageEffectif.specialisations.length > 0 ||
        ciblageEffectif.domaines.length > 0 ||
        ciblageEffectif.equipeProjetId
      );
      
      await traducteurService.mettreAJourDisponibilite(traducteurId, {
        disponiblePourTravail: nouvelleValeur,
        commentaireDisponibilite: nouvelleValeur ? commentaireDisponibilite : undefined,
        ciblageDisponibilite: hasCiblage ? ciblageEffectif : null,
      });
      setDisponibiliteActive(nouvelleValeur);
      if (!nouvelleValeur) {
        setCommentaireDisponibilite('');
        setCiblageDisponibilite({
          divisions: [],
          categories: [],
          specialisations: [],
          domaines: [],
          equipeProjetId: '',
        });
      }
    } catch (err: any) {
      alert(`Erreur: ${err.response?.data?.erreur || err.message || 'Erreur lors de la mise à jour'}`);
    } finally {
      setSavingDisponibilite(false);
    }
  }, [traducteurId, disponibiliteActive, commentaireDisponibilite, ciblageDisponibilite]);
  
  // Sauvegarder le commentaire et ciblage sans changer le statut
  const sauvegarderCiblageDisponibilite = useCallback(async () => {
    if (!traducteurId || !disponibiliteActive) return;

    setSavingDisponibilite(true);
    try {
      const ciblageEffectif = {
        divisions: ciblageDisponibilite.divisions,
        categories: ciblageDisponibilite.categories,
        specialisations: ciblageDisponibilite.specialisations,
        domaines: ciblageDisponibilite.domaines,
        equipeProjetId: ciblageDisponibilite.equipeProjetId || null,
      };
      
      const hasCiblage = 
        ciblageEffectif.divisions.length > 0 ||
        ciblageEffectif.categories.length > 0 ||
        ciblageEffectif.specialisations.length > 0 ||
        ciblageEffectif.domaines.length > 0 ||
        ciblageEffectif.equipeProjetId;
      
      await traducteurService.mettreAJourDisponibilite(traducteurId, {
        disponiblePourTravail: true,
        commentaireDisponibilite,
        ciblageDisponibilite: hasCiblage ? ciblageEffectif : null,
      });
    } catch (err: any) {
      alert(`Erreur: ${err.response?.data?.erreur || err.message || 'Erreur lors de la mise à jour'}`);
    } finally {
      setSavingDisponibilite(false);
    }
  }, [traducteurId, disponibiliteActive, commentaireDisponibilite, ciblageDisponibilite]);

  // ============ Actions blocages ============
  const creerBlocage = useCallback(
    async (e: React.FormEvent) => {
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
          journeeComplete: false,
        });
        refreshPlanification();
        chargerBlocages();
      } catch (err: any) {
        setErreurBlocage(
          err.response?.data?.message || err.response?.data?.erreur || 'Erreur lors de la création du blocage'
        );
      } finally {
        setSubmittingBlocage(false);
      }
    },
    [traducteurId, blocageData, today, refreshPlanification, chargerBlocages]
  );

  const demanderSuppressionBlocage = useCallback((id: string) => {
    setConfirmDeleteBlocage({ isOpen: true, id });
  }, []);

  const executerSuppressionBlocage = useCallback(async () => {
    if (!confirmDeleteBlocage.id) return;
    try {
      await traducteurService.supprimerBlocage(confirmDeleteBlocage.id);
      chargerBlocages();
      refreshPlanification();
    } catch (err) {
      console.error('Erreur suppression blocage:', err);
    } finally {
      setConfirmDeleteBlocage({ isOpen: false, id: null });
    }
  }, [confirmDeleteBlocage.id, chargerBlocages, refreshPlanification]);

  const annulerSuppressionBlocage = useCallback(() => {
    setConfirmDeleteBlocage({ isOpen: false, id: null });
  }, []);

  // ============ Actions terminaison tâche ============
  const demanderTerminerTache = useCallback((tacheId: string, tacheStatut?: string) => {
    setCommentaireTerminaison('');
    setConfirmTerminerTache({ isOpen: true, tacheId, tacheStatut });
  }, []);

  const confirmerTerminerTache = useCallback(async () => {
    if (!confirmTerminerTache.tacheId) return;

    setTerminerLoading(true);
    try {
      const result = await tacheService.terminerTache(
        confirmTerminerTache.tacheId,
        commentaireTerminaison || undefined
      );
      await chargerMesTaches();
      refreshPlanification();
      setConfirmTerminerTache({ isOpen: false, tacheId: null, tacheStatut: undefined });
      setCommentaireTerminaison('');

      if (result.heuresLiberees > 0) {
        alert(`✅ Tâche terminée ! ${result.heuresLiberees.toFixed(1)}h libérées sur ${result.joursLiberes} jour(s).`);
      } else {
        alert('✅ Tâche terminée !');
      }
    } catch (err: any) {
      console.error('Erreur terminaison tâche:', err);
      alert('Erreur lors de la terminaison: ' + (err.response?.data?.erreur || err.message || 'Erreur inconnue'));
    } finally {
      setTerminerLoading(false);
    }
  }, [confirmTerminerTache.tacheId, commentaireTerminaison, chargerMesTaches, refreshPlanification]);

  const annulerTerminerTache = useCallback(() => {
    setConfirmTerminerTache({ isOpen: false, tacheId: null, tacheStatut: undefined });
    setCommentaireTerminaison('');
  }, []);

  // ============ Actions paramètres ============
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

  // ============ Retour ============
  return {
    // Données
    traducteur,
    mesTaches,
    blocages,
    planification,
    stats,
    percentageUtilise,
    today,
    periodeActuelle,
    isViewingAsAdmin,

    // Loading states
    loadingTraducteur,
    loadingTaches,
    loadingPlanif,
    errorPlanif,

    // Vue
    viewMode,
    setViewMode,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,

    // Disponibilité
    disponibiliteActive,
    commentaireDisponibilite,
    setCommentaireDisponibilite,
    ciblageDisponibilite,
    setCiblageDisponibilite,
    savingDisponibilite,
    toggleDisponibilite,
    sauvegarderCiblageDisponibilite,

    // Blocages
    ouvrirBlocage,
    setOuvrirBlocage,
    blocageData,
    setBlocageData,
    submittingBlocage,
    erreurBlocage,
    creerBlocage,
    confirmDeleteBlocage,
    demanderSuppressionBlocage,
    executerSuppressionBlocage,
    annulerSuppressionBlocage,

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
    setParametresForm,
    savingParametres,
    sauvegarderParametres,

    // Refresh
    refresh: refreshPlanification,
    chargerMesTaches,
    chargerBlocages,
  };
}
