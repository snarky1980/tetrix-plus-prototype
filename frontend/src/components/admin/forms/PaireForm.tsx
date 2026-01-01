import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { referentielService, Langue, LANGUES_STANDARDS } from '../../../services/referentielService';

interface PaireFormProps {
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
  langues: Langue[];
}

export const PaireForm: React.FC<PaireFormProps> = ({ 
  ouvert, 
  onFermer, 
  onSauvegarder, 
  langues 
}) => {
  const { addToast } = useToast();
  const [langueSource, setLangueSource] = useState('');
  const [langueCible, setLangueCible] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLangueSource('');
    setLangueCible('');
  }, [ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await referentielService.creerPaireLinguistique({ langueSource, langueCible });
      addToast('Paire linguistique créée', 'success');
      onSauvegarder();
      onFermer();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  const languesDisponibles = langues.length > 0 ? langues : LANGUES_STANDARDS;

  return (
    <Modal titre="Nouvelle paire linguistique" ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        <FormField label="Langue source" required>
          <select
            value={langueSource}
            onChange={e => setLangueSource(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- Sélectionner --</option>
            {languesDisponibles.map(l => (
              <option key={l.code} value={l.code}>{l.nom} ({l.code})</option>
            ))}
          </select>
        </FormField>

        <FormField label="Langue cible" required>
          <select
            value={langueCible}
            onChange={e => setLangueCible(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- Sélectionner --</option>
            {languesDisponibles.filter(l => l.code !== langueSource).map(l => (
              <option key={l.code} value={l.code}>{l.nom} ({l.code})</option>
            ))}
          </select>
        </FormField>

        <p className="text-sm text-gray-500 mt-4">
          💡 Cette paire sera disponible lors de la création de profils traducteurs.
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} disabled={!langueSource || !langueCible}>
            {loading ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
