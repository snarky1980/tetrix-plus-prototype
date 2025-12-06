import React, { useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { FormField } from '../components/ui/FormField';
import { useAuth } from '../contexts/AuthContext';
import { usePlanning } from '../hooks/usePlanning';
import { formatHeures } from '../lib/format';
import { JourDetail } from '../components/ui/JourDetail';
import api from '../services/api';

/**
 * Dashboard Traducteur - Planning personnel et blocage de temps
 */
const DashboardTraducteur: React.FC = () => {
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
      <Card>
        <CardHeader><CardTitle>Résumé hebdomadaire (7 jours)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-md text-center bg-blue-50">
              <p className="text-xs text-muted">Capacité</p>
              <p className="text-lg font-semibold">{formatHeures(resume.capacite)} h</p>
            </div>
            <div className="p-3 rounded-md text-center bg-purple-50">
              <p className="text-xs text-muted">Tâches</p>
              <p className="text-lg font-semibold">{formatHeures(resume.taches)} h</p>
            </div>
            <div className="p-3 rounded-md text-center bg-orange-50">
              <p className="text-xs text-muted">Blocages</p>
              <p className="text-lg font-semibold">{formatHeures(resume.blocages)} h</p>
            </div>
            <div className="p-3 rounded-md text-center bg-green-50">
              <p className="text-xs text-muted">Disponible</p>
              <p className="text-lg font-semibold">{formatHeures(resume.libre)} h</p>
            </div>
          </div>
          <Button 
            className="mt-4" 
            full 
            variant="secondaire" 
            onClick={() => setOuvrirBlocage(true)}
          >
            + Bloquer du temps
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Calendrier simplifié (7 jours)</CardTitle></CardHeader>
        <CardContent>
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
            {(!planning || planning.planning.length === 0) && !loading && (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-3 rounded-md border border-border bg-white min-h-[90px]">
                  <span className="text-xs font-medium">Jour {i + 1}</span>
                  <span className="mt-2 px-2 py-1 rounded text-xs bg-muted text-foreground/70" aria-label="Disponibilité">—</span>
                </div>
              ))
            )}
          </div>
          {loading && <p className="text-xs text-muted mt-2">Chargement...</p>}
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
