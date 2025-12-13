
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { repartitionPEPS, repartitionEquilibree, validerRepartition } from '../src/services/repartitionService';
import prisma from '../src/config/database';

describe('BUG REPRO - Deadline Precision - Other Modes', () => {
  let traducteur: any;

  beforeEach(async () => {
    const email = `bug_repro_modes_${Date.now()}@test.local`;
    traducteur = await prisma.traducteur.create({
      data: {
        nom: 'Anna Ahlgren Repro Modes',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 7.5,
        horaire: '09:00-17:00',
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
  });

  afterEach(async () => {
    if (traducteur) {
      await prisma.ajustementTemps.deleteMany({ where: { traducteurId: traducteur.id } });
      await prisma.traducteur.delete({ where: { id: traducteur.id } });
    }
  });

  it('PEPS: should limit capacity on deadline day when time is specified', async () => {
    // Deadline: 17th Dec at 11:00 AM
    // Start: 16th Dec
    // Schedule: 09:00 - 17:00
    // Available on 17th: 09:00 to 11:00 = 2 hours
    // Task: 10 hours
    // Expected: 
    // 16th: 7h (full day - pause)
    // 17th: 2h (max)
    // Total: 9h (should fail if 10h requested, or return what fits)
    
    // Note: PEPS throws if capacity insufficient.
    // Let's try 8 hours. 
    // 16th: 7h
    // 17th: 1h (fits in 2h available)
    
    const start = '2025-12-16';
    const deadline = '2025-12-17T11:00:00';
    const hours = 8;

    const resultat = await repartitionPEPS(
      traducteur.id,
      hours,
      start,
      deadline
    );

    console.log('PEPS Resultat:', resultat);

    const alloc17 = resultat.find(r => r.date === '2025-12-17');
    if (alloc17) {
        expect(alloc17.heures).toBeLessThanOrEqual(2);
    }
  });

  it('Equilibré: should limit capacity on deadline day when time is specified', async () => {
    // Deadline: 17th Dec at 11:00 AM
    // Start: 16th Dec
    // Schedule: 09:00 - 17:00
    // Available on 16th: 7h
    // Available on 17th: 2h
    // Total available: 9h
    // Task: 8 hours
    // Balanced: 4h on 16th, 4h on 17th -> FAIL because 17th max is 2h.
    // Should redistribute: 6h on 16th, 2h on 17th.

    const start = '2025-12-16';
    const deadline = '2025-12-17T11:00:00';
    const hours = 8;

    const resultat = await repartitionEquilibree(
      traducteur.id,
      hours,
      start,
      deadline
    );

    console.log('Equilibré Resultat:', resultat);

    const alloc17 = resultat.find(r => r.date === '2025-12-17');
    if (alloc17) {
        expect(alloc17.heures).toBeLessThanOrEqual(2);
    }
  });

  it('Manuel: validation should fail if exceeding deadline time capacity', async () => {
    // Deadline: 17th Dec at 11:00 AM
    // Schedule: 09:00 - 17:00
    // Available on 17th: 2h
    // User tries to put 3h on 17th.

    const repartition = [
        { date: '2025-12-17', heures: 3 }
    ];

    const result = await validerRepartition(
        traducteur.id,
        repartition,
        3,
        undefined,
        '2025-12-17T11:00:00-05:00'
    );

    expect(result.valide).toBe(false);
    expect(result.erreurs.some(e => e.includes('Dépassement capacité'))).toBe(true);
  });
});
