import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { TraducteurForm } from './TraducteurForm';
// Force rebuild for cache refresh
import { Traducteur } from '../../types';
import { traducteurService } from '../../services/traducteurService';

export const TraducteurManagement: React.FC = () => {
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [traducteurSelectionne, setTraducteurSelectionne] = useState<Traducteur | undefined>();
  const [filtres, setFiltres] = useState({
    recherche: '',
    division: '',
    classification: '',
    domaine: '',
    paire: '',
    actif: 'tous',
  });

  const chargerTraducteurs = async () => {
    setLoading(true);
    try {
      // Charger tous les traducteurs, on filtre côté client pour combiner les filtres
      const data = await traducteurService.obtenirTraducteurs({});
      setTraducteurs(data);
    } catch (err) {
      console.error('Erreur chargement traducteurs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerTraducteurs();
  }, []);

  const traducteursFiltres = traducteurs.filter(t => {
    // Filtre par statut actif
    if (filtres.actif !== 'tous') {
      const actif = filtres.actif === 'actif';
      if (t.actif !== actif) return false;
    }
    
    // Filtre par division
    if (filtres.division && t.division !== filtres.division) {
      return false;
    }
    
    // Filtre par classification
    if (filtres.classification && t.classification !== filtres.classification) {
      return false;
    }
    
    // Filtre par domaine
    if (filtres.domaine && !t.domaines.includes(filtres.domaine)) {
      return false;
    }

    // Filtre par paire linguistique (source ou cible)
    if (filtres.paire) {
      const valeur = filtres.paire.toLowerCase();
      const match = t.pairesLinguistiques?.some(p =>
        p.langueSource.toLowerCase().includes(valeur) ||
        p.langueCible.toLowerCase().includes(valeur)
      );
      if (!match) return false;
    }
    
    // Filtre par recherche textuelle
    if (filtres.recherche) {
      const recherche = filtres.recherche.toLowerCase();
      return (
        t.nom.toLowerCase().includes(recherche) ||
        t.division.toLowerCase().includes(recherche) ||
        t.domaines.some(d => d.toLowerCase().includes(recherche))
      );
    }
    
    return true;
  });

  const divisions = Array.from(new Set(traducteurs.map(t => t.division))).sort();
  const classifications = Array.from(new Set(traducteurs.map(t => t.classification).filter(Boolean))).sort();
  const domaines = Array.from(new Set(traducteurs.flatMap(t => t.domaines))).sort();
  const paires = Array.from(new Set(
    traducteurs.flatMap(t => t.pairesLinguistiques || []).flatMap(p => [p.langueSource, p.langueCible])
  )).sort();

  const handleNouveauTraducteur = () => {
    setTraducteurSelectionne(undefined);
    setModalOuvert(true);
  };

  const handleEditerTraducteur = (traducteur: Traducteur) => {
    setTraducteurSelectionne(traducteur);
    setModalOuvert(true);
  };

  const handleSupprimerTraducteur = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce traducteur ?')) {
      return;
    }
    try {
      await traducteurService.desactiverTraducteur(id);
      await chargerTraducteurs();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const columns = [
    {
      header: 'Nom',
      accessor: 'nom',
      render: (val: string) => (
        <div className="font-medium">{val}</div>
      ),
    },
    {
      header: 'Classification',
      accessor: 'classification',
      render: (val: string) => (
        <Badge variant="default">{val}</Badge>
      ),
    },
    {
      header: 'Division',
      accessor: 'division',
      render: (val: string) => (
        <Badge variant="info">{val}</Badge>
      ),
    },
    {
      header: 'Capacité',
      accessor: 'capaciteHeuresParJour',
      render: (val: number) => `${val}h/jour`,
    },
    {
      header: 'Domaines',
      accessor: 'domaines',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val.slice(0, 3).map((d, i) => (
            <Badge key={i} variant="info">
              {d}
            </Badge>
          ))}
          {val.length > 3 && (
            <Badge variant="default">+{val.length - 3}</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Paires linguistiques',
      accessor: 'pairesLinguistiques',
      render: (val: any[]) => (
        <div className="flex flex-wrap gap-1">
          {val?.map((p, i) => (
            <Badge key={i} variant="default">
              {p.langueSource} → {p.langueCible}
            </Badge>
          ))}
        </div>
      ),
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
      render: (_: string, row: Traducteur) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleEditerTraducteur(row);
            }}
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleSupprimerTraducteur(row.id);
            }}
            className="py-1 px-2 text-xs"
          >
            Désactiver
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des traducteurs</CardTitle>
            <Button variant="primaire" onClick={handleNouveauTraducteur}>
              + Nouveau traducteur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <Input
              placeholder="Rechercher par nom..."
              value={filtres.recherche}
              onChange={e => setFiltres({ ...filtres, recherche: e.target.value })}
            />
            <Select
              value={filtres.division}
              onChange={e => setFiltres({ ...filtres, division: e.target.value })}
            >
              <option value="">Toutes les divisions</option>
              {divisions.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select
              value={filtres.classification}
              onChange={e => setFiltres({ ...filtres, classification: e.target.value })}
            >
              <option value="">Toutes les classifications</option>
              {classifications.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              value={filtres.domaine}
              onChange={e => setFiltres({ ...filtres, domaine: e.target.value })}
            >
              <option value="">Tous les domaines</option>
              {domaines.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select
              value={filtres.paire}
              onChange={e => setFiltres({ ...filtres, paire: e.target.value })}
            >
              <option value="">Toutes les paires</option>
              {paires.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select
              value={filtres.actif}
              onChange={e => setFiltres({ ...filtres, actif: e.target.value })}
            >
              <option value="tous">Tous les statuts</option>
              <option value="actif">Actifs uniquement</option>
              <option value="inactif">Inactifs uniquement</option>
            </Select>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : traducteursFiltres.length === 0 ? (
            <EmptyState 
              icon="👥"
              title="Aucun traducteur trouvé"
              description="Créez votre premier traducteur pour commencer"
              action={{
                label: '+ Créer un traducteur',
                onClick: handleNouveauTraducteur
              }}
            />
          ) : (
            <>
              <div className="mb-2 text-sm text-muted">
                {traducteursFiltres.length} traducteur(s)
              </div>
              <DataTable
                data={traducteursFiltres}
                columns={columns}
                emptyMessage="Aucun traducteur trouvé"
              />
            </>
          )}
        </CardContent>
      </Card>

      <TraducteurForm
        traducteur={traducteurSelectionne}
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        onSauvegarder={chargerTraducteurs}
      />
    </>
  );
};
