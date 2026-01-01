import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { SousDomaine } from '../../../types';
import { sousDomaineService } from '../../../services/sousDomaineService';

interface DomaineFormProps {
  domaine?: { id: string; nom: string };
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
  sousDomaines: SousDomaine[];
}

export const DomaineForm: React.FC<DomaineFormProps> = ({ 
  domaine, 
  ouvert, 
  onFermer, 
  onSauvegarder, 
  sousDomaines 
}) => {
  const { addToast } = useToast();
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNom(domaine?.nom || '');
  }, [domaine, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (domaine) {
        // Mettre à jour tous les sous-domaines avec ce parent
        const sdsToUpdate = sousDomaines.filter(sd => sd.domaineParent === domaine.nom);
        for (const sd of sdsToUpdate) {
          await sousDomaineService.mettreAJourSousDomaine(sd.id, { domaineParent: nom });
        }
        addToast('Domaine renommé avec succès', 'success');
      } else {
        addToast('Créez un sous-domaine avec ce domaine parent', 'info');
      }
      onSauvegarder();
      onFermer();
    } catch (err) {
      addToast('Erreur lors de la modification', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titre={domaine ? 'Modifier domaine' : 'Nouveau domaine'} ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        <FormField 
          label="Nom du domaine" 
          required 
          helper="Les domaines regroupent plusieurs sous-domaines"
        >
          <Input 
            value={nom} 
            onChange={e => setNom(e.target.value)} 
            required 
            placeholder="Ex: Juridique, Technique..." 
          />
        </FormField>

        {!domaine && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded mt-4">
            💡 Pour créer un nouveau domaine, ajoutez un sous-domaine avec ce domaine comme parent.
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} disabled={!domaine}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
