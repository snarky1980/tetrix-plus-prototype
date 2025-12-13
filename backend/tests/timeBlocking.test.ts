import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bloquerTemps, supprimerBlocage } from '../src/services/timeBlockingService';
import prisma from '../src/config/database';

// Mock Prisma
vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    traducteur: {
      findUnique: vi.fn()
    },
    tache: {
      create: vi.fn(),
      delete: vi.fn()
    },
    ajustementTemps: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn()
    }
  };
  mockPrisma.$transaction = vi.fn((callback) => callback(mockPrisma));
  return { default: mockPrisma };
});

describe('Time Blocking - bloquerTemps', () => {
  const mockTraducteur = {
    id: 'trad-1',
    nom: 'Test Traducteur',
    horaire: '09:00-17:00',
    utilisateurId: 'user-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.traducteur.findUnique as any).mockResolvedValue(mockTraducteur);
    (prisma.tache.create as any).mockResolvedValue({ id: 'task-block-1' });
    // Fix recursive mock issue in transaction
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(prisma));
  });

  it('should create a time block successfully', async () => {
    // Block 10:00 - 12:00 (2h)
    // Schedule 09:00-17:00. Lunch 12-13.
    // Intersection: 2h.
    
    await bloquerTemps('trad-1', '2025-12-15', '10:00', '12:00', 'Meeting', 'user-1');

    expect(prisma.tache.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        typeTache: 'AUTRE',
        description: 'Meeting',
        heuresTotal: 2,
        dateEcheance: expect.any(Date)
      })
    });

    expect(prisma.ajustementTemps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heures: 2,
        type: 'BLOCAGE',
        tacheId: 'task-block-1'
      })
    });
  });

  it('should exclude lunch break from block duration', async () => {
    // Block 11:00 - 14:00 (3h total)
    // Lunch 12:00-13:00.
    // Effective: 11-12 (1h) + 13-14 (1h) = 2h.
    
    await bloquerTemps('trad-1', '2025-12-15', '11:00', '14:00', 'Long Lunch', 'user-1');

    expect(prisma.ajustementTemps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heures: 2
      })
    });
  });

  it('should exclude time outside schedule', async () => {
    // Block 08:00 - 10:00 (2h total)
    // Schedule starts 09:00.
    // Effective: 09:00-10:00 = 1h.
    
    await bloquerTemps('trad-1', '2025-12-15', '08:00', '10:00', 'Early', 'user-1');

    expect(prisma.ajustementTemps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heures: 1
      })
    });
  });

  it('should handle full day block', async () => {
    // Block 00:00 - 24:00
    // Schedule 09-17 (8h) - 1h lunch = 7h.
    
    await bloquerTemps('trad-1', '2025-12-15', '00:00', '23:59', 'Sick Day', 'user-1');

    expect(prisma.ajustementTemps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heures: 7
      })
    });
  });
  
  it('should allow block up to remaining capacity', async () => {
      await bloquerTemps('trad-1', '2025-12-15', '10:00', '12:00', 'Meeting', 'user-1');
      expect(prisma.ajustementTemps.create).toHaveBeenCalled();
  });
});

describe('Time Blocking - supprimerBlocage', () => {
    it('should delete a valid block', async () => {
        (prisma.ajustementTemps.findFirst as any).mockResolvedValue({
            id: 'adj-1',
            tacheId: 'task-1',
            type: 'BLOCAGE',
            heures: 2,
            date: new Date()
        });
        
        await supprimerBlocage('adj-1');
        
        expect(prisma.tache.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });
});
