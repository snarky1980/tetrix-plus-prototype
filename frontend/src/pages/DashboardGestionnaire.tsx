import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FormField } from '../components/ui/FormField';
import { StatCard } from '../components/ui/StatCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatHeures } from '../lib/format';
import { traducteurService } from '../services/traducteurService';
import { divisionService } from '../services/divisionService';
import { planificationService } from '../services/planificationService';
import { todayOttawa, formatOttawaISO, addDaysOttawa } from '../utils/dateTimeOttawa';
import type { Traducteur } from '../types';

type Section = 'overview' | 'planification' | 'traducteurs' | 'blocages' | 'statistiques';
type ViewMode = '1' | '7' | '14' | '30' | 'custom';

interface Division {
  id: string;
  nom: string;
  code?: string;
}

/**
 * Dashboard Gestionnaire - Interface pour les gestionnaires de divisions
 * Accès filtré par divisions autorisées, gestion des blocages TR, statistiques
 * SANS création/modification de tâches
 */
const DashboardGestionnaire: React.FC = () => {
  // ============ États principaux ============
  const [section, setSection] = useState<Section>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const { utilisateur } = useAuth();
  const todayDate = todayOttawa();
  const today = formatOttawaISO(todayDate);
  
  // ============ États pour les données ============
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionSelectionnee, setDivisionSelectionnee] = useState<string>('');
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [planificationData, setPlanificationData] = useState<any[]>([]);
  const [blocagesListe, setBlocagesListe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlanif, setLoadingPlanif] = useState(false);

  // ============ États pour les blocages ============
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const [blocageData, setBlocageData] = useState({
    traducteurId: '',
    date: today,
    heureDebut: '09:00',
    heureFin: '17:00',
    motif: '',
    journeeComplete: false
  });
  const [submittingBlocage, setSubmittingBlocage] = useState(false);
  const [erreurBlocage, setErreurBlocage] = useState('');
  const [confirmDeleteBlocage, setConfirmDeleteBlocage] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  usePageTitle('Espace Gestionnaire - Tetrix PLUS', 'Gérez vos équipes et planifications');

  // ============ Calcul des dates de période ============
  const periodeActuelle = useMemo(() => {
    const baseDate = todayDate;
    let nbJours = 7;
    
    switch (viewMode) {
      case '1': nbJours = 1; break;
      case '7': nbJours = 7; break;
      case '14': nbJours = 14; break;
      case '30': nbJours = 30; break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { debut: customStartDate, fin: customEndDate };
        }
        nbJours = 7;
        break;
    }
    
    const fin = addDaysOttawa(baseDate, nbJours - 1);
    return { 
      debut: formatOttawaISO(baseDate), 
      fin: formatOttawaISO(fin) 
    };
  }, [today, viewMode, customStartDate, customEndDate]);

  // ============ Chargement des divisions autorisées ============
  useEffect(() => {
    const chargerDivisions = async () => {
      setLoading(true);
      try {
        // Récupérer les divisions autorisées pour ce gestionnaire
        const data = await divisionService.obtenirDivisions();
        // Filtrer par les accès de l'utilisateur si disponible
        if (utilisateur?.divisionAccess && utilisateur.divisionAccess.length > 0) {
          const divisionIds = utilisateur.divisionAccess.map(da => da.divisionId);
          const divisionsAutorisees = data.filter((d: any) => divisionIds.includes(d.id));
          setDivisions(divisionsAutorisees);
          if (divisionsAutorisees.length > 0) {
            setDivisionSelectionnee(divisionsAutorisees[0].id);
          }
        } else {
          // Si pas de filtre, prendre toutes les divisions
          setDivisions(data);
          if (data.length > 0) {
            setDivisionSelectionnee(data[0].id);
          }
        }
      } catch (err) {
        console.error('Erreur chargement divisions:', err);
      } finally {
        setLoading(false);
      }
    };
    chargerDivisions();
  }, [utilisateur]);

  // ============ Chargement des traducteurs par division ============
  useEffect(() => {
    const chargerTraducteurs = async () => {
      if (!divisionSelectionnee) return;
      try {
        const data = await traducteurService.obtenirTraducteurs();
        // Filtrer côté client par la division sélectionnée si nécessaire
        const divisionObj = divisions.find(d => d.id === divisionSelectionnee);
        const filtres = divisionObj 
          ? data.filter(t => t.division === divisionObj.nom || t.division === divisionObj.code) 
          : data;
        setTraducteurs(filtres);
      } catch (err) {
        console.error('Erreur chargement traducteurs:', err);
      }
    };
    chargerTraducteurs();
  }, [divisionSelectionnee]);

  // ============ Chargement de la planification ============
  const chargerPlanification = useCallback(async () => {
    if (!divisionSelectionnee || traducteurs.length === 0) return;
    setLoadingPlanif(true);
    try {
      const planifPromises = traducteurs.map(tr =>
        planificationService.obtenirPlanification(tr.id, periodeActuelle.debut, periodeActuelle.fin)
          .then((planif: any) => ({ traducteur: tr, planification: planif }))
          .catch(() => ({ traducteur: tr, planification: null }))
      );
      const resultats = await Promise.all(planifPromises);
      setPlanificationData(resultats.filter((r: any) => r.planification !== null));
    } catch (err) {
      console.error('Erreur chargement planification:', err);
    } finally {
      setLoadingPlanif(false);
    }
  }, [divisionSelectionnee, traducteurs, periodeActuelle]);

  useEffect(() => {
    chargerPlanification();
  }, [chargerPlanification]);

  // ============ Chargement des blocages ============
  const chargerBlocages = useCallback(async () => {
    if (traducteurs.length === 0) return;
    try {
      const blocagesPromises = traducteurs.map(tr =>
        traducteurService.obtenirBlocages(tr.id, { dateDebut: periodeActuelle.debut, dateFin: periodeActuelle.fin })
          .then(blocages => blocages.map((b: any) => ({ ...b, traducteur: tr })))
          .catch(() => [])
      );
      const resultats = await Promise.all(blocagesPromises);
      const allBlocages = resultats.flat().sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setBlocagesListe(allBlocages);
    } catch (err) {
      console.error('Erreur chargement blocages:', err);
    }
  }, [traducteurs, periodeActuelle]);

  useEffect(() => {
    chargerBlocages();
  }, [chargerBlocages]);

  // ============ Statistiques globales ============
  const stats = useMemo(() => {
    const totaux = planificationData.reduce((acc, item) => {
      if (!item.planification?.planification) return acc;
      const joursTotaux = item.planification.planification.reduce((sum: any, jour: any) => ({
        capacite: sum.capacite + (jour.capacite || 0),
        taches: sum.taches + (jour.heuresTaches || 0),
        blocages: sum.blocages + (jour.heuresBlocages || 0),
        disponible: sum.disponible + (jour.disponible || 0),
      }), { capacite: 0, taches: 0, blocages: 0, disponible: 0 });
      return {
        capacite: acc.capacite + joursTotaux.capacite,
        taches: acc.taches + joursTotaux.taches,
        blocages: acc.blocages + joursTotaux.blocages,
        disponible: acc.disponible + joursTotaux.disponible,
      };
    }, { capacite: 0, taches: 0, blocages: 0, disponible: 0 });

    // Traducteurs avec disponibilité signalée
    const disponibles = traducteurs.filter(t => t.disponiblePourTravail).length;
    
    return {
      ...totaux,
      nbTraducteurs: traducteurs.length,
      traducteurDisponibles: disponibles,
      nbBlocages: blocagesListe.length,
    };
  }, [planificationData, traducteurs, blocagesListe]);

  const tauxUtilisation = useMemo(() => {
    if (stats.capacite === 0) return 0;
    return ((stats.taches + stats.blocages) / stats.capacite) * 100;
  }, [stats]);

  // ============ Handlers ============
  const handleCreerBlocage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocageData.traducteurId) {
      setErreurBlocage('Veuillez sélectionner un traducteur');
      return;
    }
    
    setSubmittingBlocage(true);
    setErreurBlocage('');

    try {
      const heureDebut = blocageData.journeeComplete ? '00:00' : blocageData.heureDebut;
      const heureFin = blocageData.journeeComplete ? '23:59' : blocageData.heureFin;
      
      await traducteurService.bloquerTemps(blocageData.traducteurId, {
        date: blocageData.date,
        heureDebut,
        heureFin,
        motif: blocageData.motif || 'Blocage gestionnaire',
      });
      setOuvrirBlocage(false);
      setBlocageData({
        traducteurId: '',
        date: today,
        heureDebut: '09:00',
        heureFin: '17:00',
        motif: '',
        journeeComplete: false
      });
      chargerBlocages();
      chargerPlanification();
    } catch (err: any) {
      setErreurBlocage(err.response?.data?.message || err.response?.data?.erreur || 'Erreur lors de la création du blocage');
    } finally {
      setSubmittingBlocage(false);
    }
  };

  const handleSupprimerBlocage = async (id: string) => {
    setConfirmDeleteBlocage({ isOpen: true, id });
  };

  const executerSuppressionBlocage = async () => {
    if (!confirmDeleteBlocage.id) return;
    try {
      await traducteurService.supprimerBlocage(confirmDeleteBlocage.id);
      chargerBlocages();
      chargerPlanification();
    } catch (err) {
      console.error('Erreur suppression blocage:', err);
    } finally {
      setConfirmDeleteBlocage({ isOpen: false, id: null });
    }
  };

  // ============ Rendu des sections ============
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Sélecteur de division */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Division sélectionnée</h3>
                <p className="text-sm text-muted">
                  Vous avez accès à {divisions.length} division(s)
                </p>
              </div>
            </div>
            <Select
              value={divisionSelectionnee}
              onChange={e => setDivisionSelectionnee(e.target.value)}
              className="w-64"
            >
              {divisions.map(div => (
                <option key={div.id} value={div.id}>
                  {div.nom} ({div.code})
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Traducteurs"
          value={stats.nbTraducteurs}
          icon="👥"
          variant="info"
          subtitle={`${stats.traducteurDisponibles} disponible(s)`}
        />
        <StatCard
          title="Capacité totale"
          value={formatHeures(stats.capacite)}
          icon="📊"
          suffix="h"
          variant="default"
          subtitle={`sur ${viewMode === '1' ? '1 jour' : `${viewMode} jours`}`}
        />
        <StatCard
          title="Tâches planifiées"
          value={formatHeures(stats.taches)}
          icon="📝"
          suffix="h"
          variant="warning"
          subtitle={`${tauxUtilisation.toFixed(0)}% utilisé`}
        />
        <StatCard
          title="Temps bloqué"
          value={formatHeures(stats.blocages)}
          icon="🚫"
          suffix="h"
          variant="default"
          subtitle={`${stats.nbBlocages} blocage(s)`}
        />
      </div>

      {/* Barre de progression globale */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Utilisation globale de la division</span>
            <span className="text-sm font-bold">{tauxUtilisation.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                tauxUtilisation >= 100 ? 'bg-red-600' : 
                tauxUtilisation >= 75 ? 'bg-orange-500' : 
                tauxUtilisation >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(tauxUtilisation, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted">
            <span>📝 Tâches: {stats.taches.toFixed(1)}h</span>
            <span>🚫 Blocages: {stats.blocages.toFixed(1)}h</span>
            <span>✅ Disponible: {stats.disponible.toFixed(1)}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Traducteurs cherchant du travail */}
      {stats.traducteurDisponibles > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle>✋ Traducteurs disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {traducteurs.filter(t => t.disponiblePourTravail).map(tr => (
                <div key={tr.id} className="p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                      {tr.nom.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{tr.nom}</div>
                      <div className="text-xs text-muted">{tr.classification}</div>
                    </div>
                  </div>
                  {tr.commentaireDisponibilite && (
                    <div className="mt-2 text-sm text-green-700 bg-green-100 p-2 rounded">
                      💬 {tr.commentaireDisponibilite}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aperçu des prochains blocages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🚫 Blocages à venir</CardTitle>
            <Button variant="outline" onClick={() => setSection('blocages')}>
              Voir tout →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {blocagesListe.length === 0 ? (
            <EmptyState
              icon="🚫"
              title="Aucun blocage"
              description="Aucun blocage prévu pour cette période"
            />
          ) : (
            <div className="space-y-2">
              {blocagesListe.slice(0, 5).map((blocage: any) => (
                <div 
                  key={blocage.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
                      {blocage.traducteur?.nom?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{blocage.traducteur?.nom}</div>
                      <div className="text-xs text-muted">
                        {new Date(blocage.date).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' • '}{blocage.heureDebut} - {blocage.heureFin}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{blocage.motif || 'Blocage'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPlanification = () => (
    <div className="space-y-6">
      {/* Contrôles */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>📅 Planification globale</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as ViewMode)}
              >
                <option value="1">Aujourd'hui</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
                <option value="custom">Personnalisé</option>
              </Select>
              {viewMode === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                  />
                  <span>à</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grille de planification par traducteur */}
      {loadingPlanif ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : planificationData.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucune donnée"
          description="Pas de planification disponible pour cette division"
        />
      ) : (
        <div className="space-y-4">
          {planificationData.map(item => {
            const tr = item.traducteur;
            const planif = item.planification?.planification || [];
            
            const totaux = planif.reduce((acc: any, jour: any) => ({
              taches: acc.taches + (jour.heuresTaches || 0),
              blocages: acc.blocages + (jour.heuresBlocages || 0),
              capacite: acc.capacite + (jour.capacite || 0),
            }), { taches: 0, blocages: 0, capacite: 0 });
            
            const pctUtilise = totaux.capacite > 0 
              ? ((totaux.taches + totaux.blocages) / totaux.capacite) * 100 
              : 0;

            return (
              <Card key={tr.id} className="overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      tr.disponiblePourTravail ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {tr.nom.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{tr.nom}</div>
                      <div className="text-xs text-muted">
                        {tr.classification} • {tr.horaire || '9h-17h'}
                        {tr.disponiblePourTravail && ' • ✋ Disponible'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{pctUtilise.toFixed(0)}% utilisé</div>
                    <div className="text-xs text-muted">
                      {totaux.taches.toFixed(1)}h tâches • {totaux.blocages.toFixed(1)}h blocages
                    </div>
                  </div>
                </div>
                
                <CardContent className="pt-4">
                  <div className="grid grid-cols-7 gap-1">
                    {planif.slice(0, 7).map((jour: any) => {
                      const dateObj = new Date(jour.date);
                      const jourSemaine = dateObj.toLocaleDateString('fr-CA', { weekday: 'short' });
                      const jourNum = dateObj.getDate();
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      const utilise = (jour.heuresTaches || 0) + (jour.heuresBlocages || 0);
                      const pct = jour.capacite > 0 ? (utilise / jour.capacite) * 100 : 0;
                      
                      let bg = 'bg-green-100';
                      if (isWeekend) bg = 'bg-gray-100';
                      else if (pct >= 100) bg = 'bg-red-100';
                      else if (pct >= 75) bg = 'bg-orange-100';
                      else if (pct >= 50) bg = 'bg-yellow-100';
                      
                      return (
                        <div key={jour.date} className={`p-2 rounded text-center ${bg}`}>
                          <div className="text-[10px] text-gray-500 uppercase">{jourSemaine}</div>
                          <div className="text-sm font-bold">{jourNum}</div>
                          {!isWeekend && (
                            <div className="text-[10px]">{utilise.toFixed(1)}h</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTraducteurs = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>👥 Traducteurs de la division</CardTitle>
        </CardHeader>
        <CardContent>
          {traducteurs.length === 0 ? (
            <EmptyState
              icon="👥"
              title="Aucun traducteur"
              description="Aucun traducteur dans cette division"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {traducteurs.map(tr => (
                <div 
                  key={tr.id} 
                  className={`p-4 rounded-lg border-2 ${
                    tr.disponiblePourTravail 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                      tr.disponiblePourTravail ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {tr.nom.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{tr.nom}</div>
                      <div className="text-sm text-muted">{tr.classification}</div>
                      <div className="text-xs text-muted mt-1">
                        🕐 {tr.horaire || '9h-17h'} • 📊 {tr.capaciteHeuresParJour || 7.5}h/jour
                      </div>
                    </div>
                  </div>
                  
                  {tr.disponiblePourTravail && (
                    <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-700">
                      ✋ Cherche du travail
                      {tr.commentaireDisponibilite && (
                        <div className="text-xs mt-1">💬 {tr.commentaireDisponibilite}</div>
                      )}
                    </div>
                  )}

                  {tr.specialisations && tr.specialisations.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-muted mb-1">Spécialisations:</div>
                      <div className="flex flex-wrap gap-1">
                        {tr.specialisations.slice(0, 3).map((spec, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {spec}
                          </span>
                        ))}
                        {tr.specialisations.length > 3 && (
                          <span className="text-xs text-muted">+{tr.specialisations.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => {
                        setBlocageData(prev => ({ ...prev, traducteurId: tr.id }));
                        setOuvrirBlocage(true);
                      }}
                    >
                      + Blocage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderBlocages = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🚫 Gestion des blocages</CardTitle>
            <Button onClick={() => setOuvrirBlocage(true)}>
              + Nouveau blocage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {blocagesListe.length === 0 ? (
            <EmptyState
              icon="🚫"
              title="Aucun blocage"
              description="Aucun blocage planifié pour cette période"
              action={{
                label: 'Créer un blocage',
                onClick: () => setOuvrirBlocage(true)
              }}
            />
          ) : (
            <div className="space-y-2">
              {blocagesListe.map((blocage: any) => (
                <div 
                  key={blocage.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold">
                      {blocage.traducteur?.nom?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium">{blocage.traducteur?.nom}</div>
                      <div className="text-sm text-muted">
                        {new Date(blocage.date).toLocaleDateString('fr-CA', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {blocage.heureDebut} - {blocage.heureFin} ({blocage.heures}h)
                        {blocage.motif && ` • ${blocage.motif}`}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="danger" 
                    onClick={() => handleSupprimerBlocage(blocage.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderStatistiques = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Statistiques de productivité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.nbTraducteurs}</div>
              <div className="text-sm text-muted">Traducteurs</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{stats.capacite.toFixed(0)}h</div>
              <div className="text-sm text-muted">Capacité totale</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.taches.toFixed(0)}h</div>
              <div className="text-sm text-muted">Heures planifiées</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">{tauxUtilisation.toFixed(0)}%</div>
              <div className="text-sm text-muted">Taux d'utilisation</div>
            </div>
          </div>
          
          <EmptyState
            icon="📈"
            title="Statistiques détaillées à venir"
            description="Des graphiques et analyses avancées de productivité seront disponibles prochainement"
          />
        </CardContent>
      </Card>
    </div>
  );

  // ============ Rendu principal ============
  if (loading) {
    return (
      <AppLayout titre="Chargement...">
        <LoadingSpinner message="Chargement de vos divisions..." />
      </AppLayout>
    );
  }

  if (divisions.length === 0) {
    return (
      <AppLayout titre="Espace Gestionnaire">
        <EmptyState
          icon="🔒"
          title="Aucune division assignée"
          description="Vous n'avez accès à aucune division. Contactez un administrateur pour obtenir les accès nécessaires."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout titre="">
      <div className="space-y-6">
        {/* En-tête avec navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Espace Gestionnaire 👔</h1>
              <p className="text-muted mt-1">
                Gérez vos équipes et suivez la planification de vos divisions
              </p>
            </div>
            <Select
              value={divisionSelectionnee}
              onChange={e => setDivisionSelectionnee(e.target.value)}
              className="w-48"
            >
              {divisions.map(div => (
                <option key={div.id} value={div.id}>
                  {div.code || div.nom}
                </option>
              ))}
            </Select>
          </div>
          
          {/* Menu de navigation */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button 
              variant={section === 'overview' ? 'primaire' : 'outline'}
              onClick={() => setSection('overview')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🏠</span>
              <span className="text-sm">Vue d'ensemble</span>
            </Button>
            <Button 
              variant={section === 'planification' ? 'primaire' : 'outline'}
              onClick={() => setSection('planification')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">📅</span>
              <span className="text-sm">Planification</span>
            </Button>
            <Button 
              variant={section === 'traducteurs' ? 'primaire' : 'outline'}
              onClick={() => setSection('traducteurs')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">👥</span>
              <span className="text-sm">Traducteurs</span>
            </Button>
            <Button 
              variant={section === 'blocages' ? 'primaire' : 'outline'}
              onClick={() => setSection('blocages')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🚫</span>
              <span className="text-sm">Blocages</span>
            </Button>
            <Button 
              variant={section === 'statistiques' ? 'primaire' : 'outline'}
              onClick={() => setSection('statistiques')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">📊</span>
              <span className="text-sm">Statistiques</span>
            </Button>
          </div>
        </div>

        {/* Contenu de la section */}
        {section === 'overview' && renderOverview()}
        {section === 'planification' && renderPlanification()}
        {section === 'traducteurs' && renderTraducteurs()}
        {section === 'blocages' && renderBlocages()}
        {section === 'statistiques' && renderStatistiques()}
      </div>

      {/* Modal de blocage */}
      <Modal
        titre="🚫 Créer un blocage"
        ouvert={ouvrirBlocage}
        onFermer={() => setOuvrirBlocage(false)}
        ariaDescription="Formulaire pour créer un blocage pour un traducteur"
      >
        <form onSubmit={handleCreerBlocage} className="space-y-4">
          {erreurBlocage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreurBlocage}
            </div>
          )}

          <FormField label="Traducteur" required>
            <Select
              value={blocageData.traducteurId}
              onChange={e => setBlocageData({ ...blocageData, traducteurId: e.target.value })}
              required
            >
              <option value="">-- Sélectionner un traducteur --</option>
              {traducteurs.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.nom}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Date" required>
            <Input
              type="date"
              value={blocageData.date}
              onChange={e => setBlocageData({ ...blocageData, date: e.target.value })}
              required
              min={today}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="journeeCompleteGest"
              checked={blocageData.journeeComplete}
              onChange={e => setBlocageData({ ...blocageData, journeeComplete: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="journeeCompleteGest" className="text-sm">
              Journée complète
            </label>
          </div>

          {!blocageData.journeeComplete && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Heure de début" required>
                <Input
                  type="time"
                  value={blocageData.heureDebut}
                  onChange={e => setBlocageData({ ...blocageData, heureDebut: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Heure de fin" required>
                <Input
                  type="time"
                  value={blocageData.heureFin}
                  onChange={e => setBlocageData({ ...blocageData, heureFin: e.target.value })}
                  required
                />
              </FormField>
            </div>
          )}

          <FormField label="Motif">
            <Input
              type="text"
              value={blocageData.motif}
              onChange={e => setBlocageData({ ...blocageData, motif: e.target.value })}
              placeholder="Ex: Réunion d'équipe, Formation..."
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOuvrirBlocage(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submittingBlocage}>
              {submittingBlocage ? 'Création...' : 'Créer le blocage'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dialogue de confirmation suppression */}
      <ConfirmDialog
        isOpen={confirmDeleteBlocage.isOpen}
        onClose={() => setConfirmDeleteBlocage({ isOpen: false, id: null })}
        onConfirm={executerSuppressionBlocage}
        title="Supprimer le blocage"
        message="Voulez-vous vraiment supprimer ce blocage ? Cette action est irréversible."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </AppLayout>
  );
};

export default DashboardGestionnaire;
