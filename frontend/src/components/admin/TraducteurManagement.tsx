import { TraducteurForm } from './TraducteurForm';
import { Traducteur } from '../../types';
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { InfoTooltip } from '../ui/Tooltip';
import { traducteurService } from '../../services/traducteurService';

// Composant FilterDropdown réutilisable
interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, options, selected, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors
          ${selected.length > 0 
            ? 'bg-primaire text-white border-primaire' 
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-white/20 text-xs px-1.5 rounded">{selected.length}</span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">Aucune option</div>
          ) : (
            <div className="p-2">
              {options.map(option => (
                <label 
                  key={option} 
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => onToggle(option)}
                    className="rounded border-gray-300 text-primaire focus:ring-primaire"
                  />
                  <span className="truncate">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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

  // Générer la liste des paires linguistiques comme couples uniques (ex: EN → FR)
  const paires = Array.from(
    new Set(
      traducteurs
        .flatMap(t => t.pairesLinguistiques || [])
        .map(p => `${p.langueSource} → ${p.langueCible}`)
    )
  ).sort();

  const traducteursFiltres = traducteurs.filter(t => {
    // Filtre par statut actif
    if (filtres.actif !== 'tous') {
      const actif = filtres.actif === 'actif';
      if (t.actif !== actif) return false;
    }
    
    // Filtre par divisions (OR logic - au moins une division en commun)
    if (filtres.divisions.length > 0 && !t.divisions?.some(d => filtres.divisions.includes(d))) {
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

    // Filtre par paires linguistiques (OR logic - au moins une paire complète cochée)
    if (filtres.paires.length > 0) {
      const match = t.pairesLinguistiques?.some(p => 
        filtres.paires.includes(`${p.langueSource} → ${p.langueCible}`)
      );
      if (!match) return false;
    }
    
    // Filtre par recherche textuelle
    if (filtres.recherche) {
      const recherche = filtres.recherche.toLowerCase();
      return (
        t.nom.toLowerCase().includes(recherche) ||
        t.divisions?.some(d => d.toLowerCase().includes(recherche)) ||
        t.domaines.some(d => d.toLowerCase().includes(recherche))
      );
    }
    
    return true;
  });

  const divisions = Array.from(new Set(traducteurs.flatMap(t => t.divisions || []))).sort();
  const classifications = Array.from(new Set(traducteurs.map(t => t.classification).filter(Boolean))).sort();
  const domaines = Array.from(new Set(traducteurs.flatMap(t => t.domaines))).sort();

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
      header: 'Divisions',
      accessor: 'divisions',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val?.slice(0, 2).map((d, i) => (
            <Badge key={i} variant="info" className="text-xs">{d}</Badge>
          ))}
          {val?.length > 2 && (
            <Badge variant="default" className="text-xs">+{val.length - 2}</Badge>
          )}
        </div>
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
            <div className="flex items-center gap-2">
              <CardTitle>Gestion des traducteurs</CardTitle>
              <InfoTooltip 
                content="Gérez les profils des traducteurs : compétences linguistiques, domaines d'expertise, divisions assignées et disponibilités."
                size="md"
              />
            </div>
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
            
            {/* Filtres compacts en ligne */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                Filtres
                <InfoTooltip 
                  content="Utilisez ces filtres pour trouver rapidement un traducteur. Sélectionnez plusieurs valeurs pour un filtre combiné (OU logique)."
                  size="sm"
                />
              </span>
              <FilterDropdown
                label="Classification"
                options={classifications}
                selected={filtres.classifications}
                onToggle={(c) => {
                  if (filtres.classifications.includes(c)) {
                    setFiltres({ ...filtres, classifications: filtres.classifications.filter(v => v !== c) });
                  } else {
                    setFiltres({ ...filtres, classifications: [...filtres.classifications, c] });
                  }
                }}
              />
              
              <FilterDropdown
                label="Division"
                options={divisions}
                selected={filtres.divisions}
                onToggle={(d) => {
                  if (filtres.divisions.includes(d)) {
                    setFiltres({ ...filtres, divisions: filtres.divisions.filter(v => v !== d) });
                  } else {
                    setFiltres({ ...filtres, divisions: [...filtres.divisions, d] });
                  }
                }}
              />
              
              <FilterDropdown
                label="Domaines"
                options={domaines}
                selected={filtres.domaines}
                onToggle={(d) => {
                  if (filtres.domaines.includes(d)) {
                    setFiltres({ ...filtres, domaines: filtres.domaines.filter(v => v !== d) });
                  } else {
                    setFiltres({ ...filtres, domaines: [...filtres.domaines, d] });
                  }
                }}
              />
              
              <FilterDropdown
                label="Paires linguistiques"
                options={paires}
                selected={filtres.paires}
                onToggle={(p) => {
                  if (filtres.paires.includes(p)) {
                    setFiltres({ ...filtres, paires: filtres.paires.filter(v => v !== p) });
                  } else {
                    setFiltres({ ...filtres, paires: [...filtres.paires, p] });
                  }
                }}
              />
              
              {/* Bouton réinitialiser inline */}
              {(filtres.classifications.length > 0 || filtres.divisions.length > 0 || filtres.domaines.length > 0 || filtres.paires.length > 0) && (
                <button
                  onClick={() => setFiltres({
                    ...filtres,
                    divisions: [],
                    classifications: [],
                    domaines: [],
                    paires: [],
                  })}
                  className="text-sm text-gray-500 hover:text-red-600 underline"
                >
                  Effacer filtres
                </button>
              )}
            </div>
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
