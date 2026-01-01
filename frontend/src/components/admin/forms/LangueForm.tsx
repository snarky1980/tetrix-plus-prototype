import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { referentielService } from '../../../services/referentielService';

interface LangueFormProps {
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}

export const LangueForm: React.FC<LangueFormProps> = ({ 
  ouvert, 
  onFermer, 
  onSauvegarder 
}) => {
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [nativeName, setNativeName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCode('');
    setNom('');
    setNativeName('');
  }, [ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await referentielService.creerLangue({ code: code.toUpperCase(), nom, nativeName });
      addToast('Langue créée', 'success');
      onSauvegarder();
      onFermer();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titre="Nouvelle langue" ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        <FormField label="Code ISO" required helper="Code à 2 lettres (ex: FR, EN, ES)">
          <Input 
            value={code} 
            onChange={e => setCode(e.target.value.toUpperCase())} 
            required 
            placeholder="FR" 
            maxLength={3}
          />
        </FormField>

        <FormField label="Nom en français" required>
          <Input 
            value={nom} 
            onChange={e => setNom(e.target.value)} 
            required 
            placeholder="Français" 
          />
        </FormField>

        <FormField label="Nom natif">
          <Input 
            value={nativeName} 
            onChange={e => setNativeName(e.target.value)} 
            placeholder="Français" 
          />
        </FormField>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} disabled={!code || !nom}>
            {loading ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
