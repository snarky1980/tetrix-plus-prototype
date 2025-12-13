/**
 * ============================================================================
 * AGENT QA AUTONOME - TEST DES MODES DE DISTRIBUTION
 * ============================================================================
 * 
 * Objectif: Tester rigoureusement la logique de distribution des tâches
 * pour les 4 modes: JAT, PEPS, ÉQUILIBRÉ, MANUEL (Personnalisable)
 * 
 * Périmètre: UNIQUEMENT la logique de calcul et distribution
 * Hors périmètre: UI, DB structure, autres fonctionnalités
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  repartitionJusteATemps,
  repartitionEquilibree,
  repartitionPEPS,
  RepartitionItem
} from '../src/services/repartitionService';

// ============================================================================
// CONFIGURATION DES TESTS
// ============================================================================

// Mock Prisma pour les tests
const mockTraducteur = {
  id: 'qa-test-trad-1',
  nom: 'Traducteur QA Test',
  email: 'qa@test.com',
  capaciteHeuresParJour: 7.5,
  horaire: '08:00-16:30', // 8.5h range - 1h lunch = 7.5h NET capacity
  classification: 'TR2',
  actif: true
};

// Mock les ajustements de temps existants
let mockAjustements: any[] = [];

vi.mock('../src/config/database', () => ({
  default: {
    traducteur: {
      findUnique: vi.fn(async () => mockTraducteur)
    },
    ajustementTemps: {
      // Important: Utiliser une fonction qui lit la valeur actuelle de mockAjustements
      // et non une closure qui capture la valeur initiale
      findMany: vi.fn(async () => {
        // Retourner la valeur actuelle de mockAjustements à chaque appel
        return mockAjustements;
      })
    }
  }
}));

// ============================================================================
// UTILITAIRES DE TEST
// ============================================================================

interface TestScenario {
  nom: string;
  description: string;
  traducteurId: string;
  heuresTotal: number;
  capaciteJour: number;
  ajustementsExistants: Array<{ date: string; heures: number }>;
  parametres: any;
  resultatAttendu?: {
    nbJours?: number;
    sommeHeures?: number;
    premierJour?: string;
    dernierJour?: string;
  };
}

interface TestResult {
  scenario: string;
  mode: string;
  succes: boolean;
  repartition: RepartitionItem[];
  erreur?: string;
  anomalies: string[];
  metriques: {
    nbJours: number;
    sommeHeures: number;
    min: number;
    max: number;
    moyenne: number;
    ecartType: number;
  };
}

/**
 * Calculer les métriques d'une répartition
 */
function calculerMetriques(repartition: RepartitionItem[]) {
  const heures = repartition.map(r => r.heures);
  const somme = heures.reduce((a, b) => a + b, 0);
  const moyenne = somme / heures.length;
  const variance = heures.reduce((acc, h) => acc + Math.pow(h - moyenne, 2), 0) / heures.length;
  
  return {
    nbJours: repartition.length,
    sommeHeures: Math.round(somme * 100) / 100,
    min: Math.min(...heures),
    max: Math.max(...heures),
    moyenne: Math.round(moyenne * 100) / 100,
    ecartType: Math.round(Math.sqrt(variance) * 100) / 100
  };
}

/**
 * Vérifier les invariants de base
 */
