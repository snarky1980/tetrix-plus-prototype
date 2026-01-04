/**
 * Hook useFormulaireTache
 * 
 * Gère la logique métier du formulaire de création/édition de tâches:
 * - Chargement des données de référence (traducteurs, clients, domaines)
 * - Chargement de la tâche existante (mode édition)
 * - Gestion de la prévisualisation de répartition
 * - Suggestion de capacité
 * - Soumission et suppression
 */

import { useState, useEffect, useCallback } from 'react';
import { traducteurService } from '../services/traducteurService';
import { clientService } from '../services/clientService';
import { sousDomaineService } from '../services/sousDomaineService';
import { domaineService } from '../services/domaineService';
import { tacheService } from '../services/tacheService';
import { repartitionService, SuggestionRepartitionResponse } from '../services/repartitionService';
import { extractDatePart, extractTimePart, combineDateAndTime } from '../utils/dateTimeOttawa';
import { Traducteur, Client, SousDomaine, PaireLinguistique, TypeTache, TypeRepartitionUI } from '../types';
import { toUIMode } from '../utils/modeDistribution';

// Types
export interface FormulaireTacheFormData {
  numeroProjet: string;
  traducteurId: string;
  clientId: string;
  domaine: string;
  sousDomaineId: string;
  paireLinguistiqueId: string;
  typeTache: TypeTache;
  specialisation: string;
  description: string;
  heuresTotal: string | number;
  compteMots: string | number;
  dateEcheance: string;
  heureEcheance: string;
  priorite: 'URGENT' | 'REGULIER';
  typeRepartition: TypeRepartitionUI;
  dateDebut: string;
  dateFin: string;
}

export interface RepartitionManuelle {
  date: string;
  heures: number;
  heureDebut?: string;
  heureFin?: string;
}

interface UseFormulaireTacheOptions {
  tacheId?: string;
  onSuccess?: (tacheId: string) => void;
  onCancel?: () => void;
}

interface UseFormulaireTacheResult {
  // États de chargement
  loading: boolean;
  submitting: boolean;
  deleting: boolean;
  loadingPreview: boolean;
  loadingSuggestion: boolean;
  
  // Données de référence
  traducteurs: Traducteur[];
  clients: Client[];
  domaines: string[];
  sousDomaines: SousDomaine[];
  pairesDisponibles: PaireLinguistique[];
  
  // Formulaire
  formData: FormulaireTacheFormData;
  setFormData: React.Dispatch<React.SetStateAction<FormulaireTacheFormData>>;
  repartitionManuelle: RepartitionManuelle[];
  setRepartitionManuelle: React.Dispatch<React.SetStateAction<RepartitionManuelle[]>>;
  
  // Preview et suggestion
  previewRepartition: any[] | null;
  setPreviewRepartition: React.Dispatch<React.SetStateAction<any[] | null>>;
  suggestionCapacite: SuggestionRepartitionResponse | null;
  setSuggestionCapacite: React.Dispatch<React.SetStateAction<SuggestionRepartitionResponse | null>>;
  
  // Erreurs et avertissements
  erreur: string;
  setErreur: React.Dispatch<React.SetStateAction<string>>;
  warningDatesPassees: string | null;
  datesPassees: string[];
  
  // Confirmation
  confirmDelete: boolean;
  setConfirmDelete: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmDatesPassees: boolean;
  setShowConfirmDatesPassees: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Navigation
  etape: number;
  setEtape: React.Dispatch<React.SetStateAction<number>>;
  
  // Actions
  chargerPreview: () => Promise<void>;
  demanderSuggestion: () => Promise<void>;
  appliquerSuggestion: () => void;
  validerEtape1: () => boolean;
  handleSubmit: (confirmeDatesPassees?: boolean) => Promise<void>;
  handleDelete: () => Promise<void>;
  
  // Helpers
  formatNumeroProjet: (value: string) => string;
  traducteurSelectionne: Traducteur | undefined;
}

// Version de la tâche pour le verrouillage optimiste
let tacheVersion: number = 0;

