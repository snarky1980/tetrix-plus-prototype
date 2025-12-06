import React, { useState, ChangeEvent } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';
import { useRepartition } from '../hooks/useRepartition';
import { Input } from '../components/ui/Input';

const TacheCreationEtape1: React.FC = () => {
  usePageTitle('Tetrix PLUS Création Tâche', 'Créez une nouvelle tâche de traduction');
  const [heuresTotal, setHeuresTotal] = useState(0);
  const [dateEcheance, setDateEcheance] = useState('');
  const traducteurId = 'demo'; // Placeholder jusqu'à intégration vraie sélection
  const { previewJAT, jatPreview, erreurs, loadingJAT } = useRepartition({ traducteurId, heuresTotal, dateEcheance: dateEcheance || new Date().toISOString().split('T')[0] });
  const disabled = heuresTotal <= 0 || !dateEcheance;
  return (
    <AppLayout titre="Création tâche – Étape 1">
      <Card>
        <CardHeader><CardTitle>Métadonnées de la tâche</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2" aria-label="Formulaire création tâche">
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="traducteur">Traducteur</label>
              <Select id="traducteur" disabled aria-label="Sélection traducteur"><option>—</option></Select>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="client">Client (optionnel)</label>
              <Select id="client" disabled aria-label="Sélection client"><option>—</option></Select>
            </div>
            <div className="flex flex-col gap-1 text-sm md:col-span-2">
              <label htmlFor="sousDomaine">Sous-domaine (optionnel)</label>
              <Select id="sousDomaine" disabled aria-label="Sélection sous-domaine"><option>—</option></Select>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="paire">Paire linguistique *</label>
              <Select id="paire" disabled aria-label="Sélection paire linguistique"><option>—</option></Select>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="heures">Heures totales (décimal)</label>
              <Input id="heures" placeholder="0.00" aria-label="Heures totales" value={heuresTotal === 0 ? '' : heuresTotal} onChange={(e: ChangeEvent<HTMLInputElement>) => setHeuresTotal(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="dateEcheance">Date d'échéance</label>
              <Input id="dateEcheance" placeholder="YYYY-MM-DD" aria-label="Date d'échéance" value={dateEcheance} onChange={(e: ChangeEvent<HTMLInputElement>) => setDateEcheance(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 text-sm md:col-span-2">
              <label htmlFor="description">Description</label>
              <Input id="description" disabled placeholder="Brève description" aria-label="Description tâche" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="primaire" aria-label="Preview JAT" disabled={disabled || loadingJAT} onClick={() => previewJAT()}>Prévisualiser JAT</Button>
            <Button variant="outline" disabled={disabled} aria-label="Passer répartition manuelle">Répartition manuelle</Button>
          </div>
          {loadingJAT && <p className="text-xs text-muted mt-2">Calcul JAT…</p>}
          {jatPreview && (
            <div className="mt-3 text-xs space-y-1" aria-label="Résultat JAT">
              <p className="font-medium">Proposition JAT:</p>
              {jatPreview.map(r => <div key={r.date}>{r.date}: {r.heures.toFixed(2)}h</div>)}
            </div>
          )}
          {erreurs.length > 0 && <div className="mt-2 text-xs text-red-600" role="alert">{erreurs.join(' | ')}</div>}
          <p className="text-xs text-muted mt-4">La validation et l'algorithme JAT seront ajoutés par Agent 3.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TacheCreationEtape1;
