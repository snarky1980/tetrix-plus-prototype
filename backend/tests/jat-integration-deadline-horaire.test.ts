/**
 * ═══════════════════════════════════════════════════════════════════════
 * TESTS D'INTÉGRATION - JAT AVEC DEADLINE + HORAIRE + PAUSE MIDI
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Objectif: Valider l'intégration complète de:
 * 1. Horaires de travail par traducteur (07:00-15:00, etc.)
 * 2. Pause midi obligatoire (12:00-13:00) systématiquement exclue
 * 3. Deadline avec heure précise (14:00, 12:30, etc.)
 * 4. Allocation à rebours JAT respectant TOUTES les contraintes
 * 
 * Ces tests valident la CORRECTION des bugs identifiés:
 * - Bug #1: Deadline traitée comme date-only
 * - Bug #2: Pause 12h-13h non exclue de l'allocation
 * - Bug #3: Horaire traducteur ignoré
 * - Bug #4: Capacité globale sans pause
 * 
 * Framework: Vitest 1.6.1
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { repartitionJusteATemps } from '../src/services/repartitionService';
import prisma from '../src/config/database';
import { parseOttawaDateISO, formatOttawaISO, todayOttawa } from '../src/utils/dateTimeOttawa';

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

async function creerTraducteurTest(horaire: string, capacite: number = 7.5) {
  const email = `test_${Date.now()}_${Math.random()}@test.local`;
  
  return await prisma.traducteur.create({
    data: {
      nom: `Test Traducteur ${horaire}`,
      divisions: ['TEST'],
      domaines: [],
      clientsHabituels: [],
      capaciteHeuresParJour: capacite,
      horaire: horaire,
      classification: 'TR-02',
      utilisateur: {
        create: {
          email,
          motDePasse: 'test123',
          role: 'TRADUCTEUR'
        }
      }
    }
  });
}

async function nettoyerTraducteur(traducteurId: string) {
  // Supprimer les ajustements
  await prisma.ajustementTemps.deleteMany({ where: { traducteurId } });
  
  // Récupérer l'utilisateur lié
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
    select: { utilisateurId: true }
  });
  
  // Supprimer le traducteur (cascade supprimera l'utilisateur)
  await prisma.traducteur.delete({ where: { id: traducteurId } });
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: CAS CANONIQUE - DEADLINE 14H, HORAIRE 07-15
// ═══════════════════════════════════════════════════════════════════════

describe('🎯 CAS CANONIQUE - Règle Métier Centrale', () => {
  
  let traducteur: any;
  
  beforeEach(async () => {
    traducteur = await creerTraducteurTest('07:00-15:00', 7.5);
  });
  
  afterEach(async () => {
    if (traducteur) {
      await nettoyerTraducteur(traducteur.id);
    }
  });
  
  it('2h, deadline 14:00, horaire 07-15 → allocation correcte sans toucher pause', async () => {
    const deadline = '2025-12-20T14:00:00'; // Vendredi 20 déc 14h
    const heures = 2;
    
    const resultat = await repartitionJusteATemps(
      traducteur.id,
      heures,
      deadline,
      { modeTimestamp: true, debug: true }
    );
    
    console.log('\\n📊 Résultat allocation 2h, deadline 14h:');
    resultat.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
    
    // Validations principales
    expect(resultat).toBeDefined();
    expect(resultat.length).toBeGreaterThan(0);
    
    // Vérifier total = 2h
    const total = resultat.reduce((sum, r) => sum + r.heures, 0);
    expect(total).toBeCloseTo(2.0, 2);
    
    // Vérifier que chaque jour ne dépasse pas 7h (capacité nette avec pause)
    resultat.forEach(r => {
      expect(r.heures).toBeLessThanOrEqual(7.0);
    });
    
    // Le premier jour (deadline) devrait avoir au max 6h
    // (07-12 = 5h + 13-14 = 1h = 6h total)
    if (resultat[0].date === '2025-12-20') {
      expect(resultat[0].heures).toBeLessThanOrEqual(6.0);
    }
  });
  
  it('10h sur plusieurs jours → aucun jour ne dépasse 7h (pause exclue)', async () => {
    const deadline = '2025-12-20T15:00:00'; // Vendredi 20 déc 15h (fin horaire)
    const heures = 10;
    
    const resultat = await repartitionJusteATemps(
      traducteur.id,
      heures,
      deadline,
      { modeTimestamp: true, debug: true }
    );
    
    console.log('\\n📊 Résultat allocation 10h multi-jours:');
    resultat.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
    
    // Vérifier total = 10h
    const total = resultat.reduce((sum, r) => sum + r.heures, 0);
    expect(total).toBeCloseTo(10.0, 2);
    
    // CRITIQUE: Aucun jour ne devrait dépasser 7h (capacité nette)
    resultat.forEach(r => {
      expect(r.heures).toBeLessThanOrEqual(7.01); // Petite tolérance pour arrondis
      expect(r.heures).toBeGreaterThan(0);
    });
    
    // Devrait nécessiter au moins 2 jours (10h / 7h max par jour)
    expect(resultat.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: DEADLINE AVEC HEURES VARIÉES
// ═══════════════════════════════════════════════════════════════════════

describe('⏰ Deadline avec Heures Variées', () => {
  
  let traducteur: any;
  
  beforeEach(async () => {
    traducteur = await creerTraducteurTest('09:00-17:00', 7.5);
  });
  
  afterEach(async () => {
    if (traducteur) {
      await nettoyerTraducteur(traducteur.id);
    }
  });
  
  it('Deadline 12:30 (avant pause) → allocation matin uniquement', async () => {
    const deadline = '2025-12-20T12:30:00';
    const heures = 3;
    
    const resultat = await repartitionJusteATemps(
      traducteur.id,
      heures,
      deadline,
      { modeTimestamp: true, debug: true }
    );
    
    console.log('\\n📊 Résultat deadline 12:30:');
    resultat.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
    
    // Total = 3h
    const total = resultat.reduce((sum, r) => sum + r.heures, 0);
    expect(total).toBeCloseTo(3.0, 2);
    
    // Le jour de deadline ne peut avoir que max 3h (09-12)
    const jourDeadline = resultat.find(r => r.date === '2025-12-20');
    if (jourDeadline) {
      expect(jourDeadline.heures).toBeLessThanOrEqual(3.01);
    }
  });
  
  it('Deadline 18:00 (après horaire) → capée à 17:00', async () => {
    const deadline = '2025-12-20T18:00:00'; // Après horaire
    const heures = 7;
    
    const resultat = await repartitionJusteATemps(
      traducteur.id,
      heures,
      deadline,
      { modeTimestamp: true, debug: true }
    );
    
    console.log('\\n📊 Résultat deadline 18h (après horaire):');
    resultat.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
    
    // Total = 7h
    const total = resultat.reduce((sum, r) => sum + r.heures, 0);
    expect(total).toBeCloseTo(7.0, 2);
    
    // Peut tenir sur 1 jour car horaire 09-17 = 7h nettes (8h - 1h pause)
    expect(resultat.length).toBeGreaterThanOrEqual(1);
    
    // Si sur 1 jour, doit être exactement 7h
    if (resultat.length === 1) {
      expect(resultat[0].heures).toBeCloseTo(7.0, 2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: HORAIRES TRADUCTEURS VARIÉS (CISR RÉELS)
// ═══════════════════════════════════════════════════════════════════════

describe('👥 Horaires Traducteurs Variés', () => {
  
  it('Traducteur 7h30-15h30 (Michaud) → capacité 7h/jour', async () => {
    const traducteur = await creerTraducteurTest('7h30-15h30', 7.5);
    
    try {
      const deadline = '2025-12-20T15:30:00'; // Fin horaire
      const heures = 7;
      
      const resultat = await repartitionJusteATemps(
        traducteur.id,
        heures,
        deadline,
        { modeTimestamp: true, debug: true }
      );
      
      console.log('\\n📊 Traducteur Michaud (7h30-15h30):');
      resultat.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
      
      // Total = 7h
      const total = resultat.reduce((sum, r) => sum + r.heures, 0);
      expect(total).toBeCloseTo(7.0, 2);
      
      // Capacité: 7h30-12h (4.5h) + 13h-15h30 (2.5h) = 7h
      // Devrait tenir sur 1 jour
      expect(resultat.length).toBe(1);
      expect(resultat[0].heures).toBeCloseTo(7.0, 2);
      
    } finally {
      await nettoyerTraducteur(traducteur.id);
    }
  });
  
  it('Traducteur 8h-16h (Ouellet) → capacité 7h/jour', async () => {
    const traducteur = await creerTraducteurTest('8h-16h', 7.5);
    
    try {
      const deadline = '2025-12-20T16:00:00'; // Fin horaire
      const heures = 14; // 2 jours
      
      const resultat = await repartitionJusteATemps(
        traducteur.id,
        heures,
        deadline,
        { modeTimestamp: true, debug: true }
      );
      
      console.log('\\n📊 Traducteur Ouellet (8h-16h):');
      resultat.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
      
      // Total = 14h
      const total = resultat.reduce((sum, r) => sum + r.heures, 0);
      expect(total).toBeCloseTo(14.0, 2);
      
      // Capacité: 8h-12h (4h) + 13h-16h (3h) = 7h/jour
      // 14h → 2 jours
      expect(resultat.length).toBeGreaterThanOrEqual(2);
      
      // Chaque jour max 7h
      resultat.forEach(r => {
        expect(r.heures).toBeLessThanOrEqual(7.01);
      });
      
    } finally {
      await nettoyerTraducteur(traducteur.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: EDGE CASES ET VALIDATIONS
// ═══════════════════════════════════════════════════════════════════════

describe('⚠️ Edge Cases', () => {
  
  let traducteur: any;
  
  beforeEach(async () => {
    traducteur = await creerTraducteurTest('09:00-17:00', 7.5);
  });
  
  afterEach(async () => {
    if (traducteur) {
      await nettoyerTraducteur(traducteur.id);
    }
  });
  
  it('Capacité insuffisante → erreur claire', async () => {
    const deadline = '2025-12-16T17:00:00'; // 2 jours ouvrables disponibles (lun-mar)
    const heures = 50; // Impossible avec 2 jours × 7h = 14h max
    
    await expect(
      repartitionJusteATemps(
        traducteur.id,
        heures,
        deadline,
        { modeTimestamp: true }
      )
    ).rejects.toThrow(/capacité insuffisante/i);
  });
  
  it('Deadline passée → erreur', async () => {
    const deadlinePassee = '2025-12-01T17:00:00'; // Dans le passé
    const heures = 5;
    
    await expect(
      repartitionJusteATemps(
        traducteur.id,
        heures,
        deadlinePassee,
        { modeTimestamp: true }
      )
    ).rejects.toThrow();
  });
  
  it('Mode legacy (date-only) fonctionne toujours', async () => {
    const deadline = '2025-12-20'; // Date seule
    const heures = 7;
    
    const resultat = await repartitionJusteATemps(
      traducteur.id,
      heures,
      deadline,
      { modeTimestamp: false } // Mode legacy
    );
    
    // Devrait fonctionner même sans heure précise
    const total = resultat.reduce((sum, r) => sum + r.heures, 0);
    expect(total).toBeCloseTo(7.0, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: VALIDATION CAPACITÉ GLOBALE
// ═══════════════════════════════════════════════════════════════════════

describe('📊 Validation Capacité Globale', () => {
  
  it('Capacité journalière = 7h (pas 7.5h) grâce à exclusion pause', async () => {
    const traducteur = await creerTraducteurTest('09:00-17:00', 7.5);
    
    try {
      const deadline = '2025-12-20T17:00:00';
      
      // Test avec 35h exactement
      const resultat35 = await repartitionJusteATemps(
        traducteur.id,
        35,
        deadline,
        { modeTimestamp: true, debug: true }
      );
      
      const total35 = resultat35.reduce((sum, r) => sum + r.heures, 0);
      expect(total35).toBeCloseTo(35.0, 2);
      
      console.log('\\n📊 Allocation 35h:');
      resultat35.forEach(r => console.log(`   ${r.date}: ${r.heures}h`));
      
      // CRITIQUE: Chaque jour doit avoir MAX 7h (pas 7.5h)
      resultat35.forEach(r => {
        expect(r.heures).toBeLessThanOrEqual(7.01); // Tolérance arrondi
        expect(r.heures).toBeGreaterThan(0);
      });
      
      // Test avec 7h (1 jour complet)
      const resultat7 = await repartitionJusteATemps(
        traducteur.id,
        7,
        deadline,
        { modeTimestamp: true, debug: false }
      );
      
      const total7 = resultat7.reduce((sum, r) => sum + r.heures, 0);
      expect(total7).toBeCloseTo(7.0, 2);
      
      // 1 jour complet = exactement 7h (horaire 09-17 moins pause 12-13)
      if (resultat7.length === 1) {
        expect(resultat7[0].heures).toBeCloseTo(7.0, 2);
      }
      
      console.log('\\n✅ Capacité globale correcte: 7h/jour net (pause exclue)');
      
    } finally {
      await nettoyerTraducteur(traducteur.id);
    }
  });
});
