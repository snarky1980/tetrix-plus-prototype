import React, { useMemo, useState } from 'react';
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
import { usePlanning } from '../hooks/usePlanning';
import { formatHeures } from '../lib/format';
import { JourDetail } from '../components/ui/JourDetail';
import api from '../services/api';

/**
 * Dashboard Traducteur - Planning personnel et blocage de temps
 */
const DashboardTraducteur: React.FC = () => {
  usePageTitle('Traducteur Tetrix PLUS', 'Consultez votre planning et bloquez votre temps');
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const [blocageData, setBlocageData] = useState({ date: '', heures: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState('');
  const { utilisateur } = useAuth();
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planning, loading, error, refresh } = usePlanning(utilisateur?.traducteurId, { 
    dateDebut: dateISO(aujourdHui), 
    dateFin: dateISO(fin) 
  });

  const resume = useMemo(() => {
    if (!planning) return { taches: 0, blocages: 0, libre: 0, capacite: 0 };
    const totaux = planning.planning.reduce((acc, jour) => ({
      taches: acc.taches + jour.heuresTaches,
      blocages: acc.blocages + jour.heuresBlocages,
      libre: acc.libre + jour.disponible,
      capacite: acc.capacite + jour.capacite,
    }), { taches: 0, blocages: 0, libre: 0, capacite: 0 });
    return totaux;
  }, [planning]);

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

  return (
    <AppLayout titre="Mon planning">
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
          ) : (!planning || planning.planning.length === 0) ? (
            <EmptyState 
              icon="📅"
              title="Aucun planning disponible"
              description="Votre planning n'a pas encore été généré pour cette période"
            />
          ) : (
            <div className="grid grid-cols-7 gap-2" aria-label="Calendrier 7 jours">
              {planning?.planning.map((jour) => (
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
