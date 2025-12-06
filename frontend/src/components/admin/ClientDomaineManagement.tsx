import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/Spinner';
import { Client, SousDomaine } from '../../types';
import { clientService } from '../../services/clientService';
import { sousDomaineService } from '../../services/sousDomaineService';

export const ClientDomaineManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sousDomaines, setSousDomaines] = useState<SousDomaine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalClient, setModalClient] = useState(false);
  const [modalDomaine, setModalDomaine] = useState(false);
  const [clientSelectionne, setClientSelectionne] = useState<Client | undefined>();
  const [domaineSelectionne, setDomaineSelectionne] = useState<SousDomaine | undefined>();

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [clientsData, domainesData] = await Promise.all([
        clientService.obtenirClients(),
        sousDomaineService.obtenirSousDomaines(),
      ]);
      setClients(clientsData);
      setSousDomaines(domainesData);
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const handleNouveauClient = () => {
    setClientSelectionne(undefined);
    setModalClient(true);
  };

  const handleEditerClient = (client: Client) => {
    setClientSelectionne(client);
    setModalClient(true);
  };

  const handleSupprimerClient = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    try {
      await clientService.supprimerClient(id);
      await chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleNouveauDomaine = () => {
    setDomaineSelectionne(undefined);
    setModalDomaine(true);
  };

  const handleEditerDomaine = (domaine: SousDomaine) => {
    setDomaineSelectionne(domaine);
    setModalDomaine(true);
  };

  const handleSupprimerDomaine = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) return;
    try {
      await sousDomaineService.supprimerSousDomaine(id);
      await chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const colonnesClients = [
    { header: 'Nom', accessor: 'nom' },
    {
      header: 'Sous-domaines',
      accessor: 'sousDomaines',
      render: (val: string[]) => `${val?.length || 0} sous-domaine(s)`,
    },
    {
      header: 'Statut',
      accessor: 'actif',
      render: (val: boolean) => (
        <Badge variant={val ? 'success' : 'default'}>
          {val ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: Client) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleEditerClient(row);
            }}
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleSupprimerClient(row.id);
            }}
            className="py-1 px-2 text-xs"
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const colonnesDomaines = [
    { header: 'Nom', accessor: 'nom' },
    {
      header: 'Domaine parent',
      accessor: 'domaineParent',
      render: (val: string | undefined) => val || '-',
    },
    {
      header: 'Statut',
      accessor: 'actif',
      render: (val: boolean) => (
        <Badge variant={val ? 'success' : 'default'}>
          {val ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: SousDomaine) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleEditerDomaine(row);
            }}
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleSupprimerDomaine(row.id);
            }}
            className="py-1 px-2 text-xs"
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Clients</CardTitle>
              <Button variant="primaire" onClick={handleNouveauClient}>
                + Nouveau client
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={clients}
              columns={colonnesClients}
              emptyMessage="Aucun client"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Domaines & Sous-domaines</CardTitle>
              <Button variant="primaire" onClick={handleNouveauDomaine}>
                + Nouveau domaine
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={sousDomaines}
              columns={colonnesDomaines}
              emptyMessage="Aucun domaine"
            />
          </CardContent>
        </Card>
      </div>

      <ClientForm
        client={clientSelectionne}
        ouvert={modalClient}
        onFermer={() => setModalClient(false)}
        onSauvegarder={chargerDonnees}
      />

      <DomaineForm
        domaine={domaineSelectionne}
        ouvert={modalDomaine}
        onFermer={() => setModalDomaine(false)}
        onSauvegarder={chargerDonnees}
      />
    </>
  );
};

// Formulaire Client
const ClientForm: React.FC<{
  client?: Client;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ client, ouvert, onFermer, onSauvegarder }) => {
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
      } else {
        await clientService.creerClient({ nom });
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
      titre={client ? 'Modifier client' : 'Nouveau client'}
      ouvert={ouvert}
      onFermer={onFermer}
    >
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

// Formulaire Domaine
const DomaineForm: React.FC<{
  domaine?: SousDomaine;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ domaine, ouvert, onFermer, onSauvegarder }) => {
  const [nom, setNom] = useState('');
  const [domaineParent, setDomaineParent] = useState('');
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (domaine) {
      setNom(domaine.nom);
      setDomaineParent(domaine.domaineParent || '');
      setActif(domaine.actif);
    } else {
      setNom('');
      setDomaineParent('');
      setActif(true);
    }
    setErreur('');
  }, [domaine, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    try {
      if (domaine) {
        await sousDomaineService.mettreAJourSousDomaine(domaine.id, {
          nom,
          domaineParent: domaineParent || undefined,
          actif,
        });
      } else {
        await sousDomaineService.creerSousDomaine({
          nom,
          domaineParent: domaineParent || undefined,
        });
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
      titre={domaine ? 'Modifier domaine' : 'Nouveau domaine'}
      ouvert={ouvert}
      onFermer={onFermer}
    >
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        <FormField label="Nom du domaine" required>
          <Input
            value={nom}
            onChange={e => setNom(e.target.value)}
            required
            placeholder="Juridique, Médical, Technique..."
          />
        </FormField>

        <FormField label="Domaine parent (optionnel)">
          <Input
            value={domaineParent}
            onChange={e => setDomaineParent(e.target.value)}
            placeholder="Laisser vide si domaine principal"
          />
        </FormField>

        {domaine && (
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
