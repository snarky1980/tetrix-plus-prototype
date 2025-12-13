import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  repartitionEquilibree,
  repartitionPEPS,
  validerRepartition
} from '../src/services/repartitionService';

// Mock Data
const mockTraducteurStrict = {
  id: 'strict-trad-1',
  nom: 'Traducteur Strict',
  email: 'strict@test.com',
  capaciteHeuresParJour: 7.5, // Configured capacity
  horaire: '08:00-16:00',     // 8h range - 1h lunch = 7h NET capacity
  actif: true
};

// Mock Prisma
vi.mock('../src/config/database', () => ({
  default: {
    traducteur: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.id === mockTraducteurStrict.id) return mockTraducteurStrict;
        return null;
      })
    },
    ajustementTemps: {
      findMany: vi.fn(async () => []) // No existing adjustments
    }
  }
}));

describe('��️ Strict Compliance Tests (Capacity vs Schedule)', () => {
  
  const dateTest = '2025-12-17'; // A Wednesday (Business Day)

  it('should FAIL in repartitionEquilibree if requested hours > net schedule capacity', async () => {
    // Request 7.5h. Config says 7.5h ok, but Schedule says max 7h.
    await expect(repartitionEquilibree(
      mockTraducteurStrict.id,
      7.5,
      dateTest,
      dateTest
    )).rejects.toThrow(/Capacité insuffisante/);
  });

  it('should FAIL in repartitionPEPS if requested hours > net schedule capacity', async () => {
    await expect(repartitionPEPS(
      mockTraducteurStrict.id,
      7.5,
      dateTest,
      dateTest
    )).rejects.toThrow(/Capacité insuffisante/);
  });

  it('should INVALIDATE in validerRepartition if hours > net schedule capacity', async () => {
    const result = await validerRepartition(
      mockTraducteurStrict.id,
      [{ date: dateTest, heures: 7.5 }],
      7.5
    );
    
    expect(result.valide).toBe(false);
    expect(result.erreurs.some(e => e.includes('Dépassement capacité'))).toBe(true);
  });
});
