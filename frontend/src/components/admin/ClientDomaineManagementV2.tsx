import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { InfoTooltip } from '../ui/Tooltip';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { Client, SousDomaine } from '../../types';
import { clientService } from '../../services/clientService';
import { sousDomaineService } from '../../services/sousDomaineService';
import { divisionService, Division } from '../../services/divisionService';
import { referentielService, PaireLangue, Specialisation, Langue } from '../../services/referentielService';

// Formulaires extraits
import {
  ClientForm,
  DomaineForm,
  SousDomaineForm,
  DivisionForm,
  PaireForm,
  SpecialisationForm,
  LangueForm
} from './forms';

type OngletActif = 'divisions' | 'domaines' | 'sous-domaines' | 'specialisations' | 'paires' | 'clients';

interface Statistiques {
  totalClients: number;
  totalDomaines: number;
  totalSousDomaines: number;
  totalSpecialisations: number;
  totalPaires: number;
  totalDivisions: number;
}

interface Domaine {
  id: string;
  nom: string;
  sousDomainesNoms: string[];
  actif: boolean;
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
  const [domaines, setDomaines] = useState<Domaine[]>([]);

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
  const [confirmDelete, setConfirmDelete] = useState<{ 
    isOpen: boolean; 
    type: string; 
    id: string | null; 
    nom: string 
  }>({
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
        statsData
      ] = await Promise.all([
        clientService.obtenirClients(),
        sousDomaineService.obtenirSousDomaines(),
        divisionService.obtenirDivisions(),
        referentielService.obtenirPairesLinguistiques(),
        referentielService.obtenirSpecialisations(),
        referentielService.obtenirLangues(),
        referentielService.obtenirStatistiques()
      ]);

      // Construire les domaines depuis les sous-domaines
      const domainesMap = new Map<string, string[]>();
      sousDomainesData.forEach(sd => {
        const parent = sd.domaineParent || 'Sans catégorie';
        if (!domainesMap.has(parent)) {
          domainesMap.set(parent, []);
        }
        domainesMap.get(parent)!.push(sd.nom);
      });
      const domainesData = Array.from(domainesMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([nom, sousDomainesNoms], i) => ({
          id: `dom-${i + 1}`,
          nom,
          sousDomainesNoms,
          actif: true
        }));

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

  const onglets = [
    { id: 'divisions' as const, label: 'Divisions', icon: '🏛️', count: stats?.totalDivisions },
    { id: 'domaines' as const, label: 'Domaines', icon: '📁', count: stats?.totalDomaines },
    { id: 'sous-domaines' as const, label: 'Sous-domaines', icon: '📄', count: stats?.totalSousDomaines },
    { id: 'specialisations' as const, label: 'Spécialisations', icon: '🎯', count: stats?.totalSpecialisations },
    { id: 'paires' as const, label: 'Paires de langues', icon: '🌐', count: stats?.totalPaires },
    { id: 'clients' as const, label: 'Clients', icon: '🏢', count: stats?.totalClients },
  ];

  // ====== DÉFINITIONS DES COLONNES ======
  
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
          <Button 
            variant="outline" 
            onClick={() => { setClientSelectionne(row); setModalClient(true); }} 
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setConfirmDelete({ isOpen: true, type: 'client', id: row.id, nom: row.nom })} 
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
          <Button 
            variant="outline" 
            onClick={() => { setSousDomaineSelectionne(row); setModalSousDomaine(true); }} 
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setConfirmDelete({ isOpen: true, type: 'sous-domaine', id: row.id, nom: row.nom })} 
            className="py-1 px-2 text-xs"
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

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
          <Button 
            variant="outline" 
            onClick={() => { setDivisionSelectionnee(row); setModalDivision(true); }} 
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setConfirmDelete({ isOpen: true, type: 'division', id: row.id, nom: row.nom })} 
            className="py-1 px-2 text-xs"
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  // ====== RENDU DU CONTENU PAR ONGLET ======
  
  const renderContenu = () => {
    if (loading) {
      return <SkeletonTable />;
    }

    const renderTable = (
      titre: string,
      data: any[],
      columns: any[],
      emptyIcon: string,
      emptyTitle: string,
      emptyDesc: string,
      onNouveau: () => void,
      footer?: React.ReactNode
    ) => (
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-medium">{titre} ({data.length})</span>
          <Button size="sm" onClick={onNouveau}>
            + Nouveau
          </Button>
        </div>
        <div className="p-2">
          {data.length === 0 ? (
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />
          ) : (
            <DataTable data={data} columns={columns} />
          )}
          {footer}
        </div>
      </div>
    );

    switch (ongletActif) {
      case 'clients':
        return renderTable(
          'Clients',
          clients,
          colonnesClients,
          '🏢',
          'Aucun client',
          'Créez votre premier client',
          () => { setClientSelectionne(undefined); setModalClient(true); }
        );

      case 'domaines':
        return renderTable(
          'Domaines',
          domaines,
          colonnesDomaines,
          '📁',
          'Aucun domaine',
          'Les domaines sont créés via les sous-domaines',
          () => { setDomaineSelectionne(undefined); setModalDomaine(true); }
        );

      case 'sous-domaines':
        return renderTable(
          'Sous-domaines',
          sousDomaines,
          colonnesSousDomaines,
          '📄',
          'Aucun sous-domaine',
          'Créez votre premier sous-domaine',
          () => { setSousDomaineSelectionne(undefined); setModalSousDomaine(true); }
        );

      case 'specialisations':
        return renderTable(
          'Spécialisations',
          specialisations,
          colonnesSpecs,
          '🎯',
          'Aucune spécialisation',
          'Définies sur les traducteurs',
          () => setModalSpec(true),
          <p className="text-xs text-gray-400 mt-2 px-2">
            💡 Les spécialisations viennent des profils traducteurs
          </p>
        );

      case 'paires':
        return renderTable(
          'Paires de langues',
          paires,
          colonnesPaires,
          '🌐',
          'Aucune paire',
          'Définies sur les traducteurs',
          () => setModalPaire(true),
          <p className="text-xs text-gray-400 mt-2 px-2">
            💡 Les paires viennent des profils traducteurs
          </p>
        );

      case 'divisions':
        return renderTable(
          'Divisions',
          divisions,
          colonnesDivisions,
          '🏛️',
          'Aucune division',
          'Créez votre première division',
          () => { setDivisionSelectionnee(undefined); setModalDivision(true); }
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

      {/* ====== MODALS (importés des forms/) ====== */}
      
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
        sousDomaines={sousDomaines}
      />

      <SousDomaineForm
        sousDomaine={sousDomaineSelectionne}
        ouvert={modalSousDomaine}
        onFermer={() => setModalSousDomaine(false)}
        onSauvegarder={chargerDonnees}
        domaines={domaines}
      />

      <DivisionForm
        division={divisionSelectionnee}
        ouvert={modalDivision}
        onFermer={() => setModalDivision(false)}
        onSauvegarder={chargerDonnees}
      />

      <PaireForm
        ouvert={modalPaire}
        onFermer={() => setModalPaire(false)}
        onSauvegarder={chargerDonnees}
        langues={langues}
      />

      <SpecialisationForm
        ouvert={modalSpec}
        onFermer={() => setModalSpec(false)}
        onSauvegarder={chargerDonnees}
      />

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