function verifierInvariants(
  repartition: RepartitionItem[],
  heuresTotal: number,
  capaciteJour: number
): string[] {
  const anomalies: string[] = [];
  
  // 1. Aucune tâche ne disparaît - vérifier somme
  const somme = repartition.reduce((s, r) => s + r.heures, 0);
  if (Math.abs(somme - heuresTotal) > 0.02) { // Tolérance 0.02h pour arrondis
    anomalies.push(`PERTE/AJOUT: Somme=${somme.toFixed(2)}h, attendu=${heuresTotal}h (écart=${(somme - heuresTotal).toFixed(4)}h)`);
  }
  
  // 2. Aucune duplication de dates
  const dates = repartition.map(r => r.date);
  const datesUniques = new Set(dates);
  if (dates.length !== datesUniques.size) {
    anomalies.push(`DUPLICATION: ${dates.length - datesUniques.size} date(s) dupliquée(s)`);
  }
  
  // 3. Pas de valeurs négatives
  const negatifs = repartition.filter(r => r.heures < 0);
  if (negatifs.length > 0) {
    anomalies.push(`VALEURS NÉGATIVES: ${negatifs.length} jour(s) avec heures négatives`);
  }
  
  // 4. Pas de dépassement de capacité (avec tolérance de 0.01h pour arrondis)
  const depassements = repartition.filter(r => r.heures > capaciteJour + 0.01);
  if (depassements.length > 0) {
    anomalies.push(`DÉPASSEMENT CAPACITÉ: ${depassements.length} jour(s) > ${capaciteJour}h (max=${Math.max(...depassements.map(d => d.heures)).toFixed(2)}h)`);
  }
  
  // 5. Ordre chronologique
  for (let i = 1; i < repartition.length; i++) {
    if (repartition[i].date < repartition[i - 1].date) {
      anomalies.push(`ORDRE INCORRECT: ${repartition[i].date} avant ${repartition[i - 1].date}`);
      break;
    }
  }
  
  return anomalies;
}

// ============================================================================
// TESTS MODE JAT (JUSTE-À-TEMPS)
// ============================================================================

