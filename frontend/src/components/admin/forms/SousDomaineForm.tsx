import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { SousDomaine } from '../../../types';
import { sousDomaineService } from '../../../services/sousDomaineService';

interface SousDomaineFormProps {
  sousDomaine?: SousDomaine;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
  domaines: { nom: string }[];
}

export const SousDomaineForm: React.FC<SousDomaineFormProps> = ({ 
  sousDomaine, 
  ouvert, 
  onFermer, 
  onSauvegarder, 
  domaines 
}) => {
  const { addToast } = useToast();
  const [nom, setNom] = useState('');
  const [domaineParent, setDomaineParent] = useState('');
  const [nouveauDomaine, setNouveauDomaine] = useState('');
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (sousDomaine) {
      setNom(sousDomaine.nom);
      setDomaineParent(sousDomaine.domaineParent || '');
      setActif(sousDomaine.actif);
    } else {
      setNom('');
      setDomaineParent('');
      setActif(true);
    }
    setNouveauDomaine('');
    setErreur('');
  }, [sousDomaine, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    const parentFinal = nouveauDomaine || domaineParent || undefined;

    try {
      if (sousDomaine) {
        await sousDomaineService.mettreAJourSousDomaine(sousDomaine.id, { 
          nom, 
          domaineParent: parentFinal, 
          actif 
        });
        addToast('Sous-domaine modifié avec succès', 'success');
      } else {
        await sousDomaineService.creerSousDomaine({ nom, domaineParent: parentFinal });
        addToast('Sous-domaine créé avec succès', 'success');
      }
      onSauvegarder();
      onFermer();
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      titre={sousDomaine ? 'Modifier sous-domaine' : 'Nouveau sous-domaine'} 
      ouvert={ouvert} 
      onFermer={onFermer}
    >
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        <FormField label="Nom du sous-domaine" required>
          <Input 
            value={nom} 
            onChange={e => setNom(e.target.value)} 
            required 
            placeholder="Ex: Immigration, Brevets..." 
          />
        </FormField>

        <FormField 
          label="Domaine parent" 
          helper="Sélectionnez un domaine existant ou créez-en un nouveau"
        >
          <select
            value={domaineParent}
            onChange={e => setDomaineParent(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Aucun domaine parent --</option>
            {domaines.filter(d => d.nom !== 'Sans catégorie').map(d => (
              <option key={d.nom} value={d.nom}>{d.nom}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Ou créer un nouveau domaine parent">
          <Input 
            value={nouveauDomaine} 
            onChange={e => { 
              setNouveauDomaine(e.target.value); 
              setDomaineParent(''); 
            }} 
            placeholder="Nouveau domaine..." 
          />
        </FormField>

        {sousDomaine && (
          <FormField label="Statut">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={actif} 
                onChange={e => setActif(e.target.checked)} 
              />
              <span className="text-sm">Actif</span>
            </label>
          </FormField>
        )}

        <div className="flex justify-end gap-2 mt-6">
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
