import React, { useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanning } from '../hooks/usePlanning';
import { formatHeures } from '../lib/format';
import { JourDetail } from '../components/ui/JourDetail';

/**
 * Dashboard Traducteur - Structure de base
 * Agent 2 appliquera le design
 * Agent 3 implémentera la logique métier
 */
const DashboardTraducteur: React.FC = () => {
  const [ouvrirBlocage, setOuvrirBlocage] = useState(false);
  const { utilisateur } = useAuth();
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planning, loading, error } = usePlanning(utilisateur?.traducteurId, { dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });

  const resume = useMemo(() => {
    if (!planning) return { taches: 0, blocages: 0, libre: 0 };
    const jour0 = planning.planning[0];
    if (!jour0) return { taches: 0, blocages: 0, libre: 0 };
    return {
      taches: jour0.heuresTaches,
      blocages: jour0.heuresBlocages,
      libre: jour0.disponible,
    };
  }, [planning]);

  return (
    <AppLayout titre="Mon planning">
      <Card>
        <CardHeader><CardTitle>Résumé quotidien</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4" aria-label="Résumé des heures">
            <div className="card-base p-3 rounded-md text-center" aria-label="Heures tâches planifiées">
              <p className="text-xs text-muted">Tâches</p>
              <p className="text-lg font-semibold" aria-live="polite">{formatHeures(resume.taches)} h</p>
            </div>
            <div className="card-base p-3 rounded-md text-center" aria-label="Heures blocages">
              <p className="text-xs text-muted">Blocages</p>
              <p className="text-lg font-semibold" aria-live="polite">{formatHeures(resume.blocages)} h</p>
            </div>
            <div className="card-base p-3 rounded-md text-center" aria-label="Heures libres">
              <p className="text-xs text-muted">Libre</p>
              <p className="text-lg font-semibold" aria-live="polite">{formatHeures(resume.libre)} h</p>
            </div>
          </div>
          <Button className="mt-4" full variant="secondaire" aria-label="Ouvrir la fenêtre de blocage" onClick={() => setOuvrirBlocage(true)}>Bloquer du temps</Button>
          <p className="text-muted text-sm mt-3">Les données réelles seront injectées par Agent 3.</p>
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
        titre="Blocage de temps"
        ouvert={ouvrirBlocage}
        onFermer={() => setOuvrirBlocage(false)}
        ariaDescription="Formulaire pour bloquer des heures sur une journée"
      >
        <p className="text-sm text-muted mb-3">Action: bloquer une journée complète ou un nombre d'heures décimal.</p>
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Date (à venir)</span>
            <input disabled className="border border-border rounded-md px-3 py-2 text-sm bg-muted" placeholder="Sélectionner" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Heures (décimal)</span>
            <input disabled className="border border-border rounded-md px-3 py-2 text-sm bg-muted" placeholder="0.00" />
          </label>
          <div className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled aria-label="Bloquer journée complète" />
            <span>Journée complète</span>
          </div>
          <Button variant="primaire" disabled aria-label="Enregistrer blocage">Enregistrer</Button>
        </div>
        <p className="text-xs text-muted mt-4">Validation capacité journalière ajoutée par Agent 3.</p>
      </Modal>
    </AppLayout>
  );
};

export default DashboardTraducteur;