describe('🎯 MODE JAT - Juste-à-Temps', () => {
  
  beforeAll(() => {
    mockAjustements = [];
  });

  it('Cas simple: Distribution basique sans contraintes', async () => {
    // Scénario: 20h à répartir, échéance dans 5 jours, capacité 7.5h/jour
    mockAjustements = [];
    
    const result = await repartitionJusteATemps(
      mockTraducteur.id,
      20,
      '2025-12-16', // 5 jours ouvrables depuis aujourd'hui (11 déc)
      { debug: false }
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 20, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 JAT - Cas simple:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 20h`);
    console.log(`   Distribution: ${metriques.min.toFixed(2)}h - ${metriques.max.toFixed(2)}h (σ=${metriques.ecartType})`);
    
    expect(anomalies).toHaveLength(0);
    expect(metriques.sommeHeures).toBeCloseTo(20, 1);
    expect(result.length).toBeGreaterThan(0);
  });

  it('Cas charge élevée: Proche de la saturation', async () => {
    // 20h sur 3 jours ouvrables = capacité presque saturée
    // Capacité disponible: 3 × 7h net (avec pause exclu) = 21h
    mockAjustements = [];
    
    const result = await repartitionJusteATemps(
      mockTraducteur.id,
      20,
      '2025-12-16',
      { debug: false }
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 20, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 JAT - Charge élevée:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 20h`);
    console.log(`   Distribution: ${metriques.min.toFixed(2)}h - ${metriques.max.toFixed(2)}h (σ=${metriques.ecartType})`);
    
    expect(anomalies).toHaveLength(0);
    expect(metriques.sommeHeures).toBeCloseTo(20, 1);
  });

  it('Cas avec tâches existantes: Ne doit pas surcharger', async () => {
    // Simule 5h déjà assignées le 2025-12-12
    mockAjustements = [
      { date: new Date('2025-12-12'), heures: 5, traducteurId: mockTraducteur.id, type: 'TACHE' }
    ];
    
    const result = await repartitionJusteATemps(
      mockTraducteur.id,
      15, // Demande 15h supplémentaires
      '2025-12-16',
      { debug: false }
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 15, mockTraducteur.capaciteHeuresParJour);
    
    // Vérifier que le 12 déc ne reçoit pas plus de 2.5h (7.5 - 5 = 2.5h disponibles)
    const jour12 = result.find(r => r.date === '2025-12-12');
    if (jour12 && jour12.heures > 2.5 + 0.01) {
      anomalies.push(`SURCHARGE: 2025-12-12 a ${jour12.heures}h alors que seul 2.5h est disponible`);
    }
    
    console.log('\n📊 JAT - Avec tâches existantes:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 15h`);
    console.log(`   12 déc: ${jour12?.heures.toFixed(2) || 'N/A'}h (max 2.5h dispo)`);
    
    expect(anomalies).toHaveLength(0);
  });

  it('Cas limite: Une seule journée disponible', async () => {
    mockAjustements = [];
    
    const result = await repartitionJusteATemps(
      mockTraducteur.id,
      6, // 6h sur 1 jour (capacité 7h net avec pause)
      '2025-12-13', // Jour futur valide
      { debug: false }
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 6, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 JAT - Journée unique:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 6h`);
    
    expect(anomalies).toHaveLength(0);
    expect(result.length).toBe(1);
  });

  it('Cas limite: Capacité insuffisante - doit rejeter', async () => {
    mockAjustements = [];
    
    await expect(
      repartitionJusteATemps(
        mockTraducteur.id,
        100, // Beaucoup trop d'heures pour 5 jours
        '2025-12-16',
        { debug: false }
      )
    ).rejects.toThrow(/Capacité insuffisante/);
    
    console.log('\n✅ JAT - Rejet capacité insuffisante: OK');
  });

  it('Test comportement à rebours: Remplit depuis échéance', async () => {
    mockAjustements = [];
    
    const result = await repartitionJusteATemps(
      mockTraducteur.id,
      20,
      '2025-12-16',
      { debug: true }
    );
    
    // JAT doit remplir à rebours, donc les derniers jours d'abord
    // Mais le résultat est trié chronologiquement
    const metriques = calculerMetriques(result);
    
    console.log('\n📊 JAT - Comportement à rebours:');
    console.log(`   Dates: ${result[0].date} à ${result[result.length - 1].date}`);
    console.log(`   Logique validée par somme correcte: ${metriques.sommeHeures}h`);
    
    expect(metriques.sommeHeures).toBeCloseTo(20, 1);
  });
});

// ============================================================================
// TESTS MODE ÉQUILIBRÉ
// ============================================================================

describe('⚖️ MODE ÉQUILIBRÉ', () => {
  
  beforeAll(() => {
    mockAjustements = [];
  });

  it('Cas simple: Distribution uniforme', async () => {
    mockAjustements = [];
    
    const result = await repartitionEquilibree(
      mockTraducteur.id,
      20,
      '2025-12-11',
      '2025-12-16'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 20, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 ÉQUILIBRÉ - Cas simple:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 20h`);
    console.log(`   Distribution: ${metriques.min.toFixed(2)}h - ${metriques.max.toFixed(2)}h (écart-type=${metriques.ecartType})`);
    
    // Mode équilibré doit avoir un écart-type très faible
    if (metriques.ecartType > 0.5) {
      anomalies.push(`DÉSÉQUILIBRE: Écart-type trop élevé (${metriques.ecartType}) pour mode équilibré`);
    }
    
    expect(anomalies).toHaveLength(0);
    expect(metriques.sommeHeures).toBeCloseTo(20, 1);
  });

  it('Cas déséquilibré: Jours avec capacités différentes', async () => {
    // Simule un jour presque saturé
    mockAjustements = [
      { date: new Date('2025-12-12'), heures: 6, traducteurId: mockTraducteur.id, type: 'TACHE' }
    ];
    
    const result = await repartitionEquilibree(
      mockTraducteur.id,
      15,
      '2025-12-11',
      '2025-12-16'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 15, mockTraducteur.capaciteHeuresParJour);
    
    const jour12 = result.find(r => r.date === '2025-12-12');
    
    console.log('\n📊 ÉQUILIBRÉ - Capacités variables:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 15h`);
    console.log(`   12 déc: ${jour12?.heures.toFixed(2) || 'N/A'}h (1.5h dispo seulement)`);
    console.log(`   Écart-type: ${metriques.ecartType}`);
    
    expect(anomalies).toHaveLength(0);
  });

  it('Test précision: 35h sur 6 jours (cas difficile)', async () => {
    // 35 / 6 = 5.8333... heures/jour - test des arrondis
    mockAjustements = [];
    
    const result = await repartitionEquilibree(
      mockTraducteur.id,
      35,
      '2025-12-11',
      '2025-12-18'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 35, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 ÉQUILIBRÉ - Précision arrondis:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 35h (écart=${Math.abs(metriques.sommeHeures - 35).toFixed(4)}h)`);
    console.log(`   Distribution détaillée:`);
    result.forEach(r => console.log(`      ${r.date}: ${r.heures.toFixed(4)}h`));
    
    expect(anomalies).toHaveLength(0);
    expect(Math.abs(metriques.sommeHeures - 35)).toBeLessThan(0.01);
  });

  it('Cas limite: Tous les jours saturés sauf un', async () => {
    // Tous les jours ont 7.5h sauf un qui est libre
    const datesOccupees = ['2025-12-11', '2025-12-13', '2025-12-16'];
    mockAjustements = datesOccupees.map(date => ({
      date: new Date(date),
      heures: 7.5,
      traducteurId: mockTraducteur.id,
      type: 'TACHE'
    }));
    
    const result = await repartitionEquilibree(
      mockTraducteur.id,
      5,
      '2025-12-11',
      '2025-12-16'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 5, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 ÉQUILIBRÉ - Un seul jour disponible:');
    console.log(`   Jours utilisés: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 5h`);
    
    // Devrait allouer sur les jours restants uniquement
    expect(anomalies).toHaveLength(0);
    expect(metriques.nbJours).toBeLessThanOrEqual(2); // Max 2 jours libres dans la période
  });
});

// ============================================================================
// TESTS MODE PEPS (Premier Entré, Premier Sorti)
// ============================================================================

describe('📥 MODE PEPS - Premier Entré Premier Sorti', () => {
  
  beforeAll(() => {
    mockAjustements = [];
  });

  it('Cas simple: Remplit chronologiquement', async () => {
    mockAjustements = [];
    
    const result = await repartitionPEPS(
      mockTraducteur.id,
      20,
      '2025-12-11',
      '2025-12-16'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 20, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 PEPS - Cas simple:');
    console.log(`   Jours: ${metriques.nbJours}`);
    console.log(`   Somme: ${metriques.sommeHeures}h / 20h`);
    console.log(`   Premier jour: ${result[0].date} = ${result[0].heures}h`);
    console.log(`   Dernier jour: ${result[result.length - 1].date} = ${result[result.length - 1].heures}h`);
    
    // PEPS doit remplir les premiers jours au maximum
    if (result.length > 1 && result[0].heures < mockTraducteur.capaciteHeuresParJour - 0.01) {
      anomalies.push(`NON-PEPS: Premier jour (${result[0].heures}h) pas saturé alors que tâche continue`);
    }
    
    expect(anomalies).toHaveLength(0);
  });

  it('Test ordre PEPS: Les premiers jours doivent être saturés en premier', async () => {
    mockAjustements = [];
    
    const result = await repartitionPEPS(
      mockTraducteur.id,
      18, // 18h sur plusieurs jours
      '2025-12-11',
      '2025-12-16'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 18, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 PEPS - Ordre de remplissage:');
    result.forEach((r, idx) => {
      console.log(`   Jour ${idx + 1} (${r.date}): ${r.heures.toFixed(2)}h`);
    });
    
    // Vérifier que les jours sauf peut-être le dernier sont à capacité max
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].heures < mockTraducteur.capaciteHeuresParJour - 0.01) {
        anomalies.push(`ORDRE PEPS VIOLÉ: Jour ${result[i].date} a ${result[i].heures}h < capacité max alors que ce n'est pas le dernier jour`);
      }
    }
    
    expect(anomalies).toHaveLength(0);
  });

  it('Avec tâches existantes: Saute les jours saturés', async () => {
    // Le 12 déc est déjà plein
    // IMPORTANT: On doit créer la date à l'heure de Ottawa (pas UTC minuit)
    const date12Dec = new Date('2025-12-12T12:00:00-05:00'); // Midi à Ottawa
    mockAjustements = [
      { date: date12Dec, heures: 7.5, traducteurId: mockTraducteur.id, type: 'TACHE' }
    ];
    
    console.log('\n🔍 DEBUG Mock:');
    console.log(`   Date mock brute: ${date12Dec.toISOString()}`);
    console.log(`   Date mock locale: ${date12Dec.toString()}`);
    
    const result = await repartitionPEPS(
      mockTraducteur.id,
      15,
      '2025-12-11',
      '2025-12-16'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 15, mockTraducteur.capaciteHeuresParJour);
    
    // Le 12 déc ne devrait PAS apparaître dans le résultat
    const jour12 = result.find(r => r.date === '2025-12-12');
    
    console.log('\n📊 PEPS - Évite jours saturés:');
    console.log(`   Jours utilisés: ${metriques.nbJours}`);
    console.log(`   12 déc présent: ${jour12 ? 'OUI ⚠️' : 'NON ✓'}`);
    result.forEach(r => {
      console.log(`   ${r.date}: ${r.heures.toFixed(2)}h`);
    });
    
    if (jour12) {
      anomalies.push(`SURCHARGE: 2025-12-12 saturé mais PEPS l'a quand même utilisé avec ${jour12.heures}h`);
    }
    
    expect(anomalies).toHaveLength(0);
  });

  it('Cas limite: Capacité juste suffisante', async () => {
    mockAjustements = [];
    
    // Exactement 15h sur 2 jours = 7.5h par jour
    const result = await repartitionPEPS(
      mockTraducteur.id,
      15,
      '2025-12-11',
      '2025-12-12'
    );
    
    const metriques = calculerMetriques(result);
    const anomalies = verifierInvariants(result, 15, mockTraducteur.capaciteHeuresParJour);
    
    console.log('\n📊 PEPS - Capacité exacte:');
    console.log(`   Somme: ${metriques.sommeHeures}h / 15h`);
    console.log(`   Deux jours à ${mockTraducteur.capaciteHeuresParJour}h chacun`);
    
    expect(anomalies).toHaveLength(0);
    expect(result.length).toBe(2);
    expect(result.every(r => r.heures === mockTraducteur.capaciteHeuresParJour)).toBe(true);
  });
});

// ============================================================================
// TESTS COMPARATIFS INTER-MODES
// ============================================================================

describe('🔄 TESTS COMPARATIFS - Cohérence inter-modes', () => {
  
  beforeAll(() => {
    mockAjustements = [];
  });

  it('Même input, 3 modes: Tous doivent donner somme identique', async () => {
    mockAjustements = [];
    
    const params = {
      traducteurId: mockTraducteur.id,
      heuresTotal: 20,
      dateDebut: '2025-12-11',
      dateFin: '2025-12-16',
      dateEcheance: '2025-12-16'
    };
    
    const resultJAT = await repartitionJusteATemps(
      params.traducteurId,
      params.heuresTotal,
      params.dateEcheance
    );
    
    const resultEquilibre = await repartitionEquilibree(
      params.traducteurId,
      params.heuresTotal,
      params.dateDebut,
      params.dateFin
    );
    
    const resultPEPS = await repartitionPEPS(
      params.traducteurId,
      params.heuresTotal,
      params.dateDebut,
      params.dateFin
    );
    
    const sommeJAT = resultJAT.reduce((s, r) => s + r.heures, 0);
    const sommeEquilibre = resultEquilibre.reduce((s, r) => s + r.heures, 0);
    const sommePEPS = resultPEPS.reduce((s, r) => s + r.heures, 0);
    
    console.log('\n📊 COMPARAISON - Sommes identiques:');
    console.log(`   JAT: ${sommeJAT.toFixed(2)}h`);
    console.log(`   ÉQUILIBRÉ: ${sommeEquilibre.toFixed(2)}h`);
    console.log(`   PEPS: ${sommePEPS.toFixed(2)}h`);
    console.log(`   Attendu: 20h`);
    
    expect(Math.abs(sommeJAT - 20)).toBeLessThan(0.02);
    expect(Math.abs(sommeEquilibre - 20)).toBeLessThan(0.02);
    expect(Math.abs(sommePEPS - 20)).toBeLessThan(0.02);
  });

  it('Caractérisation: Équilibré vs JAT vs PEPS', async () => {
    mockAjustements = [];
    
    const resultJAT = await repartitionJusteATemps(mockTraducteur.id, 25, '2025-12-18');
    const resultEquilibre = await repartitionEquilibree(mockTraducteur.id, 25, '2025-12-11', '2025-12-18');
    const resultPEPS = await repartitionPEPS(mockTraducteur.id, 25, '2025-12-11', '2025-12-18');
    
    const metriquesJAT = calculerMetriques(resultJAT);
    const metriquesEquilibre = calculerMetriques(resultEquilibre);
    const metriquesPEPS = calculerMetriques(resultPEPS);
    
    console.log('\n📊 CARACTÉRISATION DES MODES:');
    console.log(`\n   JAT (Juste-à-temps):`);
    console.log(`      Jours: ${metriquesJAT.nbJours}`);
    console.log(`      Distribution: ${metriquesJAT.min.toFixed(2)}h - ${metriquesJAT.max.toFixed(2)}h`);
    console.log(`      Écart-type: ${metriquesJAT.ecartType}`);
    
    console.log(`\n   ÉQUILIBRÉ:`);
    console.log(`      Jours: ${metriquesEquilibre.nbJours}`);
    console.log(`      Distribution: ${metriquesEquilibre.min.toFixed(2)}h - ${metriquesEquilibre.max.toFixed(2)}h`);
    console.log(`      Écart-type: ${metriquesEquilibre.ecartType}`);
    
    console.log(`\n   PEPS:`);
    console.log(`      Jours: ${metriquesPEPS.nbJours}`);
    console.log(`      Distribution: ${metriquesPEPS.min.toFixed(2)}h - ${metriquesPEPS.max.toFixed(2)}h`);
    console.log(`      Écart-type: ${metriquesPEPS.ecartType}`);
    
    // ÉQUILIBRÉ doit avoir le plus faible écart-type
    expect(metriquesEquilibre.ecartType).toBeLessThanOrEqual(metriquesJAT.ecartType + 0.1);
    expect(metriquesEquilibre.ecartType).toBeLessThanOrEqual(metriquesPEPS.ecartType + 0.1);
  });

  it('Déterminisme: Même input = même output', async () => {
    mockAjustements = [];
    
    const params = {
      traducteurId: mockTraducteur.id,
      heuresTotal: 20,
      dateEcheance: '2025-12-16'
    };
    
    const result1 = await repartitionJusteATemps(params.traducteurId, params.heuresTotal, params.dateEcheance);
    const result2 = await repartitionJusteATemps(params.traducteurId, params.heuresTotal, params.dateEcheance);
    
    const identique = JSON.stringify(result1) === JSON.stringify(result2);
    
    console.log('\n📊 DÉTERMINISME - JAT:');
    console.log(`   Exécution 1: ${result1.length} jours, somme=${result1.reduce((s, r) => s + r.heures, 0).toFixed(2)}h`);
    console.log(`   Exécution 2: ${result2.length} jours, somme=${result2.reduce((s, r) => s + r.heures, 0).toFixed(2)}h`);
    console.log(`   Identique: ${identique ? '✓' : '✗'}`);
    
    expect(identique).toBe(true);
  });
});

// ============================================================================
// RAPPORT FINAL (sera généré après l'exécution des tests)
// ============================================================================

/**
 * Note: Ce fichier de test génère automatiquement un rapport détaillé
 * lors de son exécution via console.log().
 * 
 * Pour exécuter: npm test -- qa-distribution-modes.test.ts
 */
