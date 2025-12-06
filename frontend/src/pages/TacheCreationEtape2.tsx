import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';
import { useRepartition } from '../hooks/useRepartition';
import { Input } from '../components/ui/Input';

const TacheCreationEtape2: React.FC = () => {
  usePageTitle('Tetrix PLUS Répartition', 'Définissez la répartition des heures');
  const [heuresTotal, setHeuresTotal] = useState(0);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const traducteurId = 'demo';
  const dateEcheance = useMemo(() => dateFin || new Date().toISOString().split('T')[0], [dateFin]);
  const { previewJAT, genererUniforme, jatPreview, uniforme, erreurs, loadingJAT } = useRepartition({ traducteurId, heuresTotal, dateEcheance });
  const disableGen = heuresTotal <= 0 || !dateDebut || !dateFin;
  return (
    <AppLayout titre="Création tâche – Répartition">
      <Card>
        <CardHeader><CardTitle>Répartition des heures</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted text-sm mb-4">Ajustez les heures par jour. La somme doit égaler les heures totales et aucune journée ne doit dépasser la capacité.</p>
          <div className="grid gap-3 md:grid-cols-5 mb-4 text-xs">
            <label className="flex flex-col gap-1">Heures totales
              <Input value={heuresTotal === 0 ? '' : heuresTotal} onChange={e => setHeuresTotal(parseFloat(e.target.value) || 0)} placeholder="0.00" aria-label="Heures totales" />
            </label>
            <label className="flex flex-col gap-1">Date début
              <Input value={dateDebut} onChange={e => setDateDebut(e.target.value)} placeholder="YYYY-MM-DD" aria-label="Date début" />
            </label>
            <label className="flex flex-col gap-1">Date fin
              <Input value={dateFin} onChange={e => setDateFin(e.target.value)} placeholder="YYYY-MM-DD" aria-label="Date fin" />
            </label>
            <div className="flex flex-col gap-1">JAT Échéance
              <Input value={dateEcheance} disabled aria-label="Date échéance JAT" />
            </div>
            <div className="flex flex-col gap-1">Statut validation
              <Input disabled value={erreurs.length === 0 ? '✓ OK' : 'Erreurs'} aria-label="Statut validation" />
            </div>
          </div>
          <div className="overflow-auto rounded-md border border-border" aria-label="Table de répartition">
            <table className="w-full text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Heures proposées</th>
                  <th className="text-left px-3 py-2">Planifiées</th>
                  <th className="text-left px-3 py-2">Capacité restante</th>
                </tr>
              </thead>
              <tbody>
                {(uniforme || jatPreview || []).map((r) => (
                  <tr key={r.date} className="even:bg-muted/40">
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">
                      <input aria-label={`Heures proposées ${r.date}`} defaultValue={r.heures.toFixed(2)} className="w-20 border border-border rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2">{r.heures.toFixed(2)}</td>
                    <td className="px-3 py-2">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="secondaire" aria-label="Répartition uniforme" disabled={disableGen} onClick={() => genererUniforme(dateDebut, dateFin)}>Uniforme</Button>
            <Button variant="outline" aria-label="Algorithme juste-à-temps" disabled={heuresTotal <= 0 || loadingJAT} onClick={() => previewJAT()}>JAT</Button>
            <Button variant="ghost" aria-label="Effacer la répartition" onClick={() => { /* reset */ }} disabled={!uniforme && !jatPreview}>Effacer</Button>
            <Button variant="primaire" aria-label="Enregistrer la tâche" disabled={erreurs.length > 0 || (uniforme?.length ?? jatPreview?.length ?? 0) === 0}>Enregistrer</Button>
          </div>
          {loadingJAT && <p className="text-xs text-muted mt-2">Calcul JAT…</p>}
          {erreurs.length > 0 && <p className="text-xs text-red-600 mt-2" role="alert">{erreurs.join(' | ')}</p>}
          <p className="text-xs text-muted mt-4">Logique de validation temps & capacité ajoutée par Agent 3.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TacheCreationEtape2;
