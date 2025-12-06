/**
 * Time Blocking Tests
 * Phase 3: Validation of time blocking functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bloquerTemps, obtenirBlocages, supprimerBlocage } from '../src/controllers/traducteurController';
import type { Response } from 'express';
import type { AuthRequest } from '../src/middleware/auth';

// Mock Prisma
vi.mock('../src/config/database', () => {
  const mockTraducteur = {
    id: 't1',
    nom: 'Test Traducteur',
    capaciteHeuresParJour: 8,
  };

  return {
    default: {
      traducteur: {
        findUnique: vi.fn(async () => mockTraducteur),
      },
      ajustementTemps: {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === 'valid-block') {
            return {
              id: 'valid-block',
              traducteurId: 't1',
              date: new Date('2025-12-15'),
              heures: 2,
              type: 'BLOCAGE',
              creePar: 'admin',
            };
          }
          return null;
        }),
        create: vi.fn(async (data: any) => ({
          id: 'new-block-' + Date.now(),
          ...data.data,
          creeLe: new Date(),
        })),
        delete: vi.fn(async () => ({})),
      },
    },
  };
});

describe('Time Blocking - bloquerTemps', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonFn: any;
  let statusFn: any;

  beforeEach(() => {
    jsonFn = vi.fn();
    statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    
    mockReq = {
      params: { id: 't1' },
      body: {},
      utilisateur: { id: 'admin-user', role: 'ADMIN' } as any,
    };
    
    mockRes = {
      json: jsonFn,
      status: statusFn,
    };
  });

  it('should create a time block successfully', async () => {
    mockReq.body = {
      date: '2025-12-15',
      heures: 2,
      raison: 'Meeting',
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(201);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Temps bloqué avec succès',
        blocage: expect.objectContaining({
          heures: 2,
          type: 'BLOCAGE',
        }),
      })
    );
  });

  it('should reject block without date', async () => {
    mockReq.body = {
      heures: 2,
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({ erreur: 'Date requise' });
  });

  it('should reject block with zero hours', async () => {
    mockReq.body = {
      date: '2025-12-15',
      heures: 0,
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({ erreur: 'Heures doivent être > 0' });
  });

  it('should reject block with negative hours', async () => {
    mockReq.body = {
      date: '2025-12-15',
      heures: -2,
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({ erreur: 'Heures doivent être > 0' });
  });

  it('should reject block exceeding available capacity', async () => {
    const mockPrisma = await import('../src/config/database');
    
    // Mock existing adjustments that use 6h
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { heures: 4 },
      { heures: 2 },
    ]);

    mockReq.body = {
      date: '2025-12-15',
      heures: 3, // 6 + 3 = 9 > 8 capacity
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        erreur: expect.stringContaining('dépasse la capacité disponible'),
        capaciteDisponible: 2,
      })
    );
  });

  it('should handle non-existent translator', async () => {
    const mockPrisma = await import('../src/config/database');
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => null);

    mockReq.body = {
      date: '2025-12-15',
      heures: 2,
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(404);
    expect(jsonFn).toHaveBeenCalledWith({ erreur: 'Traducteur non trouvé' });
  });

  it('should allow block up to remaining capacity', async () => {
    const mockPrisma = await import('../src/config/database');
    
    // Reset mocks
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
      id: 't1',
      nom: 'Test Traducteur',
      capaciteHeuresParJour: 8,
    }));
    
    // Mock existing adjustments that use 6h
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { heures: 6 },
    ]);

    mockReq.body = {
      date: '2025-12-15',
      heures: 2, // 6 + 2 = 8 (exactly at capacity)
    };

    await bloquerTemps(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(201);
  });
});

describe('Time Blocking - obtenirBlocages', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonFn: any;

  beforeEach(() => {
    jsonFn = vi.fn();
    
    mockReq = {
      params: { id: 't1' },
      query: {},
    };
    
    mockRes = {
      json: jsonFn,
      status: vi.fn().mockReturnValue({ json: jsonFn }),
    };
  });

  it('should retrieve all blocks for a translator', async () => {
    const mockPrisma = await import('../src/config/database');
    const mockBlocages = [
      { id: 'b1', traducteurId: 't1', date: new Date('2025-12-15'), heures: 2, type: 'BLOCAGE' },
      { id: 'b2', traducteurId: 't1', date: new Date('2025-12-16'), heures: 3, type: 'BLOCAGE' },
    ];
    
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => mockBlocages);

    await obtenirBlocages(mockReq as AuthRequest, mockRes as Response);

    expect(jsonFn).toHaveBeenCalledWith(mockBlocages);
  });

  it('should filter blocks by date range', async () => {
    const mockPrisma = await import('../src/config/database');
    
    mockReq.query = {
      dateDebut: '2025-12-15',
      dateFin: '2025-12-20',
    };

    await obtenirBlocages(mockReq as AuthRequest, mockRes as Response);

    // Verify findMany was called with date filters
    expect(mockPrisma.default.ajustementTemps.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          traducteurId: 't1',
          type: 'BLOCAGE',
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });
});

describe('Time Blocking - supprimerBlocage', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonFn: any;
  let statusFn: any;

  beforeEach(() => {
    jsonFn = vi.fn();
    statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    
    mockReq = {
      params: { blocageId: 'valid-block' },
    };
    
    mockRes = {
      json: jsonFn,
      status: statusFn,
    };
  });

  it('should delete a valid block', async () => {
    await supprimerBlocage(mockReq as AuthRequest, mockRes as Response);

    expect(jsonFn).toHaveBeenCalledWith({ message: 'Blocage supprimé avec succès' });
  });

  it('should reject deletion of non-existent block', async () => {
    mockReq.params = { blocageId: 'nonexistent' };

    await supprimerBlocage(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(404);
    expect(jsonFn).toHaveBeenCalledWith({ erreur: 'Blocage non trouvé' });
  });

  it('should reject deletion of non-block adjustment (task)', async () => {
    const mockPrisma = await import('../src/config/database');
    
    mockPrisma.default.ajustementTemps.findUnique = vi.fn(async () => ({
      id: 'task-1',
      type: 'TACHE', // Not a BLOCAGE
    }));

    await supprimerBlocage(mockReq as AuthRequest, mockRes as Response);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({ erreur: 'Cet ajustement n\'est pas un blocage' });
  });
});

describe('Time Blocking - Integration with Capacity', () => {
  it('should correctly reduce available capacity when blocks exist', async () => {
    const mockPrisma = await import('../src/config/database');
    
    // Setup: translator with 8h/day capacity
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
      id: 't1',
      capaciteHeuresParJour: 8,
    }));
    
    // Existing blocks and tasks for a specific day
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { heures: 2, type: 'BLOCAGE' },
      { heures: 3, type: 'TACHE' },
    ]);

    // Import capacity service
    const { verifierCapaciteJournaliere } = await import('../src/services/capaciteService');
    
    const result = await verifierCapaciteJournaliere('t1', new Date('2025-12-15'), 2);
    
    // 8h capacity - 2h block - 3h task = 3h available
    expect(result.heuresActuelles).toBe(5);
    expect(result.disponible).toBe(3);
  });

  it('should prevent task allocation when blocks consume capacity', async () => {
    const mockPrisma = await import('../src/config/database');
    
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
      id: 't1',
      nom: 'Test',
      capaciteHeuresParJour: 8,
    }));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Block consuming 6h today
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { date: today, heures: 6, type: 'BLOCAGE' },
    ]);
    
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 1); // Only 2 days
    
    const { repartitionJusteATemps } = await import('../src/services/repartitionService');
    
    // Try to allocate 20h (only 2h today + 8h tomorrow = 10h available)
    await expect(
      repartitionJusteATemps('t1', 20, deadline)
    ).rejects.toThrow(/Capacité insuffisante/);
  });
});

describe('Time Blocking - Multiple Blocks Scenarios', () => {
  it('should handle multiple consecutive blocks', async () => {
    const mockPrisma = await import('../src/config/database');
    
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
      id: 't1',
      capaciteHeuresParJour: 8,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { verifierCapaciteJournaliere } = await import('../src/services/capaciteService');
    
    // Test today with 3h block
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { date: today, heures: 3, type: 'BLOCAGE' },
    ]);
    
    const resultToday = await verifierCapaciteJournaliere('t1', today, 0);
    expect(resultToday.disponible).toBe(5); // 8 - 3
    
    // Test tomorrow with 2h block
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { date: tomorrow, heures: 2, type: 'BLOCAGE' },
    ]);
    
    const resultTomorrow = await verifierCapaciteJournaliere('t1', tomorrow, 0);
    expect(resultTomorrow.disponible).toBe(6); // 8 - 2
  });

  it('should handle overlapping blocks on same day', async () => {
    const mockPrisma = await import('../src/config/database');
    
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
      id: 't1',
      capaciteHeuresParJour: 8,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Multiple blocks on same day (cumulative)
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { date: today, heures: 2, type: 'BLOCAGE' },
      { date: today, heures: 3, type: 'BLOCAGE' },
    ]);
    
    const { verifierCapaciteJournaliere } = await import('../src/services/capaciteService');
    
    const result = await verifierCapaciteJournaliere('t1', today, 0);
    expect(result.heuresActuelles).toBe(5); // 2 + 3
    expect(result.disponible).toBe(3); // 8 - 5
  });

  it('should allow blocks that fill entire day capacity', async () => {
    const mockPrisma = await import('../src/config/database');
    
    mockPrisma.default.traducteur.findUnique = vi.fn(async () => ({
      id: 't1',
      nom: 'Test',
      capaciteHeuresParJour: 8,
    }));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Block entire day
    mockPrisma.default.ajustementTemps.findMany = vi.fn(async () => [
      { date: today, heures: 8, type: 'BLOCAGE' },
    ]);
    
    const { verifierCapaciteJournaliere } = await import('../src/services/capaciteService');
    
    const result = await verifierCapaciteJournaliere('t1', today, 0);
    expect(result.heuresActuelles).toBe(8);
    expect(result.disponible).toBe(0);
    expect(result.depassement).toBe(false); // No additional hours requested
  });
});
