import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config/database', () => {
  return {
    default: {
      traducteur: { findUnique: vi.fn(async () => ({ id: 't1', capaciteHeuresParJour: 7.5 })) },
      ajustementTemps: { findMany: vi.fn(async () => ([{ heures: 2 }, { heures: 1.5 }])) },
    },
  };
});

import { verifierCapaciteJournaliere } from '../src/services/capaciteService';

describe('capaciteService.verifierCapaciteJournaliere', () => {
  it('calcule la capacité disponible correctement', async () => {
    const res = await verifierCapaciteJournaliere('t1', new Date('2025-03-10'), 2);
    expect(res.capacite).toBe(7.5);
    expect(res.heuresActuelles).toBeCloseTo(3.5);
    expect(res.disponible).toBeCloseTo(4.0);
    expect(res.depassement).toBe(false);
  });
  it('indique dépassement si ajout excède capacité', async () => {
    const res = await verifierCapaciteJournaliere('t1', new Date('2025-03-10'), 5);
    expect(res.depassement).toBe(true);
  });
});
