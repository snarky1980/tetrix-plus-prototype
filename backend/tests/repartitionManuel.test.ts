import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/database';
import { suggererHeuresManuel, validerRepartition } from '../src/services/repartitionService';

describe('Mode MANUEL - Suggestions et validation heures précises', () => {
  let traducteur: any;

  beforeAll(async () => {
    // Créer un traducteur de test
    traducteur = await prisma.traducteur.create({
      data: {
        nom: 'Test Manuel',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 8,
        horaire: '08:00-17:00', // 8h net avec pause
        classification: 'A',
        utilisateur: {
          create: {
            email: `manuel_${Date.now()}@test.local`,
            motDePasse: 'test123',
            role: 'TRADUCTEUR'
          }
        }
      }
    });
  });

  afterAll(async () => {
    // Nettoyer
    if (traducteur) {
      await prisma.ajustementTemps.deleteMany({ where: { traducteurId: traducteur.id } });
      await prisma.traducteur.delete({ where: { id: traducteur.id } });
    }
  });

  describe('suggererHeuresManuel', () => {
    it('devrait suggérer des heures par défaut (début de journée)', async () => {
      const repartition = [
        { date: '2025-12-16', heures: 4 },
        { date: '2025-12-17', heures: 3 }
      ];

      const suggestions = await suggererHeuresManuel(traducteur.id, repartition);

      expect(suggestions).toHaveLength(2);
      
      // Premier jour: 4h depuis le début (8h-12h, pas de pause)
      expect(suggestions[0].date).toBe('2025-12-16');
      expect(suggestions[0].heures).toBe(4);
      expect(suggestions[0].heureDebut).toBe('8h');
      expect(suggestions[0].heureFin).toBe('12h'); // 8h + 4h = 12h (juste avant pause)
      
      // Deuxième jour: 3h depuis le début
      expect(suggestions[1].date).toBe('2025-12-17');
      expect(suggestions[1].heures).toBe(3);
      expect(suggestions[1].heureDebut).toBe('8h');
      expect(suggestions[1].heureFin).toBe('11h'); // 8h + 3h = 11h
    });

    it('devrait tenir compte des heures déjà allouées', async () => {
      // Allouer 2h le 2025-12-18 (9h-11h)
      const dateObj = new Date('2025-12-18T14:00:00Z'); // Midi à Ottawa
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur.id,
          date: dateObj,
          heures: 2,
          type: 'TACHE',
          creePar: traducteur.utilisateurId
        }
      });

      const repartition = [
        { date: '2025-12-18', heures: 3 }
      ];

      const suggestions = await suggererHeuresManuel(traducteur.id, repartition);

      expect(suggestions).toHaveLength(1);
      // Devrait commencer après les 2h déjà utilisées (8h-10h)
      // Donc commence à 10h pour 3h = 10h-14h (avec pause 12h-13h)
      expect(suggestions[0].heureDebut).toBe('10h');
      expect(suggestions[0].heureFin).toBe('14h');
      
      // Nettoyer
      await prisma.ajustementTemps.deleteMany({
        where: { traducteurId: traducteur.id, date: dateObj }
      });
    });

    it('devrait préserver les heures déjà spécifiées', async () => {
      const repartition = [
        { date: '2025-12-19', heures: 2, heureDebut: '14h', heureFin: '16h' },
        { date: '2025-12-20', heures: 3 }
      ];

      const suggestions = await suggererHeuresManuel(traducteur.id, repartition);

      expect(suggestions).toHaveLength(2);
      
      // Premier jour: heures préservées
      expect(suggestions[0].heureDebut).toBe('14h');
      expect(suggestions[0].heureFin).toBe('16h');
      
      // Deuxième jour: heures suggérées
      expect(suggestions[1].heureDebut).toBe('8h');
      expect(suggestions[1].heureFin).toBe('11h');
    });
  });

  describe('validerRepartition - heures précises', () => {
    it('devrait valider des heures précises correctes', async () => {
      const repartition = [
        { date: '2025-12-21', heures: 4, heureDebut: '8h', heureFin: '12h' } // 4h sans pause
      ];

      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        repartition,
        4
      );

      console.log('Erreurs:', erreurs);
      expect(valide).toBe(true);
      expect(erreurs).toHaveLength(0);
    });

    it('devrait rejeter si heureDebut >= heureFin', async () => {
      const repartition = [
        { date: '2025-12-22', heures: 2, heureDebut: '15h', heureFin: '14h' }
      ];

      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        repartition,
        2
      );

      expect(valide).toBe(false);
      expect(erreurs.some(e => e.includes('heureDebut'))).toBe(true);
    });

    it('devrait rejeter si heures hors de l\'horaire du traducteur', async () => {
      const repartition = [
        { date: '2025-12-23', heures: 2, heureDebut: '6h', heureFin: '8h' } // Avant 8h
      ];

      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        repartition,
        2
      );

      expect(valide).toBe(false);
      expect(erreurs.some(e => e.includes('horaire du traducteur'))).toBe(true);
    });

    it('devrait rejeter si durée incohérente', async () => {
      const repartition = [
        { date: '2025-12-24', heures: 5, heureDebut: '8h', heureFin: '11h' } // 3h seulement
      ];

      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        repartition,
        5
      );

      expect(valide).toBe(false);
      expect(erreurs.some(e => e.includes('Incohérence'))).toBe(true);
    });

    it('devrait calculer correctement la durée avec pause midi', async () => {
      const repartition = [
        { date: '2025-12-25', heures: 4, heureDebut: '10h', heureFin: '15h' } // 5h - 1h pause = 4h
      ];

      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        repartition,
        4
      );

      expect(valide).toBe(true);
      expect(erreurs).toHaveLength(0);
    });

    it('devrait accepter heures précises avec format heures et minutes', async () => {
      const repartition = [
        { date: '2025-12-26', heures: 2.5, heureDebut: '8h30', heureFin: '11h' }
      ];

      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        repartition,
        2.5
      );

      expect(valide).toBe(true);
      expect(erreurs).toHaveLength(0);
    });
  });

  describe('Scénarios complets', () => {
    it('Mode MANUEL complet: suggérer puis valider', async () => {
      // 1. Créer répartition manuelle sans heures
      const repartitionInitiale = [
        { date: '2025-12-27', heures: 3 },
        { date: '2025-12-28', heures: 4 },
        { date: '2025-12-29', heures: 2 }
      ];

      // 2. Demander suggestions
      const suggestions = await suggererHeuresManuel(traducteur.id, repartitionInitiale);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].heureDebut).toBeDefined();
      expect(suggestions[0].heureFin).toBeDefined();

      // 3. Valider les suggestions
      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        suggestions,
        9 // 3 + 4 + 2
      );

      expect(valide).toBe(true);
      expect(erreurs).toHaveLength(0);
    });

    it('Mode MANUEL avec ajustements: utilisateur modifie une suggestion', async () => {
      // 1. Suggérer des heures
      const repartitionInitiale = [
        { date: '2025-12-30', heures: 3 },
        { date: '2025-12-31', heures: 2 }
      ];

      const suggestions = await suggererHeuresManuel(traducteur.id, repartitionInitiale);

      // 2. Utilisateur ajuste le deuxième jour (préfère l'après-midi)
      suggestions[1].heureDebut = '14h';
      suggestions[1].heureFin = '16h';

      // 3. Valider avec l'ajustement
      const { valide, erreurs } = await validerRepartition(
        traducteur.id,
        suggestions,
        5
      );

      expect(valide).toBe(true);
      expect(erreurs).toHaveLength(0);
    });
  });
});
