import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repartitionJusteATemps, repartitionEquilibree } from '../src/services/repartitionService';
import { capaciteDisponibleJour } from '../src/services/capaciteService';
import * as mockPrisma from '../src/config/database';

// Mock Prisma
vi.mock('../src/config/database', () => ({
  default: {
    traducteur: {
      findUnique: vi.fn()
    },
    ajustementTemps: {
      findMany: vi.fn()
    }
  }
}));

describe('Phase 2 - Nouvelles fonctionnalités', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JAT avec livraison matinale', () => {
    it('devrait limiter les heures du jour J à 2h par défaut', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      // Utiliser date future fixe (lundi 16 décembre 2025)
      const echeance = '2025-12-16';
      
      const result = await repartitionJusteATemps('t1', 10, echeance, {
        livraisonMatinale: true,
        debug: false,
        modeTimestamp: false // Mode legacy pour date-only
      });
      
      // Le dernier jour (jour J) ne devrait pas dépasser 2h
      const jourJ = result.find(r => r.date === echeance);
      if (jourJ) {
        expect(jourJ.heures).toBeLessThanOrEqual(2);
      }
      
      // Total doit quand même être correct
      const total = result.reduce((s, r) => s + r.heures, 0);
      expect(Math.abs(total - 10)).toBeLessThan(0.01);
    });

    it('devrait respecter heuresMaxJourJ personnalisé', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const echeance = '2025-12-18'; // Mercredi
      
      const result = await repartitionJusteATemps('t1', 12, echeance, {
        livraisonMatinale: true,
        heuresMaxJourJ: 3.5,
        modeTimestamp: false // Mode legacy pour date-only
      });
      
      const jourJ = result.find(r => r.date === echeance);
      if (jourJ) {
        expect(jourJ.heures).toBeLessThanOrEqual(3.5);
      }
    });

    it('devrait fonctionner en mode normal sans option', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const echeance = '2025-12-17'; // Mardi
      
      // Appel sans options (mode normal)
      const result = await repartitionJusteATemps('t1', 10, echeance);
      
      // Devrait allouer jusqu'à 7.5h même le jour J
      const total = result.reduce((s, r) => s + r.heures, 0);
      expect(Math.abs(total - 10)).toBeLessThan(0.01);
    });

    it('devrait maintenir compatibilité avec ancienne signature (debug: boolean)', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const echeance = '2025-12-19'; // Vendredi
      
      // Ancienne signature: debug = true
      await expect(
        repartitionJusteATemps('t1', 8, echeance, true)
      ).resolves.toBeDefined();
    });
  });

  describe('Mode Équilibré - Nouvelle méthode centimes', () => {
    it('devrait distribuer exactement sans boucle de rattrapage', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const debut = new Date('2025-12-16'); // Lundi
      const fin = new Date('2025-12-18');   // Mercredi (3 jours)
      
      const result = await repartitionEquilibree('t1', 10.5, debut, fin);
      
      // 3 jours ouvrables × 3.5h = 10.5h
      expect(result.length).toBe(3);
      
      // Vérifier somme exacte
      const total = result.reduce((s, r) => s + r.heures, 0);
      expect(Math.abs(total - 10.5)).toBeLessThan(0.01);
      
      // Vérifier distribution équilibrée (± 0.01h)
      const heures = result.map(r => r.heures);
      const min = Math.min(...heures);
      const max = Math.max(...heures);
      expect(max - min).toBeLessThanOrEqual(0.01);
    });

    it('devrait gérer fractions complexes (ex: 10.33h sur 3 jours)', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const debut = new Date('2025-12-16');
      const fin = new Date('2025-12-18');
      
      const result = await repartitionEquilibree('t1', 10.33, debut, fin);
      
      // 10.33h = 1033 centimes
      // 1033 / 3 = 344 centimes + reste 1
      // → 3.45h, 3.44h, 3.44h
      
      expect(result.length).toBe(3);
      const total = result.reduce((s, r) => s + r.heures, 0);
      expect(Math.abs(total - 10.33)).toBeLessThan(0.01);
      
      // Deux jours à 3.44h, un jour à 3.45h
      const heures = result.map(r => r.heures).sort();
      expect(heures[0]).toBeCloseTo(3.44, 2);
      expect(heures[1]).toBeCloseTo(3.44, 2);
      expect(heures[2]).toBeCloseTo(3.45, 2);
    });

    it('devrait rejeter si somme incorrecte (sécurité)', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 2, // Capacité trop faible
        horaire: '09:00-11:00' // 2h net
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const debut = new Date('2025-12-16');
      const fin = new Date('2025-12-18');
      
      // 10h sur 3 jours avec max 2h/jour → impossible
      await expect(
        repartitionEquilibree('t1', 10, debut, fin)
      ).rejects.toThrow(/Capacité insuffisante/);
    });
  });

  describe('capaciteDisponibleJour - Nouvelle fonction centralisée', () => {
    it('devrait retourner capacité totale si aucun ajustement', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([]);
      
      const date = new Date('2025-12-16');
      const dispo = await capaciteDisponibleJour('t1', date);
      
      expect(dispo).toBe(7.5);
    });

    it('devrait soustraire ajustements existants', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([
        { id: 'a1', traducteurId: 't1', date: new Date('2025-12-16'), heures: 3, tacheId: 'task1' },
        { id: 'a2', traducteurId: 't1', date: new Date('2025-12-16'), heures: 2, tacheId: 'task2' }
      ]);
      
      const date = new Date('2025-12-16');
      const dispo = await capaciteDisponibleJour('t1', date);
      
      // 7.5 - 3 - 2 = 2.5
      expect(dispo).toBe(2.5);
    });

    it('devrait ignorer une tâche spécifique', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      // Mock avec filtre NOT
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockImplementation(async (query) => {
        const ajustements = [
          { id: 'a1', traducteurId: 't1', date: new Date('2025-12-16'), heures: 3, tacheId: 'task1' },
          { id: 'a2', traducteurId: 't1', date: new Date('2025-12-16'), heures: 2, tacheId: 'task2' }
        ];
        
        // Simuler NOT { tacheId: 'task1' }
        if (query.where.NOT?.tacheId === 'task1') {
          return ajustements.filter(a => a.tacheId !== 'task1');
        }
        return ajustements;
      });
      
      const date = new Date('2025-12-16');
      const dispo = await capaciteDisponibleJour('t1', date, 'task1');
      
      // 7.5 - 2 = 5.5 (task1 ignorée)
      expect(dispo).toBe(5.5);
    });

    it('devrait retourner 0 si capacité saturée', async () => {
      mockPrisma.default.traducteur.findUnique = vi.fn().mockResolvedValue({
        id: 't1',
        nom: 'Test',
        capaciteHeuresParJour: 7.5
      } as any);
      
      mockPrisma.default.ajustementTemps.findMany = vi.fn().mockResolvedValue([
        { id: 'a1', traducteurId: 't1', date: new Date('2025-12-16'), heures: 5, tacheId: 'task1' },
        { id: 'a2', traducteurId: 't1', date: new Date('2025-12-16'), heures: 3, tacheId: 'task2' }
      ]);
      
      const date = new Date('2025-12-16');
      const dispo = await capaciteDisponibleJour('t1', date);
      
      // 7.5 - 8 = -0.5 → Math.max(0) = 0
      expect(dispo).toBe(0);
    });
  });
});
