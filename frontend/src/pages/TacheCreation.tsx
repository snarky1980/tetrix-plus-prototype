import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FormField, Textarea } from '../components/ui/FormField';
import { LoadingSpinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { traducteurService } from '../services/traducteurService';
import { clientService } from '../services/clientService';
import { sousDomaineService } from '../services/sousDomaineService';
import { tacheService } from '../services/tacheService';
import { repartitionService } from '../services/repartitionService';
import { Traducteur, Client, SousDomaine, PaireLinguistique } from '../types';

const TacheCreation: React.FC = () => {
  const navigate = useNavigate();
  const [etape, setEtape] = useState(1);
  
  // Données de référence
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sousDomaines, setSousDomaines] = useState<SousDomaine[]>([]);
  const [pairesDisponibles, setPairesDisponibles] = useState<PaireLinguistique[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState('');
  
  // Formulaire
  const [formData, setFormData] = useState({
    traducteurId: '',
    clientId: '',
    sousDomaineId: '',
    paireLinguistiqueId: '',
    description: '',
    heuresTotal: 0,
    dateEcheance: '',
    repartitionAuto: true,
    repartitionManuelle: [] as { date: string; heures: number }[],
  });

  // Preview JAT
  const [previewJAT, setPreviewJAT] = useState<{ date: string; heures: number }[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    if (formData.traducteurId) {
      const trad = traducteurs.find(t => t.id === formData.traducteurId);
      setPairesDisponibles(trad?.pairesLinguistiques || []);
      setFormData(prev => ({ ...prev, paireLinguistiqueId: '' }));
    }
  }, [formData.traducteurId, traducteurs]);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [traducs, cls, doms] = await Promise.all([
        traducteurService.obtenirTraducteurs({ actif: true }),
        clientService.obtenirClients(true),
        sousDomaineService.obtenirSousDomaines(true),
      ]);
      setTraducteurs(traducs);
      setClients(cls);
      setSousDomaines(doms);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setErreur('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const chargerPreviewJAT = async () => {
    if (!formData.traducteurId || !formData.heuresTotal || !formData.dateEcheance) {
      return;
    }
    setLoadingPreview(true);
    try {
      const preview = await repartitionService.previewJAT({
        traducteurId: formData.traducteurId,
        heuresTotal: formData.heuresTotal,
        dateEcheance: formData.dateEcheance,
      });
      setPreviewJAT(preview);
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur lors du calcul de la répartition');
      setPreviewJAT(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const ajouterRepartitionManuelle = () => {
    setFormData({
      ...formData,
      repartitionManuelle: [
        ...formData.repartitionManuelle,
        { date: '', heures: 0 },
      ],
    });
  };

  const retirerRepartitionManuelle = (index: number) => {
    setFormData({
      ...formData,
      repartitionManuelle: formData.repartitionManuelle.filter((_, i) => i !== index),
    });
  };

  const mettreAJourRepartitionManuelle = (
    index: number,
    champ: 'date' | 'heures',
    valeur: string | number
  ) => {
    const nouvelles = [...formData.repartitionManuelle];
    nouvelles[index] = { ...nouvelles[index], [champ]: valeur };
    setFormData({ ...formData, repartitionManuelle: nouvelles });
  };

  const validerEtape1 = () => {
    if (!formData.traducteurId) {
      setErreur('Veuillez sélectionner un traducteur');
      return false;
    }
    if (!formData.paireLinguistiqueId) {
      setErreur('Veuillez sélectionner une paire linguistique');
      return false;
    }
    if (!formData.description.trim()) {
      setErreur('Veuillez saisir une description');
      return false;
    }
    if (formData.heuresTotal <= 0) {
      setErreur('Les heures doivent être supérieures à 0');
      return false;
    }
    if (!formData.dateEcheance) {
      setErreur('Veuillez sélectionner une date d\'échéance');
      return false;
    }
    setErreur('');
    return true;
  };

  const handleEtape1Suivant = () => {
    if (validerEtape1()) {
      if (formData.repartitionAuto) {
        chargerPreviewJAT();
      }
      setEtape(2);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErreur('');

    try {
      const tache: any = {
        traducteurId: formData.traducteurId,
        paireLinguistiqueId: formData.paireLinguistiqueId,
        description: formData.description,
        heuresTotal: formData.heuresTotal,
        dateEcheance: formData.dateEcheance,
      };

      if (formData.clientId) tache.clientId = formData.clientId;
      if (formData.sousDomaineId) tache.sousDomaineId = formData.sousDomaineId;

      if (formData.repartitionAuto) {
        tache.repartitionAuto = true;
      } else {
        tache.repartition = formData.repartitionManuelle;
      }

      await tacheService.creerTache(tache);
      navigate('/conseiller');
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de la création de la tâche');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout titre="Créer une tâche">
        <LoadingSpinner message="Chargement..." />
      </AppLayout>
    );
  }

  const traducteurSelectionne = traducteurs.find(t => t.id === formData.traducteurId);
  const totalManuel = formData.repartitionManuelle.reduce((sum, r) => sum + r.heures, 0);

  return (
    <AppLayout titre="Créer une tâche">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {etape === 1 ? 'Étape 1 : Informations de la tâche' : 'Étape 2 : Répartition'}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={etape >= 1 ? 'success' : 'default'}>1</Badge>
                <Badge variant={etape >= 2 ? 'success' : 'default'}>2</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {erreur && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {erreur}
              </div>
            )}

            {etape === 1 && (
              <div className="space-y-4">
                <FormField label="Traducteur" required>
                  <Select
                    value={formData.traducteurId}
                    onChange={e => setFormData({ ...formData, traducteurId: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un traducteur...</option>
                    {traducteurs.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.disponiblePourTravail ? '🟢 ' : ''}{t.nom} - {t.division} ({t.capaciteHeuresParJour}h/jour)
                      </option>
                    ))}
                  </Select>
                </FormField>

                {formData.traducteurId && (
                  <FormField label="Paire linguistique" required>
                    <Select
                      value={formData.paireLinguistiqueId}
                      onChange={e => setFormData({ ...formData, paireLinguistiqueId: e.target.value })}
                      required
                    >
                      <option value="">Sélectionner une paire...</option>
                      {pairesDisponibles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.langueSource} → {p.langueCible}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}

                <FormField label="Client (optionnel)">
                  <Select
                    value={formData.clientId}
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Aucun client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Sous-domaine (optionnel)">
                  <Select
                    value={formData.sousDomaineId}
                    onChange={e => setFormData({ ...formData, sousDomaineId: e.target.value })}
                  >
                    <option value="">Aucun sous-domaine</option>
                    {sousDomaines.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nom}
                        {d.domaineParent && ` (${d.domaineParent})`}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Description" required>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    placeholder="Description de la tâche..."
                  />
                </FormField>

                <FormField label="Heures totales" required>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.heuresTotal || ''}
                    onChange={e =>
                      setFormData({ ...formData, heuresTotal: parseFloat(e.target.value) || 0 })
                    }
                    required
                    placeholder="7.5"
                  />
                </FormField>

                <FormField label="Date d'échéance" required>
                  <Input
                    type="date"
                    value={formData.dateEcheance}
                    onChange={e => setFormData({ ...formData, dateEcheance: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormField>

                <FormField label="Type de répartition">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={formData.repartitionAuto}
                        onChange={() => setFormData({ ...formData, repartitionAuto: true })}
                      />
                      <span className="text-sm">Automatique (Juste-à-temps)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!formData.repartitionAuto}
                        onChange={() => setFormData({ ...formData, repartitionAuto: false })}
                      />
                      <span className="text-sm">Manuelle</span>
                    </label>
                  </div>
                </FormField>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => navigate('/conseiller')}>
                    Annuler
                  </Button>
                  <Button onClick={handleEtape1Suivant}>
                    Suivant →
                  </Button>
                </div>
              </div>
            )}

            {etape === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-medium mb-2">Résumé de la tâche</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Traducteur:</span> {traducteurSelectionne?.nom}
                    </p>
                    <p>
                      <span className="font-medium">Heures:</span> {formData.heuresTotal}h
                    </p>
                    <p>
                      <span className="font-medium">Échéance:</span> {formData.dateEcheance}
                    </p>
                    <p>
                      <span className="font-medium">Capacité/jour:</span>{' '}
                      {traducteurSelectionne?.capaciteHeuresParJour}h
                    </p>
                  </div>
                </div>

                {formData.repartitionAuto ? (
                  <>
                    <h3 className="font-medium">Répartition automatique (Juste-à-temps)</h3>
                    {loadingPreview ? (
                      <LoadingSpinner message="Calcul de la répartition..." />
                    ) : previewJAT ? (
                      <div className="border rounded">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm">Date</th>
                              <th className="px-4 py-2 text-right text-sm">Heures</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewJAT.map((r, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-4 py-2 text-sm">{r.date}</td>
                                <td className="px-4 py-2 text-sm text-right">{r.heures}h</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted font-medium">
                            <tr>
                              <td className="px-4 py-2 text-sm">Total</td>
                              <td className="px-4 py-2 text-sm text-right">
                                {previewJAT.reduce((sum, r) => sum + r.heures, 0)}h
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        Impossible de calculer la répartition automatique.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-medium">Répartition manuelle</h3>
                    <div className="space-y-2">
                      {formData.repartitionManuelle.map((r, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            type="date"
                            value={r.date}
                            onChange={e => mettreAJourRepartitionManuelle(i, 'date', e.target.value)}
                            className="flex-1"
                            min={new Date().toISOString().split('T')[0]}
                            max={formData.dateEcheance}
                          />
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            value={r.heures || ''}
                            onChange={e =>
                              mettreAJourRepartitionManuelle(i, 'heures', parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                            placeholder="Heures"
                          />
                          <Button
                            variant="danger"
                            onClick={() => retirerRepartitionManuelle(i)}
                            className="px-3"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={ajouterRepartitionManuelle} className="w-full">
                        + Ajouter une date
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded text-sm">
                      <span className="font-medium">Total réparti:</span> {totalManuel}h /{' '}
                      {formData.heuresTotal}h
                      {totalManuel !== formData.heuresTotal && (
                        <span className="text-red-600 ml-2">
                          (Manque {formData.heuresTotal - totalManuel}h)
                        </span>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setEtape(1)}>
                    ← Précédent
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      (formData.repartitionAuto && !previewJAT) ||
                      (!formData.repartitionAuto && totalManuel !== formData.heuresTotal)
                    }
                  >
                    {submitting ? 'Création...' : 'Créer la tâche'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TacheCreation;