export function useFormulaireTache(options: UseFormulaireTacheOptions): UseFormulaireTacheResult {
  const { tacheId, onSuccess, onCancel } = options;
  
  // États de navigation
  const [etape, setEtape] = useState(1);
  
  // États de chargement
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  
  // Erreurs
  const [erreur, setErreur] = useState('');
  const [warningDatesPassees, setWarningDatesPassees] = useState<string | null>(null);
  const [datesPassees, setDatesPassees] = useState<string[]>([]);
  
  // Confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showConfirmDatesPassees, setShowConfirmDatesPassees] = useState(false);

  // Données de référence
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);
  const [sousDomaines, setSousDomaines] = useState<SousDomaine[]>([]);
  const [pairesDisponibles, setPairesDisponibles] = useState<PaireLinguistique[]>([]);

  // Formulaire
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<FormulaireTacheFormData>({
    numeroProjet: '',
    traducteurId: '',
    clientId: '',
    domaine: '',
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
  });

  const [repartitionManuelle, setRepartitionManuelle] = useState<RepartitionManuelle[]>([]);
  const [previewRepartition, setPreviewRepartition] = useState<any[] | null>(null);
  const [suggestionCapacite, setSuggestionCapacite] = useState<SuggestionRepartitionResponse | null>(null);

  // Traducteur sélectionné (calculé)
  const traducteurSelectionne = traducteurs.find(t => t.id === formData.traducteurId);

  // Chargement des données de référence
  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    try {
      const [traducs, cls, domns, doms] = await Promise.all([
        traducteurService.obtenirTraducteurs({ actif: true }),
        clientService.obtenirClients(true),
        domaineService.obtenirDomaines(),
        sousDomaineService.obtenirSousDomaines(true),
      ]);
      setTraducteurs(traducs);
      setClients(cls);
      setSousDomaines(doms);
      
      // Agréger tous les domaines
      const domainesNoms = Array.from(new Set([
        ...domns.map(d => d.nom),
        ...traducs.flatMap(t => t.domaines || []),
        ...doms.map(sd => sd.nom),
      ])).sort();
      setDomaines(domainesNoms);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setErreur('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement de la tâche existante
  const chargerTache = useCallback(async () => {
    if (!tacheId) return;
    
    try {
      const tache = await tacheService.obtenirTache(tacheId);
      tacheVersion = tache.version || 0;
      
      const dateEcheanceStr = extractDatePart(tache.dateEcheance);
      const heureEcheance = extractTimePart(tache.dateEcheance, '17:00');
      const dateEcheanceComplete = combineDateAndTime(dateEcheanceStr, heureEcheance);
      
      setFormData({
        numeroProjet: tache.numeroProjet || '',
        traducteurId: tache.traducteurId,
        clientId: tache.clientId || '',
        domaine: '',
        sousDomaineId: tache.sousDomaineId || '',
        paireLinguistiqueId: tache.paireLinguistiqueId || '',
        typeTache: tache.typeTache || 'TRADUCTION',
        specialisation: tache.specialisation || '',
        description: tache.description || '',
        heuresTotal: tache.heuresTotal,
        compteMots: tache.compteMots || '',
        dateEcheance: dateEcheanceComplete,
        heureEcheance: heureEcheance,
        priorite: (tache.priorite === 'URGENT' ? 'URGENT' : 'REGULIER') as 'URGENT' | 'REGULIER',
        typeRepartition: toUIMode(tache.modeDistribution),
        dateDebut: today,
        dateFin: '',
      });

      // Charger les ajustements existants
      if (tache.ajustementsTemps && tache.ajustementsTemps.length > 0) {
        const repartitions = tache.ajustementsTemps
          .filter((a: any) => a.type === 'TACHE')
          .map((a: any) => ({
            date: a.date.split('T')[0],
            heures: a.heures
          }));
        if (repartitions.length > 0) {
          setFormData(prev => ({ ...prev, typeRepartition: 'MANUEL' }));
          setRepartitionManuelle(repartitions);
        }
      }
    } catch (err) {
      console.error('Erreur chargement tâche:', err);
      setErreur('Erreur lors du chargement de la tâche');
    }
  }, [tacheId, today]);

  // Effets
  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  useEffect(() => {
    if (tacheId) {
      chargerTache();
    }
  }, [tacheId, chargerTache]);

  // Mise à jour des paires linguistiques selon le traducteur sélectionné
  useEffect(() => {
    if (formData.traducteurId) {
      const trad = traducteurs.find(t => t.id === formData.traducteurId);
      setPairesDisponibles(trad?.pairesLinguistiques || []);
      if (!tacheId) {
        setFormData(prev => ({ ...prev, paireLinguistiqueId: '' }));
      }
    } else {
      setPairesDisponibles([]);
    }
  }, [formData.traducteurId, traducteurs, tacheId]);

  // Helpers
  const formatNumeroProjet = useCallback((value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 9)}-${cleaned.slice(9, 12)}`;
  }, []);

  // Actions
  const chargerPreview = useCallback(async () => {
    if (!formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
      setErreur('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if ((formData.typeRepartition === 'PEPS' || formData.typeRepartition === 'EQUILIBRE') && !formData.dateDebut) {
      setErreur('La date de début est requise pour ce mode de répartition');
      return;
    }
    if (formData.typeRepartition === 'EQUILIBRE' && !formData.dateFin) {
      setErreur('La date de fin est requise pour le mode équilibré');
      return;
    }

    setLoadingPreview(true);
    setErreur('');
    setWarningDatesPassees(null);
    setDatesPassees([]);
    
    try {
      const dateEcheanceComplete = `${formData.dateEcheance}T${formData.heureEcheance}:00`;
      
      let result;
      switch (formData.typeRepartition) {
        case 'PEPS':
          result = await repartitionService.previewPEPS({
            traducteurId: formData.traducteurId,
            heuresTotal: Number(formData.heuresTotal),
            dateDebut: `${formData.dateDebut}T09:00:00`,
            dateEcheance: dateEcheanceComplete,
          });
          break;
        case 'EQUILIBRE':
          result = await repartitionService.previewEquilibre({
            traducteurId: formData.traducteurId,
            heuresTotal: Number(formData.heuresTotal),
            dateDebut: `${formData.dateDebut}T09:00:00`,
            dateFin: `${formData.dateFin}T17:00:00`,
          });
          break;
        case 'JUSTE_TEMPS':
        default:
          result = await repartitionService.previewJAT({
            traducteurId: formData.traducteurId,
            heuresTotal: Number(formData.heuresTotal),
            dateEcheance: dateEcheanceComplete,
          });
          break;
      }
      
      setPreviewRepartition(result.repartition);
      
      if (result.warning && result.datesPassees && result.datesPassees.length > 0) {
        setWarningDatesPassees(result.warning);
        setDatesPassees(result.datesPassees);
      }
    } catch (err: any) {
      console.error('Erreur preview:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors du calcul de la répartition');
      setPreviewRepartition(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [formData]);

  const demanderSuggestion = useCallback(async () => {
    if (!formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
      setErreur('Veuillez remplir traducteur, heures et échéance pour obtenir une suggestion');
      return;
    }

    setLoadingSuggestion(true);
    setErreur('');
    setSuggestionCapacite(null);

    try {
      let dateDebut = formData.dateDebut || new Date().toISOString().split('T')[0];
      let dateFin = formData.dateFin || formData.dateEcheance;
      
      let modeApi: 'equilibre' | 'jat' | 'peps' = 'equilibre';
      if (formData.typeRepartition === 'JUSTE_TEMPS') {
        modeApi = 'jat';
        dateDebut = new Date().toISOString().split('T')[0];
        dateFin = formData.dateEcheance;
      } else if (formData.typeRepartition === 'PEPS') {
        modeApi = 'peps';
        dateFin = formData.dateEcheance;
      }

      const suggestion = await repartitionService.suggererRepartition({
        traducteurId: formData.traducteurId,
        heuresTotal: Number(formData.heuresTotal),
        dateDebut,
        dateFin,
        mode: modeApi,
      });

      setSuggestionCapacite(suggestion);
    } catch (err: any) {
      console.error('Erreur suggestion:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de la suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  }, [formData]);

  const appliquerSuggestion = useCallback(() => {
    if (suggestionCapacite?.repartition) {
      setPreviewRepartition(suggestionCapacite.repartition);
      setSuggestionCapacite(null);
    }
  }, [suggestionCapacite]);

  const validerEtape1 = useCallback((): boolean => {
    if (!formData.numeroProjet.trim()) {
      setErreur('Veuillez saisir un numéro de projet');
      return false;
    }
    if (!formData.traducteurId) {
      setErreur('Veuillez sélectionner un traducteur');
      return false;
    }
    if (!formData.heuresTotal || Number(formData.heuresTotal) <= 0) {
      setErreur('Les heures doivent être supérieures à 0');
      return false;
    }
    if (!formData.dateEcheance) {
      setErreur('Veuillez sélectionner une date d\'échéance');
      return false;
    }
    setErreur('');
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async (confirmeDatesPassees: boolean = false) => {
    if (datesPassees.length > 0 && !confirmeDatesPassees && !showConfirmDatesPassees) {
      setShowConfirmDatesPassees(true);
      return;
    }
    
    setShowConfirmDatesPassees(false);
    setSubmitting(true);
    setErreur('');

    try {
      if (!formData.numeroProjet || !formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
        setErreur('Veuillez remplir tous les champs obligatoires');
        setSubmitting(false);
        return;
      }

      if (formData.typeRepartition === 'MANUEL') {
        const totalHeuresManuel = repartitionManuelle.reduce((s, r) => s + r.heures, 0);
        const heuresAttendu = parseFloat(String(formData.heuresTotal));
        
        if (Math.abs(totalHeuresManuel - heuresAttendu) > 0.01) {
          setErreur(`Le total des heures (${totalHeuresManuel.toFixed(2)}h) ne correspond pas au total attendu (${heuresAttendu}h)`);
          setSubmitting(false);
          return;
        }
      }

      let dateEcheanceComplete = formData.dateEcheance;
      if (!formData.dateEcheance.includes('T')) {
        dateEcheanceComplete = `${formData.dateEcheance}T${formData.heureEcheance || '17:00'}:00`;
      }

      const data: any = {
        numeroProjet: formData.numeroProjet,
        traducteurId: formData.traducteurId,
        typeTache: formData.typeTache,
        description: formData.description || '',
        heuresTotal: parseFloat(String(formData.heuresTotal)),
        dateEcheance: dateEcheanceComplete,
      };

      if (formData.clientId) data.clientId = formData.clientId;
      if (formData.sousDomaineId) data.sousDomaineId = formData.sousDomaineId;
      if (formData.paireLinguistiqueId) data.paireLinguistiqueId = formData.paireLinguistiqueId;
      if (formData.specialisation && formData.specialisation.trim()) data.specialisation = formData.specialisation;
      if (formData.compteMots) data.compteMots = parseInt(String(formData.compteMots));

      if (formData.typeRepartition === 'MANUEL') {
        data.repartition = repartitionManuelle;
        data.repartitionAuto = false;
        data.modeDistribution = 'MANUEL';
      } else {
        if (previewRepartition && previewRepartition.length > 0) {
          data.repartition = previewRepartition;
          data.repartitionAuto = false;
          const modeMapping: Record<string, string> = {
            'JUSTE_TEMPS': 'JAT',
            'EQUILIBRE': 'EQUILIBRE',
            'PEPS': 'PEPS'
          };
          data.modeDistribution = modeMapping[formData.typeRepartition] || 'JAT';
        } else {
          setErreur('Aucune répartition générée. Veuillez recalculer.');
          setSubmitting(false);
          return;
        }
      }

      let resultat;
      if (tacheId) {
        data.version = tacheVersion;
        resultat = await tacheService.mettreAJourTache(tacheId, data);
      } else {
        resultat = await tacheService.creerTache(data);
      }

      if (onSuccess) {
        onSuccess(resultat.id);
      }
    } catch (err: any) {
      console.error('Erreur soumission:', err);
      const messageErreur = err.response?.data?.erreur || `Erreur lors de ${tacheId ? 'la modification' : 'la création'} de la tâche`;
      const detailsErreur = err.response?.data?.details ? `\nDétails: ${JSON.stringify(err.response.data.details)}` : '';
      setErreur(messageErreur + detailsErreur);
    } finally {
      setSubmitting(false);
    }
  }, [formData, repartitionManuelle, previewRepartition, datesPassees, showConfirmDatesPassees, tacheId, onSuccess]);

  const handleDelete = useCallback(async () => {
    if (!tacheId || !confirmDelete) return;
    
    setDeleting(true);
    setErreur('');
    
    try {
      await tacheService.supprimerTache(tacheId);
      if (onCancel) {
        onCancel();
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de la suppression de la tâche');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }, [tacheId, confirmDelete, onCancel]);

  return {
    // États de chargement
    loading,
    submitting,
    deleting,
    loadingPreview,
    loadingSuggestion,
    
    // Données de référence
    traducteurs,
    clients,
    domaines,
    sousDomaines,
    pairesDisponibles,
    
    // Formulaire
    formData,
    setFormData,
    repartitionManuelle,
    setRepartitionManuelle,
    
    // Preview et suggestion
    previewRepartition,
    setPreviewRepartition,
    suggestionCapacite,
    setSuggestionCapacite,
    
    // Erreurs et avertissements
    erreur,
    setErreur,
    warningDatesPassees,
    datesPassees,
    
    // Confirmation
    confirmDelete,
    setConfirmDelete,
    showConfirmDatesPassees,
    setShowConfirmDatesPassees,
    
    // Navigation
    etape,
    setEtape,
    
    // Actions
    chargerPreview,
    demanderSuggestion,
    appliquerSuggestion,
    validerEtape1,
    handleSubmit,
    handleDelete,
    
    // Helpers
    formatNumeroProjet,
    traducteurSelectionne,
  };
}
