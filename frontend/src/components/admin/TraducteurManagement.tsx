import { TraducteurFormV2 as TraducteurForm } from './TraducteurFormV2';
import { Traducteur, CategorieTraducteur } from '../../types';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { InfoTooltip } from '../ui/Tooltip';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { traducteurService } from '../../services/traducteurService';
import { exporterTraducteurs } from '../../utils/exportUtils';

// Labels pour les catégories
const CATEGORIE_LABELS: Record<CategorieTraducteur, { label: string; color: string; tooltip: string }> = {
  'TR01': { label: 'TR-01', color: 'bg-emerald-100 text-emerald-800', tooltip: 'Traducteur junior – travail à réviser' },
  'TR02': { label: 'TR-02', color: 'bg-amber-100 text-amber-800', tooltip: 'Traducteur intermédiaire' },
  'TR03': { label: 'TR-03', color: 'bg-sky-100 text-sky-800', tooltip: 'Traducteur conseiller – réviseur' },
};

export const TraducteurManagement: React.FC = () => {
  const navigate = useNavigate();
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [traducteurSelectionne, setTraducteurSelectionne] = useState<Traducteur | undefined>();
  const [filtres, setFiltres] = useState({
    recherche: '',
    divisions: [] as string[],
    categories: [] as string[],
    domaines: [] as string[],
    specialisations: [] as string[],
    clients: [] as string[],
    paires: [] as string[],
    actif: 'tous' as 'tous' | 'actif' | 'inactif',
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
    
    // Filtre par catégories (OR logic)
    if (filtres.categories.length > 0 && (!t.categorie || !filtres.categories.includes(t.categorie))) {
      return false;
    }
    
    // Filtre par domaines (OR logic - au moins un domaine coché)
    if (filtres.domaines.length > 0 && !t.domaines.some(d => filtres.domaines.includes(d))) {
      return false;
    }

    // Filtre par spécialisations (OR logic)
    if (filtres.specialisations.length > 0 && !t.specialisations?.some(s => filtres.specialisations.includes(s))) {
      return false;
    }

    // Filtre par clients habituels (OR logic)
    if (filtres.clients.length > 0 && !t.clientsHabituels?.some(c => filtres.clients.includes(c))) {
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
        t.utilisateur?.email?.toLowerCase().includes(recherche) ||
        t.divisions?.some(d => d.toLowerCase().includes(recherche)) ||
        t.domaines.some(d => d.toLowerCase().includes(recherche)) ||
        t.specialisations?.some(s => s.toLowerCase().includes(recherche)) ||
        t.clientsHabituels?.some(c => c.toLowerCase().includes(recherche))
      );
    }
    
    return true;
  });

  const divisions = Array.from(new Set(traducteurs.flatMap(t => t.divisions || []))).sort();
  const domaines = Array.from(new Set(traducteurs.flatMap(t => t.domaines))).sort();
  const specialisations = Array.from(new Set(traducteurs.flatMap(t => t.specialisations || []))).sort();
  const clientsHabituels = Array.from(new Set(traducteurs.flatMap(t => t.clientsHabituels || []))).sort();
  const categories = Array.from(new Set(traducteurs.map(t => t.categorie).filter(Boolean))) as CategorieTraducteur[];

  const handleNouveauTraducteur = () => {
    setTraducteurSelectionne(undefined);
    setModalOuvert(true);
  };

  const handleEditerTraducteur = (traducteur: Traducteur) => {
    setTraducteurSelectionne(traducteur);
    setModalOuvert(true);
  };

  // Fonction pour formater l'horaire de travail
  const formatHoraire = (horaire?: string) => {
    if (!horaire) return null;
    // Format attendu: "9h-17h" ou "8h30-16h30"
    return horaire;
  };

  // Fonction pour formater la pause dîner
  const formatDiner = (debut?: string, fin?: string) => {
    if (!debut || !fin) return null;
    return `${debut}-${fin}`;
  };

  // Composant ligne de tableau personnalisé
  const TraducteurRow: React.FC<{ traducteur: Traducteur; onClick: () => void }> = ({ traducteur, onClick }) => {
    const t = traducteur;
    const catInfo = t.categorie ? CATEGORIE_LABELS[t.categorie as CategorieTraducteur] : null;
    
    // Combiner spécialisations et clients habituels pour l'affichage
    const expertises = [
      ...(t.specialisations || []),
      ...(t.clientsHabituels || []).map(c => `📋 ${c}`)
    ];
    
    return (
      <tr 
        onClick={onClick}
        className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
      >
        {/* Nom + Email + Statut */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Avatar avec initiales */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
              t.actif ? 'bg-primaire/10 text-primaire' : 'bg-gray-200 text-gray-500'
            }`}>
              {t.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                <span className="truncate">{t.nom}</span>
                {!t.actif && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded shrink-0">Inactif</span>
                )}
                {t.disponiblePourTravail === false && t.actif && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded shrink-0" title={t.commentaireDisponibilite || 'Non disponible'}>
                    Indispo
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {t.utilisateur?.email || '—'}
              </div>
            </div>
          </div>
        </td>

        {/* Catégorie */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            {catInfo ? (
              <span 
                title={catInfo.tooltip}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit cursor-help ${catInfo.color}`}
              >
                {catInfo.label}
                {t.necessiteRevision && <span title="Travail à réviser" className="text-amber-600">⚠</span>}
              </span>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* Divisions */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 max-w-[140px]">
            {t.divisions?.length ? (
              <>
                {t.divisions.slice(0, 2).map((d, i) => (
                  <Badge key={i} variant="info" className="text-xs">{d}</Badge>
                ))}
                {t.divisions.length > 2 && (
                  <span className="text-xs text-gray-500 cursor-help" title={t.divisions.slice(2).join(', ')}>
                    +{t.divisions.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* Paires linguistiques */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 max-w-[120px]">
            {t.pairesLinguistiques?.length ? (
              <>
                {t.pairesLinguistiques.slice(0, 2).map((p, i) => (
                  <span key={i} className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    {p.langueSource}<span className="mx-0.5 text-gray-400">→</span>{p.langueCible}
                  </span>
                ))}
                {t.pairesLinguistiques.length > 2 && (
                  <span 
                    className="text-xs text-gray-500 cursor-help"
                    title={t.pairesLinguistiques.slice(2).map(p => `${p.langueSource}→${p.langueCible}`).join(', ')}
                  >
                    +{t.pairesLinguistiques.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* Domaines */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 max-w-[130px]">
            {t.domaines?.length ? (
              <>
                {t.domaines.slice(0, 2).map((d, i) => (
                  <span key={i} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded truncate max-w-[60px]" title={d}>
                    {d}
                  </span>
                ))}
                {t.domaines.length > 2 && (
                  <span 
                    className="text-xs text-gray-500 cursor-help"
                    title={t.domaines.slice(2).join(', ')}
                  >
                    +{t.domaines.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* Spécialisations + Clients habituels */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {expertises.length ? (
              <>
                {expertises.slice(0, 2).map((e, i) => (
                  <span 
                    key={i} 
                    className={`text-xs px-1.5 py-0.5 rounded truncate max-w-[70px] ${
                      e.startsWith('📋') 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-teal-50 text-teal-700'
                    }`}
                    title={e.replace('📋 ', '')}
                  >
                    {e.replace('📋 ', '')}
                  </span>
                ))}
                {expertises.length > 2 && (
                  <span 
                    className="text-xs text-gray-500 cursor-help"
                    title={expertises.slice(2).map(e => e.replace('📋 ', '')).join(', ')}
                  >
                    +{expertises.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* Horaire + Capacité */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5 text-xs">
            {formatHoraire(t.horaire) ? (
              <div className="flex items-center gap-1 text-gray-700">
                <span className="text-gray-400">🕐</span>
                {formatHoraire(t.horaire)}
              </div>
            ) : null}
            {formatDiner(t.heureDinerDebut, t.heureDinerFin) && (
              <div className="flex items-center gap-1 text-gray-500">
                <span className="text-gray-400">🍽</span>
                {formatDiner(t.heureDinerDebut, t.heureDinerFin)}
              </div>
            )}
            {t.capaciteHeuresParJour && (
              <div className="flex items-center gap-1 text-gray-600">
                <span className="text-gray-400">⏱</span>
                {t.capaciteHeuresParJour}h/j
              </div>
            )}
            {!formatHoraire(t.horaire) && !t.capaciteHeuresParJour && (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/traducteur/${t.id}`);
              }}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Voir le portail"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="p-1.5 text-gray-500 hover:text-primaire hover:bg-primaire/10 rounded transition-colors"
              title="Modifier"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  };

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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exporterTraducteurs(traducteursFiltres)}
                title="Exporter la liste en CSV"
              >
                📥 Export CSV
              </Button>
              <Button variant="primaire" onClick={handleNouveauTraducteur}>
                + Nouveau traducteur
              </Button>
            </div>
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

              {/* Filtre Statut (boutons radio visuels) */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                {(['tous', 'actif', 'inactif'] as const).map((statut) => (
                  <button
                    key={statut}
                    onClick={() => setFiltres({ ...filtres, actif: statut })}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filtres.actif === statut
                        ? 'bg-blue-600'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    style={{ color: filtres.actif === statut ? '#ffffff' : '#000000' }}
                  >
                    {statut === 'tous' ? 'Tous' : statut === 'actif' ? 'Actifs' : 'Inactifs'}
                  </button>
                ))}
              </div>

              <MultiSelectDropdown
                variant="badge"
                label="Catégorie"
                options={categories.map(c => CATEGORIE_LABELS[c].label)}
                selected={filtres.categories.map(c => CATEGORIE_LABELS[c as CategorieTraducteur]?.label || c)}
                onChange={(labels) => {
                  // Convertir les labels en codes
                  const codes = labels.map(label => 
                    Object.entries(CATEGORIE_LABELS).find(([, v]) => v.label === label)?.[0] || label
                  );
                  setFiltres({ ...filtres, categories: codes });
                }}
              />
              
              <MultiSelectDropdown
                variant="badge"
                label="Division"
                options={divisions}
                selected={filtres.divisions}
                onChange={(d) => setFiltres({ ...filtres, divisions: d })}
              />
              
              <MultiSelectDropdown
                variant="badge"
                label="Domaines"
                options={domaines}
                selected={filtres.domaines}
                onChange={(d) => setFiltres({ ...filtres, domaines: d })}
              />
              
              <MultiSelectDropdown
                variant="badge"
                label="Paires linguistiques"
                options={paires}
                selected={filtres.paires}
                onChange={(p) => setFiltres({ ...filtres, paires: p })}
              />

              <MultiSelectDropdown
                variant="badge"
                label="Spécialisations"
                options={specialisations}
                selected={filtres.specialisations}
                onChange={(s) => setFiltres({ ...filtres, specialisations: s })}
              />

              <MultiSelectDropdown
                variant="badge"
                label="Clients"
                options={clientsHabituels}
                selected={filtres.clients}
                onChange={(c) => setFiltres({ ...filtres, clients: c })}
              />
              
              {/* Bouton réinitialiser inline */}
              {(filtres.divisions.length > 0 || filtres.domaines.length > 0 || filtres.paires.length > 0 || filtres.categories.length > 0 || filtres.specialisations.length > 0 || filtres.clients.length > 0 || filtres.actif !== 'tous') && (
                <button
                  onClick={() => setFiltres({
                    ...filtres,
                    divisions: [],
                    categories: [],
                    domaines: [],
                    specialisations: [],
                    clients: [],
                    paires: [],
                    actif: 'tous',
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
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted">
                  {traducteursFiltres.length} traducteur{traducteursFiltres.length > 1 ? 's' : ''}
                  {traducteursFiltres.length !== traducteurs.length && (
                    <span className="text-gray-400"> sur {traducteurs.length}</span>
                  )}
                </span>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Actifs: {traducteurs.filter(t => t.actif).length}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    Inactifs: {traducteurs.filter(t => !t.actif).length}
                  </span>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-3 min-w-[200px]">Traducteur</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">Divisions</th>
                      <th className="px-4 py-3">Paires</th>
                      <th className="px-4 py-3">Domaines</th>
                      <th className="px-4 py-3">Spécialités</th>
                      <th className="px-4 py-3">Horaires</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {traducteursFiltres.map(traducteur => (
                      <TraducteurRow 
                        key={traducteur.id} 
                        traducteur={traducteur} 
                        onClick={() => handleEditerTraducteur(traducteur)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
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
