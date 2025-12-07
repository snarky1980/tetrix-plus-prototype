import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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
    divisions: [] as string[],
    classifications: [] as string[],
    domaines: [] as string[],
    paires: [] as string[],
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
    
    // Filtre par divisions (OR logic - au moins une division cochée)
    if (filtres.divisions.length > 0 && !filtres.divisions.includes(t.division)) {
      return false;
    }
    
    // Filtre par classifications (OR logic)
    if (filtres.classifications.length > 0 && !filtres.classifications.includes(t.classification)) {
      return false;
    }
    
    // Filtre par domaines (OR logic - au moins un domaine coché)
    if (filtres.domaines.length > 0 && !t.domaines.some(d => filtres.domaines.includes(d))) {
      return false;
    }

    // Filtre par paires linguistiques (OR logic - au moins une paire cochée)
    if (filtres.paires.length > 0) {
      const match = t.pairesLinguistiques?.some(p => 
        filtres.paires.includes(p.langueSource) || filtres.paires.includes(p.langueCible)
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

  const columns = [
    {
      header: 'Nom',
      accessor: 'nom',
      render: (val: string) => (
        <div className="font-medium text-primaire cursor-pointer">{val}</div>
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
      header: 'Domaines',
      accessor: 'domaines',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val.slice(0, 2).map((d, i) => (
            <Badge key={i} variant="info" className="text-xs">
              {d}
            </Badge>
          ))}
          {val.length > 2 && (
            <Badge variant="default" className="text-xs">+{val.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Paires',
      accessor: 'pairesLinguistiques',
      render: (val: any[]) => (
        <div className="flex flex-wrap gap-1">
          {val?.slice(0, 2).map((p, i) => (
            <Badge key={i} variant="default" className="text-xs">
              {p.langueSource}→{p.langueCible}
            </Badge>
          ))}
          {val?.length > 2 && (
            <Badge variant="default" className="text-xs">+{val.length - 2}</Badge>
          )}
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
          <div className="mb-4">
            <Input
              placeholder="Rechercher par nom..."
              value={filtres.recherche}
              onChange={e => setFiltres({ ...filtres, recherche: e.target.value })}
              className="mb-3"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filtre Classifications */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm">Classification</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {classifications.map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filtres.classifications.includes(c)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFiltres({ ...filtres, classifications: [...filtres.classifications, c] });
                          } else {
                            setFiltres({ ...filtres, classifications: filtres.classifications.filter(v => v !== c) });
                          }
                        }}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtre Divisions */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm">Division</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {divisions.map(d => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filtres.divisions.includes(d)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFiltres({ ...filtres, divisions: [...filtres.divisions, d] });
                          } else {
                            setFiltres({ ...filtres, divisions: filtres.divisions.filter(v => v !== d) });
                          }
                        }}
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtre Domaines */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm">Domaines</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {domaines.map(d => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filtres.domaines.includes(d)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFiltres({ ...filtres, domaines: [...filtres.domaines, d] });
                          } else {
                            setFiltres({ ...filtres, domaines: filtres.domaines.filter(v => v !== d) });
                          }
                        }}
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtre Paires linguistiques */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm">Paires linguistiques</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {paires.map(p => (
                    <label key={p} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filtres.paires.includes(p)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFiltres({ ...filtres, paires: [...filtres.paires, p] });
                          } else {
                            setFiltres({ ...filtres, paires: filtres.paires.filter(v => v !== p) });
                          }
                        }}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Bouton réinitialiser */}
            {(filtres.classifications.length > 0 || filtres.divisions.length > 0 || filtres.domaines.length > 0 || filtres.paires.length > 0 || filtres.recherche) && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={() => setFiltres({
                    recherche: '',
                    divisions: [],
                    classifications: [],
                    domaines: [],
                    paires: [],
                    actif: 'tous',
                  })}
                  className="text-sm"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
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
                onRowClick={handleEditerTraducteur}
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
