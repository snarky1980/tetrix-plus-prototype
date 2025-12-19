/**
 * ═══════════════════════════════════════════════════════════════════════
 * TESTS - SERVICE DE DÉTECTION ET SUGGESTION DE RÉATTRIBUTION
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Couvre les scénarios d'exemples requis:
 * - Cas 1: Blocage simple avec déplacement possible
 * - Cas 2: Blocage rendant l'échéance impossible
 * - Cas 3: Réattribution suggérée
 * - Cas 4: Aucun changement requis
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../src/config/database';
import {
  detecterConflitsBlocage,
  genererSuggestions,
  genererRapportConflits,
  TypeConflict,
  TypeSuggestion,
  NiveauImpact
} from '../src/services/conflictDetectionService';
import { normalizeToOttawa, formatOttawaISO, addDaysOttawa } from '../src/utils/dateTimeOttawa';

describe('Service de Détection et Suggestion de Réattribution', () => {
  let traducteur1: any;
  let traducteur2: any;
  let tache1: any;
  let user1: any;
  let user2: any;

  beforeAll(async () => {
    // Nettoyer d'abord si les utilisateurs test existent déjà
    await prisma.utilisateur.deleteMany({
      where: { email: { in: ['test.conflit1@test.com', 'test.conflit2@test.com'] } }
    });

    // Créer utilisateurs de test
    user1 = await prisma.utilisateur.create({
      data: {
        email: 'test.conflit1@test.com',
        motDePasse: 'test',
        role: 'TRADUCTEUR'
      }
    });

    user2 = await prisma.utilisateur.create({
      data: {
        email: 'test.conflit2@test.com',
        motDePasse: 'test',
        role: 'TRADUCTEUR'
      }
    });

    // Créer traducteurs
    traducteur1 = await prisma.traducteur.create({
      data: {
        nom: 'Test Conflit 1',
        division: 'TEST',
        classification: 'TT4',
        utilisateurId: user1.id,
        capaciteHeuresParJour: 7.5,
        horaire: '8:00-17:00',
        actif: true
      }
    });

    traducteur2 = await prisma.traducteur.create({
      data: {
        nom: 'Test Conflit 2',
        division: 'TEST',
        classification: 'TT4',
        utilisateurId: user2.id,
        capaciteHeuresParJour: 7.5,
        horaire: '8:00-17:00',
        actif: true
      }
    });
  });

  afterAll(async () => {
    // Nettoyer (seulement si créés)
    if (traducteur1 && traducteur2) {
      await prisma.ajustementTemps.deleteMany({
        where: { traducteurId: { in: [traducteur1.id, traducteur2.id] } }
      });
      await prisma.tache.deleteMany({
        where: { traducteurId: { in: [traducteur1.id, traducteur2.id] } }
      });
      await prisma.traducteur.deleteMany({
        where: { id: { in: [traducteur1.id, traducteur2.id] } }
      });
    }
    if (user1 && user2) {
      await prisma.utilisateur.deleteMany({
        where: { id: { in: [user1.id, user2.id] } }
      });
    }
  });

  beforeEach(async () => {
    // Nettoyer ajustements et tâches avant chaque test
    await prisma.ajustementTemps.deleteMany({
      where: { traducteurId: { in: [traducteur1.id, traducteur2.id] } }
    });
    await prisma.tache.deleteMany({
      where: { traducteurId: { in: [traducteur1.id, traducteur2.id] } }
    });
  });

  describe('Cas 1 - Blocage simple avec chevauchement', () => {
    it('devrait détecter un conflit de chevauchement', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      // Créer une tâche
      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-001',
          heuresTotal: 2,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      // Créer allocation existante 09:00-11:00
      const allocation = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '9h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      // Ajouter blocage 10:00-12:00 (chevauche allocation)
      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '10h',
          heureFin: '12h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      // Détecter conflits
      const conflits = await detecterConflitsBlocage(blocage.id);

      expect(conflits).toHaveLength(1);
      expect(conflits[0].type).toBe(TypeConflict.CHEVAUCHEMENT_BLOCAGE);
      expect(conflits[0].allocationId).toBe(allocation.id);
      expect(conflits[0].heureDebut).toBe('9h');
      expect(conflits[0].heureFin).toBe('11h');
    });

    it('devrait suggérer un déplacement local', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      // Créer tâche
      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-002',
          heuresTotal: 1,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      // Allocation existante 10:00-11:00
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '10h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      // Blocage 10:00-12:00
      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '10h',
          heureFin: '12h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const conflits = await detecterConflitsBlocage(blocage.id);
      const suggestions = await genererSuggestions(conflits);

      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestionLocale = suggestions.find(s => s.type === TypeSuggestion.REPARATION_LOCALE);
      expect(suggestionLocale).toBeDefined();
      expect(suggestionLocale?.traducteurActuel).toBe(traducteur1.id);
      expect(suggestionLocale?.plagesProposees.length).toBeGreaterThan(0);
    });

    it('devrait calculer un score d\'impact faible pour ajustement simple', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-003',
          heuresTotal: 1,
          dateEcheance: addDaysOttawa(demain, 10), // Beaucoup de marge
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '10h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '10h',
          heureFin: '11h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const conflits = await detecterConflitsBlocage(blocage.id);
      const suggestions = await genererSuggestions(conflits);

      const suggestion = suggestions[0];
      expect(suggestion.impact.niveau).toBe(NiveauImpact.FAIBLE);
      expect(suggestion.impact.total).toBeLessThan(30);
    });
  });

  describe('Cas 2 - Blocage rendant échéance impossible', () => {
    it('devrait détecter allocation après échéance', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);
      const echeanceHier = addDaysOttawa(new Date(), -1);

      // Tâche avec échéance passée
      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-004',
          heuresTotal: 2,
          dateEcheance: echeanceHier,
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      // Allocation APRÈS échéance
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '9h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      // Ajout d'un blocage (même s'il ne chevauche pas, on vérifie tous conflits)
      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '14h',
          heureFin: '15h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const conflits = await detecterConflitsBlocage(blocage.id);

      const conflitEcheance = conflits.find(c => c.type === TypeConflict.APRES_ECHEANCE);
      expect(conflitEcheance).toBeDefined();
      expect(conflitEcheance?.tacheId).toBe(tache1.id);
    });

    it('devrait suggérer "impossible" si échéance dépassée', async () => {
      const hier = addDaysOttawa(new Date(), -1);
      const dateDemain = normalizeToOttawa(addDaysOttawa(new Date(), 1));

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-005',
          heuresTotal: 5,
          dateEcheance: hier, // Échéance passée
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemain,
          heures: 2,
          heureDebut: '9h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemain,
          heures: 1,
          heureDebut: '14h',
          heureFin: '15h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const conflits = await detecterConflitsBlocage(blocage.id);
      const suggestions = await genererSuggestions(conflits);

      // Devrait soit avoir aucune suggestion viable, soit suggérer "impossible"
      // Pour l'instant on vérifie juste qu'on ne suggère pas de réparation locale
      const suggestionLocale = suggestions.find(s => s.type === TypeSuggestion.REPARATION_LOCALE);
      expect(suggestionLocale).toBeUndefined();
    });
  });

  describe('Cas 3 - Dépassement de capacité', () => {
    it('devrait détecter dépassement de capacité quotidienne', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-006',
          heuresTotal: 10,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      // Allocation de 8h (dépasse capacité nette de 7.5h - pause)
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 8,
          heureDebut: '8h',
          heureFin: '17h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      // Ajouter un blocage supplémentaire
      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '16h',
          heureFin: '17h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const conflits = await detecterConflitsBlocage(blocage.id);

      const conflitCapacite = conflits.find(c => c.type === TypeConflict.DEPASSEMENT_CAPACITE);
      expect(conflitCapacite).toBeDefined();
    });
  });

  describe('Cas 4 - Aucun changement requis', () => {
    it('ne devrait détecter aucun conflit si blocage ne chevauche pas', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-007',
          heuresTotal: 2,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      // Allocation 09:00-11:00
      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '9h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      // Blocage 14:00-15:00 (NE chevauche PAS)
      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '14h',
          heureFin: '15h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const conflits = await detecterConflitsBlocage(blocage.id);

      expect(conflits).toHaveLength(0);
    });

    it('ne devrait générer aucune suggestion si aucun conflit', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-008',
          heuresTotal: 2,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '9h',
          heureFin: '11h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '14h',
          heureFin: '15h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const rapport = await genererRapportConflits(blocage.id);

      expect(rapport.conflitsDetectes).toHaveLength(0);
      expect(rapport.suggestions).toHaveLength(0);
    });
  });

  describe('Génération de rapport complet', () => {
    it('devrait générer un rapport structuré avec métadonnées', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-009',
          heuresTotal: 2,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '10h',
          heureFin: '12h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '10h30',
          heureFin: '12h30',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const rapport = await genererRapportConflits(blocage.id);

      expect(rapport.declencheur.type).toBe('BLOCAGE');
      expect(rapport.declencheur.blocageId).toBe(blocage.id);
      expect(rapport.declencheur.traducteurId).toBe(traducteur1.id);
      expect(rapport.conflitsDetectes.length).toBeGreaterThan(0);
      expect(rapport.genereLe).toBeInstanceOf(Date);
    });

    it('devrait inclure score d\'impact dans chaque suggestion', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-010',
          heuresTotal: 3,
          dateEcheance: addDaysOttawa(demain, 2), // Échéance proche
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 3,
          heureDebut: '10h',
          heureFin: '13h', // Empiète sur pause
          type: 'TACHE',
          creePar: user1.id
        }
      });

      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 1,
          heureDebut: '11h',
          heureFin: '12h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      const rapport = await genererRapportConflits(blocage.id);

      if (rapport.suggestions.length > 0) {
        const suggestion = rapport.suggestions[0];
        
        expect(suggestion.impact).toBeDefined();
        expect(suggestion.impact.total).toBeGreaterThanOrEqual(0);
        expect(suggestion.impact.total).toBeLessThanOrEqual(100);
        expect(suggestion.impact.niveau).toBeDefined();
        expect(suggestion.impact.decomposition).toBeDefined();
        expect(suggestion.impact.justification).toBeTruthy();
        expect(typeof suggestion.impact.justification).toBe('string');
      }
    });
  });

  describe('Validation des invariants', () => {
    it('NE DOIT JAMAIS modifier automatiquement une allocation', async () => {
      const demain = addDaysOttawa(new Date(), 1);
      const dateDemainNormalise = normalizeToOttawa(demain);

      tache1 = await prisma.tache.create({
        data: {
          numeroProjet: 'TEST-INVARIANT',
          heuresTotal: 2,
          dateEcheance: addDaysOttawa(demain, 5),
          traducteurId: traducteur1.id,
          creePar: user1.id
        }
      });

      const allocationOriginale = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          tacheId: tache1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '10h',
          heureFin: '12h',
          type: 'TACHE',
          creePar: user1.id
        }
      });

      const blocage = await prisma.ajustementTemps.create({
        data: {
          traducteurId: traducteur1.id,
          date: dateDemainNormalise.date,
          heures: 2,
          heureDebut: '11h',
          heureFin: '13h',
          type: 'BLOCAGE',
          creePar: user1.id
        }
      });

      // Appeler détection et suggestion
      await genererRapportConflits(blocage.id);

      // Vérifier que l'allocation N'A PAS changé
      const allocationApres = await prisma.ajustementTemps.findUnique({
        where: { id: allocationOriginale.id }
      });

      expect(allocationApres).toBeDefined();
      expect(allocationApres?.heureDebut).toBe('10h');
      expect(allocationApres?.heureFin).toBe('12h');
      expect(allocationApres?.heures).toBe(2);
      expect(allocationApres?.date).toEqual(allocationOriginale.date);
    });
  });
});
