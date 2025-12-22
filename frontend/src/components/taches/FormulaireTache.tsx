import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DateTimeInput } from '../ui/DateTimeInput';
import { LoadingSpinner } from '../ui/Spinner';
import { BoutonPlanificationTraducteur } from '../BoutonPlanificationTraducteur';
import { traducteurService } from '../../services/traducteurService';
import { clientService } from '../../services/clientService';
import { sousDomaineService } from '../../services/sousDomaineService';
import { domaineService } from '../../services/domaineService';
import { tacheService } from '../../services/tacheService';
import { repartitionService, SuggestionRepartitionResponse } from '../../services/repartitionService';
import { extractDatePart, extractTimePart, combineDateAndTime, formatDateEcheanceDisplay } from '../../utils/dateTimeOttawa';
import { Traducteur, Client, SousDomaine, PaireLinguistique, TypeTache, TypeRepartitionUI } from '../../types';
import { toUIMode, MODE_LABELS } from '../../utils/modeDistribution';

// Utilitaires pour formater les dates et heures
const formatDateAvecJour = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  };
  return date.toLocaleDateString('fr-CA', options);
};

const convertirHeureVersFomatHTML = (heure: string | undefined): string => {
  if (!heure) return '';
  // Convertir "10h" ou "10h30" vers "10:00" ou "10:30"
  const match = heure.match(/^(\d+)h(\d+)?$/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2] ? match[2].padStart(2, '0') : '00';
    return `${h}:${m}`;
  }
  return heure;
};

const convertirFormatHTMLVersHeure = (time: string): string => {
  if (!time) return '';
  // Convertir "10:00" ou "10:30" vers "10h" ou "10h30"
  const [h, m] = time.split(':');
  const heures = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  if (minutes === 0) return `${heures}h`;
  return `${heures}h${m}`;
};

const calculerHeureFin = (heureDebut: string, duree: number): string => {
  if (!heureDebut) return '';
  const [h, m] = heureDebut.split(':');
  let minutes = parseInt(h, 10) * 60 + parseInt(m, 10) + duree * 60;
  // Ajouter pause midi si on traverse 12h-13h
  const debutMinutes = parseInt(h, 10) * 60 + parseInt(m, 10);
  if (debutMinutes < 12 * 60 && minutes > 12 * 60) {
    minutes += 60; // Ajouter 1h de pause
  }
  const hFin = Math.floor(minutes / 60);
  const mFin = minutes % 60;
  return `${hFin}h${mFin > 0 ? mFin.toString().padStart(2, '0') : ''}`;
};

interface FormulaireTacheProps {
  /** ID de la tâche à éditer (undefined pour création) */
  tacheId?: string;
  /** Callback appelé après création/modification réussie */
  onSuccess?: (tacheId: string) => void;
  /** Callback appelé lors de l'annulation */
  onCancel?: () => void;
  /** Mode compact (pour modal) */
  compact?: boolean;
}

interface FormData {
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

interface RepartitionManuelle {
  date: string;
  heures: number;
  heureDebut?: string;
  heureFin?: string;
}

// Version de la tâche pour le verrouillage optimiste
let tacheVersion: number = 0;

export const FormulaireTache: React.FC<FormulaireTacheProps> = ({
  tacheId,
  onSuccess,
  onCancel,
  compact: _compact = false,
}) => {
  const [etape, setEtape] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [erreur, setErreur] = useState('');

  // Données de référence
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);
  const [sousDomaines, setSousDomaines] = useState<SousDomaine[]>([]);
  const [pairesDisponibles, setPairesDisponibles] = useState<PaireLinguistique[]>([]);

