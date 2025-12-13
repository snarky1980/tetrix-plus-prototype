/**
 * ═══════════════════════════════════════════════════════════════════════
 * TESTS - GESTION HORAIRES TRADUCTEURS ET DEADLINE AVEC HEURE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Objectif: Valider l'intégration de:
 * 1. Horaires de travail par traducteur (07:00-15:00, etc.)
 * 2. Pause midi obligatoire (12:00-13:00) 
 * 3. Deadline avec heure précise (14:00, 12:30, etc.)
 * 4. Allocation à rebours respectant TOUTES les contraintes
 * 
 * Framework: Vitest 1.6.1
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  parseHoraireTraducteur,
  setHourDecimalOttawa,
  capaciteNetteJour,
  getEffectiveEndDateTime,
  todayOttawa,
  parseOttawaDateISO,
  parseOttawaDateTimeISO,
  HoraireTraducteur
} from '../src/utils/dateTimeOttawa';

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: PARSING HORAIRES TRADUCTEURS
// ═══════════════════════════════════════════════════════════════════════

describe('🕐 Parsing Horaires Traducteurs', () => {
  
  it('Parse format "7h30-15h30" correctement', () => {
    const horaire = parseHoraireTraducteur('7h30-15h30');
    
    expect(horaire.heureDebut).toBe(7.5);
    expect(horaire.heureFin).toBe(15.5);
  });
  
  it('Parse format "07:00-15:00" correctement', () => {
    const horaire = parseHoraireTraducteur('07:00-15:00');
    
    expect(horaire.heureDebut).toBe(7.0);
    expect(horaire.heureFin).toBe(15.0);
  });
  
  it('Parse format "9h-17h" correctement', () => {
    const horaire = parseHoraireTraducteur('9h-17h');
    
    expect(horaire.heureDebut).toBe(9.0);
    expect(horaire.heureFin).toBe(17.0);
  });
  
  it('Parse format "8h-16h" correctement', () => {
    const horaire = parseHoraireTraducteur('8h-16h');
    
    expect(horaire.heureDebut).toBe(8.0);
    expect(horaire.heureFin).toBe(16.0);
  });
  
  it('Retourne défaut 9h-17h si horaire null', () => {
    const horaire = parseHoraireTraducteur(null);
    
    expect(horaire.heureDebut).toBe(9.0);
    expect(horaire.heureFin).toBe(17.0);
  });
  
  it('Retourne défaut 9h-17h si horaire invalide', () => {
    const horaire = parseHoraireTraducteur('horaire bizarre');
    
    expect(horaire.heureDebut).toBe(9.0);
    expect(horaire.heureFin).toBe(17.0);
  });
  
  it('Gère format avec espaces', () => {
    const horaire = parseHoraireTraducteur('  7h30 - 15h30  ');
    
    expect(horaire.heureDebut).toBe(7.5);
    expect(horaire.heureFin).toBe(15.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: CAPACITÉ NETTE JOUR (AVEC PAUSE MIDI)
// ═══════════════════════════════════════════════════════════════════════

describe('📊 Capacité Nette Jour', () => {
  
  const today = todayOttawa();
  
  it('Horaire 07:00-15:00 sans deadline → 7h (8h - 1h pause)', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    // Plage: 07-12 (5h) + 13-15 (2h) = 7h
    expect(capacite).toBe(7.0);
  });
  
  it('Horaire 09:00-17:00 sans deadline → 7h (8h - 1h pause)', () => {
    const horaire: HoraireTraducteur = { heureDebut: 9.0, heureFin: 17.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    // Plage: 09-12 (3h) + 13-17 (4h) = 7h
    expect(capacite).toBe(7.0);
  });
  
  it('Horaire 07:00-15:00 avec deadline 14:00 → 6h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    const deadline = setHourDecimalOttawa(today, 14.0);
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    // Plage: 07-12 (5h) + 13-14 (1h) = 6h
    expect(capacite).toBe(6.0);
  });
  
  it('Horaire 07:00-15:00 avec deadline 18:00 → 7h (deadline ignorée, après horaire)', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    const deadline = setHourDecimalOttawa(today, 18.0);
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    // Deadline après horaire → horaire prime
    // Plage: 07-12 (5h) + 13-15 (2h) = 7h
    expect(capacite).toBe(7.0);
  });
  
  it('Horaire 08:00-12:00 (avant pause) → 4h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 8.0, heureFin: 12.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    // Pas de chevauchement avec pause
    expect(capacite).toBe(4.0);
  });
  
  it('Horaire 13:00-17:00 (après pause) → 4h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 13.0, heureFin: 17.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    // Pas de chevauchement avec pause
    expect(capacite).toBe(4.0);
  });
  
  it('Horaire 11:00-14:00 (chevauche pause) → 2h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 11.0, heureFin: 14.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    // Plage: 11-12 (1h) + 13-14 (1h) = 2h
    expect(capacite).toBe(2.0);
  });
  
  it('Deadline 12:30 → capacité avant pause uniquement', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    const deadline = setHourDecimalOttawa(today, 12.5); // 12h30
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    // Plage: 07-12:30 mais pause commence à 12:00
    // Donc seulement 07-12 = 5h
    expect(capacite).toBe(5.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: HEURE EFFECTIVE DE FIN
// ═══════════════════════════════════════════════════════════════════════

describe('⏰ Heure Effective de Fin', () => {
  
  const today = todayOttawa();
  
  it('Deadline 14:00, horaire 07-15 → fin effective = 14:00', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    const deadline = setHourDecimalOttawa(today, 14.0);
    
    const finEffective = getEffectiveEndDateTime(horaire, today, deadline);
    
    expect(finEffective.getTime()).toBe(deadline.getTime());
  });
  
  it('Deadline 18:00, horaire 07-15 → fin effective = 15:00 (horaire prime)', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    const deadline = setHourDecimalOttawa(today, 18.0);
    
    const finEffective = getEffectiveEndDateTime(horaire, today, deadline);
    const finHoraire = setHourDecimalOttawa(today, 15.0);
    
    expect(finEffective.getTime()).toBe(finHoraire.getTime());
  });
  
  it('Pas de deadline → fin effective = fin horaire', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    
    const finEffective = getEffectiveEndDateTime(horaire, today);
    const finHoraire = setHourDecimalOttawa(today, 15.0);
    
    expect(finEffective.getTime()).toBe(finHoraire.getTime());
  });
  
  it('Deadline jour différent → fin effective = fin horaire', () => {
    const horaire: HoraireTraducteur = { heureDebut: 7.0, heureFin: 15.0 };
    const demain = parseOttawaDateISO('2025-12-17');
    const deadlineDemain = setHourDecimalOttawa(demain, 14.0);
    
    const finEffective = getEffectiveEndDateTime(horaire, today, deadlineDemain);
    const finHoraire = setHourDecimalOttawa(today, 15.0);
    
    expect(finEffective.getTime()).toBe(finHoraire.getTime());
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: HELPER SETHOURDECIMAL
// ═══════════════════════════════════════════════════════════════════════

describe('🕐 setHourDecimalOttawa', () => {
  
  const today = todayOttawa();
  
  it('Set 14.0 → 14h00', () => {
    const result = setHourDecimalOttawa(today, 14.0);
    
    // Vérifier via formatting plutôt que getHours() (qui est en UTC)
    const formatted = result.toISOString();
    // Should contain 19: (14h Ottawa = 19h UTC en hiver EST)
    // Ou 18: en été EDT - donc on vérifie juste que c'est cohérent
    expect(formatted).toMatch(/T(14|18|19):/);
  });
  
  it('Set 14.5 → 14h30', () => {
    const result = setHourDecimalOttawa(today, 14.5);
    
    const formatted = result.toISOString();
    // Should contain :30
    expect(formatted).toContain(':30:');
  });
  
  it('Set 7.5 → 07h30', () => {
    const result = setHourDecimalOttawa(today, 7.5);
    
    const formatted = result.toISOString();
    // Should have :30
    expect(formatted).toContain(':30:');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: CAS MÉTIER RÉELS (SCÉNARIOS CISR)
// ═══════════════════════════════════════════════════════════════════════

describe('📋 Scénarios Métier Réels', () => {
  
  const today = todayOttawa();
  
  it('Traducteur Michaud (7h30-15h30) avec deadline 14:00', () => {
    const horaire = parseHoraireTraducteur('7h30-15h30');
    const deadline = setHourDecimalOttawa(today, 14.0);
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    // 07:30-12:00 = 4.5h
    // 13:00-14:00 = 1h
    // Total: 5.5h
    expect(capacite).toBe(5.5);
  });
  
  it('Traducteur Ouellet (8h-16h) avec deadline 16:30', () => {
    const horaire = parseHoraireTraducteur('8h-16h');
    const deadline = setHourDecimalOttawa(today, 16.5); // 16h30
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    // Deadline après horaire → horaire prime
    // 08:00-12:00 = 4h
    // 13:00-16:00 = 3h
    // Total: 7h
    expect(capacite).toBe(7.0);
  });
  
  it('Traducteur Mean (9h-17h) avec deadline 12:30', () => {
    const horaire = parseHoraireTraducteur('9h-17h');
    const deadline = setHourDecimalOttawa(today, 12.5); // 12h30
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    // Deadline avant pause → seulement matin
    // 09:00-12:00 = 3h (on ne va pas jusqu'à 12:30 car pause commence à 12:00)
    // Total: 3h
    expect(capacite).toBe(3.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: EDGE CASES
// ═══════════════════════════════════════════════════════════════════════

describe('⚠️ Edge Cases', () => {
  
  const today = todayOttawa();
  
  it('Horaire complètement dans pause (12h-13h) → 0h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 12.0, heureFin: 13.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    expect(capacite).toBe(0);
  });
  
  it('Deadline avant début horaire → 0h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 9.0, heureFin: 17.0 };
    const deadline = setHourDecimalOttawa(today, 8.0); // 08h00, avant 09h00
    
    const capacite = capaciteNetteJour(horaire, today, deadline);
    
    expect(capacite).toBe(0);
  });
  
  it('Horaire très court (1h) sans chevauchement pause', () => {
    const horaire: HoraireTraducteur = { heureDebut: 14.0, heureFin: 15.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    expect(capacite).toBe(1.0);
  });
  
  it('Horaire fin = début → 0h', () => {
    const horaire: HoraireTraducteur = { heureDebut: 9.0, heureFin: 9.0 };
    
    const capacite = capaciteNetteJour(horaire, today);
    
    expect(capacite).toBe(0);
  });
});
