import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/Spinner';
import { InfoTooltip } from '../components/ui/Tooltip';
import { MultiSelectDropdown } from '../components/ui/MultiSelectDropdown';
import { TacheCard } from '../components/taches/TacheCard';
import { DemandesRessources } from '../components/notifications/DemandesRessources';
import { ImportBatchModal } from '../components/admin/ImportBatchModal';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { tacheService } from '../services/tacheService';
import { traducteurService } from '../services/traducteurService';
import { divisionService } from '../services/divisionService';
import type { Tache, Traducteur } from '../types';

type Section = 'overview' | 'taches' | 'demandes';

/**
 * Dashboard Conseiller - Vue d'ensemble enrichie avec stats et navigation
 * Style harmonisé avec le Dashboard Admin
 */
const DashboardConseiller: React.FC = () => {
  usePageTitle('Portail Conseiller', 'Gérez vos tâches et la planification');
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  
  const [section, setSection] = useState<Section>('overview');
  const [taches, setTaches] = useState<Tache[]>([]);
  const [tachesFiltered, setTachesFiltered] = useState<Tache[]>([]);
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [recherche, setRecherche] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filtres pour traducteurs disponibles
  const [toutesLesDivisions, setToutesLesDivisions] = useState<string[]>([]);
  const [filtresDivisions, setFiltresDivisions] = useState<string[]>([]);
  const [filtresCategories, setFiltresCategories] = useState<string[]>([]);
  const [filtresPaires, setFiltresPaires] = useState<string[]>([]);
  const [filtresSpecialisations, setFiltresSpecialisations] = useState<string[]>([]);
  const [triTraducteurs, setTriTraducteurs] = useState<'nom' | 'capacite' | 'anciennete'>('nom');
  const categoriesOptions = ['TR01', 'TR02', 'TR03'];

  // Planification des 7 prochains jours
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planificationGlobale } = usePlanificationGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });

  // Stats de capacité
  const capaciteStats = useMemo(() => {
    if (!planificationGlobale) return { total: 0, libre: 0, presque: 0, plein: 0 };
    let libre = 0, presque = 0, plein = 0;
    planificationGlobale.planification.forEach(l => {
      Object.values(l.dates).forEach(d => {
        if (d.couleur === 'libre') libre++;
        else if (d.couleur === 'presque-plein') presque++;
        else if (d.couleur === 'plein') plein++;
      });
    });
    return { total: libre + presque + plein, libre, presque, plein };
  }, [planificationGlobale]);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [tachesData, traducteursData, divisionsData] = await Promise.all([
        tacheService.obtenirTaches({}),
        traducteurService.obtenirTraducteurs({}).catch(() => []),
        divisionService.obtenirDivisions().catch(() => [])
      ]);
      
      // Trier par date de création (plus récent d'abord)
      const tachesTries = tachesData.sort((a, b) => 
        new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime()
      );
      setTaches(tachesTries);
      setTachesFiltered(tachesTries);
      setTraducteurs(traducteursData);
      
      // Extraire les divisions pour les filtres
      const divisionNames = divisionsData.map((d: any) => d.nom).filter(Boolean).sort();
      setToutesLesDivisions(divisionNames);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    appliquerFiltres();
  }, [filtreStatut, recherche, taches]);

  const appliquerFiltres = () => {
    let filtered = [...taches];

    if (filtreStatut) {
      filtered = filtered.filter(t => t.statut === filtreStatut);
    }

    if (recherche) {
      const rech = recherche.toLowerCase();
      filtered = filtered.filter(t => 
        t.numeroProjet.toLowerCase().includes(rech) ||
        t.description?.toLowerCase().includes(rech) ||
        t.traducteur?.nom.toLowerCase().includes(rech) ||
        t.client?.nom.toLowerCase().includes(rech)
      );
    }

    setTachesFiltered(filtered);
  };

  const reinitialiserFiltres = () => {
    setFiltreStatut('');
    setRecherche('');
  };

  const stats = {
    total: taches.length,
    planifiees: taches.filter(t => t.statut === 'PLANIFIEE').length,
    enCours: taches.filter(t => t.statut === 'EN_COURS').length,
    enRetard: taches.filter(t => t.statut === 'EN_RETARD').length,
    terminees: taches.filter(t => t.statut === 'TERMINEE').length,
    heuresTotal: taches.reduce((sum, t) => sum + t.heuresTotal, 0),
    heuresEnCours: taches.filter(t => t.statut === 'EN_COURS' || t.statut === 'PLANIFIEE').reduce((sum, t) => sum + t.heuresTotal, 0),
  };

  const traducteursDispo = traducteurs.filter(t => t.disponiblePourTravail);
  const traducteursActifs = traducteurs.filter(t => t.actif);
  
  // Extraction des options de filtres depuis les traducteurs
  const optionsPaires = useMemo(() => {
    const paires = new Set<string>();
    traducteursDispo.forEach(tr => {
      tr.pairesLinguistiques?.forEach(p => paires.add(`${p.langueSource}→${p.langueCible}`));
    });
    return Array.from(paires).sort();
  }, [traducteursDispo]);
  
  const optionsSpecialisations = useMemo(() => {
    const specs = new Set<string>();
    traducteursDispo.forEach(tr => {
      tr.specialisations?.forEach(s => specs.add(s));
    });
    return Array.from(specs).sort();
  }, [traducteursDispo]);
  
  // Filtrage et tri des traducteurs disponibles
  const traducteursFiltres = useMemo(() => {
    let resultat = traducteursDispo.filter(tr => {
      // Filtre par divisions (OR logic)
      if (filtresDivisions.length > 0 && !tr.divisions?.some(d => filtresDivisions.includes(d))) return false;
      // Filtre par catégorie/classification
      if (filtresCategories.length > 0 && !filtresCategories.includes(tr.categorie || '')) return false;
      // Filtre par paires linguistiques
      if (filtresPaires.length > 0) {
        const trPaires = tr.pairesLinguistiques?.map(p => `${p.langueSource}→${p.langueCible}`) || [];
        if (!filtresPaires.some(fp => trPaires.includes(fp))) return false;
      }
      // Filtre par spécialisations
      if (filtresSpecialisations.length > 0) {
        if (!filtresSpecialisations.some(fs => tr.specialisations?.includes(fs))) return false;
      }
      return true;
    });
    
    // Tri
    resultat.sort((a, b) => {
      switch (triTraducteurs) {
        case 'capacite':
          return (b.capaciteHeuresParJour || 7.5) - (a.capaciteHeuresParJour || 7.5);
        case 'anciennete':
          // Trier par modifieLe (plus ancien en premier = disponible depuis plus longtemps)
          const dateA = (a as any).modifieLe ? new Date((a as any).modifieLe).getTime() : 0;
          const dateB = (b as any).modifieLe ? new Date((b as any).modifieLe).getTime() : 0;
          return dateA - dateB;
        default:
          return a.nom.localeCompare(b.nom);
      }
    });
    
    return resultat;
  }, [traducteursDispo, filtresDivisions, filtresCategories, filtresPaires, filtresSpecialisations, triTraducteurs]);

  // Tâches urgentes (échéance dans les 3 prochains jours)
  const tachesUrgentes = taches.filter(t => {
    if (t.statut === 'TERMINEE') return false;
    const echeance = new Date(t.dateEcheance);
    const dans3Jours = new Date(aujourdHui.getTime() + 3 * 86400000);
    return echeance <= dans3Jours;
  });

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Stats cliquables en grille */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Tâches', value: stats.total, sub: `${stats.enCours} en cours`, color: 'blue', tooltip: 'Nombre total de tâches dans le système', action: () => setSection('taches') },
          { label: 'Planifiées', value: stats.planifiees, color: 'gray', tooltip: 'Tâches assignées mais pas encore commencées', action: () => { setFiltreStatut('PLANIFIEE'); setSection('taches'); } },
          { label: 'En retard', value: stats.enRetard, color: stats.enRetard > 0 ? 'red' : 'gray', tooltip: 'Tâches dont l\'échéance est dépassée', action: () => { setFiltreStatut('EN_RETARD'); setSection('taches'); } },
          { label: 'Heures', value: `${stats.heuresEnCours.toFixed(0)}h`, sub: 'actives', color: 'amber', tooltip: 'Heures de travail sur les tâches en cours et planifiées', action: () => navigate('/statistiques-productivite') },
          { label: 'Dispo.', value: capaciteStats.libre, sub: '7 jours', color: 'green', tooltip: 'Créneaux de disponibilité des traducteurs sur les 7 prochains jours', action: () => navigate('/planification-globale') },
          { label: 'Saturé', value: capaciteStats.plein, color: capaciteStats.plein > 0 ? 'orange' : 'gray', tooltip: 'Créneaux complètement occupés - traducteurs à pleine capacité', action: () => navigate('/planification-globale') },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={stat.action}
            className={`p-2 rounded border bg-${stat.color}-50 border-${stat.color}-200 hover:bg-${stat.color}-100 hover:border-${stat.color}-300 transition-colors text-left cursor-pointer`}
          >
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {stat.label}
              {stat.tooltip && <InfoTooltip content={stat.tooltip} size="sm" />}
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
            {stat.sub && <div className="text-xs text-gray-400">{stat.sub}</div>}
          </button>
        ))}
      </div>

      {/* Alertes - Tâches urgentes */}
      {tachesUrgentes.length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">⚠️ {tachesUrgentes.length} tâche(s) urgente(s) - échéance ≤ 3 jours</span>
            <Button size="sm" variant="outline" onClick={() => { setSection('taches'); }}>
              Voir tout
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tachesUrgentes.slice(0, 5).map(t => (
              <div 
                key={t.id} 
                className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-orange-200 text-xs cursor-pointer hover:bg-orange-50"
                onClick={() => navigate(`/conseiller/planifier/${t.id}`)}
              >
                <span className="font-medium">{t.numeroProjet}</span>
                <span className="text-orange-600">{t.heuresTotal}h</span>
                <span className="text-gray-500">→ {new Date(t.dateEcheance).toLocaleDateString('fr-CA')}</span>
              </div>
            ))}
            {tachesUrgentes.length > 5 && (
              <span className="text-xs text-orange-600 self-center">+{tachesUrgentes.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {/* Traducteurs disponibles - Section améliorée avec filtres */}
      {traducteursDispo.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
          {/* En-tête avec filtres */}
          <div className="px-3 py-2 border-b border-green-200 bg-green-100/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                ✋ Traducteurs disponibles 
                <span className="px-1.5 py-0.5 bg-green-200 rounded text-xs">
                  {traducteursFiltres.length}{filtresDivisions.length > 0 || filtresCategories.length > 0 || filtresPaires.length > 0 || filtresSpecialisations.length > 0 ? `/${traducteursDispo.length}` : ''}
                </span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtres */}
                <MultiSelectDropdown
                  label=""
                  options={toutesLesDivisions}
                  selected={filtresDivisions}
                  onChange={setFiltresDivisions}
                  placeholder="Divisions"
                  minWidth="160px"
                />
                <MultiSelectDropdown
                  label=""
                  options={categoriesOptions}
                  selected={filtresCategories}
                  onChange={setFiltresCategories}
                  placeholder="Catégorie"
                  minWidth="130px"
                />
                {optionsPaires.length > 0 && (
                  <MultiSelectDropdown
                    label=""
                    options={optionsPaires}
                    selected={filtresPaires}
                    onChange={setFiltresPaires}
                    placeholder="🌐 Langues"
                    minWidth="140px"
                  />
                )}
                {optionsSpecialisations.length > 0 && (
                  <MultiSelectDropdown
                    label=""
                    options={optionsSpecialisations}
                    selected={filtresSpecialisations}
                    onChange={setFiltresSpecialisations}
                    placeholder="🎯 Spéc."
                    minWidth="150px"
                  />
                )}
                {/* Tri */}
                <select
                  value={triTraducteurs}
                  onChange={(e) => setTriTraducteurs(e.target.value as any)}
                  className="text-xs px-2 py-1 border border-green-300 rounded bg-white"
                  title="Trier par"
                >
                  <option value="nom">↕ Nom</option>
                  <option value="capacite">↕ Capacité</option>
                  <option value="anciennete">↕ Ancienneté</option>
                </select>
                {/* Reset */}
                {(filtresDivisions.length > 0 || filtresCategories.length > 0 || filtresPaires.length > 0 || filtresSpecialisations.length > 0) && (
                  <button
                    onClick={() => { setFiltresDivisions([]); setFiltresCategories([]); setFiltresPaires([]); setFiltresSpecialisations([]); }}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded"
                    title="Réinitialiser les filtres"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Liste des traducteurs */}
          <div className="p-3">
            {traducteursFiltres.length === 0 ? (
              <div className="text-center py-3 text-gray-500 text-sm">
                Aucun traducteur ne correspond aux filtres
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {traducteursFiltres.map(tr => {
                  const disponibleDepuis = tr.disponibleDepuis || (tr as any).modifieLe;
                  const modifieLe = (tr as any).modifieLe;
                  
                  // Formater les dates avec heure
                  const formatDateHeure = (dateStr: string | undefined) => {
                    if (!dateStr) return null;
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('fr-CA', { 
                      day: 'numeric', 
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };
                  
                  // Calculer le nombre de jours depuis
                  const joursDepuis = disponibleDepuis 
                    ? Math.floor((aujourdHui.getTime() - new Date(disponibleDepuis).getTime()) / 86400000)
                    : null;
                    
                  return (
                    <div 
                      key={tr.id} 
                      className="p-2 bg-white rounded border border-green-200 text-xs hover:shadow-md hover:border-green-400 transition-all cursor-pointer group"
                      onClick={() => navigate(`/conseiller/creation-tache?traducteurId=${tr.id}&traducteurNom=${encodeURIComponent(tr.nom)}`)}
                      title="Cliquer pour créer une tâche pour ce traducteur"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 group-hover:bg-green-600">
                          {tr.nom.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-1" title={tr.nom}>
                            {tr.nom}
                            <span className="opacity-0 group-hover:opacity-100 text-green-600 transition-opacity">→</span>
                          </div>
                          <div className="text-gray-500 text-[10px] flex items-center gap-1">
                            {tr.categorie || '-'} • {tr.capaciteHeuresParJour || 7.5}h/j
                            {joursDepuis !== null && joursDepuis >= 0 && (
                              <span className={`px-1 py-0.5 rounded ${joursDepuis <= 1 ? 'bg-green-200 text-green-800' : joursDepuis <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`} title={`Disponible depuis: ${formatDateHeure(disponibleDepuis)}`}>
                                {joursDepuis === 0 ? 'Auj.' : joursDepuis === 1 ? '1j' : `${joursDepuis}j`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Dates de disponibilité */}
                      <div className="text-[10px] text-gray-400 mb-1 flex flex-wrap gap-x-2">
                        {disponibleDepuis && (
                          <span title="Date de demande de travail">📅 Demande: {formatDateHeure(disponibleDepuis)}</span>
                        )}
                        {modifieLe && modifieLe !== disponibleDepuis && (
                          <span title="Dernière modification">✏️ Modif: {formatDateHeure(modifieLe)}</span>
                        )}
                      </div>
                      {/* Divisions */}
                      {tr.divisions && tr.divisions.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mb-1">
                          {tr.divisions.slice(0, 3).map((d, i) => (
                            <span key={i} className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">{d}</span>
                          ))}
                          {tr.divisions.length > 3 && (
                            <span className="text-[10px] text-green-500">+{tr.divisions.length - 3}</span>
                          )}
                        </div>
                      )}
                      {/* Paires linguistiques */}
                      {tr.pairesLinguistiques && tr.pairesLinguistiques.length > 0 && (
                        <div className="text-[10px] text-gray-500 truncate">
                          🌐 {tr.pairesLinguistiques.slice(0, 2).map((p: any) => `${p.langueSource}→${p.langueCible}`).join(', ')}
                          {tr.pairesLinguistiques.length > 2 && ` +${tr.pairesLinguistiques.length - 2}`}
                        </div>
                      )}
                      {/* Spécialisations */}
                      {tr.specialisations && tr.specialisations.length > 0 && (
                        <div className="text-[10px] text-purple-600 truncate">
                          🎯 {tr.specialisations.slice(0, 2).join(', ')}
                          {tr.specialisations.length > 2 && ` +${tr.specialisations.length - 2}`}
                        </div>
                      )}
                      {/* Commentaire de disponibilité */}
                      {(tr as any).commentaireDisponibilite && (
                        <div className="mt-1 text-green-700 bg-green-100 p-1 rounded text-[10px] truncate" title={(tr as any).commentaireDisponibilite}>
                          💬 {(tr as any).commentaireDisponibilite}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Demandes de ressources */}
      <DemandesRessources />

      {/* Aperçu des tâches récentes */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">📋 Tâches récentes</span>
          <Button size="sm" variant="outline" onClick={() => setSection('taches')}>
            Voir toutes ({taches.length})
          </Button>
        </div>
        {taches.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Aucune tâche. <button className="text-primary hover:underline" onClick={() => navigate('/conseiller/creation-tache')}>Créer une tâche</button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {taches.slice(0, 5).map((tache) => (
              <TacheCard key={tache.id} tache={tache} showPlanningButton={true} />
            ))}
          </div>
        )}
      </div>

      {/* Stats traducteurs compact */}
      <div className="bg-white border rounded-lg p-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Équipe de traduction</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {traducteursActifs.length} actifs
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
            {traducteursDispo.length} disponibles
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {traducteurs.length - traducteursActifs.length} inactifs
          </span>
        </div>
      </div>
    </div>
  );

  const renderTaches = () => (
    <div className="space-y-3">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="text-xs py-1 px-2 border-gray-200 rounded min-w-[120px]"
        >
          <option value="">Tous statuts</option>
          <option value="PLANIFIEE">📝 Planifiée</option>
          <option value="EN_COURS">🔄 En cours</option>
          <option value="EN_RETARD">⚠️ En retard</option>
          <option value="TERMINEE">✅ Terminée</option>
        </Select>
        <div className="relative">
          <Input
            type="text"
            value={recherche}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecherche(e.target.value)}
            placeholder="Rechercher..."
            className="text-xs py-1 px-2 pl-7 w-40 border-gray-200 rounded"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
        </div>
        {(filtreStatut || recherche) && (
          <button 
            onClick={reinitialiserFiltres}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            ✕ Réinitialiser
          </button>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {tachesFiltered.length}/{taches.length} tâches • {tachesFiltered.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(1)}h
        </span>
      </div>

      {/* Liste */}
      {tachesFiltered.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
            <span className="text-2xl">📭</span>
          </div>
          <p className="text-gray-500 mb-3">Aucune tâche trouvée</p>
          {utilisateur?.role !== 'GESTIONNAIRE' && (
            <Button onClick={() => navigate('/conseiller/creation-tache')} className="gap-2">
              <span>➕</span> Créer une tâche
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {tachesFiltered.map((tache) => (
            <TacheCard key={tache.id} tache={tache} showPlanningButton={true} />
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'taches':
        return renderTaches();
      case 'demandes':
        return <DemandesRessources showAll />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  if (loading && section === 'overview') {
    return (
      <AppLayout titre="Portail Conseiller">
        <LoadingSpinner message="Chargement des données..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout titre="Portail Conseiller">
      <div className="space-y-4">
        {/* En-tête compact avec navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Bonjour, {utilisateur?.prenom || 'Conseiller'}</h1>
              <p className="text-sm text-muted">Gérez vos tâches et la planification</p>
            </div>
            
            {/* Navigation compacte */}
            <div className="flex flex-wrap gap-2">
              {utilisateur?.role !== 'GESTIONNAIRE' && (
                <Button 
                  onClick={() => navigate('/conseiller/creation-tache')}
                  size="sm"
                  className="gap-1.5"
                >
                  <span>➕</span> Nouvelle tâche
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/planification-globale')}
                className="gap-1.5"
              >
                <span>📅</span> Planification
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/liaisons')}
                className="gap-1.5"
              >
                <span>🔗</span> Liaisons
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/statistiques-productivite')}
                className="gap-1.5"
              >
                <span>📊</span> Stats
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/conflict-resolution')}
                className="gap-1.5"
              >
                <span>⚠️</span> Conflits
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/mes-notes')}
                className="gap-1.5"
              >
                <span>📝</span> Mes notes
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => setShowImportModal(true)}
                className="gap-1.5"
              >
                <span>📥</span> Import tâches
              </Button>
            </div>
          </div>
        </div>

        {/* Stats en barre horizontale */}
        <div className="bg-white border rounded-lg px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">{stats.total} tâches</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{stats.planifiees} planifiées</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.enCours} en cours</span>
            {stats.enRetard > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">{stats.enRetard} en retard</span>
            )}
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{stats.terminees} terminées</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{stats.heuresTotal.toFixed(0)}h total</span>
          </div>
          <div className="text-xs text-green-600 flex items-center gap-1">
            {stats.enRetard === 0 ? (
              <>
                <span>✅</span> Aucun retard
              </>
            ) : (
              <span className="text-red-600">⚠️ {stats.enRetard} retard(s)</span>
            )}
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1">
            {[
              { id: 'overview' as const, icon: '🏠', label: 'Vue d\'ensemble' },
              { id: 'taches' as const, icon: '📋', label: 'Toutes les tâches' },
              { id: 'demandes' as const, icon: '📨', label: 'Demandes' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  section === item.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Contenu de la section */}
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modal d'import de tâches */}
      {showImportModal && (
        <ImportBatchModal
          type="taches"
          ouvert={showImportModal}
          onFermer={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            chargerDonnees();
          }}
        />
      )}
    </AppLayout>
  );
};

export default DashboardConseiller;
