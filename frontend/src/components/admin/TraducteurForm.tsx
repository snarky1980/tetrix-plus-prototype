import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { useToast } from '../../contexts/ToastContext';
import { Traducteur, PaireLinguistique } from '../../types';
import { traducteurService } from '../../services/traducteurService';

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
  const [formData, setFormData] = useState({
    nom: '',
    division: '',
    email: '',
    motDePasse: '',
    capaciteHeuresParJour: 7.5,
    domaines: [] as string[],
    clientsHabituels: [] as string[],
    actif: true,
  });
  const [domaineInput, setDomaineInput] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [paires, setPaires] = useState<Omit<PaireLinguistique, 'id'>[]>([]);
  const [paireInput, setPaireInput] = useState({ source: '', cible: '' });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (traducteur) {
      setFormData({
        nom: traducteur.nom,
        division: traducteur.division,
        email: '',
        motDePasse: '',
        capaciteHeuresParJour: traducteur.capaciteHeuresParJour,
        domaines: [...traducteur.domaines],
        clientsHabituels: [...traducteur.clientsHabituels],
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
        division: '',
        email: '',
        motDePasse: '',
        capaciteHeuresParJour: 7.5,
        domaines: [],
        clientsHabituels: [],
        actif: true,
      });
      setPaires([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    try {
      if (traducteur) {
        // Mise à jour
        await traducteurService.mettreAJourTraducteur(traducteur.id, {
          nom: formData.nom,
          division: formData.division,
          capaciteHeuresParJour: formData.capaciteHeuresParJour,
          domaines: formData.domaines,
          clientsHabituels: formData.clientsHabituels,
          actif: formData.actif,
        });

        // Mettre à jour les paires linguistiques
        for (const paire of paires) {
          await traducteurService.ajouterPaireLinguistique(traducteur.id, paire);
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
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        <FormField label="Nom" required>
          <Input
            value={formData.nom}
            onChange={e => setFormData({ ...formData, nom: e.target.value })}
            required
            placeholder="Jean Dupont"
          />
        </FormField>

        <FormField label="Division" required>
          <Input
            value={formData.division}
            onChange={e => setFormData({ ...formData, division: e.target.value })}
            required
            placeholder="Nord, Sud, Est, Ouest..."
          />
        </FormField>

        {!traducteur && (
          <>
            <FormField label="Email" required>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="jean.dupont@tetrix.com"
              />
            </FormField>

            <FormField label="Mot de passe" required>
              <Input
                type="password"
                value={formData.motDePasse}
                onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </FormField>
          </>
        )}

        <FormField label="Capacité heures/jour" required>
          <Input
            type="number"
            step="0.25"
            min="0"
            value={formData.capaciteHeuresParJour}
            onChange={e =>
              setFormData({ ...formData, capaciteHeuresParJour: parseFloat(e.target.value) })
            }
            required
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

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
