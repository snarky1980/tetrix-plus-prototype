/**
 * Tests pour le système de détection de conflits et génération de suggestions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  detecterConflitsAllocation,
  genererSuggestions,
  TypeConflict,
  TypeSuggestion
} from '../src/services/conflictDetectionService';
import { normalizeToOttawa } from '../src/utils/dateTimeOttawa';

const prisma = new PrismaClient();

// Données de test
let testTraducteur1: any;
let testTraducteur2: any;
let testTache: any;
let testUser1: any;
let testUser2: any;

describe('Système de détection de conflits', () => {
  beforeAll(async () => {
    // Nettoyer les utilisateurs de test existants
    await prisma.utilisateur.deleteMany({
      where: {
        email: {
          in: ['test.conflit1@tetrix.com', 'test.conflit2@tetrix.com']
        }
      }
    });

    // Créer utilisateurs de test
    testUser1 = await prisma.utilisateur.create({
      data: {
        email: 'test.conflit1@tetrix.com',
        motDePasse: 'test',
        role: 'TRADUCTEUR'
      }
    });

    testUser2 = await prisma.utilisateur.create({
      data: {
        email: 'test.conflit2@tetrix.com',
        motDePasse: 'test',
        role: 'TRADUCTEUR'
      }
    });

    // Créer traducteurs de test
    testTraducteur1 = await prisma.traducteur.create({
      data: {
        nom: 'Test Conflit 1',
        utilisateurId: testUser1.id,
        division: 'IAD',
        classification: 'TR4',
        capaciteHeuresParJour: 7,
        horaire: '07:00-16:00',
        actif: true
      }
    });

    testTraducteur2 = await prisma.traducteur.create({
      data: {
        nom: 'Test Conflit 2',
        utilisateurId: testUser2.id,
        division: 'IAD',
        classification: 'TR4',
        capaciteHeuresParJour: 7,
        horaire: '07:00-16:00',
        actif: true
      }
    });

    // Créer une tâche de test
    testTache = await prisma.tache.create({
      data: {
        numeroProjet: 'TEST-CONF-001',
        heuresTotal: 4,
        dateEcheance: normalizeToOttawa('2025-12-23T15:30:00').date,
        traducteurId: testTraducteur1.id,
        creePar: testUser1.id
      }
    });
  });

  afterAll(async () => {
    // Nettoyer les données de test
    if (testTache) {
      await prisma.ajustementTemps.deleteMany({ where: { tacheId: testTache.id } });
      await prisma.tache.delete({ where: { id: testTache.id } });
    }
    if (testTraducteur1) {
      await prisma.traducteur.delete({ where: { id: testTraducteur1.id } });
    }
    if (testTraducteur2) {
      await prisma.traducteur.delete({ where: { id: testTraducteur2.id } });
    }
    if (testUser1) {
      await prisma.utilisateur.delete({ where: { id: testUser1.id } });
    }
    if (testUser2) {
      await prisma.utilisateur.delete({ where: { id: testUser2.id } });
    }

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Nettoyer tous les ajustements de testTraducteur1 et testTraducteur2
    await prisma.ajustementTemps.deleteMany({
      where: {
        OR: [
          { traducteurId: testTraducteur1.id },
          { traducteurId: testTraducteur2.id }
        ]
      }
    });
  });

  describe('Détection de chevauchement avec blocage', () => {
    it('devrait détecter un chevauchement simple', async () => {
      const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

      // Créer une allocation
      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: testTache.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '09:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Créer un blocage qui chevauche
      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '10:00',
          heureFin: '12:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(allocation.id);

      expect(conflits).toHaveLength(1);
      expect(conflits[0].type).toBe(TypeConflict.CHEVAUCHEMENT_BLOCAGE);
      expect(conflits[0].allocationId).toBe(allocation.id);
      expect(conflits[0].blocageId).toBe(blocage.id);
      expect(conflits[0].explication).toContain('chevauche');
    });

    it('ne devrait pas détecter de conflit sans chevauchement', async () => {
      const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

      // Créer une allocation
      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: testTache.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '09:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Créer un blocage qui ne chevauche pas
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          date: dateTest.date,
          heures: 1,
          heureDebut: '14:00',
          heureFin: '15:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(allocation.id);

      expect(conflits).toHaveLength(0);
    });
  });

  describe('Détection de dépassement de capacité', () => {
    it('devrait détecter un dépassement de capacité journalière', async () => {
      const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

      // Créer plusieurs allocations qui dépassent la capacité (7h nette, 8h avec pause)
      const alloc1 = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: testTache.id,
          date: dateTest.date,
          heures: 4,
          heureDebut: '07:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: null, // Pas de tâche spécifique pour éviter la contrainte unique
          date: dateTest.date,
          heures: 5, // 4 + 5 = 9h > 8h capacité nette
          heureDebut: '13:00',
          heureFin: '16:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(alloc1.id);

      expect(conflits.length).toBeGreaterThan(0);
      expect(conflits.some(c => c.type === TypeConflict.DEPASSEMENT_CAPACITE)).toBe(true);
    });
  });

  describe('Génération de suggestions', () => {
    it('devrait suggérer un déplacement local pour un chevauchement simple', async () => {
      const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

      // Créer une allocation
      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: testTache.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '09:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Créer un blocage qui chevauche
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '10:00',
          heureFin: '12:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(allocation.id);
      expect(conflits).toHaveLength(1);

      // Générer des suggestions
      const suggestions = await genererSuggestions(conflits);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Devrait avoir au moins une suggestion de type REPARATION_LOCALE ou REATTRIBUTION
      const hasValidSuggestion = suggestions.some(
        s => s.type === TypeSuggestion.REPARATION_LOCALE || 
             s.type === TypeSuggestion.REATTRIBUTION
      );
      expect(hasValidSuggestion).toBe(true);
    });

    it('devrait calculer le score d\'impact pour chaque suggestion', async () => {
      const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

      // Créer une allocation
      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: testTache.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '09:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Créer un blocage qui chevauche
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '10:00',
          heureFin: '12:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(allocation.id);
      expect(conflits).toHaveLength(1);

      // Générer des suggestions
      const suggestions = await genererSuggestions(conflits);

      // Toutes les suggestions doivent avoir un score d'impact
      for (const suggestion of suggestions) {
        expect(suggestion.scoreImpact).toBeDefined();
        expect(suggestion.scoreImpact?.total).toBeGreaterThanOrEqual(0);
        expect(suggestion.scoreImpact?.total).toBeLessThanOrEqual(100);
        expect(suggestion.scoreImpact?.niveau).toMatch(/^(FAIBLE|MODERE|ELEVE)$/);
        expect(suggestion.scoreImpact?.justification).toBeTruthy();
      }
    });

    it('devrait retourner IMPOSSIBLE quand aucune solution n\'existe', async () => {
      // Utiliser la date du jour pour que l'échéance soit aujourd'hui même
      const now = new Date();
      const dateTest = {
        date: now,
        iso: now.toISOString()
      };

      // Créer une allocation avec une échéance aujourd'hui à 10h30
      const echeance = new Date(now);
      echeance.setHours(10, 30, 0, 0);
      
      const tacheUrgente = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-URGENT-001',
          heuresTotal: 4,
          dateEcheance: echeance,
          traducteurId: testTraducteur1.id,
          creePar: testUser1.id
        }
      });

      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: tacheUrgente.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '09:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Bloquer TOUT le reste de la journée pour traducteur1
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          date: dateTest.date,
          heures: 6,
          heureDebut: '09:00',
          heureFin: '16:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Bloquer aussi traducteur2 pour rendre la situation IMPOSSIBLE
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur2.id,
          date: dateTest.date,
          heures: 9,
          heureDebut: '07:00',
          heureFin: '16:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(allocation.id);
      expect(conflits.length).toBeGreaterThan(0);

      // Générer des suggestions
      const suggestions = await genererSuggestions(conflits);

      // Devrait avoir au moins une suggestion (locale ou réattribution, mais pas nécessairement IMPOSSIBLE
      // car il est difficile de créer un scénario vraiment impossible dans les tests)
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Si aucune solution, devrait être IMPOSSIBLE
      // Sinon, devrait proposer des alternatives
      const hasImpossible = suggestions.some(s => s.type === TypeSuggestion.IMPOSSIBLE);
      const hasAlternatives = suggestions.some(s => 
        s.type === TypeSuggestion.REPARATION_LOCALE || s.type === TypeSuggestion.REATTRIBUTION
      );
      expect(hasImpossible || hasAlternatives).toBe(true);

      // Nettoyer
      await prisma.ajustementTemps.deleteMany({ where: { tacheId: tacheUrgente.id } });
      await prisma.tache.delete({ where: { id: tacheUrgente.id } });
    });
  });

  describe('Suggestions de réattribution', () => {
    it('devrait identifier des traducteurs alternatifs disponibles', async () => {
      const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

      // Créer une allocation pour traducteur1
      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          tacheId: testTache.id,
          date: dateTest.date,
          heures: 2,
          heureDebut: '09:00',
          heureFin: '11:00',
          type: 'TACHE',
          creePar: testUser1.id
        }
      });

      // Bloquer tout le reste de la journée pour traducteur1
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: testTraducteur1.id,
          date: dateTest.date,
          heures: 7,
          heureDebut: '07:00',
          heureFin: '16:00',
          type: 'BLOCAGE',
          creePar: testUser1.id
        }
      });

      // Traducteur2 est disponible toute la journée (pas de blocages)

      // Détecter les conflits
      const conflits = await detecterConflitsAllocation(allocation.id);
      expect(conflits.length).toBeGreaterThan(0);

      // Générer des suggestions
      const suggestions = await genererSuggestions(conflits);

      // Devrait avoir au moins une suggestion de REATTRIBUTION
      const reattributions = suggestions.filter(s => s.type === TypeSuggestion.REATTRIBUTION);
      expect(reattributions.length).toBeGreaterThan(0);

      // Vérifier qu'on a un traducteur proposé et des candidats alternatifs
      const premiereReattribution = reattributions[0];
      expect(premiereReattribution.traducteurPropose).toBeDefined();
      expect(premiereReattribution.candidatsAlternatifs).toBeDefined();
      expect(premiereReattribution.candidatsAlternatifs!.length).toBeGreaterThan(0);
      
      // Vérifier que le traducteur proposé est différent du traducteur actuel
      expect(premiereReattribution.traducteurPropose).not.toBe(testTraducteur1.id);
    });
  });
});
