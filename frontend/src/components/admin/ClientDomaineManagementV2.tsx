import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FormField } from '../ui/FormField';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { InfoTooltip } from '../ui/Tooltip';
import { useToast } from '../../contexts/ToastContext';
import { Client, SousDomaine } from '../../types';
import { clientService } from '../../services/clientService';
import { sousDomaineService } from '../../services/sousDomaineService';
import { divisionService, Division } from '../../services/divisionService';
import { referentielService, PaireLangue, Specialisation, Langue, LANGUES_STANDARDS } from '../../services/referentielService';

type OngletActif = 'divisions' | 'domaines' | 'sous-domaines' | 'specialisations' | 'paires' | 'clients';

interface Statistiques {
  totalClients: number;
  totalDomaines: number;
  totalSousDomaines: number;
  totalSpecialisations: number;
  totalPaires: number;
  totalDivisions: number;
}

export const ClientDomaineManagement: React.FC = () => {
  const { addToast } = useToast();
  const [ongletActif, setOngletActif] = useState<OngletActif>('divisions');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Statistiques | null>(null);
  
  // Données
  const [clients, setClients] = useState<Client[]>([]);
  const [sousDomaines, setSousDomaines] = useState<SousDomaine[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [paires, setPaires] = useState<PaireLangue[]>([]);
  const [specialisations, setSpecialisations] = useState<Specialisation[]>([]);
  const [langues, setLangues] = useState<Langue[]>([]);
  const [domaines, setDomaines] = useState<{ id: string; nom: string; sousDomainesNoms: string[]; actif: boolean }[]>([]);

  // Modals
  const [modalClient, setModalClient] = useState(false);
  const [modalDomaine, setModalDomaine] = useState(false);
  const [modalSousDomaine, setModalSousDomaine] = useState(false);
  const [modalDivision, setModalDivision] = useState(false);
  const [modalPaire, setModalPaire] = useState(false);
  const [modalSpec, setModalSpec] = useState(false);
  const [modalLangue, setModalLangue] = useState(false);

  // Sélection pour édition
  const [clientSelectionne, setClientSelectionne] = useState<Client | undefined>();
  const [domaineSelectionne, setDomaineSelectionne] = useState<{ id: string; nom: string } | undefined>();
  const [sousDomaineSelectionne, setSousDomaineSelectionne] = useState<SousDomaine | undefined>();
  const [divisionSelectionnee, setDivisionSelectionnee] = useState<Division | undefined>();

  // Confirmation suppression
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; type: string; id: string | null; nom: string }>({
    isOpen: false,
    type: '',
    id: null,
    nom: ''
  });

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [
        clientsData,
        sousDomainesData,
        divisionsData,
        pairesData,
        specsData,
        languesData,
        domainesData,
        statsData
      ] = await Promise.all([
        clientService.obtenirClients(),
        sousDomaineService.obtenirSousDomaines(),
        divisionService.obtenirDivisions(),
        referentielService.obtenirPairesLinguistiques(),
        referentielService.obtenirSpecialisations(),
        referentielService.obtenirLangues(),
        referentielService.obtenirPairesLinguistiques().then(() => 
          // Charger les domaines depuis les sous-domaines
          sousDomaineService.obtenirSousDomaines().then(sds => {
            const domainesMap = new Map<string, string[]>();
            sds.forEach(sd => {
              const parent = sd.domaineParent || 'Sans catégorie';
              if (!domainesMap.has(parent)) {
                domainesMap.set(parent, []);
              }
              domainesMap.get(parent)!.push(sd.nom);
            });
            return Array.from(domainesMap.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([nom, sousDomainesNoms], i) => ({
                id: `dom-${i + 1}`,
                nom,
                sousDomainesNoms,
                actif: true
              }));
          })
        ),
        referentielService.obtenirStatistiques()
      ]);

      setClients(clientsData);
      setSousDomaines(sousDomainesData);
      setDivisions(divisionsData);
      setPaires(pairesData);
      setSpecialisations(specsData);
      setLangues(languesData);
      setDomaines(domainesData);
      setStats(statsData);
    } catch (err) {
      console.error('Erreur chargement:', err);
      addToast('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const onglets = [
    { id: 'divisions' as const, label: 'Divisions', icon: '🏛️', count: stats?.totalDivisions },
    { id: 'domaines' as const, label: 'Domaines', icon: '📁', count: stats?.totalDomaines },
    { id: 'sous-domaines' as const, label: 'Sous-domaines', icon: '📄', count: stats?.totalSousDomaines },
    { id: 'specialisations' as const, label: 'Spécialisations', icon: '🎯', count: stats?.totalSpecialisations },
    { id: 'paires' as const, label: 'Paires de langues', icon: '🌐', count: stats?.totalPaires },
    { id: 'clients' as const, label: 'Clients', icon: '🏢', count: stats?.totalClients },
  ];

  const handleSupprimer = async () => {
    if (!confirmDelete.id) return;

    try {
      switch (confirmDelete.type) {
        case 'client':
          await clientService.supprimerClient(confirmDelete.id);
          break;
        case 'sous-domaine':
          await sousDomaineService.supprimerSousDomaine(confirmDelete.id);
          break;
        case 'division':
          await divisionService.supprimerDivision(confirmDelete.id);
          break;
      }
      await chargerDonnees();
      addToast(`${confirmDelete.nom} supprimé avec succès`, 'success');
    } catch (err) {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, type: '', id: null, nom: '' });
    }
  };

  // ====== COLONNES CLIENTS ======
  const colonnesClients = [
    { header: 'Nom', accessor: 'nom' },
    {
      header: 'Sous-domaines',
      accessor: 'sousDomaines',
      render: (val: string[]) => (
        val && val.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {val.map((sd, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{sd}</span>
            ))}
          </div>
        ) : <span className="text-gray-400 text-xs">-</span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'actif',
      render: (val: boolean) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Actif' : 'Inactif'}</Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: Client) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setClientSelectionne(row); setModalClient(true); }} className="py-1 px-2 text-xs">
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete({ isOpen: true, type: 'client', id: row.id, nom: row.nom })} className="py-1 px-2 text-xs">
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  // ====== COLONNES DOMAINES ======
  const colonnesDomaines = [
    { header: 'Nom', accessor: 'nom' },
    {
      header: 'Sous-domaines',
      accessor: 'sousDomainesNoms',
      render: (val: string[]) => (
        val && val.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {val.map((sd, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{sd}</span>
            ))}
          </div>
        ) : <span className="text-gray-400 text-xs">-</span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'actif',
      render: (val: boolean) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Actif' : 'Inactif'}</Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: { id: string; nom: string }) => (
        <Button 
          variant="outline" 
          onClick={() => { setDomaineSelectionne(row); setModalDomaine(true); }} 
          className="py-1 px-2 text-xs"
        >
          Modifier
        </Button>
      ),
    },
  ];

  // ====== COLONNES SOUS-DOMAINES ======
  const colonnesSousDomaines = [
    { header: 'Nom', accessor: 'nom' },
    {
      header: 'Domaine parent',
      accessor: 'domaineParent',
      render: (val: string | undefined) => val || <span className="text-gray-400">-</span>,
    },
    {
      header: 'Statut',
      accessor: 'actif',
      render: (val: boolean) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Actif' : 'Inactif'}</Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: SousDomaine) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSousDomaineSelectionne(row); setModalSousDomaine(true); }} className="py-1 px-2 text-xs">
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete({ isOpen: true, type: 'sous-domaine', id: row.id, nom: row.nom })} className="py-1 px-2 text-xs">
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  // ====== COLONNES SPÉCIALISATIONS ======
  const colonnesSpecs = [
    { header: 'Nom', accessor: 'nom' },
    {
      header: 'Utilisée par',
      accessor: 'utilisationCount',
      render: (val: number) => (
        <span className="text-xs text-gray-600">{val} traducteur{val > 1 ? 's' : ''}</span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'actif',
      render: (val: boolean) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Active' : 'Inactive'}</Badge>
      ),
    },
  ];

  // ====== COLONNES PAIRES LINGUISTIQUES ======
  const colonnesPaires = [
    {
      header: 'Paire',
      accessor: 'id',
      render: (_: string, row: PaireLangue) => (
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium">{row.langueSource}</span>
          <span className="text-gray-400">→</span>
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{row.langueCible}</span>
        </div>
      ),
    },
    {
      header: 'Utilisée par',
      accessor: 'utilisationCount',
      render: (val: number) => (
        <span className="text-xs text-gray-600">{val} traducteur{val > 1 ? 's' : ''}</span>
      ),
    },
  ];

  // ====== COLONNES DIVISIONS ======
  const colonnesDivisions = [
    { header: 'Nom', accessor: 'nom' },
    { header: 'Code', accessor: 'code' },
    {
      header: 'Description',
      accessor: 'description',
      render: (val: string | undefined) => val || <span className="text-gray-400">-</span>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: Division) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setDivisionSelectionnee(row); setModalDivision(true); }} className="py-1 px-2 text-xs">
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete({ isOpen: true, type: 'division', id: row.id, nom: row.nom })} className="py-1 px-2 text-xs">
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const renderContenu = () => {
    if (loading) {
      return <SkeletonTable />;
    }

    switch (ongletActif) {
      case 'clients':
        return (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Clients ({clients.length})</span>
              <Button size="sm" onClick={() => { setClientSelectionne(undefined); setModalClient(true); }}>
                + Nouveau
              </Button>
            </div>
            <div className="p-2">
              {clients.length === 0 ? (
                <EmptyState icon="🏢" title="Aucun client" description="Créez votre premier client" />
              ) : (
                <DataTable data={clients} columns={colonnesClients} />
              )}
            </div>
          </div>
        );

      case 'domaines':
        return (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Domaines ({domaines.length})</span>
              <Button size="sm" onClick={() => { setDomaineSelectionne(undefined); setModalDomaine(true); }}>
                + Nouveau
              </Button>
            </div>
            <div className="p-2">
              {domaines.length === 0 ? (
                <EmptyState icon="📁" title="Aucun domaine" description="Les domaines sont créés via les sous-domaines" />
              ) : (
                <DataTable data={domaines} columns={colonnesDomaines} />
              )}
            </div>
          </div>
        );

      case 'sous-domaines':
        return (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Sous-domaines ({sousDomaines.length})</span>
              <Button size="sm" onClick={() => { setSousDomaineSelectionne(undefined); setModalSousDomaine(true); }}>
                + Nouveau
              </Button>
            </div>
            <div className="p-2">
              {sousDomaines.length === 0 ? (
                <EmptyState icon="📄" title="Aucun sous-domaine" description="Créez votre premier sous-domaine" />
              ) : (
                <DataTable data={sousDomaines} columns={colonnesSousDomaines} />
              )}
            </div>
          </div>
        );

      case 'specialisations':
        return (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Spécialisations ({specialisations.length})</span>
              <Button size="sm" onClick={() => setModalSpec(true)}>
                + Nouveau
              </Button>
            </div>
            <div className="p-2">
              {specialisations.length === 0 ? (
                <EmptyState icon="🎯" title="Aucune spécialisation" description="Définies sur les traducteurs" />
              ) : (
                <DataTable data={specialisations} columns={colonnesSpecs} />
              )}
              <p className="text-xs text-gray-400 mt-2 px-2">
                💡 Les spécialisations viennent des profils traducteurs
              </p>
            </div>
          </div>
        );

      case 'paires':
        return (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Paires de langues ({paires.length})</span>
              <Button size="sm" onClick={() => setModalPaire(true)}>
                + Nouveau
              </Button>
            </div>
            <div className="p-2">
              {paires.length === 0 ? (
                <EmptyState icon="🌐" title="Aucune paire" description="Définies sur les traducteurs" />
              ) : (
                <DataTable data={paires} columns={colonnesPaires} />
              )}
              <p className="text-xs text-gray-400 mt-2 px-2">
                💡 Les paires viennent des profils traducteurs
              </p>
            </div>
          </div>
        );

      case 'divisions':
        return (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Divisions ({divisions.length})</span>
              <Button size="sm" onClick={() => { setDivisionSelectionnee(undefined); setModalDivision(true); }}>
                + Nouveau
              </Button>
            </div>
            <div className="p-2">
              {divisions.length === 0 ? (
                <EmptyState icon="🏛️" title="Aucune division" description="Créez votre première division" />
              ) : (
                <DataTable data={divisions} columns={colonnesDivisions} />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Navigation compacte avec stats intégrées */}
      <div className="flex flex-wrap items-center gap-1 mb-3 pb-2 border-b">
        <span className="text-xs text-gray-500 flex items-center gap-1 mr-2">
          Référentiel
          <InfoTooltip 
            content="Données de base utilisées dans tout le système : clients, domaines, divisions, langues. Modifications réservées aux administrateurs."
            size="sm"
          />
        </span>
        {onglets.map(({ id, label, icon, count }) => (
          <button
            key={id}
            onClick={() => setOngletActif(id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
              ongletActif === id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                ongletActif === id ? 'bg-blue-500' : 'bg-gray-200'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet actif */}
      {renderContenu()}

      {/* ====== MODALS ====== */}
      
      {/* Modal Client */}
      <ClientForm
        client={clientSelectionne}
        ouvert={modalClient}
        onFermer={() => setModalClient(false)}
        onSauvegarder={chargerDonnees}
      />

      {/* Modal Domaine */}
      <DomaineForm
        domaine={domaineSelectionne}
        ouvert={modalDomaine}
        onFermer={() => setModalDomaine(false)}
        onSauvegarder={chargerDonnees}
        sousDomaines={sousDomaines}
      />

      {/* Modal Sous-Domaine */}
      <SousDomaineForm
        sousDomaine={sousDomaineSelectionne}
        ouvert={modalSousDomaine}
        onFermer={() => setModalSousDomaine(false)}
        onSauvegarder={chargerDonnees}
        domaines={domaines}
      />

      {/* Modal Division */}
      <DivisionForm
        division={divisionSelectionnee}
        ouvert={modalDivision}
        onFermer={() => setModalDivision(false)}
        onSauvegarder={chargerDonnees}
      />

      {/* Modal Paire Linguistique */}
      <PaireForm
        ouvert={modalPaire}
        onFermer={() => setModalPaire(false)}
        onSauvegarder={chargerDonnees}
        langues={langues}
      />

      {/* Modal Spécialisation */}
      <SpecialisationForm
        ouvert={modalSpec}
        onFermer={() => setModalSpec(false)}
        onSauvegarder={chargerDonnees}
      />

      {/* Modal Langue */}
      <LangueForm
        ouvert={modalLangue}
        onFermer={() => setModalLangue(false)}
        onSauvegarder={chargerDonnees}
      />

      {/* Dialogue de confirmation suppression */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, type: '', id: null, nom: '' })}
        onConfirm={handleSupprimer}
        title={`Supprimer ${confirmDelete.type}`}
        message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete.nom}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </>
  );
};

// ====== FORMULAIRES ======

// Formulaire Client
const ClientForm: React.FC<{
  client?: Client;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ client, ouvert, onFermer, onSauvegarder }) => {
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
        {erreur && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erreur}</div>}
        
        <FormField label="Nom du client" required>
          <Input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Nom du client" />
        </FormField>

        {client && (
          <FormField label="Statut">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={actif} onChange={e => setActif(e.target.checked)} />
              <span className="text-sm">Actif</span>
            </label>
          </FormField>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// Formulaire Domaine
const DomaineForm: React.FC<{
  domaine?: { id: string; nom: string };
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
  sousDomaines: SousDomaine[];
}> = ({ domaine, ouvert, onFermer, onSauvegarder, sousDomaines }) => {
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
        <FormField label="Nom du domaine" required helper="Les domaines regroupent plusieurs sous-domaines">
          <Input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Juridique, Technique..." />
        </FormField>

        {!domaine && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded mt-4">
            💡 Pour créer un nouveau domaine, ajoutez un sous-domaine avec ce domaine comme parent.
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!domaine}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// Formulaire Sous-Domaine
const SousDomaineForm: React.FC<{
  sousDomaine?: SousDomaine;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
  domaines: { nom: string }[];
}> = ({ sousDomaine, ouvert, onFermer, onSauvegarder, domaines }) => {
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
        await sousDomaineService.mettreAJourSousDomaine(sousDomaine.id, { nom, domaineParent: parentFinal, actif });
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
    <Modal titre={sousDomaine ? 'Modifier sous-domaine' : 'Nouveau sous-domaine'} ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        {erreur && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erreur}</div>}

        <FormField label="Nom du sous-domaine" required>
          <Input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Immigration, Brevets..." />
        </FormField>

        <FormField label="Domaine parent" helper="Sélectionnez un domaine existant ou créez-en un nouveau">
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
            onChange={e => { setNouveauDomaine(e.target.value); setDomaineParent(''); }} 
            placeholder="Nouveau domaine..." 
          />
        </FormField>

        {sousDomaine && (
          <FormField label="Statut">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={actif} onChange={e => setActif(e.target.checked)} />
              <span className="text-sm">Actif</span>
            </label>
          </FormField>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// Formulaire Division
const DivisionForm: React.FC<{
  division?: Division;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ division, ouvert, onFermer, onSauvegarder }) => {
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
        await divisionService.mettreAJourDivision(division.id, { nom, description });
        addToast('Division modifiée avec succès', 'success');
      } else {
        await divisionService.creerDivision({ nom, description });
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
    <Modal titre={division ? 'Modifier division' : 'Nouvelle division'} ouvert={ouvert} onFermer={onFermer}>
      <form onSubmit={handleSubmit}>
        {erreur && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erreur}</div>}

        <FormField label="Nom de la division" required>
          <Input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Droit, CISR, Science..." />
        </FormField>

        <FormField label="Code" helper="Code court auto-généré">
          <Input value={code} onChange={e => setCode(e.target.value)} placeholder="DROIT" disabled={!!division} />
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
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// Formulaire Paire Linguistique
const PaireForm: React.FC<{
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
  langues: Langue[];
}> = ({ ouvert, onFermer, onSauvegarder, langues }) => {
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
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!langueSource || !langueCible}>
            {loading ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Formulaire Spécialisation
const SpecialisationForm: React.FC<{
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ ouvert, onFermer, onSauvegarder }) => {
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
          <Input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Immigration, Brevets..." />
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
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!nom}>{loading ? 'Création...' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// Formulaire Langue
const LangueForm: React.FC<{
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ ouvert, onFermer, onSauvegarder }) => {
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
          <Input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Français" />
        </FormField>

        <FormField label="Nom natif">
          <Input value={nativeName} onChange={e => setNativeName(e.target.value)} placeholder="Français" />
        </FormField>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!code || !nom}>{loading ? 'Création...' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  );
};
