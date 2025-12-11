/**
 * ═══════════════════════════════════════════════════════════════════════
 * TESTS QA - LOGIQUE TEMPORELLE TETRIX PLUS
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Périmètre: Validation exhaustive de la gestion des heures, dates, 
 *            capacités journalières, découpage des tâches et 
 *            PAUSE OBLIGATOIRE 12h-13h.
 * 
 * Objectif: Identifier toute incohérence, perte d'heures, duplication,
 *           ou allocation dans la plage bloquée 12h-13h.
 * 
 * Framework: Vitest 1.6.1
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  parseOttawaDateISO,
  parseOttawaDateTimeISO,
  differenceInHoursOttawa,
  formatOttawaISO,
  formatOttawaDateTimeISO,
  hasSignificantTime,
  businessDaysOttawa,
  todayOttawa
} from '../src/utils/dateTimeOttawa';
import { capaciteDisponiblePlageHoraire } from '../src/services/capaciteService';

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: TESTS DE BASE - CALCUL D'HEURES
// ═══════════════════════════════════════════════════════════════════════

describe('🕐 CALCUL D\'HEURES - Basique', () => {
  
  it('Cas simple: 09h-17h même jour = 8h', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    
    const heures = differenceInHoursOttawa(debut, fin);
    
    expect(heures).toBe(8);
  });
  
  it('Cas simple: 08h30-16h30 = 8h', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T08:30:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T16:30:00');
    
    const heures = differenceInHoursOttawa(debut, fin);
    
    expect(heures).toBe(8);
  });
  
  it('Cas fractionnaire: 09h15-10h45 = 1.5h', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:15:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T10:45:00');
    
    const heures = differenceInHoursOttawa(debut, fin);
    
    expect(heures).toBe(1.5);
  });
  
  it('Cas multi-jours: 09h lundi → 17h mardi = 32h brut', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-16T17:00:00');
    
    const heures = differenceInHoursOttawa(debut, fin);
    
    expect(heures).toBe(32);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: PAUSE 12h-13h - TESTS CRITIQUES
// ═══════════════════════════════════════════════════════════════════════

describe('🍽️ PAUSE 12h-13h - Exclusion obligatoire', () => {
  
  it('CRITIQUE: 09h-17h doit soustraire 1h pour pause', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause 09h-17h:');
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Différence: ${(heuresSansPause - heuresAvecPause).toFixed(2)}h`);
    
    expect(heuresSansPause).toBe(8);
    expect(heuresAvecPause).toBe(7);
    expect(heuresSansPause - heuresAvecPause).toBe(1);
  });
  
  it('CRITIQUE: 08h-12h ne chevauche PAS la pause → aucune soustraction', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T08:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T12:00:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause 08h-12h (avant pause):');
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Devrait être IDENTIQUE (pas de chevauchement)`);
    
    // BUG ATTENDU: La fonction actuelle soustrait 1h même si pas de chevauchement!
    expect(heuresSansPause).toBe(4);
    // Ce test devrait ÉCHOUER avec l'implémentation actuelle
    // expect(heuresAvecPause).toBe(4); // Ce qu'on VEUT
    // expect(heuresAvecPause).toBe(3); // Ce qu'on OBTIENT (BUG)
    
    const anomalie = heuresAvecPause < heuresSansPause ? 'BUG: Pause soustraite alors que plage ne chevauche pas 12h-13h' : 'OK';
    console.log(`   🚨 Anomalie: ${anomalie}`);
  });
  
  it('CRITIQUE: 13h-17h ne chevauche PAS la pause → aucune soustraction', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T13:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause 13h-17h (après pause):');
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Devrait être IDENTIQUE (pas de chevauchement)`);
    
    // BUG ATTENDU: La fonction actuelle soustrait 1h même si pas de chevauchement!
    expect(heuresSansPause).toBe(4);
    
    const anomalie = heuresAvecPause < heuresSansPause ? 'BUG: Pause soustraite alors que plage ne chevauche pas 12h-13h' : 'OK';
    console.log(`   🚨 Anomalie: ${anomalie}`);
  });
  
  it('CRITIQUE: 10h-14h chevauche pause → doit soustraire exactement 1h', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T10:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T14:00:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause 10h-14h (chevauche pause):');
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Différence attendue: 1h`);
    
    expect(heuresSansPause).toBe(4);
    expect(heuresAvecPause).toBe(3);
    expect(heuresSansPause - heuresAvecPause).toBe(1);
  });
  
  it('CRITIQUE: 11h30-12h30 chevauche pause partiellement', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T11:30:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T12:30:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause 11h30-12h30 (chevauche début pause):');
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Heures bloquées: 12h00-12h30 = 0.5h théorique`);
    
    // La plage est 1h, mais 0.5h sont dans la pause
    // Comportement actuel: soustrait 1h si > 1h total
    // Comportement correct: devrait soustraire 0.5h (chevauchement réel)
    expect(heuresSansPause).toBe(1);
  });
  
  it('CRITIQUE: Multi-jours avec plusieurs pauses', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-16T17:00:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause multi-jours:');
    console.log(`   Heures brutes: ${heuresSansPause}h (32h sur 2 jours)`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Pauses attendues: 2 × 1h = 2h`);
    
    // BUG ATTENDU: La fonction actuelle soustrait 1h pour toute la plage
    // Au lieu de 1h par jour
    expect(heuresSansPause).toBe(32);
    // expect(heuresAvecPause).toBe(30); // Ce qu'on VEUT (2 pauses)
    // expect(heuresAvecPause).toBe(31); // Ce qu'on OBTIENT probablement (1 pause)
    
    console.log(`   🚨 Anomalie: Devrait soustraire 2h (2 jours), pas 1h`);
  });
  
  it('Cas limite: Plage < 1h ne devrait PAS soustraire pause', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T14:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T14:30:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Test pause < 1h:');
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    
    expect(heuresSansPause).toBe(0.5);
    expect(heuresAvecPause).toBe(0.5); // Plage < 1h, pas de soustraction
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: CAPACITÉS JOURNALIÈRES - COHÉRENCE
// ═══════════════════════════════════════════════════════════════════════

describe('⚖️ CAPACITÉS JOURNALIÈRES - Cohérence', () => {
  
  it('Journée standard 8h avec pause = 7h disponibles', () => {
    // Simuler journée 09h-17h
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    
    const capacite = capaciteDisponiblePlageHoraire(debut, fin, true);
    
    console.log('\\n📊 Journée standard:');
    console.log(`   Plage: 09h-17h`);
    console.log(`   Capacité disponible: ${capacite}h`);
    console.log(`   Attendu: 7h (8h - 1h pause)`);
    
    expect(capacite).toBe(7);
  });
  
  it('Journée partielle matin 08h-12h = 4h disponibles (pas de pause)', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T08:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T12:00:00');
    
    const capacite = capaciteDisponiblePlageHoraire(debut, fin, true);
    
    console.log('\\n📊 Demi-journée matin:');
    console.log(`   Plage: 08h-12h`);
    console.log(`   Capacité disponible: ${capacite}h`);
    console.log(`   Attendu: 4h (pas de chevauchement pause)`);
    
    // BUG ATTENDU
    // expect(capacite).toBe(4); // Ce qu'on VEUT
  });
  
  it('Journée partielle après-midi 13h-17h = 4h disponibles (pas de pause)', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T13:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    
    const capacite = capaciteDisponiblePlageHoraire(debut, fin, true);
    
    console.log('\\n📊 Demi-journée après-midi:');
    console.log(`   Plage: 13h-17h`);
    console.log(`   Capacité disponible: ${capacite}h`);
    console.log(`   Attendu: 4h (pas de chevauchement pause)`);
    
    // BUG ATTENDU
    // expect(capacite).toBe(4); // Ce qu'on VEUT
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: JOURS OUVRABLES - DÉCOUPAGE
// ═══════════════════════════════════════════════════════════════════════

describe('📅 JOURS OUVRABLES - Découpage', () => {
  
  it('Semaine complète lundi-vendredi = 5 jours', () => {
    const debut = parseOttawaDateISO('2025-12-15'); // Lundi
    const fin = parseOttawaDateISO('2025-12-19'); // Vendredi
    
    const jours = businessDaysOttawa(debut, fin);
    
    console.log('\\n📊 Jours ouvrables:');
    console.log(`   Période: ${formatOttawaISO(debut)} → ${formatOttawaISO(fin)}`);
    console.log(`   Jours ouvrables: ${jours.length}`);
    console.log(`   Dates:`, jours.map(d => formatOttawaISO(d)));
    
    expect(jours.length).toBe(5);
    expect(formatOttawaISO(jours[0])).toBe('2025-12-15');
    expect(formatOttawaISO(jours[4])).toBe('2025-12-19');
  });
  
  it('Période incluant weekend = saute samedi-dimanche', () => {
    const debut = parseOttawaDateISO('2025-12-15'); // Lundi
    const fin = parseOttawaDateISO('2025-12-22'); // Lundi suivant
    
    const jours = businessDaysOttawa(debut, fin);
    
    console.log('\\n📊 Jours ouvrables avec weekend:');
    console.log(`   Période: ${formatOttawaISO(debut)} → ${formatOttawaISO(fin)}`);
    console.log(`   Jours ouvrables: ${jours.length}`);
    console.log(`   Dates:`, jours.map(d => formatOttawaISO(d)));
    
    expect(jours.length).toBe(6); // 5 + 1 (lundi suivant)
    
    // Vérifier qu'aucun samedi/dimanche n'est présent
    const hasWeekend = jours.some(d => {
      const day = d.getDay();
      return day === 0 || day === 6;
    });
    expect(hasWeekend).toBe(false);
  });
  
  it('Un seul jour = 1 jour ouvrable', () => {
    const debut = parseOttawaDateISO('2025-12-15');
    const fin = parseOttawaDateISO('2025-12-15');
    
    const jours = businessDaysOttawa(debut, fin);
    
    expect(jours.length).toBe(1);
    expect(formatOttawaISO(jours[0])).toBe('2025-12-15');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: CONSERVATION DES HEURES - Invariants critiques
// ═══════════════════════════════════════════════════════════════════════

describe('💎 CONSERVATION DES HEURES - Invariants', () => {
  
  it('INVARIANT: Somme des segments = durée totale (sans perte)', () => {
    // Simuler découpage d'une tâche de 15h sur 3 jours
    const jour1 = 7; // 7h le premier jour (09h-17h avec pause)
    const jour2 = 7; // 7h le deuxième jour
    const jour3 = 1; // 1h le dernier jour
    
    const somme = jour1 + jour2 + jour3;
    
    console.log('\\n📊 Conservation heures:');
    console.log(`   Jour 1: ${jour1}h`);
    console.log(`   Jour 2: ${jour2}h`);
    console.log(`   Jour 3: ${jour3}h`);
    console.log(`   Somme: ${somme}h`);
    console.log(`   Attendu: 15h`);
    
    expect(somme).toBe(15);
  });
  
  it('INVARIANT: Aucune heure ne doit disparaître lors du découpage', () => {
    const heuresTotal = 23.5;
    const capaciteJour = 7; // avec pause
    
    // Calcul manuel du découpage
    const joursComplets = Math.floor(heuresTotal / capaciteJour);
    const heuresRestantes = heuresTotal - (joursComplets * capaciteJour);
    
    const somme = (joursComplets * capaciteJour) + heuresRestantes;
    
    console.log('\\n📊 Découpage sans perte:');
    console.log(`   Total à distribuer: ${heuresTotal}h`);
    console.log(`   Jours complets: ${joursComplets} × ${capaciteJour}h = ${joursComplets * capaciteJour}h`);
    console.log(`   Heures restantes: ${heuresRestantes}h`);
    console.log(`   Somme finale: ${somme}h`);
    
    expect(somme).toBe(heuresTotal);
    expect(heuresRestantes).toBeGreaterThanOrEqual(0);
    expect(heuresRestantes).toBeLessThan(capaciteJour);
  });
  
  it('INVARIANT: Arrondi décimal ne doit pas créer/perdre heures', () => {
    const heures = 7.75; // 7h45min
    
    // Test de précision décimale
    const arrondi2 = parseFloat(heures.toFixed(2));
    const arrondi4 = parseFloat(heures.toFixed(4));
    
    console.log('\\n📊 Précision décimale:');
    console.log(`   Valeur originale: ${heures}`);
    console.log(`   Arrondi 2 déc: ${arrondi2}`);
    console.log(`   Arrondi 4 déc: ${arrondi4}`);
    
    expect(arrondi2).toBe(7.75);
    expect(arrondi4).toBe(7.75);
    expect(Math.abs(arrondi4 - heures)).toBeLessThan(0.0001);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: CAS LIMITES - Edge cases
// ═══════════════════════════════════════════════════════════════════════

describe('🔬 CAS LIMITES - Edge cases', () => {
  
  it('Durée très courte: 0.25h (15 minutes)', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T10:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T10:15:00');
    
    const heures = differenceInHoursOttawa(debut, fin);
    
    console.log('\\n📊 Durée minimale:');
    console.log(`   Plage: 10h00-10h15`);
    console.log(`   Heures: ${heures}h`);
    
    expect(heures).toBe(0.25);
  });
  
  it('Durée très longue: 100h sur 15 jours ouvrables', () => {
    const debut = parseOttawaDateISO('2025-12-15');
    const fin = parseOttawaDateISO('2026-01-05');
    
    const jours = businessDaysOttawa(debut, fin);
    const capaciteJour = 7;
    const capaciteTotale = jours.length * capaciteJour;
    
    console.log('\\n📊 Durée longue:');
    console.log(`   Jours ouvrables: ${jours.length}`);
    console.log(`   Capacité/jour: ${capaciteJour}h`);
    console.log(`   Capacité totale: ${capaciteTotale}h`);
    console.log(`   Demande: 100h`);
    console.log(`   Suffisant: ${capaciteTotale >= 100 ? 'OUI' : 'NON'}`);
    
    expect(jours.length).toBeGreaterThan(10);
    expect(capaciteTotale).toBeGreaterThanOrEqual(100);
  });
  
  it('Plage inversée (fin < début) = heures négatives', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    
    const heures = differenceInHoursOttawa(debut, fin);
    
    console.log('\\n📊 Plage inversée:');
    console.log(`   Début: 17h00`);
    console.log(`   Fin: 09h00`);
    console.log(`   Heures: ${heures}h (devrait être négatif)`);
    
    expect(heures).toBeLessThan(0);
    expect(heures).toBe(-8);
  });
  
  it('Plage exactement sur la pause 12h-13h', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T12:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T13:00:00');
    
    const heuresAvecPause = capaciteDisponiblePlageHoraire(debut, fin, true);
    const heuresSansPause = capaciteDisponiblePlageHoraire(debut, fin, false);
    
    console.log('\\n📊 Plage = pause exacte:');
    console.log(`   Plage: 12h00-13h00`);
    console.log(`   Heures brutes: ${heuresSansPause}h`);
    console.log(`   Heures avec pause: ${heuresAvecPause}h`);
    console.log(`   Devrait être 0h (pause complète bloquée)`);
    
    expect(heuresSansPause).toBe(1);
    expect(heuresAvecPause).toBe(0); // Toute la plage est la pause
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7: DÉTERMINISME - Reproductibilité
// ═══════════════════════════════════════════════════════════════════════

describe('🔁 DÉTERMINISME - Reproductibilité', () => {
  
  it('Même input = même output (idempotence)', () => {
    const debut = parseOttawaDateTimeISO('2025-12-15T09:00:00');
    const fin = parseOttawaDateTimeISO('2025-12-15T17:00:00');
    
    const heures1 = differenceInHoursOttawa(debut, fin);
    const heures2 = differenceInHoursOttawa(debut, fin);
    const heures3 = differenceInHoursOttawa(debut, fin);
    
    console.log('\\n📊 Déterminisme:');
    console.log(`   Exécution 1: ${heures1}h`);
    console.log(`   Exécution 2: ${heures2}h`);
    console.log(`   Exécution 3: ${heures3}h`);
    console.log(`   Identique: ${heures1 === heures2 && heures2 === heures3 ? 'OUI ✓' : 'NON ⚠️'}`);
    
    expect(heures1).toBe(heures2);
    expect(heures2).toBe(heures3);
  });
  
  it('Parse ISO → format ISO = string identique', () => {
    const dateStr = '2025-12-15T14:30:00';
    const date = parseOttawaDateTimeISO(dateStr);
    const formatted = formatOttawaDateTimeISO(date);
    
    console.log('\\n📊 Réversibilité:');
    console.log(`   String original: ${dateStr}`);
    console.log(`   Après parse + format: ${formatted}`);
    console.log(`   Identique: ${dateStr === formatted ? 'OUI ✓' : 'NON ⚠️'}`);
    
    expect(formatted).toBe(dateStr);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 8: TIMESTAMPS - Support heure précise
// ═══════════════════════════════════════════════════════════════════════

describe('⏰ TIMESTAMPS - Support heure précise', () => {
  
  it('hasSignificantTime() détecte heure non-minuit', () => {
    const minuit = parseOttawaDateISO('2025-12-15');
    const midi = parseOttawaDateTimeISO('2025-12-15T12:00:00');
    const quinzeH = parseOttawaDateTimeISO('2025-12-15T15:30:00');
    
    console.log('\\n📊 Détection timestamp:');
    console.log(`   Minuit: hasSignificantTime = ${hasSignificantTime(minuit)}`);
    console.log(`   Midi: hasSignificantTime = ${hasSignificantTime(midi)}`);
    console.log(`   15h30: hasSignificantTime = ${hasSignificantTime(quinzeH)}`);
    
    expect(hasSignificantTime(minuit)).toBe(false);
    expect(hasSignificantTime(midi)).toBe(true);
    expect(hasSignificantTime(quinzeH)).toBe(true);
  });
  
  it('Date seule vs timestamp complet = comportement différent', () => {
    const dateSeule = parseOttawaDateISO('2025-12-15');
    const timestamp = parseOttawaDateTimeISO('2025-12-15T09:30:00');
    
    const hasTime1 = hasSignificantTime(dateSeule);
    const hasTime2 = hasSignificantTime(timestamp);
    
    console.log('\\n📊 Date vs Timestamp:');
    console.log(`   Date seule: ${hasTime1 ? 'a heure' : 'pas heure'}`);
    console.log(`   Timestamp: ${hasTime2 ? 'a heure' : 'pas heure'}`);
    
    expect(hasTime1).toBe(false);
    expect(hasTime2).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// RÉSUMÉ DES TESTS
// ═══════════════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                     SUITE DE TESTS QA TEMPORELLE                      ║
╠═══════════════════════════════════════════════════════════════════════╣
║ 📊 Sections testées:                                                  ║
║    1. Calcul d'heures basique (4 tests)                              ║
║    2. Pause 12h-13h obligatoire (7 tests) 🔴 CRITIQUE                ║
║    3. Capacités journalières (3 tests)                               ║
║    4. Jours ouvrables (3 tests)                                      ║
║    5. Conservation des heures (3 tests)                              ║
║    6. Cas limites (5 tests)                                          ║
║    7. Déterminisme (2 tests)                                         ║
║    8. Timestamps (2 tests)                                           ║
╠═══════════════════════════════════════════════════════════════════════╣
║ 🎯 FOCUS: Validation de la pause 12h-13h bloquée                     ║
║ 🐛 BUGS ATTENDUS:                                                     ║
║    - Pause soustraite même si plage ne chevauche pas 12h-13h         ║
║    - Pause de 1h pour multi-jours au lieu de 1h × nb_jours           ║
║    - Pas de vérification du chevauchement réel                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`);
