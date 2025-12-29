/**
 * TETRIX MAX - Tableau de Bord Unifié
 * 
 * Design professionnel, épuré et entièrement redimensionnable.
 * Interface moderne avec panneaux adaptatifs et tooltips informatifs.
 */

import React, { useState } from 'react';
import { Badge } from '../ui/Badge';

// ============================================================================
// TYPES
// ============================================================================

interface TetrixMaxUnifiedProps {
  rapport: any;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// ============================================================================
// COMPOSANT TOOLTIP INFORMATIF
// ============================================================================

interface TooltipInfoProps {
  texte: string;
  children: React.ReactNode;
}

function TooltipInfo({ texte, children }: TooltipInfoProps) {
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  
  const calculatePosition = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 288; // w-72 = 18rem = 288px
    const tooltipHeight = 80; // estimation
    const padding = 8;
    
    // Calculer la position horizontale
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    
    // Empêcher le débordement à gauche
    if (left < padding) {
      left = padding;
    }
    
    // Empêcher le débordement à droite
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    
    // Calculer la position verticale (préférer au-dessus)
    const spaceAbove = rect.top;
    
    let top: number;
    let position: 'top' | 'bottom';
    
    if (spaceAbove >= tooltipHeight + padding) {
      // Positionner au-dessus
      top = rect.top - padding;
      position = 'top';
    } else {
      // Positionner en dessous
      top = rect.bottom + padding;
      position = 'bottom';
    }
    
    setTooltipStyle({
      position: 'fixed',
      left: `${left}px`,
      top: position === 'top' ? `${top}px` : `${top}px`,
      transform: position === 'top' ? 'translateY(-100%)' : 'none',
      zIndex: 99999,
    });
  };

  const handleMouseEnter = () => {
    calculatePosition();
    setVisible(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!visible) {
      calculatePosition();
    }
    setVisible(!visible);
  };
  
  return (
    <span className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      {children}
      <button
        ref={buttonRef}
        type="button"
        className="ml-1.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-[11px] inline-flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-help flex-shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        onClick={handleClick}
        aria-label="Plus d'informations"
      >
        ?
      </button>
      {visible && (
        <div 
          ref={tooltipRef}
          className="w-72 p-3 bg-slate-900 text-white text-xs leading-relaxed rounded-lg shadow-2xl pointer-events-none"
          style={tooltipStyle}
        >
          {texte}
        </div>
      )}
    </span>
  );
}

// ============================================================================
// COMPOSANT SCORE CIRCULAIRE
// ============================================================================

interface ScoreCirculaireProps {
  score: number;
  taille?: 'sm' | 'md' | 'lg';
}

function ScoreCirculaire({ score, taille = 'md' }: ScoreCirculaireProps) {
  const dimensions = { sm: 80, md: 100, lg: 120 };
  const size = dimensions[taille];
  const strokeWidth = taille === 'sm' ? 6 : taille === 'md' ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-600' };
    if (s >= 60) return { stroke: '#3b82f6', text: 'text-blue-600' };
    if (s >= 40) return { stroke: '#f59e0b', text: 'text-amber-600' };
    return { stroke: '#ef4444', text: 'text-red-600' };
  };
  
  const colors = getColor(score);
  const fontSize = taille === 'sm' ? 'text-lg' : taille === 'md' ? 'text-2xl' : 'text-3xl';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <span className={`absolute ${fontSize} font-bold ${colors.text}`}>{score}</span>
    </div>
  );
}

// ============================================================================
// COMPOSANT KPI COMPACT
// ============================================================================

interface KPIProps {
  label: string;
  valeur: string | number;
  unite?: string;
  status: 'excellent' | 'bon' | 'attention' | 'danger';
  tooltip: string;
  compact?: boolean;
}

