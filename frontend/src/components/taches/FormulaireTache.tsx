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
import { domaineService, Domaine } from '../../services/domaineService';
import { tacheService } from '../../services/tacheService';
import { repartitionService } from '../../services/repartitionService';
import { Traducteur, Client, SousDomaine, PaireLinguistique } from '../../types';

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
  typeTache: 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE';
  specialisation: string;
  description: string;
  heuresTotal: string | number;
  compteMots: string | number;
  dateEcheance: string;
  heureEcheance: string;
  priorite: 'URGENT' | 'REGULIER';
  typeRepartition: 'JUSTE_TEMPS' | 'EQUILIBRE' | 'PEPS' | 'MANUEL';
  dateDebut: string;
  dateFin: string;
}

interface RepartitionManuelle {
  date: string;
  heures: number;
}

export const FormulaireTache: React.FC<FormulaireTacheProps> = ({
  tacheId,
  onSuccess,
  onCancel,
  compact = false,
}) => {
  const [etape, setEtape] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState('');

  // Données de référence
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [domaines, setDomaines] = useState<Domaine[]>([]);
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
      setDomaines(domns);
      setSousDomaines(doms);
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
      
      // Remplir le formulaire avec les données de la tâche
      const dateEch = new Date(tache.dateEcheance);
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
        dateEcheance: dateEch.toISOString().split('T')[0],
        heureEcheance: dateEch.toTimeString().slice(0, 5),
        priorite: 'REGULIER', // Champ non disponible sur le type Tache
        typeRepartition: 'JUSTE_TEMPS', // Par défaut pour l'édition
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
    // Format: 123-4567-001
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 10)}`;
  };

  const chargerPreview = async () => {
    if (!formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
      setErreur('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoadingPreview(true);
    setErreur('');
    
    try {
      const dateEcheanceComplete = `${formData.dateEcheance}T${formData.heureEcheance}:00`;
      const params = {
        traducteurId: formData.traducteurId,
        heuresTotal: Number(formData.heuresTotal),
        dateEcheance: dateEcheanceComplete,
        dateDebut: formData.typeRepartition === 'PEPS' || formData.typeRepartition === 'EQUILIBRE' 
          ? `${formData.dateDebut}T09:00:00` 
          : undefined,
        dateFin: formData.typeRepartition === 'EQUILIBRE' 
          ? `${formData.dateFin}T17:00:00` 
          : undefined,
      };

      let preview;
      switch (formData.typeRepartition) {
        case 'PEPS':
          preview = await repartitionService.previewPEPS(params);
          break;
        case 'EQUILIBRE':
          preview = await repartitionService.previewEquilibre(params);
          break;
        case 'JUSTE_TEMPS':
        default:
          preview = await repartitionService.previewJAT(params);
          break;
      }
      
      setPreviewRepartition(preview);
    } catch (err: any) {
      console.error('Erreur preview:', err);
      setErreur(err.response?.data?.erreur || 'Erreur lors du calcul de la répartition');
      setPreviewRepartition(null);
    } finally {
      setLoadingPreview(false);
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
    setRepartitionManuelle([...repartitionManuelle, { date: '', heures: 0 }]);
  };

  const retirerRepartitionManuelle = (index: number) => {
    setRepartitionManuelle(repartitionManuelle.filter((_, i) => i !== index));
  };

  const mettreAJourRepartitionManuelle = (
    index: number,
    champ: 'date' | 'heures',
    valeur: string | number
  ) => {
    const nouvelles = [...repartitionManuelle];
    nouvelles[index] = { ...nouvelles[index], [champ]: valeur };
    setRepartitionManuelle(nouvelles);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErreur('');

    try {
      const dateEcheanceComplete = `${formData.dateEcheance}T${formData.heureEcheance}:00`;

      const data: any = {
        numeroProjet: formData.numeroProjet,
        traducteurId: formData.traducteurId,
        type: formData.typeTache,
        description: formData.description,
        heuresTotal: Number(formData.heuresTotal),
        dateEcheance: dateEcheanceComplete,
        priorite: formData.priorite,
      };

      // Champs optionnels
      if (formData.clientId) data.clientId = formData.clientId;
      if (formData.domaine) data.domaine = formData.domaine;
      if (formData.sousDomaineId) data.sousDomaineId = formData.sousDomaineId;
      if (formData.paireLinguistiqueId) data.paireLinguistiqueId = formData.paireLinguistiqueId;
      if (formData.specialisation) data.specialisation = formData.specialisation;
      if (formData.compteMots) data.compteMots = Number(formData.compteMots);

      // Répartition
      if (formData.typeRepartition === 'MANUEL') {
        data.repartitionAuto = false;
        data.repartition = repartitionManuelle;
      } else {
        data.repartitionAuto = true;
        data.modeDistribution = formData.typeRepartition;
        
        if (formData.typeRepartition === 'PEPS' || formData.typeRepartition === 'EQUILIBRE') {
          data.dateDebut = `${formData.dateDebut}T09:00:00`;
        }
        if (formData.typeRepartition === 'EQUILIBRE') {
          data.dateFin = `${formData.dateFin}T17:00:00`;
        }
      }

      let resultat;
      if (tacheId) {
        resultat = await tacheService.mettreAJourTache(tacheId, data);
      } else {
        resultat = await tacheService.creerTache(data);
      }

      if (onSuccess) {
        onSuccess(resultat.id);
      }
    } catch (err: any) {
      console.error('Erreur soumission:', err);
      setErreur(err.response?.data?.erreur || `Erreur lors de ${tacheId ? 'la modification' : 'la création'} de la tâche`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

  const totalManuel = repartitionManuelle.reduce((sum, r) => sum + r.heures, 0);
  const totalFormulaire = Number(formData.heuresTotal) || 0;

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
                placeholder="123-4567-001"
                maxLength={12}
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
                  <option key={d.nom} value={d.nom}>{d.nom}</option>
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
              <Input
                type="text"
                value={formData.specialisation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, specialisation: e.target.value })
                }
                placeholder="Ex: Médical, Juridique, Technique..."
              />
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

          <div className="flex gap-2 justify-end pt-4 border-t">
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
      )}

      {/* ÉTAPE 2 : Répartition */}
      {etape === 2 && (
        <div className="space-y-4">
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
                  <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                    <input
                      type="date"
                      value={rep.date}
                      onChange={(e) => mettreAJourRepartitionManuelle(index, 'date', e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      required
                    />
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={rep.heures}
                      onChange={(e) => mettreAJourRepartitionManuelle(index, 'heures', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border rounded text-sm"
                      placeholder="Heures"
                      required
                    />
                    <Button
                      variant="outline"
                      onClick={() => retirerRepartitionManuelle(index)}
                      className="px-2 py-1 text-xs"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {loadingPreview ? (
                <LoadingSpinner message="Calcul de la répartition..." />
              ) : previewRepartition && previewRepartition.length > 0 ? (
                <div className="border rounded p-3 bg-gray-50 max-h-96 overflow-y-auto">
                  <h4 className="font-semibold text-sm mb-2">Aperçu de la répartition :</h4>
                  <div className="space-y-1">
                    {previewRepartition.map((rep, index) => (
                      <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200">
                        <span>{new Date(rep.date).toLocaleDateString('fr-CA')}</span>
                        <span className="font-semibold">
                          {rep.heures.toFixed(2)}h
                          {rep.heureDebut && rep.heureFin && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({rep.heureDebut} - {rep.heureFin})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between font-bold text-sm">
                    <span>Total:</span>
                    <span>{previewRepartition.reduce((sum, r) => sum + r.heures, 0).toFixed(2)}h</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600">
                  Aucune répartition calculée. Vérifiez les champs obligatoires à l'étape 1.
                </div>
              )}
              
              <Button variant="outline" onClick={chargerPreview} disabled={loadingPreview}>
                🔄 Recalculer la répartition
              </Button>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setEtape(1)}>
              ← Retour
            </Button>
            <Button
              variant="primaire"
              onClick={handleSubmit}
              disabled={submitting || (formData.typeRepartition === 'MANUEL' && totalManuel !== totalFormulaire)}
            >
              {submitting ? 'En cours...' : (tacheId ? 'Modifier la tâche' : 'Créer la tâche')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
