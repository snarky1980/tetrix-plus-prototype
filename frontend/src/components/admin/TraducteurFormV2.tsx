import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { Badge } from '../ui/Badge';
import { TimeRangeSelector } from '../ui/TimeSelector';
import { InfoTooltip } from '../ui/Tooltip';
import { useToast } from '../../contexts/ToastContext';
import { Traducteur, PaireLinguistique, CategorieTraducteur } from '../../types';
import { traducteurService } from '../../services/traducteurService';
import { authService } from '../../services/authService';
import NotesPanel from '../common/NotesPanel';

interface TraducteurFormProps {
  traducteur?: Traducteur;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}

type TabId = 'identite' | 'competences' | 'horaires' | 'avance' | 'notes';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'identite', label: 'Identité', icon: '👤' },
  { id: 'competences', label: 'Compétences', icon: '🎯' },
  { id: 'horaires', label: 'Horaires', icon: '🕐' },
  { id: 'avance', label: 'Avancé', icon: '⚙️' },
  { id: 'notes', label: 'Notes', icon: '📝' },
];

const DIVISION_OPTIONS = [
  'CISR', 'Droit 1', 'Droit 2', 'Traduction anglaise 1', 
  'Traduction anglaise 2', 'Multilingue', 'FINANCE', 'SATJ backlog', 'TEST', 'Autre'
];

const CATEGORIE_OPTIONS: { value: CategorieTraducteur; label: string }[] = [
  { value: 'TR01', label: 'TR-01' },
  { value: 'TR02', label: 'TR-02' },
  { value: 'TR03', label: 'TR-03' },
];

// Convertir horaire string vers objets début/fin
const parseHoraire = (horaire: string | undefined) => {
  if (!horaire) return { debut: '09:00', fin: '17:00' };
  const match = horaire.match(/^(\d{1,2})h?(\d{0,2})?\s*-\s*(\d{1,2})h?(\d{0,2})?$/);
  if (match) {
    const hDebut = match[1].padStart(2, '0');
    const mDebut = (match[2] || '00').padStart(2, '0');
    const hFin = match[3].padStart(2, '0');
    const mFin = (match[4] || '00').padStart(2, '0');
    return { debut: `${hDebut}:${mDebut}`, fin: `${hFin}:${mFin}` };
  }
  return { debut: '09:00', fin: '17:00' };
};

// Convertir objets début/fin vers horaire string
const formatHoraire = (debut: string, fin: string) => {
  const [hDebut, mDebut] = debut.split(':');
  const [hFin, mFin] = fin.split(':');
  const debutStr = mDebut === '00' ? `${parseInt(hDebut)}h` : `${parseInt(hDebut)}h${mDebut}`;
  const finStr = mFin === '00' ? `${parseInt(hFin)}h` : `${parseInt(hFin)}h${mFin}`;
  return `${debutStr}-${finStr}`;
};