function KPI({ label, valeur, unite, status, tooltip, compact }: KPIProps) {
  const statusColors = {
    excellent: 'border-l-emerald-500 bg-emerald-50/50',
    bon: 'border-l-blue-500 bg-blue-50/50',
    attention: 'border-l-amber-500 bg-amber-50/50',
    danger: 'border-l-red-500 bg-red-50/50',
  };

  const textColors = {
    excellent: 'text-emerald-700',
    bon: 'text-blue-700',
    attention: 'text-amber-700',
    danger: 'text-red-700',
  };

  return (
    <div className={`border-l-4 ${statusColors[status]} rounded-r-lg p-3 ${compact ? 'p-2' : ''}`}>
      <TooltipInfo texte={tooltip}>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </TooltipInfo>
      <div className={`${compact ? 'text-lg' : 'text-xl'} font-bold ${textColors[status]} mt-0.5`}>
        {valeur}{unite && <span className="text-sm font-normal ml-0.5">{unite}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT ALERTE
// ============================================================================

interface AlerteProps {
  type: 'critique' | 'important' | 'info';
  message: string;
}

function Alerte({ type, message }: AlerteProps) {
  const styles = {
    critique: 'bg-red-50 border-red-200 text-red-800',
    important: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    critique: '🚨',
    important: '⚠️',
    info: '💡',
  };

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${styles[type]}`}>
      <span className="flex-shrink-0">{icons[type]}</span>
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  );
}

// ============================================================================
// COMPOSANT RECOMMANDATION
// ============================================================================

interface RecommandationItemProps {
  priorite: number;
  titre: string;
  description: string;
  action: string;
  impact: string;
}

function RecommandationItem({ priorite, titre, description, action, impact }: RecommandationItemProps) {
  const prioriteConfig = {
    1: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Urgent', dot: 'bg-red-500' },
    2: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Important', dot: 'bg-amber-500' },
    3: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Suggéré', dot: 'bg-green-500' },
  };

  const config = prioriteConfig[priorite as keyof typeof prioriteConfig] || prioriteConfig[3];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot} mt-1.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="font-semibold text-slate-900 text-sm">{titre}</h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-2 leading-relaxed">{description}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">Action:</span> {action}
            </span>
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">Impact:</span> {impact}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT JAUGE TRADUCTEUR
// ============================================================================

interface JaugeTraducteurProps {
  nom: string;
  profil: string;
  utilisation: number;
  heures: number;
  capacite: number;
}

function JaugeTraducteur({ nom, profil, utilisation, heures, capacite }: JaugeTraducteurProps) {
  const getBarColor = (u: number) => {
    if (u > 100) return 'bg-red-500';
    if (u > 85) return 'bg-amber-500';
    if (u >= 70) return 'bg-emerald-500';
    return 'bg-slate-400';
  };

  const profilColors: Record<string, string> = {
    TR1: 'bg-blue-100 text-blue-700',
    TR2: 'bg-green-100 text-green-700',
    TR3: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-48 flex items-center gap-1.5 flex-shrink-0">
        <span className="text-sm font-medium text-slate-700" title={nom}>{nom}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${profilColors[profil] || 'bg-slate-100 text-slate-600'}`}>
          {profil}
        </span>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor(utilisation)} rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(utilisation, 100)}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 w-20 text-right tabular-nums">
          {heures.toFixed(1)}h / {capacite}h
        </span>
        <span className={`text-xs font-bold w-12 text-right ${utilisation > 100 ? 'text-red-600' : utilisation > 85 ? 'text-amber-600' : 'text-slate-600'}`}>
          {utilisation.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT SECTION PLIABLE
// ============================================================================

interface SectionProps {
  titre: string;
  icone: string;
  badge?: { texte: string; type: 'success' | 'warning' | 'danger' | 'info' };
  children: React.ReactNode;
  defaultOpen?: boolean;
  tooltip?: string;
}

function Section({ titre, icone, badge, children, defaultOpen = false, tooltip }: SectionProps) {
  const [ouvert, setOuvert] = useState(defaultOpen);

  const badgeStyles = {
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icone}</span>
          <span className="font-medium text-slate-800 text-sm">{titre}</span>
          {tooltip && (
            <TooltipInfo texte={tooltip}>
              <span></span>
            </TooltipInfo>
          )}
          {badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyles[badge.type]}`}>
              {badge.texte}
            </span>
          )}
        </div>
        <button
          onClick={() => setOuvert(!ouvert)}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
          aria-label={ouvert ? 'Réduire' : 'Développer'}
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {ouvert && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function TetrixMaxUnified({ rapport, onRefresh, isLoading }: TetrixMaxUnifiedProps) {
  const [onglet, setOnglet] = useState<'apercu' | 'details' | 'optimisations' | 'projections'>('apercu');

  // État de chargement
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-slate-200 rounded-full animate-spin border-t-blue-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">Analyse en cours...</p>
        <p className="text-xs text-slate-400 mt-1">Tetrix Max prépare votre rapport</p>
      </div>
    );
  }

  // Aucune donnée
  if (!rapport) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-slate-600 font-medium">Aucune donnée disponible</p>
        <p className="text-sm text-slate-400 mt-1">Lancez une analyse pour voir les résultats</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Générer le rapport
          </button>
        )}
      </div>
    );
  }

  // Extraction des données
  const { resumeExecutif, indicateursCles, diagnosticComplet, recommandations, projections, observations } = rapport;
  
  const scoreEquilibre = resumeExecutif?.metriquesClés?.scoreEquilibre || 
                         (100 - (diagnosticComplet?.risques?.scoreRisqueGlobal || 0));
  const etatGeneral = resumeExecutif?.etatGeneral || 
                      (scoreEquilibre >= 80 ? 'EXCELLENT' : scoreEquilibre >= 60 ? 'BON' : scoreEquilibre >= 40 ? 'ACCEPTABLE' : 'CRITIQUE');

  const tauxUtilisation = indicateursCles?.tauxUtilisationMoyen || 0;
  const joursSurcharge = indicateursCles?.pourcentageJoursSurcharge || 0;
  const ratioTR1TR3 = indicateursCles?.ratioChargeTR1CapaciteTR3 || 0;
  const scoreRisque = diagnosticComplet?.risques?.scoreRisqueGlobal || 0;

  // Alertes
  const alertes: AlerteProps[] = [];
  if (resumeExecutif?.principauxRisques?.length > 0) {
    resumeExecutif.principauxRisques.slice(0, 2).forEach((risque: string, idx: number) => {
      alertes.push({ type: idx === 0 ? 'critique' : 'important', message: risque });
    });
  }
  if (diagnosticComplet?.conformite?.length > 0) {
    alertes.push({ type: 'critique', message: `${diagnosticComplet.conformite.length} violation(s) des règles métier détectée(s)` });
  }

  const recsCombinees = recommandations?.slice(0, 5) || [];

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header compact */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <ScoreCirculaire score={Math.round(scoreEquilibre)} taille="md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Score de santé</h2>
              <Badge className={`text-xs ${
                etatGeneral === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-700' :
                etatGeneral === 'BON' ? 'bg-blue-100 text-blue-700' :
                etatGeneral === 'ACCEPTABLE' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {etatGeneral}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyse du {new Date(rapport.horodatage || Date.now()).toLocaleDateString('fr-CA')}
              {rapport.portrait?.nombreTraducteurs !== undefined && (
                <span className="ml-2">
                  • {rapport.portrait.nombreTraducteurs} traducteur{rapport.portrait.nombreTraducteurs > 1 ? 's' : ''} 
                  • {rapport.portrait.nombreTaches} tâche{rapport.portrait.nombreTaches > 1 ? 's' : ''}
                </span>
              )}
            </p>
            {/* Indicateur de filtres actifs */}
            {rapport.portrait?.estFiltre && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  📋 Portrait filtré
                </span>
                <span className="text-[10px] text-slate-500">
                  {rapport.portrait.filtresActifs?.join(' | ')}
                </span>
              </div>
            )}
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        )}
      </div>

      {/* Navigation par onglets */}
      <div className="flex gap-1 py-3 border-b border-slate-200 flex-shrink-0">
        {[
          { id: 'apercu', label: 'Aperçu général' },
          { id: 'details', label: 'Analyse détaillée' },
          { id: 'projections', label: 'Projections' },
          { id: 'optimisations', label: '💡 Optimisations' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setOnglet(tab.id as typeof onglet)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              onglet === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        
        {/* ONGLET APERÇU */}
        {onglet === 'apercu' && (
          <>
            {/* KPIs en grille */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPI
                label="Utilisation"
                valeur={tauxUtilisation}
                unite="%"
                status={tauxUtilisation >= 70 && tauxUtilisation <= 85 ? 'excellent' : tauxUtilisation >= 50 ? 'bon' : tauxUtilisation > 85 ? 'attention' : 'danger'}
                tooltip="Pourcentage moyen de capacité utilisée. Zone optimale: 70-85%."
              />
              <KPI
                label="Jours surcharge"
                valeur={joursSurcharge}
                unite="%"
                status={joursSurcharge < 10 ? 'excellent' : joursSurcharge < 20 ? 'bon' : joursSurcharge < 30 ? 'attention' : 'danger'}
                tooltip="% de jours où au moins un traducteur dépasse sa capacité."
              />
              <KPI
                label="Ratio TR1/TR3"
                valeur={ratioTR1TR3.toFixed(2)}
                status={ratioTR1TR3 <= 0.8 ? 'excellent' : ratioTR1TR3 <= 1.0 ? 'bon' : ratioTR1TR3 <= 1.2 ? 'attention' : 'danger'}
                tooltip="Équilibre traduction TR1 vs capacité révision TR3. Ratio >1 = goulot."
              />
              <KPI
                label="Score risque"
                valeur={scoreRisque}
                status={scoreRisque < 20 ? 'excellent' : scoreRisque < 40 ? 'bon' : scoreRisque < 60 ? 'attention' : 'danger'}
                tooltip="Score de risque global (0-100). Plus bas = mieux."
              />
            </div>

            {/* Alertes */}
            {alertes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Alertes prioritaires
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{alertes.length}</span>
                </h3>
                <div className="space-y-2">
                  {alertes.map((alerte, idx) => (
                    <Alerte key={idx} {...alerte} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommandations */}
            {recsCombinees.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Actions recommandées
                  <TooltipInfo texte="Recommandations triées par priorité. P1 = urgent, P2 = important, P3 = amélioration.">
                    <span className="text-xs text-slate-400">({recsCombinees.length})</span>
                  </TooltipInfo>
                </h3>
                <div className="grid gap-3">
                  {recsCombinees.slice(0, 3).map((rec: any, idx: number) => (
                    <RecommandationItem
                      key={rec.id || idx}
                      priorite={typeof rec.priorite === 'number' ? rec.priorite : rec.priorite === 'P1' ? 1 : rec.priorite === 'P2' ? 2 : 3}
                      titre={rec.titre}
                      description={rec.description}
                      action={rec.actionConcrete}
                      impact={rec.impactAttendu}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Points forts */}
            {resumeExecutif?.principalesForces?.length > 0 && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 mb-2">✓ Points forts</h4>
                <ul className="space-y-1">
                  {resumeExecutif.principalesForces.map((force: string, idx: number) => (
                    <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{force}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ONGLET DÉTAILS */}
        {onglet === 'details' && (
          <div className="space-y-4">
            {/* Charge par traducteur */}
            <Section
              titre={`Charge par traducteur (${diagnosticComplet?.capacites?.length || 0})`}
              icone="👥"
              defaultOpen={true}
              badge={diagnosticComplet?.capacites?.filter((c: any) => c.gravite === 'CRITIQUE').length > 0 
                ? { texte: `${diagnosticComplet.capacites.filter((c: any) => c.gravite === 'CRITIQUE').length} critique(s)`, type: 'danger' }
                : undefined}
              tooltip="Taux d'utilisation de chaque traducteur. Vert=équilibré, Jaune=attention, Rouge=surcharge."
            >
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {diagnosticComplet?.capacites?.map((cap: any, idx: number) => (
                  <JaugeTraducteur
                    key={idx}
                    nom={cap.traducteurNom}
                    profil={cap.profil}
                    utilisation={cap.metriques?.tauxUtilisation || 0}
                    heures={cap.metriques?.heuresAssignees || 0}
                    capacite={cap.metriques?.capaciteJournaliere * 5 || 35}
                  />
                ))}
              </div>
            </Section>

            {/* Équilibre TR1/TR2/TR3 */}
            <Section
              titre="Équilibre TR1 / TR2 / TR3"
              icone="⚖️"
              tooltip="Répartition de la charge entre les niveaux d'expérience."
            >
              {diagnosticComplet?.profils && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-600">
                        {diagnosticComplet.profils.repartitionVolume?.TR1 || 0}
                      </div>
                      <div className="text-xs text-slate-600">TR1</div>
                      <div className="text-[10px] text-blue-600 mt-1">
                        {diagnosticComplet.profils.tauxUtilisation?.TR1 || 0}% util.
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xl font-bold text-green-600">
                        {diagnosticComplet.profils.repartitionVolume?.TR2 || 0}
                      </div>
                      <div className="text-xs text-slate-600">TR2</div>
                      <div className="text-[10px] text-green-600 mt-1">
                        {diagnosticComplet.profils.tauxUtilisation?.TR2 || 0}% util.
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-xl font-bold text-purple-600">
                        {diagnosticComplet.profils.repartitionVolume?.TR3 || 0}
                      </div>
                      <div className="text-xs text-slate-600">TR3</div>
                      <div className="text-[10px] text-purple-600 mt-1">
                        {diagnosticComplet.profils.tauxUtilisation?.TR3 || 0}% util.
                      </div>
                    </div>
                  </div>
                  
                  {diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3 && (
                    <div className={`p-3 rounded-lg border ${
                      diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.statut === 'EQUILIBRE' ? 'bg-emerald-50 border-emerald-200' :
                      diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.statut === 'TENSION' ? 'bg-amber-50 border-amber-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <h5 className="text-xs font-medium text-slate-700 mb-2">Charge TR1 vs Capacité révision TR3</h5>
                      <div className="flex justify-between text-xs">
                        <span>Traduction: <strong>{diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.heuresTraductionTR1}h</strong></span>
                        <span>Révision dispo: <strong>{diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.heuresRevisionDisponiblesTR3}h</strong></span>
                        <span>Ratio: <strong>{diagnosticComplet.profils.chargeTR1VsCapaciteRevisionTR3.ratio.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Répartition par priorité */}
            <Section
              titre="Répartition par priorité"
              icone="⚡"
              badge={diagnosticComplet?.taches?.repartitionPriorite?.urgentes?.nombre > 0 
                ? { texte: `${diagnosticComplet.taches.repartitionPriorite.urgentes.nombre} urgente(s)`, type: 'warning' }
                : undefined}
              tooltip="Distribution des tâches entre priorité urgente et régulière."
            >
              {diagnosticComplet?.taches?.repartitionPriorite && (
                <div className="space-y-4">
                  {/* Barre de répartition visuelle */}
                  <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                    {diagnosticComplet.taches.repartitionPriorite.urgentes.pourcentage > 0 && (
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${diagnosticComplet.taches.repartitionPriorite.urgentes.pourcentage}%` }}
                      >
                        {diagnosticComplet.taches.repartitionPriorite.urgentes.pourcentage >= 15 && 'Urgentes'}
                      </div>
                    )}
                    {diagnosticComplet.taches.repartitionPriorite.regulieres.pourcentage > 0 && (
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${diagnosticComplet.taches.repartitionPriorite.regulieres.pourcentage}%` }}
                      >
                        {diagnosticComplet.taches.repartitionPriorite.regulieres.pourcentage >= 15 && 'Régulières'}
                      </div>
                    )}
                  </div>
                  
                  {/* Détails */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-500">🔴</span>
                        <span className="text-sm font-semibold text-red-700">Urgentes</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {diagnosticComplet.taches.repartitionPriorite.urgentes.nombre}
                        <span className="text-sm font-normal text-red-500 ml-1">tâches</span>
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        {diagnosticComplet.taches.repartitionPriorite.urgentes.heures}h 
                        ({diagnosticComplet.taches.repartitionPriorite.urgentes.pourcentage}%)
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-500">🔵</span>
                        <span className="text-sm font-semibold text-blue-700">Régulières</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {diagnosticComplet.taches.repartitionPriorite.regulieres.nombre}
                        <span className="text-sm font-normal text-blue-500 ml-1">tâches</span>
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {diagnosticComplet.taches.repartitionPriorite.regulieres.heures}h 
                        ({diagnosticComplet.taches.repartitionPriorite.regulieres.pourcentage}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Échéances à risque */}
            {diagnosticComplet?.echeances?.length > 0 && (
              <Section
                titre="Échéances à risque"
                icone="📅"
                badge={{ texte: `${diagnosticComplet.echeances.length}`, type: 'danger' }}
                tooltip="Tâches dont l'échéance approche avec risque de retard."
              >
                <div className="space-y-2">
                  {diagnosticComplet.echeances.slice(0, 5).map((ech: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                      ech.gravite === 'CRITIQUE' ? 'bg-red-50 border-red-500' :
                      ech.gravite === 'ELEVE' ? 'bg-amber-50 border-amber-500' :
                      'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm text-slate-800">{ech.numeroProjet}</span>
                        <span className="text-xs text-slate-500">{ech.dateEcheance}</span>
                      </div>
                      <p className="text-xs text-slate-600">{ech.description}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Conformité */}
            {diagnosticComplet?.conformite?.length > 0 && (
              <Section
                titre="Problèmes de conformité"
                icone="⚠️"
                badge={{ texte: `${diagnosticComplet.conformite.length}`, type: 'danger' }}
                tooltip="Violations des règles métier nécessitant correction."
              >
                <div className="space-y-2">
                  {diagnosticComplet.conformite.map((conf: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800 mb-1">{conf.description}</p>
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">Correction:</span> {conf.correction}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ONGLET OPTIMISATIONS */}
        {onglet === 'optimisations' && (
          <div className="space-y-6">
            {/* Résumé des optimisations */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">💡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Suggestions d'optimisation</h3>
                  <p className="text-xs text-slate-500">
                    {recommandations?.length || 0} recommandation{(recommandations?.length || 0) > 1 ? 's' : ''} identifiée{(recommandations?.length || 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {resumeExecutif?.recommandationCle && (
                <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                  <p className="text-sm font-medium text-blue-800 mb-1">⭐ Recommandation prioritaire</p>
                  <p className="text-sm text-blue-700">{resumeExecutif.recommandationCle}</p>
                </div>
              )}
            </div>

            {/* Toutes les recommandations */}
            {recommandations && recommandations.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TooltipInfo texte="Toutes les recommandations classées par priorité. P1 = action urgente requise, P2 = important à court terme, P3 = amélioration suggérée.">
                    <span>Actions recommandées ({recommandations.length})</span>
                  </TooltipInfo>
                </h4>
                
                {/* Filtre par priorité */}
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3].map((p) => {
                    const count = recommandations.filter((r: any) => 
                      (typeof r.priorite === 'number' ? r.priorite : r.priorite === 'P1' ? 1 : r.priorite === 'P2' ? 2 : 3) === p
                    ).length;
                    const config = {
                      1: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
                      2: { label: 'Important', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                      3: { label: 'Suggéré', color: 'bg-green-100 text-green-700 border-green-200' },
                    }[p]!;
                    return (
                      <span key={p} className={`text-xs font-medium px-2 py-1 rounded border ${config.color}`}>
                        {config.label}: {count}
                      </span>
                    );
                  })}
                </div>

                {/* Liste des recommandations */}
                <div className="space-y-3">
                  {recommandations.map((rec: any, idx: number) => (
                    <RecommandationItem
                      key={rec.id || idx}
                      priorite={typeof rec.priorite === 'number' ? rec.priorite : rec.priorite === 'P1' ? 1 : rec.priorite === 'P2' ? 2 : 3}
                      titre={rec.titre}
                      description={rec.description}
                      action={rec.actionConcrete}
                      impact={rec.impactAttendu}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-3xl mb-2 block">✅</span>
                <p className="text-sm font-medium text-slate-600">Aucune optimisation requise</p>
                <p className="text-xs text-slate-400 mt-1">La répartition actuelle est équilibrée</p>
              </div>
            )}

            {/* Gains d'efficacité potentiels */}
            {observations?.gainsEfficacite?.length > 0 && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <span>💰</span>
                  <TooltipInfo texte="Actions concrètes pouvant améliorer l'efficacité globale de l'équipe : rééquilibrages recommandés, optimisations de planning.">
                    <span>Gains d'efficacité potentiels</span>
                  </TooltipInfo>
                </h4>
                <ul className="space-y-2">
                  {observations.gainsEfficacite.map((gain: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span>{gain}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes de gestion */}
            {observations?.notesGestion?.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <span>📝</span>
                  <TooltipInfo texte="Observations et recommandations pour les gestionnaires concernant l'organisation du travail et la planification.">
                    <span>Notes de gestion</span>
                  </TooltipInfo>
                </h4>
                <ul className="space-y-2">
                  {observations.notesGestion.map((note: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-700">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Anomalies détectées */}
            {observations?.anomalies?.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  <TooltipInfo texte="Anomalies ou situations inhabituelles détectées dans la répartition qui méritent attention.">
                    <span>Anomalies détectées</span>
                  </TooltipInfo>
                </h4>
                <ul className="space-y-2">
                  {observations.anomalies.map((anomalie: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="text-amber-500 mt-0.5">▲</span>
                      <span>{anomalie}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ONGLET PROJECTIONS */}
        {onglet === 'projections' && (
          <div className="space-y-4">
            {/* Projections 7/14/30 jours */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projections?.charge7Jours && (
                <div className={`p-4 rounded-lg border-2 ${
                  projections.charge7Jours.statut === 'SATURE' ? 'bg-red-50 border-red-300' :
                  projections.charge7Jours.statut === 'TENDU' ? 'bg-amber-50 border-amber-300' :
                  'bg-emerald-50 border-emerald-300'
                }`}>
                  <div className="flex items-center gap-1 mb-3">
                    <TooltipInfo texte="Projection de la charge de travail sur les 7 prochains jours calendaires, basée sur les tâches assignées et leurs échéances. Permet d'anticiper les périodes de surcharge à court terme.">
                      <h4 className="font-semibold text-sm text-slate-800">📆 7 jours</h4>
                    </TooltipInfo>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Heures prévues</span>
                      <span className="font-semibold">{projections.charge7Jours.heuresPrevues}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Capacité</span>
                      <span className="font-semibold">{projections.charge7Jours.capaciteDisponible}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Taux</span>
                      <span className={`font-bold ${
                        projections.charge7Jours.statut === 'SATURE' ? 'text-red-600' :
                        projections.charge7Jours.statut === 'TENDU' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>{projections.charge7Jours.tauxUtilisationPrevu}%</span>
                    </div>
                    {projections.charge7Jours.joursOuvrables && (
                      <div className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                        {projections.charge7Jours.joursOuvrables} jours ouvrables
                      </div>
                    )}
                  </div>
                </div>
              )}

              {projections?.charge14Jours && (
                <div className={`p-4 rounded-lg border-2 ${
                  projections.charge14Jours.statut === 'SATURE' ? 'bg-red-50 border-red-300' :
                  projections.charge14Jours.statut === 'TENDU' ? 'bg-amber-50 border-amber-300' :
                  'bg-emerald-50 border-emerald-300'
                }`}>
                  <div className="flex items-center gap-1 mb-3">
                    <TooltipInfo texte="Projection de la charge de travail sur les 14 prochains jours. Vision à moyen terme permettant de planifier les ressources et d'anticiper les besoins en réaffectation.">
                      <h4 className="font-semibold text-sm text-slate-800">📆 14 jours</h4>
                    </TooltipInfo>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Heures prévues</span>
                      <span className="font-semibold">{projections.charge14Jours.heuresPrevues}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Capacité</span>
                      <span className="font-semibold">{projections.charge14Jours.capaciteDisponible}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Taux</span>
                      <span className={`font-bold ${
                        projections.charge14Jours.statut === 'SATURE' ? 'text-red-600' :
                        projections.charge14Jours.statut === 'TENDU' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>{projections.charge14Jours.tauxUtilisationPrevu}%</span>
                    </div>
                    {projections.charge14Jours.joursOuvrables && (
                      <div className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                        {projections.charge14Jours.joursOuvrables} jours ouvrables
                      </div>
                    )}
                  </div>
                </div>
              )}

              {projections?.charge30Jours && (
                <div className={`p-4 rounded-lg border-2 ${
                  projections.charge30Jours.statut === 'SATURE' ? 'bg-red-50 border-red-300' :
                  projections.charge30Jours.statut === 'TENDU' ? 'bg-amber-50 border-amber-300' :
                  'bg-emerald-50 border-emerald-300'
                }`}>
                  <div className="flex items-center gap-1 mb-3">
                    <TooltipInfo texte="Projection de la charge sur 30 jours. Vision à long terme pour anticiper les besoins en ressources, planifier les congés et identifier les tendances de charge.">
                      <h4 className="font-semibold text-sm text-slate-800">📆 30 jours</h4>
                    </TooltipInfo>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Heures prévues</span>
                      <span className="font-semibold">{projections.charge30Jours.heuresPrevues}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Capacité</span>
                      <span className="font-semibold">{projections.charge30Jours.capaciteDisponible}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Taux</span>
                      <span className={`font-bold ${
                        projections.charge30Jours.statut === 'SATURE' ? 'text-red-600' :
                        projections.charge30Jours.statut === 'TENDU' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>{projections.charge30Jours.tauxUtilisationPrevu}%</span>
                    </div>
                    {projections.charge30Jours.joursOuvrables && (
                      <div className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                        {projections.charge30Jours.joursOuvrables} jours ouvrables
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Graphique de tendance */}
            {projections?.charge7Jours && projections?.charge14Jours && projections?.charge30Jours && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1 mb-3">
                  <TooltipInfo texte="Évolution du taux d'utilisation prévu sur les différentes périodes. Permet de visualiser rapidement la tendance de charge (croissante, stable ou décroissante).">
                    <h4 className="font-semibold text-sm text-slate-800">📈 Tendance de charge</h4>
                  </TooltipInfo>
                </div>
                <div className="flex items-end gap-4 h-24">
                  {[
                    { label: '7j', taux: projections.charge7Jours.tauxUtilisationPrevu, statut: projections.charge7Jours.statut },
                    { label: '14j', taux: projections.charge14Jours.tauxUtilisationPrevu, statut: projections.charge14Jours.statut },
                    { label: '30j', taux: projections.charge30Jours.tauxUtilisationPrevu, statut: projections.charge30Jours.statut },
                  ].map((p, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className={`w-full rounded-t transition-all ${
                          p.statut === 'SATURE' ? 'bg-red-500' :
                          p.statut === 'TENDU' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ height: `${Math.min(100, p.taux)}%` }}
                      />
                      <span className="text-xs font-medium text-slate-600">{p.label}</span>
                      <span className={`text-xs font-bold ${
                        p.statut === 'SATURE' ? 'text-red-600' :
                        p.statut === 'TENDU' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>{p.taux}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-emerald-500"></span>
                      Normal (&lt;80%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-amber-500"></span>
                      Tendu (80-90%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-red-500"></span>
                      Saturé (&gt;90%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Impact TR1/TR3 */}
            {projections?.impactTR1TR3 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-1 mb-2">
                  <TooltipInfo texte="Analyse de l'équilibre entre traducteurs TR-01 (7h/jour) et TR-03 (quota variable). Un déséquilibre peut affecter la capacité à traiter certains types de dossiers.">
                    <h4 className="font-semibold text-sm text-blue-800">⚖️ Impact TR-01/TR-03</h4>
                  </TooltipInfo>
                </div>
                <p className="text-sm text-blue-700">{projections.impactTR1TR3}</p>
              </div>
            )}

            {/* Risques anticipés */}
            {projections?.risquesAnticipes?.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-1 mb-3">
                  <TooltipInfo texte="Liste des risques identifiés par l'algorithme basés sur les tendances actuelles : surcharges prévisibles, goulots d'étranglement potentiels, échéances critiques groupées, etc.">
                    <h4 className="font-semibold text-sm text-amber-800">🔮 Risques anticipés</h4>
                  </TooltipInfo>
                </div>
                <ul className="space-y-1.5">
                  {projections.risquesAnticipes.map((risque: string, idx: number) => (
                    <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="text-amber-500">⚠️</span>
                      <span>{risque}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opportunités */}
            {(observations?.gainsEfficacite?.length > 0 || observations?.notesGestion?.length > 0) && (
              <Section 
                titre="Opportunités d'amélioration" 
                icone="💡" 
                defaultOpen={true}
                tooltip="Suggestions d'optimisation identifiées par l'analyse : gains d'efficacité possibles, meilleures pratiques à appliquer, et notes de gestion pour améliorer la répartition."
              >
                <div className="space-y-4">
                  {observations?.gainsEfficacite?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <TooltipInfo texte="Actions concrètes pouvant améliorer l'efficacité globale de l'équipe : rééquilibrages recommandés, optimisations de planning, meilleures utilisations des compétences.">
                          <h5 className="text-xs font-semibold text-emerald-700">Gains possibles</h5>
                        </TooltipInfo>
                      </div>
                      <ul className="space-y-1">
                        {observations.gainsEfficacite.map((gain: string, idx: number) => (
                          <li key={idx} className="text-sm text-emerald-600 flex items-start gap-2">
                            <span>✓</span> <span>{gain}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {observations?.notesGestion?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <TooltipInfo texte="Observations et recommandations pour les gestionnaires concernant l'organisation du travail, la planification à venir, ou les ajustements nécessaires.">
                          <h5 className="text-xs font-semibold text-blue-700">Notes de gestion</h5>
                        </TooltipInfo>
                      </div>
                      <ul className="space-y-1">
                        {observations.notesGestion.map((note: string, idx: number) => (
                          <li key={idx} className="text-sm text-blue-600 flex items-start gap-2">
                            <span>📝</span> <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex-shrink-0">
        <p className="text-[11px] text-slate-400 text-center">
          Tetrix Max • Analyse intelligente des règles métier BT, profils TR et capacités
        </p>
      </div>
    </div>
  );
}

export default TetrixMaxUnified;
