import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { divisionService, Division } from '../../../services/divisionService';

interface DivisionFormProps {
  division?: Division;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}

export const DivisionForm: React.FC<DivisionFormProps> = ({ 
  division, 
  ouvert, 
  onFermer, 
  onSauvegarder 
}) => {
  const { addToast } = useToast();
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (division) {
      setNom(division.nom);
      setCode(division.code || '');
      setDescription(division.description || '');
    } else {
      setNom('');
      setCode('');
      setDescription('');
    }
    setErreur('');
  }, [division, ouvert]);

  // Génération auto du code
  useEffect(() => {
    if (!division && nom && !code) {
      const codeGen = nom.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
      setCode(codeGen);
    }
  }, [nom, division, code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    try {
      if (division) {
        await divisionService.mettreAJourDivision(division.id, { nom, code, description });
        addToast('Division modifiée avec succès', 'success');
      } else {
        await divisionService.creerDivision({ nom, code, description });
        addToast('Division créée avec succès', 'success');
      }
      onSauvegarder();
      onFermer();
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      titre={division ? 'Modifier division' : 'Nouvelle division'} 
      ouvert={ouvert} 
      onFermer={onFermer}
    >
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        <FormField label="Nom de la division" required>
          <Input 
            value={nom} 
            onChange={e => setNom(e.target.value)} 
            required 
            placeholder="Ex: Droit, CISR, Science..." 
          />
        </FormField>

        <FormField label="Code" helper="Code court auto-généré">
          <Input 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            placeholder="DROIT" 
            disabled={!!division} 
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Description de la division..."
          />
        </FormField>

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
