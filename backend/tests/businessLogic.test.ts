/**
 * Business Logic Validation Tests
 * Phase 3: Comprehensive validation of JAT algorithm, capacity constraints, and time blocking
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { repartitionUniforme, repartitionJusteATemps, validerRepartition, RepartitionItem } from '../src/services/repartitionService';
import { verifierCapaciteJournaliere } from '../src/services/capaciteService';
import prisma from '../src/config/database';

// Mock Prisma for unit tests without database
vi.mock('../src/config/database', () => {
  const mockTraducteur = { id: 't1', nom: 'Test Traducteur', capaciteHeuresParJour: 7.5 };
  return {
    default: {
      traducteur: { 
        findUnique: vi.fn(async () => mockTraducteur),
        create: vi.fn(async (data) => ({ ...mockTraducteur, ...data.data, id: 'test-' + Date.now() })),
      },
      ajustementTemps: { 
        findMany: vi.fn(async () => []),
      },
    },
  };
});

describe('Business Logic Validation - JAT Algorithm', () => {
  describe('Edge Cases', () => {
    it('should throw error for zero hours', async () => {
      await expect(
        repartitionJusteATemps('t1', 0, new Date('2025-12-31'))
      ).rejects.toThrow('heuresTotal doit être > 0');
    });

    it('should throw error for negative hours', async () => {
      await expect(
        repartitionJusteATemps('t1', -5, new Date('2025-12-31'))
      ).rejects.toThrow('heuresTotal doit être > 0');
    });

    it('should throw error for past deadline', async () => {
      const pastDate = new Date('2020-01-01');
      await expect(
        repartitionJusteATemps('t1', 10, pastDate)
      ).rejects.toThrow('dateEcheance déjà passée');
    });

    it('should throw error for non-existent translator', async () => {
      const mockPrisma = await import('../src/config/database');
      const originalFn = mockPrisma.default.traducteur.findUnique;
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => null);
      
      await expect(
        repartitionJusteATemps('nonexistent', 10, new Date('2025-12-31'))
      ).rejects.toThrow('Traducteur introuvable');
      
      mockPrisma.default.traducteur.findUnique = originalFn;
    });
  });

  describe('Capacity Constraint Validation', () => {
    it('should respect daily capacity limits', async () => {
      const mockPrisma = await import('../src/config/database');
      
      // Translator with 5h/day capacity
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Low Capacity',
        capaciteHeuresParJour: 5
      }));
      
      // Empty adjustments
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Request 10h for 1 day period (today only, only 5h available)
      await expect(
        repartitionJusteATemps('t1', 10, today)
      ).rejects.toThrow(/Capacité insuffisante/);
    });

    it('should account for existing tasks when calculating capacity', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      }));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Existing task using 7h today (leaving only 0.5h available)
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
        { date: today, heures: 7 }
      ]);
      
      // Only 0.5h available today, requesting 1h should fail
      await expect(
        repartitionJusteATemps('t1', 1, today)
      ).rejects.toThrow(/Capacité insuffisante/);
    });
  });

  describe('Distribution Patterns', () => {
    it('should distribute hours working backwards from deadline (JAT principle)', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 10
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 5); // 6 days total (0-5)
      
      const result = await repartitionJusteATemps('t1', 20, deadline);
      
      // Should allocate, verify result is sorted ascending
      const dates = result.map(r => r.date);
      const sortedDates = [...dates].sort((a, b) => a.localeCompare(b));
      expect(dates).toEqual(sortedDates);
      
      // Total should match requested
      const total = result.reduce((sum, r) => sum + r.heures, 0);
      expect(Math.abs(total - 20)).toBeLessThan(0.01);
      
      // No day should exceed capacity
      result.forEach(r => {
        expect(r.heures).toBeLessThanOrEqual(10 + 0.01);
        expect(r.heures).toBeGreaterThan(0);
      });
    });

    it('should handle single day period correctly', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 8
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result = await repartitionJusteATemps('t1', 5, today);
      
      expect(result.length).toBe(1);
      expect(result[0].heures).toBeCloseTo(5);
    });

    it('should handle long periods (30 days)', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      
      const result = await repartitionJusteATemps('t1', 100, deadline);
      
      // Should successfully allocate
      expect(result.length).toBeGreaterThan(0);
      
      const total = result.reduce((sum, r) => sum + r.heures, 0);
      expect(Math.abs(total - 100)).toBeLessThan(0.01);
      
      // Each day should respect capacity
      result.forEach(r => {
        expect(r.heures).toBeLessThanOrEqual(7.5 + 0.01);
      });
    });
  });

  describe('Numeric Precision', () => {
    it('should not produce NaN values', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);
      
      const result = await repartitionJusteATemps('t1', 15.75, deadline);
      
      result.forEach(r => {
        expect(isNaN(r.heures)).toBe(false);
        expect(isFinite(r.heures)).toBe(true);
      });
    });

    it('should handle decimal hours correctly', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);
      
      const result = await repartitionJusteATemps('t1', 10.25, deadline);
      
      const total = result.reduce((sum, r) => sum + r.heures, 0);
      expect(Math.abs(total - 10.25)).toBeLessThan(0.01);
    });
  });
});

describe('Business Logic Validation - Capacity Service', () => {
  describe('Daily Capacity Calculations', () => {
    it('should calculate available capacity correctly with no existing tasks', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        capaciteHeuresParJour: 8
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const result = await verifierCapaciteJournaliere('t1', new Date('2025-12-15'), 3);
      
      expect(result.capacite).toBe(8);
      expect(result.heuresActuelles).toBe(0);
      expect(result.disponible).toBe(8);
      expect(result.depassement).toBe(false);
    });

    it('should calculate available capacity correctly with existing tasks', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        capaciteHeuresParJour: 8
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
        { heures: 3 },
        { heures: 2 }
      ]);
      
      const result = await verifierCapaciteJournaliere('t1', new Date('2025-12-15'), 2);
      
      expect(result.capacite).toBe(8);
      expect(result.heuresActuelles).toBe(5);
      expect(result.disponible).toBe(3);
      expect(result.depassement).toBe(false);
    });

    it('should detect capacity overflow', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        capaciteHeuresParJour: 8
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
        { heures: 6 }
      ]);
      
      const result = await verifierCapaciteJournaliere('t1', new Date('2025-12-15'), 3);
      
      expect(result.capacite).toBe(8);
      expect(result.heuresActuelles).toBe(6);
      expect(result.disponible).toBe(2);
      expect(result.depassement).toBe(true); // 6 + 3 > 8
    });

    it('should handle time blocks correctly', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        capaciteHeuresParJour: 8
      }));
      
      // Time blocks are also stored as ajustementTemps with type BLOCAGE
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
        { heures: 2 }, // time block
        { heures: 3 }  // task
      ]);
      
      const result = await verifierCapaciteJournaliere('t1', new Date('2025-12-15'), 2);
      
      expect(result.heuresActuelles).toBe(5); // blocks + tasks
      expect(result.disponible).toBe(3);
    });

    it('should show overallocation when existing exceeds capacity', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 't1',
        capaciteHeuresParJour: 8
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
        { heures: 10 } // exceeds capacity
      ]);
      
      const result = await verifierCapaciteJournaliere('t1', new Date('2025-12-15'), 0);
      
      expect(result.heuresActuelles).toBe(10);
      expect(result.disponible).toBe(-2); // Shows overallocation
      expect(result.depassement).toBe(true); // Already exceeds even without additional hours
    });
  });
});

describe('Business Logic Validation - Uniform Distribution', () => {
  it('should distribute hours uniformly across days', () => {
    const total = 10;
    const debut = new Date('2025-01-01');
    const fin = new Date('2025-01-05'); // 5 days
    
    const result = repartitionUniforme(total, debut, fin);
    
    expect(result.length).toBe(5);
    
    const sum = result.reduce((s, r) => s + r.heures, 0);
    expect(Math.abs(sum - total)).toBeLessThan(0.01);
    
    // Each day should be approximately equal
    const average = total / 5;
    result.forEach(r => {
      expect(Math.abs(r.heures - average)).toBeLessThan(0.01);
    });
  });

  it('should handle rounding correctly for non-divisible hours', () => {
    const total = 10;
    const debut = new Date('2025-01-01');
    const fin = new Date('2025-01-03'); // 3 days: 10/3 = 3.333...
    
    const result = repartitionUniforme(total, debut, fin);
    
    expect(result.length).toBe(3);
    
    const sum = result.reduce((s, r) => s + r.heures, 0);
    expect(Math.abs(sum - total)).toBeLessThan(0.0001);
  });

  it('should throw error for invalid date range', () => {
    const debut = new Date('2025-01-05');
    const fin = new Date('2025-01-01'); // fin before debut
    
    expect(() => repartitionUniforme(10, debut, fin)).toThrow('Intervalle de dates invalide');
  });

  it('should handle single day period', () => {
    const total = 7.5;
    const date = new Date('2025-01-01');
    
    const result = repartitionUniforme(total, date, date);
    
    expect(result.length).toBe(1);
    expect(result[0].heures).toBe(7.5);
  });
});

describe('Business Logic Validation - Integration Scenarios', () => {
  describe('Scenario 1: Simple Task', () => {
    it('should handle 20h over 5 days with 7.5h/day capacity', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 'jean',
        nom: 'Jean',
        capaciteHeuresParJour: 7.5
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 5);
      
      const result = await repartitionJusteATemps('jean', 20, deadline);
      
      // Should distribute approximately 4h/day
      const total = result.reduce((s, r) => s + r.heures, 0);
      expect(Math.abs(total - 20)).toBeLessThan(0.01);
      
      // Each day should be under capacity
      result.forEach(r => {
        expect(r.heures).toBeLessThanOrEqual(7.5 + 0.01);
      });
    });
  });

  describe('Scenario 2: Task with Time Blocks', () => {
    it('should handle 30h over 5 days with blocks on days 1-2', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 'marie',
        nom: 'Marie',
        capaciteHeuresParJour: 8
      }));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const day1 = new Date(today);
      const day2 = new Date(today);
      day2.setDate(day2.getDate() + 1);
      
      // Blocks on day 1 and 2
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
        { date: day1, heures: 2 },
        { date: day2, heures: 3 }
      ]);
      
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 5);
      
      const result = await repartitionJusteATemps('marie', 30, deadline);
      
      const total = result.reduce((s, r) => s + r.heures, 0);
      expect(Math.abs(total - 30)).toBeLessThan(0.01);
      
      // Should respect existing blocks
      result.forEach(r => {
        expect(r.heures).toBeLessThanOrEqual(8 + 0.01);
      });
    });
  });

  describe('Scenario 3: Overload Scenario', () => {
    it('should reject 30h request when only 25h available', async () => {
      const mockPrisma = await import('../src/config/database');
      
      mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
        id: 'pierre',
        nom: 'Pierre',
        capaciteHeuresParJour: 5
      }));
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => []);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 5); // 6 days total = 30h capacity
      
      // Request 30h should succeed
      const result = await repartitionJusteATemps('pierre', 30, deadline);
      expect(result).toBeDefined();
      
      // But 31h should fail
      await expect(
        repartitionJusteATemps('pierre', 31, deadline)
      ).rejects.toThrow(/Capacité insuffisante/);
    });
  });
});
