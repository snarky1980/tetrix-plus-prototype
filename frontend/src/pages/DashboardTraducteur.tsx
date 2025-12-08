import React, { useMemo, useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { FormField } from '../components/ui/FormField';
import { StatCard } from '../components/ui/StatCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanification } from '../hooks/usePlanification';
import { formatHeures } from '../lib/format';
import { JourDetail } from '../components/ui/JourDetail';
import api from '../services/api';
import { traducteurService } from '../services/traducteurService';
import type { Traducteur } from '../types';

/**
 * Dashboard Traducteur - Planification personnel et blocage de temps
 */
const DashboardTraducteur: React.FC = () => {
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const [blocageData, setBlocageData] = useState({ date: '', heures: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState('');
  const [_traducteur, setTraducteur] = useState<Traducteur | null>(null);
  const [disponibiliteActive, setDisponibiliteActive] = useState(false);
  const [commentaireDisponibilite, setCommentaireDisponibilite] = useState('');
  const [savingDisponibilite, setSavingDisponibilite] = useState(false);
  
  const { utilisateur } = useAuth();
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planification, loading, error, refresh } = usePlanification(utilisateur?.traducteurId, { 
    dateDebut: dateISO(aujourdHui), 
    dateFin: dateISO(fin) 
  });

  // Charger les infos du traducteur
  useEffect(() => {
    if (utilisateur?.traducteurId) {
      console.log('[DISPONIBILITE] Chargement des infos du traducteur:', utilisateur.traducteurId);
      traducteurService.obtenirTraducteur(utilisateur.traducteurId)
        .then(data => {
          console.log('[DISPONIBILITE] Données reçues:', data);
          setTraducteur(data);
          setDisponibiliteActive(data.disponiblePourTravail);
          setCommentaireDisponibilite(data.commentaireDisponibilite || '');
        })
        .catch(err => {
          console.error('[DISPONIBILITE] Erreur chargement traducteur:', err);
          alert(`Erreur: ${err.message || 'Impossible de charger les données du traducteur'}`);
        });
    }
  }, [utilisateur?.traducteurId]);

  // Mettre à jour le titre de la page avec le nom du traducteur
  const titreTraducteur = planification?.traducteur?.nom || 'Traducteur';
  usePageTitle(`${titreTraducteur} - Tetrix PLUS`, 'Consultez votre planification et bloquez votre temps');

  const resume = useMemo(() => {
    if (!planification) return { taches: 0, blocages: 0, libre: 0, capacite: 0 };
    const totaux = planification.planification.reduce((acc: any, jour: any) => ({
      taches: acc.taches + jour.heuresTaches,
      blocages: acc.blocages + jour.heuresBlocages,
      libre: acc.libre + jour.disponible,
      capacite: acc.capacite + jour.capacite,
    }), { taches: 0, blocages: 0, libre: 0, capacite: 0 });
    return totaux;
  }, [planification]);

  // Calculer le pourcentage d'utilisation
  const percentageUtilise = useMemo(() => {
    if (resume.capacite === 0) return 0;
    return ((resume.taches + resume.blocages) / resume.capacite) * 100;
  }, [resume]);

  const handleCreerBlocage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utilisateur?.traducteurId) return;
    
    setSubmitting(true);
    setErreur('');

    try {
      await api.post('/planning/ajustements', {
        traducteurId: utilisateur.traducteurId,
        date: blocageData.date,
        heures: blocageData.heures,
        type: 'BLOCAGE',
      });
      setOuvrirBlocage(false);
      setBlocageData({ date: '', heures: 0 });
      refresh();
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de la création du blocage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDisponibilite = async () => {
    if (!utilisateur?.traducteurId) {
      console.error('[DISPONIBILITE] Pas de traducteurId');
      return;
    }
    
    setSavingDisponibilite(true);
    const nouvelleValeur = !disponibiliteActive;
    console.log('[DISPONIBILITE] Toggle vers:', nouvelleValeur);

    try {
      const result = await traducteurService.mettreAJourDisponibilite(utilisateur.traducteurId, {
        disponiblePourTravail: nouvelleValeur,
        commentaireDisponibilite: nouvelleValeur ? commentaireDisponibilite : undefined,
      });
      console.log('[DISPONIBILITE] Résultat:', result);
      setDisponibiliteActive(nouvelleValeur);
      if (!nouvelleValeur) setCommentaireDisponibilite('');
    } catch (err: any) {
      console.error('[DISPONIBILITE] Erreur mise à jour:', err);
      alert(`Erreur: ${err.response?.data?.erreur || err.message || 'Erreur lors de la mise à jour du statut'}`);
    } finally {
      setSavingDisponibilite(false);
    }
  };

  return (
    <AppLayout titre="Ma planification">
      {/* Statut de disponibilité */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🟢 Statut de disponibilité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Je cherche du travail</p>
                <p className="text-xs text-muted mt-1">
                  Les conseillers verront que vous êtes disponible pour recevoir des tâches
                </p>
              </div>
              <button
                onClick={handleToggleDisponibilite}
                disabled={savingDisponibilite}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  disponibiliteActive ? 'bg-green-500' : 'bg-gray-300'
                } ${savingDisponibilite ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={disponibiliteActive}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    disponibiliteActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {disponibiliteActive && (
              <div className="border-t pt-4">
                <FormField 
                  label="Commentaire (optionnel)"
                >
                  <Input
                    type="text"
                    value={commentaireDisponibilite}
                    onChange={e => setCommentaireDisponibilite(e.target.value)}
                    placeholder="Ex: Disponible pour révisions urgentes, préférence pour traduction juridique"
                    maxLength={200}
                  />
                </FormField>
                <Button
                  variant="secondaire"
                  onClick={async () => {
                    if (!utilisateur?.traducteurId) return;
                    setSavingDisponibilite(true);
                    try {
                      await traducteurService.mettreAJourDisponibilite(utilisateur.traducteurId, {
                        disponiblePourTravail: true,
                        commentaireDisponibilite,
                      });
                    } catch (err) {
                      alert('Erreur lors de la mise à jour');
                    } finally {
                      setSavingDisponibilite(false);
                    }
                  }}
                  disabled={savingDisponibilite}
                >
                  Enregistrer le commentaire
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Capacité totale" 
          value={formatHeures(resume.capacite)} 
          icon="📊" 
          variant="info"
          suffix=" h"
        />
        <StatCard 
          title="Tâches assignées" 
          value={formatHeures(resume.taches)} 
          icon="📝" 
          variant="warning"
          suffix=" h"
        />
        <StatCard 
          title="Temps bloqué" 
          value={formatHeures(resume.blocages)} 
          icon="🚫" 
          variant="default"
          suffix=" h"
        />
        <StatCard 
          title="Temps disponible" 
          value={formatHeures(resume.libre)} 
          icon="✅" 
          variant={percentageUtilise >= 100 ? 'danger' : percentageUtilise >= 75 ? 'warning' : 'success'}
          suffix=" h"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Résumé hebdomadaire (7 jours)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Utilisation globale</span>
              <span className="font-semibold">{percentageUtilise.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  percentageUtilise >= 100 ? 'bg-red-600' : 
                  percentageUtilise >= 75 ? 'bg-orange-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentageUtilise, 100)}%` }}
              />
            </div>
            <Button 
              className="mt-4" 
              full 
              variant="secondaire" 
              onClick={() => setOuvrirBlocage(true)}
            >
              + Bloquer du temps
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Calendrier simplifié (7 jours)</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (!planification || planification.planification.length === 0) ? (
            <EmptyState 
              icon="📅"
              title="Aucune planification disponible"
              description="Votre planification n'a pas encore été généré pour cette période"
            />
          ) : (
            <div className="grid grid-cols-7 gap-2" aria-label="Calendrier 7 jours">
              {planification?.planification.map((jour: any) => (
                <JourDetail
                  key={jour.date}
                  date={jour.date}
                  heuresTotal={jour.heuresTotal}
                  capacite={jour.capacite}
                  heuresTaches={jour.heuresTaches}
                  heuresBlocages={jour.heuresBlocages}
                  couleur={jour.couleur || 'libre'}
                />
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Modal
        titre="Bloquer du temps"
        ouvert={ouvrirBlocage}
        onFermer={() => setOuvrirBlocage(false)}
        ariaDescription="Formulaire pour bloquer des heures sur une journée"
      >
        <form onSubmit={handleCreerBlocage}>
          {erreur && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreur}
            </div>
          )}
          
          <p className="text-sm text-muted mb-4">
            Bloquez du temps pour vos activités personnelles, formations, réunions, etc.
          </p>

          <FormField label="Date" required>
            <Input
              type="date"
              value={blocageData.date}
              onChange={e => setBlocageData({ ...blocageData, date: e.target.value })}
              required
              min={dateISO(aujourdHui)}
            />
          </FormField>

          <FormField label="Heures à bloquer" required>
            <Input
              type="number"
              step="0.25"
              min="0"
              value={blocageData.heures || ''}
              onChange={e => setBlocageData({ ...blocageData, heures: parseFloat(e.target.value) || 0 })}
              required
              placeholder="7.5"
            />
          </FormField>

          <div className="flex justify-end gap-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOuvrirBlocage(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Création...' : 'Créer blocage'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};

export default DashboardTraducteur;
