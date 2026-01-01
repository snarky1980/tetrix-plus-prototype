import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { FormField } from '../../ui/FormField';
import { useToast } from '../../../contexts/ToastContext';
import { Client } from '../../../types';
import { clientService } from '../../../services/clientService';

interface ClientFormProps {
  client?: Client;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ 
  client, 
  ouvert, 
  onFermer, 
  onSauvegarder 
}) => {
  const { addToast } = useToast();
  const [nom, setNom] = useState('');
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (client) {
      setNom(client.nom);
      setActif(client.actif);
    } else {
      setNom('');
      setActif(true);
    }
    setErreur('');
  }, [client, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    try {
      if (client) {
        await clientService.mettreAJourClient(client.id, { nom, actif });
        addToast('Client modifié avec succès', 'success');
      } else {
        await clientService.creerClient({ nom });
        addToast('Client créé avec succès', 'success');
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
    <Modal titre={client ? 'Modifier client' : 'Nouveau client'} ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}
        
        <FormField label="Nom du client" required>
          <Input 
            value={nom} 
            onChange={e => setNom(e.target.value)} 
            required 
            placeholder="Nom du client" 
          />
        </FormField>

        {client && (
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