  // Formulaire
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<FormData>({
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
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [warningDatesPassees, setWarningDatesPassees] = useState<string | null>(null);
  const [datesPassees, setDatesPassees] = useState<string[]>([]);
  const [showConfirmDatesPassees, setShowConfirmDatesPassees] = useState(false);
  
  // État pour la suggestion de répartition
  const [suggestionCapacite, setSuggestionCapacite] = useState<SuggestionRepartitionResponse | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Chargement des données
  useEffect(() => {
    chargerDonnees();
  }, []);

  // Chargement de la tâche à éditer
  useEffect(() => {
    if (tacheId) {
      chargerTache();
    }
  }, [tacheId]);

  // Mise à jour des paires linguistiques selon le traducteur
  useEffect(() => {
    if (formData.traducteurId) {
      const trad = traducteurs.find(t => t.id === formData.traducteurId);
      setPairesDisponibles(trad?.pairesLinguistiques || []);
      if (!tacheId) {
        // Reset paire seulement si création
        setFormData(prev => ({ ...prev, paireLinguistiqueId: '' }));
      }
    }
  }, [formData.traducteurId, traducteurs, tacheId]);

  const chargerDonnees = async () => {
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
      
      // Agréger tous les domaines (comme dans PlanificationGlobale)
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
  };

  const chargerTache = async () => {
    if (!tacheId) return;
    
    try {
      const tache = await tacheService.obtenirTache(tacheId);
      
      // Stocker la version pour le verrouillage optimiste
      tacheVersion = tache.version || 0;
      
      // Remplir le formulaire avec les données de la tâche
      // Parser la date d'échéance avec les utilitaires standardisés
      const dateEcheanceStr = extractDatePart(tache.dateEcheance);
      const heureEcheance = extractTimePart(tache.dateEcheance, '17:00');
      // Combiner date + heure au format attendu par DateTimeInput: "YYYY-MM-DDTHH:mm:00"
      const dateEcheanceComplete = combineDateAndTime(dateEcheanceStr, heureEcheance);
      
      setFormData({
        numeroProjet: tache.numeroProjet || '',
        traducteurId: tache.traducteurId,
        clientId: tache.clientId || '',
        domaine: '', // Champ non disponible sur le type Tache
        sousDomaineId: tache.sousDomaineId || '',
        paireLinguistiqueId: tache.paireLinguistiqueId || '',
        typeTache: tache.typeTache || 'TRADUCTION',
        specialisation: tache.specialisation || '',
        description: tache.description || '',
        heuresTotal: tache.heuresTotal,
        compteMots: tache.compteMots || '',
        dateEcheance: dateEcheanceComplete, // Format complet avec heure pour DateTimeInput
        heureEcheance: heureEcheance, // Gardé pour compatibilité
        priorite: (tache.priorite === 'URGENT' ? 'URGENT' : 'REGULIER') as 'URGENT' | 'REGULIER',
        typeRepartition: toUIMode(tache.modeDistribution),
        dateDebut: today,
        dateFin: '',
      });

      // Charger les ajustements de temps existants si disponibles
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
  };

  const formatNumeroProjet = (value: string): string => {
    // Format: 123-123456-001
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 9)}-${cleaned.slice(9, 12)}`;
  };

  const chargerPreview = async () => {
    if (!formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
      setErreur('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation supplémentaire pour PEPS et EQUILIBRE
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
      
      // Gérer le warning pour les dates passées
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
  };

  // Fonction pour demander une suggestion de répartition au système
  const demanderSuggestion = async () => {
    if (!formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
      setErreur('Veuillez remplir traducteur, heures et échéance pour obtenir une suggestion');
      return;
    }

    setLoadingSuggestion(true);
    setErreur('');
    setSuggestionCapacite(null);

    try {
      // Déterminer la période en fonction du mode
      let dateDebut = formData.dateDebut || new Date().toISOString().split('T')[0];
      let dateFin = formData.dateFin || formData.dateEcheance;
      
      // Convertir mode UI vers mode API
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
      
      // Si une répartition est suggérée et on peut l'accepter, on peut optionnellement l'appliquer automatiquement
      // Pour l'instant, on affiche juste les informations
    } catch (err: any) {
      console.error('Erreur suggestion:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de la suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  // Appliquer la suggestion proposée
  const appliquerSuggestion = () => {
    if (suggestionCapacite?.repartition) {
      setPreviewRepartition(suggestionCapacite.repartition);
      setSuggestionCapacite(null);
    }
  };

  const validerEtape1 = (): boolean => {
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
  };

  const handleEtape1Suivant = () => {
    if (validerEtape1()) {
      if (formData.typeRepartition !== 'MANUEL') {
        chargerPreview();
      }
      setEtape(2);
    }
  };

  const ajouterRepartitionManuelle = () => {
    // Récupérer l'horaire du traducteur pour les plages par défaut
    const trad = traducteurs.find(t => t.id === formData.traducteurId);
    const horaireMatch = trad?.horaire?.match(/^(\d{1,2})h?-(\d{1,2})h?$/);
    const heureDebutDefaut = horaireMatch ? `${horaireMatch[1]}h` : '9h';
    setRepartitionManuelle([...repartitionManuelle, { date: '', heures: 0, heureDebut: heureDebutDefaut, heureFin: heureDebutDefaut }]);
  };

  const retirerRepartitionManuelle = (index: number) => {
    setRepartitionManuelle(repartitionManuelle.filter((_, i) => i !== index));
  };

  const mettreAJourRepartitionManuelle = (
    index: number,
    champ: 'date' | 'heures' | 'heureDebut' | 'heureFin',
    valeur: string | number
  ) => {
    const nouvelles = [...repartitionManuelle];
    nouvelles[index] = { ...nouvelles[index], [champ]: valeur };
    
    // Si on modifie les heures, recalculer l'heure de fin
    if (champ === 'heures' && nouvelles[index].heureDebut) {
      const heureDebut = convertirHeureVersFomatHTML(nouvelles[index].heureDebut);
      nouvelles[index].heureFin = calculerHeureFin(heureDebut, Number(valeur));
    }
    
    setRepartitionManuelle(nouvelles);
  };

  const handleSubmit = async (confirmeDatesPassees: boolean = false) => {
    // Si des dates passées et pas encore confirmé, demander confirmation
    if (datesPassees.length > 0 && !confirmeDatesPassees && !showConfirmDatesPassees) {
      setShowConfirmDatesPassees(true);
      return;
    }
    
    setShowConfirmDatesPassees(false);
    setSubmitting(true);
    setErreur('');

    try {
      // Validation des champs requis
      if (!formData.numeroProjet || !formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
        setErreur('Veuillez remplir tous les champs obligatoires');
        setSubmitting(false);
        return;
      }

      // Validation pour répartition manuelle
      if (formData.typeRepartition === 'MANUEL') {
        const totalHeuresManuel = repartitionManuelle.reduce((s, r) => s + r.heures, 0);
        const heuresAttendu = parseFloat(String(formData.heuresTotal));
        
        if (Math.abs(totalHeuresManuel - heuresAttendu) > 0.01) {
          setErreur(`Le total des heures (${totalHeuresManuel.toFixed(2)}h) ne correspond pas au total attendu (${heuresAttendu}h)`);
          setSubmitting(false);
          return;
        }
      }

      // Construire la dateEcheance - vérifier si déjà au format complet
      let dateEcheanceComplete = formData.dateEcheance;
      if (!formData.dateEcheance.includes('T')) {
        // Format YYYY-MM-DD seul, ajouter l'heure
        dateEcheanceComplete = `${formData.dateEcheance}T${formData.heureEcheance || '17:00'}:00`;
      }

      const data: any = {
        numeroProjet: formData.numeroProjet,
        traducteurId: formData.traducteurId,
        typeTache: formData.typeTache, // Corrigé: typeTache au lieu de type
        description: formData.description || '',
        heuresTotal: parseFloat(String(formData.heuresTotal)),
        dateEcheance: dateEcheanceComplete,
      };

      // Champs optionnels
      if (formData.clientId) data.clientId = formData.clientId;
      if (formData.sousDomaineId) data.sousDomaineId = formData.sousDomaineId;
      if (formData.paireLinguistiqueId) data.paireLinguistiqueId = formData.paireLinguistiqueId;
      if (formData.specialisation && formData.specialisation.trim()) data.specialisation = formData.specialisation;
      if (formData.compteMots) data.compteMots = parseInt(String(formData.compteMots));

      // Gérer les différentes méthodes de répartition
      if (formData.typeRepartition === 'MANUEL') {
        // Manuel: envoyer la répartition manuelle
        data.repartition = repartitionManuelle;
        data.repartitionAuto = false;
        data.modeDistribution = 'MANUEL';
      } else {
        // JAT, EQUILIBRE et PEPS: utiliser la prévisualisation (qui peut avoir été éditée par l'utilisateur)
        if (previewRepartition && previewRepartition.length > 0) {
          data.repartition = previewRepartition;
          data.repartitionAuto = false;
          // Mapper le mode de distribution
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
        // Ajouter la version pour le verrouillage optimiste
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
  };

  const handleDelete = async () => {
    if (!tacheId || !confirmDelete) return;
    
    setDeleting(true);
    setErreur('');
    
    try {
      await tacheService.supprimerTache(tacheId);
      if (onCancel) {
        onCancel(); // Fermer le formulaire après suppression
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors de la suppression de la tâche');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

  const totalManuel = repartitionManuelle.reduce((sum, r) => sum + r.heures, 0);
  const totalFormulaire = Number(formData.heuresTotal) || 0;
  
  // Mémoisation du traducteur sélectionné pour éviter les find() répétés
  const traducteurSelectionne = traducteurs.find(t => t.id === formData.traducteurId);

  return (
    <div className="space-y-4">
      {erreur && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {erreur}
        </div>
      )}

      {/* ÉTAPE 1 : Informations de la tâche */}
      {etape === 1 && (
        <div className="space-y-4">
          {/* Section Champs obligatoires */}
          <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-300 rounded">
            <h3 className="text-sm font-bold text-blue-900 mb-2">📝 Informations obligatoires</h3>
            
            {/* Numéro de projet */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Numéro de projet <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={formData.numeroProjet}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formatted = formatNumeroProjet(e.target.value);
                  setFormData({ ...formData, numeroProjet: formatted });
                }}
                placeholder="123-123456-001"
                maxLength={14}
                required
                className="border-2 border-blue-300"
              />
            </div>

            {/* Traducteur */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Traducteur <span className="text-red-600">*</span>
              </label>
              <Select
                value={formData.traducteurId}
                onChange={(e) => setFormData({ ...formData, traducteurId: e.target.value })}
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
              {formData.traducteurId && (
                <BoutonPlanificationTraducteur 
                  traducteurId={formData.traducteurId}
                  className="mt-2 text-xs px-3 py-1.5 w-full hover:bg-blue-50"
                />
              )}
            </div>

            {/* Type de tâche */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Type de tâche <span className="text-red-600">*</span>
              </label>
              <Select
                value={formData.typeTache}
                onChange={(e) => setFormData({ ...formData, typeTache: e.target.value as any })}
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
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Heures totales <span className="text-red-600">*</span>
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.heuresTotal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, heuresTotal: e.target.value })
                }
                placeholder="Ex: 4.5"
                required
                className="border-2 border-blue-300"
              />
            </div>

            {/* Date d'échéance */}
            <DateTimeInput
              label="Date d'échéance"
              value={formData.dateEcheance}
              onChange={(value) => setFormData({ ...formData, dateEcheance: value })}
              includeTime={true}
              required
            />

            {/* Priorité */}
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Priorité <span className="text-red-600">*</span>
              </label>
              <Select
                value={formData.priorite}
                onChange={(e) => setFormData({ ...formData, priorite: e.target.value as any })}
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
            
            {/* Paire linguistique */}
            {formData.traducteurId && pairesDisponibles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Paire linguistique <span className="text-gray-500 text-xs">(optionnel)</span>
                </label>
                <Select
                  value={formData.paireLinguistiqueId}
                  onChange={(e) => setFormData({ ...formData, paireLinguistiqueId: e.target.value })}
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

            {/* Compte de mots */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Compte de mots <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <Input
                type="number"
                min="0"
                value={formData.compteMots}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, compteMots: e.target.value })
                }
                placeholder="Ex: 5000"
              />
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Client <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <Select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">Aucun client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </Select>
            </div>

            {/* Domaine */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Domaine <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <Select
                value={formData.domaine}
                onChange={(e) => setFormData({ ...formData, domaine: e.target.value })}
              >
                <option value="">Aucun domaine</option>
                {domaines.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>

            {/* Sous-domaine */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Sous-domaine <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <Select
                value={formData.sousDomaineId}
                onChange={(e) => setFormData({ ...formData, sousDomaineId: e.target.value })}
              >
                <option value="">Aucun sous-domaine</option>
                {sousDomaines.map((sd) => (
                  <option key={sd.id} value={sd.id}>
                    {sd.nom}
                    {sd.domaineParent && ` (${sd.domaineParent})`}
                  </option>
                ))}
              </Select>
            </div>

            {/* Spécialisation */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Spécialisation <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <Select
                value={formData.specialisation}
                onChange={(e) => setFormData({ ...formData, specialisation: e.target.value })}
              >
                <option value="">Aucune spécialisation</option>
                {domaines.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>

            {/* Commentaire */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Commentaire <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ajoutez un commentaire ou des détails..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          {/* Mode de répartition */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              ⚙️ Mode de répartition <span className="text-red-600">*</span>
            </h3>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" 
                style={{ borderColor: formData.typeRepartition === 'JUSTE_TEMPS' ? '#3b82f6' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="typeRepartition"
                  value="JUSTE_TEMPS"
                  checked={formData.typeRepartition === 'JUSTE_TEMPS'}
                  onChange={(e) => setFormData({ ...formData, typeRepartition: e.target.value as any })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">📊 Juste à temps (JAT)</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Alloue les heures le plus TARD possible, en remontant depuis l'échéance. Optimise pour terminer juste à temps.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" 
                style={{ borderColor: formData.typeRepartition === 'PEPS' ? '#3b82f6' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="typeRepartition"
                  value="PEPS"
                  checked={formData.typeRepartition === 'PEPS'}
                  onChange={(e) => setFormData({ ...formData, typeRepartition: e.target.value as any })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">🔄 Premier Entré, Premier Sorti (PEPS)</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Alloue les heures le plus TÔT possible, en partant d'aujourd'hui. Commence immédiatement.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" 
                style={{ borderColor: formData.typeRepartition === 'EQUILIBRE' ? '#3b82f6' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="typeRepartition"
                  value="EQUILIBRE"
                  checked={formData.typeRepartition === 'EQUILIBRE'}
                  onChange={(e) => setFormData({ ...formData, typeRepartition: e.target.value as any })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">⚖️ Équilibré (Uniforme)</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Répartit les heures uniformément sur une période définie.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border-2 rounded cursor-pointer hover:bg-blue-50 transition-colors" 
                style={{ borderColor: formData.typeRepartition === 'MANUEL' ? '#3b82f6' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="typeRepartition"
                  value="MANUEL"
                  checked={formData.typeRepartition === 'MANUEL'}
                  onChange={(e) => setFormData({ ...formData, typeRepartition: e.target.value as any })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">✍️ Manuel</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Définissez manuellement les heures pour chaque jour.
                  </div>
                </div>
              </label>
            </div>

            {/* Bouton suggestion de répartition */}
            {formData.typeRepartition !== 'MANUEL' && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={demanderSuggestion}
                  disabled={loadingSuggestion || !formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance}
                  className="w-full text-sm border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  {loadingSuggestion ? '⏳ Analyse en cours...' : '💡 Suggérer une répartition optimale'}
                </Button>
              </div>
            )}

            {/* Affichage de la suggestion */}
            {suggestionCapacite && (
              <div className={`mt-3 p-4 rounded-lg border-2 ${
                suggestionCapacite.peutAccepter 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{suggestionCapacite.peutAccepter ? '✅' : '⚠️'}</span>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-2 ${
                      suggestionCapacite.peutAccepter ? 'text-green-800' : 'text-amber-800'
                    }`}>
                      Analyse de capacité
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacité totale:</span>
                        <span className="font-medium">{suggestionCapacite.capaciteTotale.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Déjà utilisée:</span>
                        <span className="font-medium text-orange-600">{suggestionCapacite.heuresDejaUtilisees.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Disponible:</span>
                        <span className={`font-medium ${suggestionCapacite.peutAccepter ? 'text-green-600' : 'text-red-600'}`}>
                          {suggestionCapacite.capaciteDisponible.toFixed(1)}h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jours utilisables:</span>
                        <span className="font-medium">{suggestionCapacite.joursDisponibles}</span>
                      </div>
                    </div>

                    <p className={`text-sm ${
                      suggestionCapacite.peutAccepter ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {suggestionCapacite.suggestion}
                    </p>

                    {!suggestionCapacite.peutAccepter && suggestionCapacite.heuresManquantes > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        ⛔ Il manque {suggestionCapacite.heuresManquantes.toFixed(1)}h de capacité
                      </p>
                    )}

                    {suggestionCapacite.repartition && suggestionCapacite.repartition.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <Button
                            onClick={appliquerSuggestion}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                          >
                            📋 Appliquer cette répartition
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSuggestionCapacite(null)}
                            className="text-sm"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Dates spécifiques selon le mode */}
            {formData.typeRepartition === 'PEPS' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <DateTimeInput
                  label="Date de début"
                  value={formData.dateDebut}
                  onChange={(value) => setFormData({ ...formData, dateDebut: value })}
                  includeTime={true}
                  required
                />
              </div>
            )}
            
            {formData.typeRepartition === 'EQUILIBRE' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                <DateTimeInput
                  label="Date de début"
                  value={formData.dateDebut}
                  onChange={(value) => setFormData({ ...formData, dateDebut: value })}
                  includeTime={true}
                  required
                />
                <DateTimeInput
                  label="Date de fin"
                  value={formData.dateFin}
                  onChange={(value) => setFormData({ ...formData, dateFin: value })}
                  includeTime={true}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-between pt-4 border-t">
            {/* Bouton supprimer à gauche (uniquement en mode édition) */}
            <div>
              {tacheId && !confirmDelete && (
                <Button 
                  variant="outline" 
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  🗑️ Supprimer
                </Button>
              )}
              {tacheId && confirmDelete && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-red-600">Confirmer ?</span>
                  <Button 
                    variant="outline" 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-600 border-red-500 bg-red-50 hover:bg-red-100"
                  >
                    {deleting ? '...' : 'Oui, supprimer'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setConfirmDelete(false)}
                  >
                    Non
                  </Button>
                </div>
              )}
            </div>
            
            {/* Boutons navigation à droite */}
            <div className="flex gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
              )}
              <Button variant="primaire" onClick={handleEtape1Suivant}>
                Suivant →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : Répartition */}
      {etape === 2 && (
        <div className="space-y-4">
          {/* Résumé de la tâche */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium mb-2 text-sm">📋 Résumé de la tâche</h3>
                <div className="text-xs space-y-1">
                  <p><span className="font-medium">Projet:</span> {formData.numeroProjet}</p>
                  <p><span className="font-medium">Traducteur:</span> {traducteurSelectionne?.nom} {traducteurSelectionne?.horaire && <span className="text-gray-500">({traducteurSelectionne.horaire} | 🍽️ 12h-13h)</span>}</p>
                  <p><span className="font-medium">Type:</span> {formData.typeTache}</p>
                  <p><span className="font-medium">Heures:</span> {formData.heuresTotal}h</p>
                  <p><span className="font-medium">Échéance:</span> {formatDateEcheanceDisplay(formData.dateEcheance)}</p>
                  <p><span className="font-medium">Répartition:</span> {MODE_LABELS[formData.typeRepartition] || 'Non définie'}</p>
                </div>
              </div>
              {formData.traducteurId && (
                <div className="flex-shrink-0">
                  <BoutonPlanificationTraducteur 
                    traducteurId={formData.traducteurId}
                    className="text-xs px-3 py-2 whitespace-nowrap"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Avertissement dates passées */}
          {warningDatesPassees && datesPassees.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800 mb-1">Dates dans le passé détectées</h4>
                  <p className="text-sm text-amber-700 mb-2">
                    {datesPassees.length} jour(s) de la répartition sont antérieurs à aujourd'hui:
                  </p>
                  <ul className="text-sm text-amber-700 mb-2 list-disc list-inside">
                    {datesPassees.map(d => (
                      <li key={d}>{formatDateAvecJour(d)}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600">
                    La confirmation sera demandée lors de l'enregistrement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal de confirmation dates passées */}
          {showConfirmDatesPassees && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Confirmer les dates passées</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Cette répartition contient {datesPassees.length} jour(s) dans le passé.
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">Jours concernés:</p>
                  <ul className="text-sm text-amber-700 list-disc list-inside">
                    {datesPassees.map(d => (
                      <li key={d}>{formatDateAvecJour(d)}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Voulez-vous vraiment enregistrer cette tâche avec des heures dans le passé?
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDatesPassees(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => handleSubmit(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Confirmer et enregistrer
                  </Button>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold text-gray-900 mb-2">
            📅 Répartition des heures
          </h3>

          {formData.typeRepartition === 'MANUEL' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Total: {totalManuel.toFixed(2)}h / {totalFormulaire.toFixed(2)}h
                </p>
                <Button variant="outline" onClick={ajouterRepartitionManuelle}>
                  + Ajouter un jour
                </Button>
              </div>

              {totalManuel !== totalFormulaire && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  ⚠️ Le total des heures réparties ({totalManuel.toFixed(2)}h) ne correspond pas au total ({totalFormulaire.toFixed(2)}h)
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {repartitionManuelle.map((rep, index) => (
                  <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 rounded border">
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={rep.date}
                        onChange={(e) => mettreAJourRepartitionManuelle(index, 'date', e.target.value)}
                        className="flex-1 px-2 py-1.5 border rounded text-sm"
                        required
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Heures:</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={rep.heures}
                          onChange={(e) => mettreAJourRepartitionManuelle(index, 'heures', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 border rounded text-sm text-center"
                          placeholder="Heures"
                          required
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => retirerRepartitionManuelle(index)}
                        className="px-2 py-1 text-xs"
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Plage:</span>
                      <input
                        type="time"
                        value={rep.heureDebut ? convertirHeureVersFomatHTML(rep.heureDebut) : '09:00'}
                        onChange={(e) => {
                          const heureFormatee = convertirFormatHTMLVersHeure(e.target.value);
                          mettreAJourRepartitionManuelle(index, 'heureDebut', heureFormatee);
                          // Recalculer l'heure de fin
                          const nouvelleFin = calculerHeureFin(e.target.value, rep.heures);
                          mettreAJourRepartitionManuelle(index, 'heureFin', nouvelleFin);
                        }}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-gray-500">→</span>
                      <input
                        type="time"
                        value={rep.heureFin ? convertirHeureVersFomatHTML(rep.heureFin) : '09:00'}
                        onChange={(e) => {
                          const heureFormatee = convertirFormatHTMLVersHeure(e.target.value);
                          mettreAJourRepartitionManuelle(index, 'heureFin', heureFormatee);
                        }}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {loadingPreview ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  ⏳ Calcul de la répartition...
                </div>
              ) : previewRepartition && previewRepartition.length > 0 ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* En-tête */}
                  <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📅</span>
                      <h3 className="text-sm font-semibold text-gray-800">
                        Répartition calculée 
                        <span className="ml-2 text-xs font-normal text-gray-600">
                          ({{
                            'JUSTE_TEMPS': 'JAT',
                            'EQUILIBRE': 'Équilibré',
                            'PEPS': 'PEPS',
                            'MANUEL': 'Manuel'
                          }[formData.typeRepartition]})
                        </span>
                      </h3>
                    </div>
                    <Button
                      variant="outline"
                      onClick={chargerPreview}
                      disabled={loadingPreview}
                      className="text-xs px-3 py-1.5 hover:bg-gray-200"
                    >
                      🔄 Recalculer
                    </Button>
                  </div>
                  
                  {/* Liste des jours */}
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
                                  newPreview[idx] = {
                                    ...newPreview[idx],
                                    heures: nouvellesDuree,
                                    heureFin: calculerHeureFin(
                                      convertirHeureVersFomatHTML(newPreview[idx].heureDebut),
                                      nouvellesDuree
                                    )
                                  };
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
                                newPreview[idx] = {
                                  ...newPreview[idx],
                                  heureDebut: convertirFormatHTMLVersHeure(e.target.value)
                                };
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
                                newPreview[idx] = {
                                  ...newPreview[idx],
                                  heureFin: convertirFormatHTMLVersHeure(e.target.value)
                                };
                                setPreviewRepartition(newPreview);
                              }}
                              className="text-sm w-24"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Pied avec total */}
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
                            {parseFloat(String(formData.heuresTotal) || '0').toFixed(2)}h
                          </span>
                          {Math.abs(previewRepartition.reduce((s, r) => s + r.heures, 0) - parseFloat(String(formData.heuresTotal) || '0')) > 0.01 && (
                            <span className={`text-xs font-medium ml-2 ${
                              previewRepartition.reduce((s, r) => s + r.heures, 0) < parseFloat(String(formData.heuresTotal) || '0')
                                ? 'text-orange-600'
                                : 'text-red-600'
                            }`}>
                              {previewRepartition.reduce((s, r) => s + r.heures, 0) < parseFloat(String(formData.heuresTotal) || '0')
                                ? `(reste ${(parseFloat(String(formData.heuresTotal) || '0') - previewRepartition.reduce((s, r) => s + r.heures, 0)).toFixed(2)}h)`
                                : `(excès ${(previewRepartition.reduce((s, r) => s + r.heures, 0) - parseFloat(String(formData.heuresTotal) || '0')).toFixed(2)}h)`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  Aucune répartition générée. Cliquez sur "Recalculer".
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-between pt-4 border-t">
            {/* Bouton supprimer à gauche (uniquement en mode édition) */}
            <div>
              {tacheId && !confirmDelete && (
                <Button 
                  variant="outline" 
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  🗑️ Supprimer
                </Button>
              )}
              {tacheId && confirmDelete && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-red-600">Confirmer ?</span>
                  <Button 
                    variant="outline" 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-600 border-red-500 bg-red-50 hover:bg-red-100"
                  >
                    {deleting ? '...' : 'Oui, supprimer'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setConfirmDelete(false)}
                  >
                    Non
                  </Button>
                </div>
              )}
            </div>
            
            {/* Boutons navigation à droite */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEtape(1)}>
                ← Retour
              </Button>
              <Button
                variant="primaire"
                onClick={() => handleSubmit()}
                disabled={submitting || (formData.typeRepartition === 'MANUEL' && totalManuel !== totalFormulaire)}
              >
                {submitting ? 'En cours...' : (tacheId ? 'Modifier la tâche' : 'Créer la tâche')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
