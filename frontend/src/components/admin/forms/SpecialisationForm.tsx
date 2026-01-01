import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { referentielService } from '../../../services/referentielService';

interface SpecialisationFormProps {
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}

export const SpecialisationForm: React.FC<SpecialisationFormProps> = ({ 
  ouvert, 
  onFermer, 
  onSauvegarder 
}) => {
  const { addToast } = useToast();
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNom('');
    setDescription('');
  }, [ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await referentielService.creerSpecialisation({ nom, description });
      addToast('Spécialisation créée', 'success');
      onSauvegarder();
      onFermer();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titre="Nouvelle spécialisation" ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        <FormField label="Nom de la spécialisation" required>
          <Input 
            value={nom} 
            onChange={e => setNom(e.target.value)} 
            required 
            placeholder="Ex: Immigration, Brevets..." 
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Description..."
          />
        </FormField>

        <p className="text-sm text-gray-500 mt-4">
          💡 Assignez cette spécialisation à des traducteurs via leur profil.
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} disabled={!nom}>
            {loading ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