export const TraducteurFormV2: React.FC<TraducteurFormProps> = ({
  traducteur,
  ouvert,
  onFermer,
  onSauvegarder,
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('identite');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  
  // États pour les champs du formulaire
  const [formData, setFormData] = useState({
    // Identité
    nom: '',
    email: '',
    motDePasse: 'password123',
    divisions: [DIVISION_OPTIONS[0]] as string[],
    actif: true,
    
    // Compétences
    categorie: 'TR02' as CategorieTraducteur,
    necessiteRevision: true,
    domaines: ['TAG', 'IMM'] as string[],
    clientsHabituels: ['CISR'] as string[],
    specialisations: [] as string[],
    
    // Horaires
    horaireDebut: '09:00',
    horaireFin: '17:00',
    dinerDebut: '12:00',
    dinerFin: '13:00',
    capaciteHeuresParJour: 7,
    
    // Avancé
    notes: '',
    disponiblePourTravail: false,
    commentaireDisponibilite: '',
  });
  
  const [paires, setPaires] = useState<Omit<PaireLinguistique, 'id'>[]>([]);
  const [paireInput, setPaireInput] = useState({ source: '', cible: '' });
  const [afficherMdp, setAfficherMdp] = useState(false);
  
  // Inputs pour les tags
  const [domaineInput, setDomaineInput] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [specialisationInput, setSpecialisationInput] = useState('');

  // Charger les données du traducteur si édition
  useEffect(() => {
    if (traducteur) {
      const horaire = parseHoraire(traducteur.horaire);
      setFormData({
        nom: traducteur.nom,
        email: '',
        motDePasse: '',
        divisions: traducteur.divisions?.length > 0 ? [...traducteur.divisions] : [DIVISION_OPTIONS[0]],
        actif: traducteur.actif,
        categorie: traducteur.categorie || 'TR02',
        necessiteRevision: traducteur.necessiteRevision ?? true,
        domaines: [...traducteur.domaines],
        clientsHabituels: [...traducteur.clientsHabituels],
        specialisations: [...(traducteur.specialisations || [])],
        horaireDebut: horaire.debut,
        horaireFin: horaire.fin,
        dinerDebut: traducteur.heureDinerDebut || '12:00',
        dinerFin: traducteur.heureDinerFin || '13:00',
        capaciteHeuresParJour: traducteur.capaciteHeuresParJour || 7,
        notes: traducteur.notes || '',
        disponiblePourTravail: traducteur.disponiblePourTravail || false,
        commentaireDisponibilite: traducteur.commentaireDisponibilite || '',
      });
      setPaires(
        traducteur.pairesLinguistiques.map(p => ({
          langueSource: p.langueSource,
          langueCible: p.langueCible,
        }))
      );
    } else {
      // Réinitialiser pour nouveau traducteur
      setFormData({
        nom: '',
        email: '',
        motDePasse: 'password123',
        divisions: [DIVISION_OPTIONS[0]],
        actif: true,
        categorie: 'TR02',
        necessiteRevision: true,
        domaines: ['TAG', 'IMM'],
        clientsHabituels: ['CISR'],
        specialisations: [],
        horaireDebut: '09:00',
        horaireFin: '17:00',
        dinerDebut: '12:00',
        dinerFin: '13:00',
        capaciteHeuresParJour: 7,
        notes: '',
        disponiblePourTravail: false,
        commentaireDisponibilite: '',
      });
      setPaires([{ langueSource: 'EN', langueCible: 'FR' }]);
    }
    setErreur('');
    setActiveTab('identite');
  }, [traducteur, ouvert]);

  // Handlers pour les tags (domaines, clients, spécialisations)
  const ajouterTag = (type: 'domaines' | 'clientsHabituels' | 'specialisations', value: string, setter: (v: string) => void) => {
    if (value.trim() && !formData[type].includes(value.trim())) {
      setFormData({ ...formData, [type]: [...formData[type], value.trim()] });
      setter('');
    }
  };

  const retirerTag = (type: 'domaines' | 'clientsHabituels' | 'specialisations', value: string) => {
    setFormData({ ...formData, [type]: formData[type].filter(v => v !== value) });
  };

  // Handlers pour les paires linguistiques
  const ajouterPaire = () => {
    if (paireInput.source.trim() && paireInput.cible.trim()) {
      const existe = paires.some(
        p => p.langueSource === paireInput.source && p.langueCible === paireInput.cible
      );
      if (!existe) {
        setPaires([...paires, { langueSource: paireInput.source.trim(), langueCible: paireInput.cible.trim() }]);
        setPaireInput({ source: '', cible: '' });
      }
    }
  };

  const retirerPaire = (index: number) => {
    setPaires(paires.filter((_, i) => i !== index));
  };

  // Réinitialiser le mot de passe
  const handleReinitialiserMotDePasse = async (nouveauMotDePasse: string) => {
    if (!traducteur?.utilisateurId) {
      addToast('Impossible de trouver l\'utilisateur associé', 'error');
      return;
    }
    setLoading(true);
    try {
      await authService.reinitialiserMotDePasse(traducteur.utilisateurId, nouveauMotDePasse);
      addToast('Mot de passe réinitialisé avec succès', 'success');
    } catch (error: any) {
      const message = error.response?.data?.erreur || 'Erreur lors de la réinitialisation';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    try {
      const horaire = formatHoraire(formData.horaireDebut, formData.horaireFin);
      
      if (traducteur) {
        // Mise à jour
        await traducteurService.mettreAJourTraducteur(traducteur.id, {
          nom: formData.nom,
          divisions: formData.divisions,
          horaire,
          heureDinerDebut: formData.dinerDebut,
          heureDinerFin: formData.dinerFin,
          notes: formData.notes,
          capaciteHeuresParJour: formData.capaciteHeuresParJour,
          domaines: formData.domaines,
          clientsHabituels: formData.clientsHabituels,
          specialisations: formData.specialisations,
          actif: formData.actif,
          categorie: formData.categorie,
          necessiteRevision: formData.necessiteRevision,
          disponiblePourTravail: formData.disponiblePourTravail,
          commentaireDisponibilite: formData.commentaireDisponibilite,
        });

        // Mettre à jour les paires linguistiques
        for (const paire of paires) {
          try {
            await traducteurService.ajouterPaireLinguistique(traducteur.id, paire);
          } catch (err: any) {
            if (!err.response?.data?.erreur?.includes('existe déjà')) {
              throw err;
            }
          }
        }
        addToast(`Traducteur ${formData.nom} mis à jour avec succès`, 'success');
      } else {
        // Création
        if (!formData.email || !formData.motDePasse) {
          addToast('Email et mot de passe requis pour un nouveau traducteur', 'error');
          setLoading(false);
          return;
        }

        const nouveauTraducteur = await traducteurService.creerTraducteur({
          nom: formData.nom,
          divisions: formData.divisions,
          horaire,
          capaciteHeuresParJour: formData.capaciteHeuresParJour,
          domaines: formData.domaines,
          clientsHabituels: formData.clientsHabituels,
          specialisations: formData.specialisations,
          notes: formData.notes,
          actif: formData.actif,
          categorie: formData.categorie,
          necessiteRevision: formData.necessiteRevision,
          email: formData.email,
          motDePasse: formData.motDePasse,
        });

        for (const paire of paires) {
          await traducteurService.ajouterPaireLinguistique(nouveauTraducteur.id, paire);
        }
        addToast(`Traducteur ${formData.nom} créé avec succès`, 'success');
      }

      onSauvegarder();
      onFermer();
    } catch (err: any) {
      const message = err.response?.data?.erreur || 'Erreur lors de la sauvegarde';
      addToast(message, 'error');
      setErreur(message);
    } finally {
      setLoading(false);
    }
  };

  // Rendu des différents onglets
  const renderIdentiteTab = () => (
    <div className="space-y-4">
      <FormField label="Nom complet" required>
        <Input
          value={formData.nom}
          onChange={e => setFormData({ ...formData, nom: e.target.value })}
          required
          placeholder="Jean Dupont"
        />
      </FormField>

      {!traducteur ? (
        <>
          <FormField label="Email" required helper="Adresse email pour la connexion">
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="jean.dupont@tetrix.com"
            />
          </FormField>

          <FormField label="Mot de passe" required helper="Minimum 6 caractères">
            <div className="relative">
              <Input
                type={afficherMdp ? 'text' : 'password'}
                value={formData.motDePasse}
                onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                required
                minLength={6}
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primaire"
              >
                {afficherMdp ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </FormField>
        </>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Gestion du mot de passe</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nouveauMdp = prompt('Entrez le nouveau mot de passe (minimum 6 caractères):');
                if (nouveauMdp && nouveauMdp.length >= 6) {
                  handleReinitialiserMotDePasse(nouveauMdp);
                } else if (nouveauMdp) {
                  addToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
                }
              }}
            >
              🔑 Réinitialiser
            </Button>
          </div>
        </div>
      )}

      <FormField label="Divisions" required helper="Le traducteur peut appartenir à plusieurs divisions">
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-white">
          {DIVISION_OPTIONS.map(option => (
            <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={formData.divisions.includes(option)}
                onChange={e => {
                  if (e.target.checked) {
                    setFormData({ ...formData, divisions: [...formData.divisions, option] });
                  } else if (formData.divisions.length > 1) {
                    setFormData({ ...formData, divisions: formData.divisions.filter(d => d !== option) });
                  }
                }}
                className="rounded text-primaire"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {formData.divisions.map(d => (
            <Badge key={d} variant="info" className="text-xs">{d}</Badge>
          ))}
        </div>
      </FormField>

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.actif}
            onChange={e => setFormData({ ...formData, actif: e.target.checked })}
            className="rounded text-primaire"
          />
          <span className="font-medium">Traducteur actif</span>
        </label>
        <InfoTooltip content="Un traducteur inactif ne peut pas recevoir de nouvelles tâches" />
      </div>
    </div>
  );

  const renderCompetencesTab = () => (
    <div className="space-y-4">
      {/* Catégorie */}
      <FormField label="Catégorie" required helper="Niveau d'autonomie du traducteur">
        <select
          value={formData.categorie}
          onChange={e => {
            const cat = e.target.value as CategorieTraducteur;
            setFormData({
              ...formData,
              categorie: cat,
              necessiteRevision: cat === 'TR01' ? true : cat === 'TR03' ? false : formData.necessiteRevision,
            });
          }}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primaire"
        >
          {CATEGORIE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>

      {/* Nécessite révision (seulement pour TR02) */}
      {formData.categorie === 'TR02' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.necessiteRevision}
              onChange={e => setFormData({ ...formData, necessiteRevision: e.target.checked })}
              className="rounded text-amber-600"
            />
            <span className="font-medium text-amber-800">Nécessite révision</span>
          </label>
          <p className="text-xs text-amber-600 mt-1">
            Si coché, les travaux de ce traducteur TR-02 seront systématiquement révisés
          </p>
        </div>
      )}

      {/* Paires linguistiques */}
      <FormField label="Paires linguistiques" helper="Combinaisons de langues maîtrisées">
        <div className="flex gap-2 mb-2">
          <Input
            value={paireInput.source}
            onChange={e => setPaireInput({ ...paireInput, source: e.target.value.toUpperCase() })}
            placeholder="Source (FR, EN...)"
            className="flex-1"
            maxLength={3}
          />
          <span className="self-center text-gray-500">→</span>
          <Input
            value={paireInput.cible}
            onChange={e => setPaireInput({ ...paireInput, cible: e.target.value.toUpperCase() })}
            placeholder="Cible"
            className="flex-1"
            maxLength={3}
          />
          <Button type="button" variant="outline" onClick={ajouterPaire}>+</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {paires.map((p, i) => (
            <Badge key={i} variant="default" className="gap-1">
              {p.langueSource} → {p.langueCible}
              <button type="button" onClick={() => retirerPaire(i)} className="ml-1 hover:text-red-600">✕</button>
            </Badge>
          ))}
        </div>
      </FormField>

      {/* Domaines */}
      <FormField label="Domaines d'expertise">
        <div className="flex gap-2 mb-2">
          <Input
            value={domaineInput}
            onChange={e => setDomaineInput(e.target.value)}
            placeholder="Ajouter un domaine..."
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), ajouterTag('domaines', domaineInput, setDomaineInput))}
          />
          <Button type="button" variant="outline" onClick={() => ajouterTag('domaines', domaineInput, setDomaineInput)}>+</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.domaines.map(d => (
            <Badge key={d} variant="info" className="gap-1">
              {d}
              <button type="button" onClick={() => retirerTag('domaines', d)} className="ml-1 hover:text-red-600">✕</button>
            </Badge>
          ))}
        </div>
      </FormField>

      {/* Clients habituels */}
      <FormField label="Clients habituels">
        <div className="flex gap-2 mb-2">
          <Input
            value={clientInput}
            onChange={e => setClientInput(e.target.value)}
            placeholder="Ajouter un client..."
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), ajouterTag('clientsHabituels', clientInput, setClientInput))}
          />
          <Button type="button" variant="outline" onClick={() => ajouterTag('clientsHabituels', clientInput, setClientInput)}>+</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.clientsHabituels.map(c => (
            <Badge key={c} variant="success" className="gap-1">
              {c}
              <button type="button" onClick={() => retirerTag('clientsHabituels', c)} className="ml-1 hover:text-red-600">✕</button>
            </Badge>
          ))}
        </div>
      </FormField>

      {/* Spécialisations */}
      <FormField label="Spécialisations" helper="Immigration, juridique, médical, etc.">
        <div className="flex gap-2 mb-2">
          <Input
            value={specialisationInput}
            onChange={e => setSpecialisationInput(e.target.value)}
            placeholder="Ajouter une spécialisation..."
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), ajouterTag('specialisations', specialisationInput, setSpecialisationInput))}
          />
          <Button type="button" variant="outline" onClick={() => ajouterTag('specialisations', specialisationInput, setSpecialisationInput)}>+</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.specialisations.map(s => (
            <Badge key={s} variant="default" className="gap-1 bg-amber-100 text-amber-800">
              {s}
              <button type="button" onClick={() => retirerTag('specialisations', s)} className="ml-1 hover:text-red-600">✕</button>
            </Badge>
          ))}
        </div>
      </FormField>
    </div>
  );

  const renderHorairesTab = () => (
    <div className="space-y-4">
      {/* Horaire de travail */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🕐</span>
          <h3 className="font-semibold text-blue-800">Horaire de travail</h3>
        </div>
        <TimeRangeSelector
          startValue={formData.horaireDebut}
          endValue={formData.horaireFin}
          onStartChange={v => setFormData({ ...formData, horaireDebut: v })}
          onEndChange={v => setFormData({ ...formData, horaireFin: v })}
          minHour={6}
          maxHour={22}
          step={30}
        />
        <p className="text-xs text-blue-600 mt-2">
          Plage horaire pendant laquelle le traducteur peut recevoir des tâches
        </p>
      </div>

      {/* Pause dîner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🍽️</span>
          <h3 className="font-semibold text-amber-800">Pause dîner</h3>
        </div>
        <TimeRangeSelector
          startValue={formData.dinerDebut}
          endValue={formData.dinerFin}
          onStartChange={v => setFormData({ ...formData, dinerDebut: v })}
          onEndChange={v => setFormData({ ...formData, dinerFin: v })}
          minHour={10}
          maxHour={16}
          step={30}
        />
        <p className="text-xs text-amber-600 mt-2">
          Période exclue automatiquement de la planification des tâches
        </p>
      </div>

      {/* Capacité heures/jour */}
      <FormField label="Capacité heures/jour" required helper="Heures de travail effectif par jour">
        <div className="flex items-center gap-4">
          <Input
            type="number"
            step="0.5"
            min="1"
            max="12"
            value={formData.capaciteHeuresParJour}
            onChange={e => setFormData({ ...formData, capaciteHeuresParJour: parseFloat(e.target.value) })}
            className="w-24"
          />
          <span className="text-gray-500">heures</span>
          <div className="flex gap-2">
            {[6, 7, 7.5, 8].map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setFormData({ ...formData, capaciteHeuresParJour: h })}
                className={`px-2 py-1 text-xs rounded ${formData.capaciteHeuresParJour === h ? 'bg-primaire text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </FormField>

      {/* Récapitulatif visuel */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">📊 Récapitulatif</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Début: <strong>{formatHoraire(formData.horaireDebut, formData.horaireDebut).split('-')[0]}</strong></div>
          <div>Fin: <strong>{formatHoraire(formData.horaireFin, formData.horaireFin).split('-')[0]}</strong></div>
          <div>Dîner: <strong>{formatHoraire(formData.dinerDebut, formData.dinerFin)}</strong></div>
          <div>Capacité: <strong>{formData.capaciteHeuresParJour}h/jour</strong></div>
        </div>
      </div>
    </div>
  );

  const renderAvanceTab = () => (
    <div className="space-y-4">
      {/* Disponibilité */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.disponiblePourTravail}
            onChange={e => setFormData({ ...formData, disponiblePourTravail: e.target.checked })}
            className="rounded text-green-600"
          />
          <span className="font-medium text-green-800">✋ Disponible pour travail supplémentaire</span>
        </label>
        <p className="text-xs text-green-600 mt-1 ml-6">
          Apparaîtra dans la liste des traducteurs disponibles sur le tableau de bord
        </p>
        
        {formData.disponiblePourTravail && (
          <div className="mt-3">
            <Input
              value={formData.commentaireDisponibilite}
              onChange={e => setFormData({ ...formData, commentaireDisponibilite: e.target.value })}
              placeholder="Commentaire optionnel (ex: disponible après 14h)"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <FormField label="Notes" helper="Informations diverses (congés, contraintes, etc.)">
        <textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Ex: En congé le mercredi, télétravail le vendredi..."
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primaire min-h-[100px] resize-y"
          rows={4}
        />
      </FormField>

      {/* Informations système (lecture seule en édition) */}
      {traducteur && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">ℹ️ Informations système</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>ID: <code className="bg-gray-200 px-1 rounded">{traducteur.id.substring(0, 8)}...</code></div>
            <div>Utilisateur ID: <code className="bg-gray-200 px-1 rounded">{traducteur.utilisateurId.substring(0, 8)}...</code></div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'identite': return renderIdentiteTab();
      case 'competences': return renderCompetencesTab();
      case 'horaires': return renderHorairesTab();
      case 'avance': return renderAvanceTab();
      case 'notes': return renderNotesTab();
      default: return null;
    }
  };

  // Onglet Notes (visible uniquement en édition)
  const renderNotesTab = () => {
    if (!traducteur) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">📝</p>
          <p>Les notes seront disponibles après la création du traducteur.</p>
        </div>
      );
    }

    return (
      <NotesPanel
        entiteType="TRADUCTEUR"
        entiteId={traducteur.id}
        titre="Notes sur ce traducteur"
        className="border-0 shadow-none"
      />
    );
  };

  return (
    <Modal 
      titre={traducteur ? `Modifier: ${traducteur.nom}` : 'Nouveau traducteur'} 
      ouvert={ouvert} 
      onFermer={onFermer}
      wide
    >
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        {/* Navigation par onglets */}
        <div className="flex border-b mb-4 -mx-6 px-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primaire'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primaire" />
              )}
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet */}
        <div className="min-h-[400px] max-h-[60vh] overflow-y-auto pr-2">
          {renderTabContent()}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-between items-center pt-4 border-t mt-4 -mx-6 px-6 -mb-4 pb-4 bg-white sticky bottom-0">
          <div className="text-xs text-gray-500">
            {activeTab !== 'identite' && (
              <button type="button" onClick={() => setActiveTab('identite')} className="text-primaire hover:underline">
                ← Retour à l'identité
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? 'Sauvegarde...' : (traducteur ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TraducteurFormV2;
