/**
 * TETRIX ORION - Affichage du Rapport Statistique Avancé
 * 
 * Composant d'affichage structuré du rapport d'analyse Orion
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

// Types
interface RapportOrion {
  resumeExecutif: any;
  indicateursCles: any;
  diagnosticComplet: any;
  recommandations: any[];
  projections: any;
  observations: any;
  horodatage: string;
  periodeCouverture: { debut: string; fin: string };
}

interface TetrixOrionDisplayProps {
  rapport: RapportOrion;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function TetrixOrionDisplay({ rapport }: TetrixOrionDisplayProps) {
  if (!rapport) {
    return <div className="p-4 text-gray-500">Aucun rapport disponible</div>;
  }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-4">
      {/* En-tête */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">🔭 Tetrix Orion</h2>
        <p className="text-sm text-gray-600 mt-1">
          Analyse Statistique Avancée
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Période: {formatDate(rapport.periodeCouverture.debut)} → {formatDate(rapport.periodeCouverture.fin)}
        </p>
      </div>

      {/* 1. RÉSUMÉ EXÉCUTIF */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">1. Résumé Exécutif</h3>
        <Card className={`${getEtatColor(rapport.resumeExecutif.etatGeneral)} border-2`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${getEtatBadge(rapport.resumeExecutif.etatGeneral)} text-sm px-3 py-1`}>
                {rapport.resumeExecutif.etatGeneral}
              </Badge>
              <span className="text-xs text-gray-500">
                État général du planning
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              {rapport.resumeExecutif.visionEnsemble}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Risques */}
              {rapport.resumeExecutif.principauxRisques.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 text-sm mb-2">⚠️ Principaux Risques</h4>
                  <ul className="space-y-1">
                    {rapport.resumeExecutif.principauxRisques.map((risque: string, idx: number) => (
                      <li key={idx} className="text-xs text-red-700">• {risque}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Forces */}
              {rapport.resumeExecutif.principalesForces.length > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 text-sm mb-2">✓ Principales Forces</h4>
                  <ul className="space-y-1">
                    {rapport.resumeExecutif.principalesForces.map((force: string, idx: number) => (
                      <li key={idx} className="text-xs text-green-700">• {force}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 text-sm mb-1">💡 Recommandation Clé</h4>
              <p className="text-sm text-blue-700">{rapport.resumeExecutif.recommandationCle}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. INDICATEURS CLÉS (KPIs) */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">2. Indicateurs Clés</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="Utilisation Moyenne"
            value={`${rapport.indicateursCles.tauxUtilisationMoyen}%`}
            trend={rapport.indicateursCles.evolutionVsPeriodePrecedente.tendance}
            status={getUtilisationStatus(rapport.indicateursCles.tauxUtilisationMoyen)}
          />
          <KPICard
            label="Jours Surcharge"
            value={`${rapport.indicateursCles.pourcentageJoursSurcharge}%`}
            status={rapport.indicateursCles.pourcentageJoursSurcharge > 20 ? 'warning' : 'success'}
          />
          <KPICard
            label="Ratio TR1/TR3"
            value={rapport.indicateursCles.ratioChargeTR1CapaciteTR3.toFixed(2)}
            status={rapport.indicateursCles.ratioChargeTR1CapaciteTR3 > 1 ? 'danger' : 'success'}
          />
          <KPICard
            label="Score Risque"
            value={rapport.diagnosticComplet.risques.scoreRisqueGlobal}
            status={getRisqueStatus(rapport.diagnosticComplet.risques.scoreRisqueGlobal)}
          />
        </div>
      </section>

      {/* 3. RECOMMANDATIONS PRIORISÉES */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">3. Recommandations Priorisées</h3>
        <div className="space-y-3">
          {rapport.recommandations.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune recommandation - situation optimale</p>
          ) : (
            rapport.recommandations.map((rec: any) => (
              <RecommandationCard key={rec.id} recommandation={rec} />
            ))
          )}
        </div>
      </section>

      {/* 4. DIAGNOSTIC COMPLET */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">4. Diagnostic Complet</h3>
        
        {/* 4.1 Capacité & Saturation */}
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4.1 Capacité & Saturation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Jours critiques (&gt;90%):</span>
                <span className="font-semibold">{rapport.diagnosticComplet.capacite.joursCritiques}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Jours vides (&lt;30%):</span>
                <span className="font-semibold">{rapport.diagnosticComplet.capacite.joursVides}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tendance:</span>
                <Badge variant="default">{rapport.diagnosticComplet.capacite.tendanceSaturation}</Badge>
              </div>
            </div>
            {rapport.diagnosticComplet.capacite.observations.length > 0 && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1">
                {rapport.diagnosticComplet.capacite.observations.map((obs: string, idx: number) => (
                  <p key={idx} className="text-gray-700">• {obs}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4.2 Profils TR1/TR2/TR3 */}
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4.2 Analyse TR1 / TR2 / TR3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-xs text-gray-600">TR1</div>
                <div className="font-bold text-lg">{rapport.diagnosticComplet.profils.repartitionVolume.TR1}</div>
                <div className="text-xs text-gray-600">{rapport.diagnosticComplet.profils.tauxUtilisation.TR1}%</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-xs text-gray-600">TR2</div>
                <div className="font-bold text-lg">{rapport.diagnosticComplet.profils.repartitionVolume.TR2}</div>
                <div className="text-xs text-gray-600">{rapport.diagnosticComplet.profils.tauxUtilisation.TR2}%</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-xs text-gray-600">TR3</div>
                <div className="font-bold text-lg">{rapport.diagnosticComplet.profils.repartitionVolume.TR3}</div>
                <div className="text-xs text-gray-600">{rapport.diagnosticComplet.profils.tauxUtilisation.TR3}%</div>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border-2 ${getStatutTR1TR3Color(rapport.diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.statut)}`}>
              <div className="text-sm font-medium mb-2">
                Charge TR1 vs Capacité Révision TR3
              </div>
              <div className="text-xs space-y-1">
                <div>Traduction TR1: {rapport.diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.heuresTraductionTR1}h</div>
                <div>Révision TR3: {rapport.diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.heuresRevisionDisponiblesTR3}h</div>
                <div className="font-bold">Ratio: {rapport.diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.ratio.toFixed(2)}</div>
                <Badge className="mt-2">{rapport.diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.statut}</Badge>
              </div>
            </div>

            {rapport.diagnosticComplet.profils.observations.length > 0 && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1">
                {rapport.diagnosticComplet.profils.observations.map((obs: string, idx: number) => (
                  <p key={idx} className="text-gray-700">• {obs}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4.3 Domaines */}
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4.3 Domaines & Spécialités</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rapport.diagnosticComplet.domaines.volumeParDomaine.slice(0, 5).map((dom: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{dom.domaine}</span>
                      <span className="font-semibold">{dom.heures}h ({dom.pourcentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${dom.pourcentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rapport.diagnosticComplet.domaines.goulots.length > 0 && (
              <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-200">
                <h5 className="text-sm font-medium text-orange-800 mb-2">⚠️ Goulots Identifiés</h5>
                {rapport.diagnosticComplet.domaines.goulots.map((goulot: any, idx: number) => (
                  <div key={idx} className="text-xs text-orange-700">
                    • {goulot.domaine}: surcharge de {goulot.surcharge}h
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4.4 Tâches & Modes */}
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4.4 Tâches & Modes de Répartition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded text-center">
                <div className="text-xs text-gray-600">Traduction</div>
                <div className="font-bold text-lg">{rapport.diagnosticComplet.taches.volumeTraductionVsRevision.traduction}h</div>
              </div>
              <div className="p-2 bg-purple-50 rounded text-center">
                <div className="text-xs text-gray-600">Révision</div>
                <div className="font-bold text-lg">{rapport.diagnosticComplet.taches.volumeTraductionVsRevision.revision}h</div>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Ratio Traduction/Révision:</span>
              <span className="font-semibold ml-2">{rapport.diagnosticComplet.taches.volumeTraductionVsRevision.ratio.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 4.5 Risques */}
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4.5 Analyse des Risques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <h5 className="text-sm font-medium text-red-800 mb-2">Échéances</h5>
                <div className="text-xs space-y-1 text-red-700">
                  <div>Tâches en retard: {rapport.diagnosticComplet.risques.risquesEcheances.tachesEnRetard}</div>
                  <div>Tâches à risque: {rapport.diagnosticComplet.risques.risquesEcheances.tachesRisque}</div>
                </div>
              </div>

              {rapport.diagnosticComplet.risques.risquesStructurels.length > 0 && (
                <div className="p-3 bg-orange-50 rounded border border-orange-200">
                  <h5 className="text-sm font-medium text-orange-800 mb-2">Risques Structurels</h5>
                  {rapport.diagnosticComplet.risques.risquesStructurels.map((risque: any, idx: number) => (
                    <div key={idx} className="text-xs text-orange-700 mb-1">
                      <Badge className="mr-2" variant={risque.gravite === 'CRITIQUE' ? 'danger' : 'default'}>
                        {risque.gravite}
                      </Badge>
                      {risque.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. PROJECTIONS */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">5. Projections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">7 Prochains Jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Heures prévues:</span>
                  <span className="font-semibold">{rapport.projections.charge7Jours.heuresPrevues}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacité:</span>
                  <span className="font-semibold">{rapport.projections.charge7Jours.capaciteDisponible}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilisation:</span>
                  <Badge variant={rapport.projections.charge7Jours.statut === 'SATURE' ? 'danger' : 'default'}>
                    {rapport.projections.charge7Jours.tauxUtilisationPrevu}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">14 Prochains Jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Heures prévues:</span>
                  <span className="font-semibold">{rapport.projections.charge14Jours.heuresPrevues}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacité:</span>
                  <span className="font-semibold">{rapport.projections.charge14Jours.capaciteDisponible}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilisation:</span>
                  <Badge variant={rapport.projections.charge14Jours.statut === 'SATURE' ? 'danger' : 'default'}>
                    {rapport.projections.charge14Jours.tauxUtilisationPrevu}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="text-sm font-medium text-blue-800 mb-2">Impact TR1/TR3</h5>
          <p className="text-xs text-blue-700">{rapport.projections.impactTR1TR3}</p>
        </div>
      </section>

      {/* 6. OBSERVATIONS ADDITIONNELLES */}
      {(rapport.observations.anomalies.length > 0 || 
        rapport.observations.gainsEfficacite.length > 0 || 
        rapport.observations.notesGestion.length > 0) && (
        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">6. Observations Additionnelles</h3>
          
          {rapport.observations.anomalies.length > 0 && (
            <Card className="mb-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Anomalies Détectées</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {rapport.observations.anomalies.map((anom: string, idx: number) => (
                    <li key={idx} className="text-xs text-gray-700">• {anom}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {rapport.observations.gainsEfficacite.length > 0 && (
            <Card className="mb-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Gains d'Efficacité Possibles</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {rapport.observations.gainsEfficacite.map((gain: string, idx: number) => (
                    <li key={idx} className="text-xs text-green-700">• {gain}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {rapport.observations.notesGestion.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes Gestion</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {rapport.observations.notesGestion.map((note: string, idx: number) => (
                    <li key={idx} className="text-xs text-blue-700">• {note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Pied de page */}
      <div className="text-center text-xs text-gray-500 pt-4 border-t">
        Rapport généré le {new Date(rapport.horodatage).toLocaleString('fr-CA')}
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANTS HELPERS
// ============================================================================

function KPICard({ label, value, trend, status }: any) {
  return (
    <Card className={`${getStatusColor(status)} border-2`}>
      <CardContent className="pt-4 text-center">
        <div className="text-xs text-gray-600 mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="text-xs mt-1">
            {trend === 'HAUSSE' && '📈'}
            {trend === 'BAISSE' && '📉'}
            {trend === 'STABLE' && '➡️'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommandationCard({ recommandation }: any) {
  const { priorite, categorie, titre, description, actionConcrete, impactAttendu, effort } = recommandation;
  
  return (
    <Card className={`${getPrioriteColor(priorite)} border-l-4`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getPrioriteIcon(priorite)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-sm">{titre}</h4>
              <Badge variant="default" className="text-xs">{categorie}</Badge>
              <Badge variant="default" className="text-xs">Effort: {effort}</Badge>
            </div>
            <p className="text-xs text-gray-700 mb-2">{description}</p>
            <div className="p-2 bg-white/50 rounded text-xs space-y-1">
              <div><span className="font-medium">Action:</span> {actionConcrete}</div>
              <div><span className="font-medium">Impact:</span> {impactAttendu}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function getEtatColor(etat: string): string {
  switch (etat) {
    case 'EXCELLENT': return 'bg-green-50 border-green-300';
    case 'BON': return 'bg-blue-50 border-blue-300';
    case 'ACCEPTABLE': return 'bg-yellow-50 border-yellow-300';
    case 'PREOCCUPANT': return 'bg-orange-50 border-orange-300';
    case 'CRITIQUE': return 'bg-red-50 border-red-300';
    default: return 'bg-gray-50 border-gray-300';
  }
}

function getEtatBadge(etat: string): string {
  switch (etat) {
    case 'EXCELLENT': return 'bg-green-500 text-white';
    case 'BON': return 'bg-blue-500 text-white';
    case 'ACCEPTABLE': return 'bg-yellow-500 text-white';
    case 'PREOCCUPANT': return 'bg-orange-500 text-white';
    case 'CRITIQUE': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}

function getUtilisationStatus(taux: number): string {
  if (taux < 50) return 'info';
  if (taux >= 70 && taux <= 85) return 'success';
  if (taux > 85) return 'warning';
  return 'info';
}

function getRisqueStatus(score: number): string {
  if (score > 60) return 'danger';
  if (score > 40) return 'warning';
  return 'success';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'bg-green-50 border-green-300';
    case 'warning': return 'bg-orange-50 border-orange-300';
    case 'danger': return 'bg-red-50 border-red-300';
    case 'info': return 'bg-blue-50 border-blue-300';
    default: return 'bg-gray-50 border-gray-300';
  }
}

function getPrioriteColor(priorite: string): string {
  switch (priorite) {
    case 'P1': return 'border-red-500';
    case 'P2': return 'border-orange-500';
    case 'P3': return 'border-green-500';
    default: return 'border-gray-300';
  }
}

function getPrioriteIcon(priorite: string): string {
  switch (priorite) {
    case 'P1': return '🔴';
    case 'P2': return '🟡';
    case 'P3': return '🟢';
    default: return '⚪';
  }
}

function getStatutTR1TR3Color(statut: string): string {
  switch (statut) {
    case 'EQUILIBRE': return 'bg-green-50 border-green-300';
    case 'TENSION': return 'bg-yellow-50 border-yellow-300';
    case 'SATURE': return 'bg-orange-50 border-orange-300';
    case 'CRITIQUE': return 'bg-red-50 border-red-300';
    default: return 'bg-gray-50 border-gray-300';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}
