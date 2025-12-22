import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { useToast } from '../../contexts/ToastContext';
import { Traducteur, PaireLinguistique } from '../../types';
import { traducteurService } from '../../services/traducteurService';
import { authService } from '../../services/authService';

interface TraducteurFormProps {
  traducteur?: Traducteur;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}

export const TraducteurForm: React.FC<TraducteurFormProps> = ({
  traducteur,
  ouvert,
  onFermer,
  onSauvegarder,
}) => {
  const { addToast } = useToast();
  const DIVISION_OPTIONS = ['CISR', 'Droit 1', 'Droit 2', 'Traduction anglaise 1', 'Traduction anglaise 2', 'Multilingue', 'FINANCE', 'SATJ backlog', 'TEST', 'Autre'];
  const CLASSIFICATION_OPTIONS = ['TR-01', 'TR-02', 'TR-03'];
  const [formData, setFormData] = useState({
    nom: '',
    divisions: [DIVISION_OPTIONS[0]] as string[],
    classification: 'TR-02' as string,
    horaire: '' as string,
    email: '',
    motDePasse: 'password123',
    capaciteHeuresParJour: 7,
    domaines: ['TAG', 'IMM'] as string[],
    clientsHabituels: ['CISR'] as string[],
    specialisations: [] as string[],
    notes: '' as string,
    actif: true,
  });
  const [domaineInput, setDomaineInput] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [specialisationInput, setSpecialisationInput] = useState('');
  const [paires, setPaires] = useState<Omit<PaireLinguistique, 'id'>[]>([]);
  const [paireInput, setPaireInput] = useState({ source: '', cible: '' });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);

  useEffect(() => {
    if (traducteur) {
      setFormData({
        nom: traducteur.nom,
        divisions: traducteur.divisions?.length > 0 ? [...traducteur.divisions] : [DIVISION_OPTIONS[0]],
        classification: traducteur.classification || 'TR-02',
        horaire: traducteur.horaire || '',
        email: '',
        motDePasse: '',
        capaciteHeuresParJour: traducteur.capaciteHeuresParJour || 7,
        domaines: [...traducteur.domaines],
        clientsHabituels: [...traducteur.clientsHabituels],
        specialisations: [...(traducteur.specialisations || [])],
        notes: traducteur.notes || '',
        actif: traducteur.actif,
      });
      setPaires(
        traducteur.pairesLinguistiques.map(p => ({
          langueSource: p.langueSource,
          langueCible: p.langueCible,
        }))
      );
    } else {
      setFormData({
        nom: '',
        divisions: [DIVISION_OPTIONS[0]],
        classification: 'TR-02',
        horaire: '',
        email: '',
        motDePasse: 'password123',
        capaciteHeuresParJour: 7,
        domaines: ['TAG', 'IMM'],
        clientsHabituels: ['CISR'],
        specialisations: [],
        notes: '',
        actif: true,
      });
      setPaires([{ langueSource: 'EN', langueCible: 'FR' }]);
    }
    setErreur('');
  }, [traducteur, ouvert]);

  const ajouterDomaine = () => {
    if (domaineInput.trim() && !formData.domaines.includes(domaineInput.trim())) {
      setFormData({
        ...formData,
        domaines: [...formData.domaines, domaineInput.trim()],
      });
      setDomaineInput('');
    }
  };

  const retirerDomaine = (domaine: string) => {
    setFormData({
      ...formData,
      domaines: formData.domaines.filter(d => d !== domaine),
    });
  };

  const ajouterClient = () => {
    if (clientInput.trim() && !formData.clientsHabituels.includes(clientInput.trim())) {
      setFormData({
        ...formData,
        clientsHabituels: [...formData.clientsHabituels, clientInput.trim()],
      });
      setClientInput('');
    }
  };

  const retirerClient = (client: string) => {
    setFormData({
      ...formData,
      clientsHabituels: formData.clientsHabituels.filter(c => c !== client),
    });
  };

  const ajouterSpecialisation = () => {
    if (specialisationInput.trim() && !formData.specialisations.includes(specialisationInput.trim())) {
      setFormData({
        ...formData,
        specialisations: [...formData.specialisations, specialisationInput.trim()],
      });
      setSpecialisationInput('');
    }
  };

  const retirerSpecialisation = (specialisation: string) => {
    setFormData({
      ...formData,
      specialisations: formData.specialisations.filter(s => s !== specialisation),
    });
  };

  const ajouterPaire = () => {
    if (paireInput.source.trim() && paireInput.cible.trim()) {
      const existe = paires.some(
        p => p.langueSource === paireInput.source && p.langueCible === paireInput.cible
      );
      if (!existe) {
        setPaires([
          ...paires,
          {
            langueSource: paireInput.source.trim(),
            langueCible: paireInput.cible.trim(),
          },
        ]);
        setPaireInput({ source: '', cible: '' });
      }
    }
  };

  const retirerPaire = (index: number) => {
    setPaires(paires.filter((_, i) => i !== index));
  };

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
      const message = error.response?.data?.erreur || 'Erreur lors de la réinitialisation du mot de passe';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    try {
      if (traducteur) {
        // Mise à jour
        await traducteurService.mettreAJourTraducteur(traducteur.id, {
          nom: formData.nom,
          divisions: formData.divisions,
          classification: formData.classification,
          horaire: formData.horaire,
          notes: formData.notes,
          capaciteHeuresParJour: formData.capaciteHeuresParJour,
          domaines: formData.domaines,
          clientsHabituels: formData.clientsHabituels,
          specialisations: formData.specialisations,
          actif: formData.actif,
        });

        // Mettre à jour les paires linguistiques (ignorer les erreurs si la paire existe déjà)
        for (const paire of paires) {
          try {
            await traducteurService.ajouterPaireLinguistique(traducteur.id, paire);
          } catch (err: any) {
            // Ignorer silencieusement si la paire existe déjà
            if (!err.response?.data?.erreur?.includes('existe déjà')) {
              throw err; // Propager les autres erreurs
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
          ...formData,
          email: formData.email,
          motDePasse: formData.motDePasse,
        });

        // Ajouter les paires linguistiques
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

  return (
    <Modal titre={traducteur ? 'Modifier traducteur' : 'Nouveau traducteur'} ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {erreur && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        <FormField label="Nom" required helper="Le nom complet du traducteur">
          <Input
            value={formData.nom}
            onChange={e => setFormData({ ...formData, nom: e.target.value })}
            required
            placeholder="Jean Dupont"
            error={!formData.nom && formData !== undefined}
          />
        </FormField>

        <FormField label="Divisions" required helper="Domaines de travail (peut appartenir à plusieurs divisions)">
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3 bg-card">
            {DIVISION_OPTIONS.map(option => (
              <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={formData.divisions.includes(option)}
                  onChange={e => {
                    if (e.target.checked) {
                      setFormData({ ...formData, divisions: [...formData.divisions, option] });
                    } else {
                      // Ne pas permettre de tout désélectionner
                      if (formData.divisions.length > 1) {
                        setFormData({ ...formData, divisions: formData.divisions.filter(d => d !== option) });
                      }
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
          <div className="text-xs text-muted mt-1">
            Sélectionné(s): {formData.divisions.join(', ')}
          </div>
        </FormField>

        <FormField label="Classification" required helper="Niveau de compétence du traducteur">
          <select
            value={formData.classification}
            onChange={e => setFormData({ ...formData, classification: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            required
          >
            {CLASSIFICATION_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Horaire" helper="Plage horaire de travail (ex: 9h-17h, 8h30-16h30) - Optionnel">
          <Input
            value={formData.horaire}
            onChange={e => setFormData({ ...formData, horaire: e.target.value })}
            placeholder="9h-17h"
          />
        </FormField>

        {!traducteur ? (
          <>
            <FormField label="Email" required helper="Adresse email professionnelle">
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="jean.dupont@tetrix.com"
                error={!formData.email && formData !== undefined}
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
                  placeholder="••••••••"
                  error={!formData.motDePasse && formData !== undefined}
                  className="pr-20"
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdp(!afficherMdp)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary"
                >
                  {afficherMdp ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </FormField>
          </>
        ) : (
          <FormField label="Mot de passe" helper="Réinitialiser le mot de passe du traducteur">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const nouveauMdp = prompt('Entrez le nouveau mot de passe (minimum 6 caractères):');
                if (nouveauMdp && nouveauMdp.length >= 6) {
                  handleReinitialiserMotDePasse(nouveauMdp);
                } else if (nouveauMdp) {
                  addToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
                }
              }}
            >
              Réinitialiser le mot de passe
            </Button>
          </FormField>
        )}

        <FormField label="Capacité heures/jour" required helper="Heures disponibles par jour (ex: 7.5)">
          <Input
            type="number"
            step="0.25"
            min="0"
            value={formData.capaciteHeuresParJour}
            onChange={e =>
              setFormData({ ...formData, capaciteHeuresParJour: parseFloat(e.target.value) })
            }
            required
            error={formData.capaciteHeuresParJour <= 0}
          />
        </FormField>

        <FormField label="Domaines">
          <div className="flex gap-2 mb-2">
            <Input
              value={domaineInput}
              onChange={e => setDomaineInput(e.target.value)}
              placeholder="Ajouter un domaine..."
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), ajouterDomaine())}
            />
            <Button type="button" variant="outline" onClick={ajouterDomaine}>
              Ajouter
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.domaines.map(d => (
              <span
                key={d}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
              >
                {d}
                <button
                  type="button"
                  onClick={() => retirerDomaine(d)}
                  className="hover:text-blue-900"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </FormField>

        <FormField label="Clients habituels">
          <div className="flex gap-2 mb-2">
            <Input
              value={clientInput}
              onChange={e => setClientInput(e.target.value)}
              placeholder="Ajouter un client..."
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), ajouterClient())}
            />
            <Button type="button" variant="outline" onClick={ajouterClient}>
              Ajouter
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.clientsHabituels.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm"
              >
                {c}
                <button
                  type="button"
                  onClick={() => retirerClient(c)}
                  className="hover:text-green-900"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </FormField>

        <FormField label="Spécialisations" helper="Spécialisations du traducteur (Immigration, Juridique, Médical, etc.)">
          <div className="flex gap-2 mb-2">
            <Input
              value={specialisationInput}
              onChange={e => setSpecialisationInput(e.target.value)}
              placeholder="Ajouter une spécialisation..."
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), ajouterSpecialisation())}
            />
            <Button type="button" variant="outline" onClick={ajouterSpecialisation}>
              Ajouter
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.specialisations.map(s => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm"
              >
                {s}
                <button
                  type="button"
                  onClick={() => retirerSpecialisation(s)}
                  className="hover:text-amber-900"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </FormField>

        <FormField label="Notes" helper="Notes diverses (ex: en congé le mercredi, un vendredi sur trois)">
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ajouter des notes..."
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card min-h-[80px] resize-y"
            rows={3}
          />
        </FormField>

        <FormField label="Paires linguistiques">
          <div className="flex gap-2 mb-2">
            <Input
              value={paireInput.source}
              onChange={e => setPaireInput({ ...paireInput, source: e.target.value })}
              placeholder="Source (FR, EN...)"
              className="flex-1"
            />
            <span className="self-center">→</span>
            <Input
              value={paireInput.cible}
              onChange={e => setPaireInput({ ...paireInput, cible: e.target.value })}
              placeholder="Cible (EN, ES...)"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={ajouterPaire}>
              Ajouter
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {paires.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
              >
                {p.langueSource} → {p.langueCible}
                <button
                  type="button"
                  onClick={() => retirerPaire(i)}
                  className="hover:text-purple-900"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </FormField>

        <FormField label="Statut">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.actif}
              onChange={e => setFormData({ ...formData, actif: e.target.checked })}
            />
            <span className="text-sm">Actif</span>
          </label>
        </FormField>

        <div className="flex justify-end gap-2 pt-4 border-t border-border sticky bottom-0 bg-card -mx-6 px-6 -mb-4 pb-4">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
