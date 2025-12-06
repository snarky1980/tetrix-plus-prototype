import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/Spinner';
import { TraducteurForm } from './TraducteurForm';
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
    actif: 'tous',
  });

  const chargerTraducteurs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filtres.actif !== 'tous') {
        params.actif = filtres.actif === 'actif';
      }
      if (filtres.division) {
        params.division = filtres.division;
      }
      const data = await traducteurService.obtenirTraducteurs(params);
      setTraducteurs(data);
    } catch (err) {
      console.error('Erreur chargement traducteurs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerTraducteurs();
  }, [filtres.division, filtres.actif]);

  const traducteursFiltres = traducteurs.filter(t => {
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
      render: (val: string, row: Traducteur) => (
        <div>
          <div className="font-medium">{val}</div>
          <div className="text-xs text-muted">{row.division}</div>
        </div>
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
      header: 'Paires',
      accessor: 'pairesLinguistiques',
      render: (val: any[]) => `${val?.length || 0} paire(s)`,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Rechercher par nom, division, domaine..."
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
              value={filtres.actif}
              onChange={e => setFiltres({ ...filtres, actif: e.target.value })}
            >
              <option value="tous">Tous les statuts</option>
              <option value="actif">Actifs uniquement</option>
              <option value="inactif">Inactifs uniquement</option>
            </Select>
          </div>

          {loading ? (
            <LoadingSpinner message="Chargement des traducteurs..." />
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
