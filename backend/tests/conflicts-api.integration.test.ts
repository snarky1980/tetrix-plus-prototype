import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { normalizeToOttawa } from '../src/utils/dateUtils';

const prisma = new PrismaClient();

/**
 * Tests d'intégration pour l'API de détection de conflits
 * 
 * Note: Ces tests nécessitent que le serveur soit démarré
 * Pour les tests unitaires, voir conflict-detection.test.ts
 */
describe('API Conflicts - Tests d\'intégration', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';
  
  let testUser: any;
  let testTraducteur: any;
  let testTache: any;
  let testAllocation: any;
  let testBlocage: any;

  beforeAll(async () => {
    // Créer données de test
    testUser = await prisma.utilisateur.create({
      data: {
        nom: 'Test API User',
        email: `test-api-${Date.now()}@example.com`,
        motDePasse: 'hash',
        role: 'CONSEILLER'
      }
    });

    testTraducteur = await prisma.traducteur.create({
      data: {
        nom: 'Test API Traducteur',
        utilisateurId: testUser.id,
        divisions: ['IAD'],
        classification: 'TR4',
        capaciteHeuresParJour: 7,
        horaire: '07:00-16:00',
        actif: true
      }
    });

    testTache = await prisma.tache.create({
      data: {
        numeroProjet: 'TEST-API-001',
        heuresTotal: 4,
        dateEcheance: normalizeToOttawa('2025-12-23T15:30:00').date,
        traducteurId: testTraducteur.id,
        creePar: testUser.id
      }
    });

    const dateTest = normalizeToOttawa('2025-12-23T09:00:00');

    // Créer une allocation
    testAllocation = await prisma.ajustementTemps.create({
      data: {
        traducteurId: testTraducteur.id,
        tacheId: testTache.id,
        date: dateTest.date,
        heures: 2,
        heureDebut: '09:00',
        heureFin: '11:00',
        type: 'TACHE',
        creePar: testUser.id
      }
    });

    // Créer un blocage qui chevauche
    testBlocage = await prisma.ajustementTemps.create({
      data: {
        traducteurId: testTraducteur.id,
        date: dateTest.date,
        heures: 2,
        heureDebut: '10:00',
        heureFin: '12:00',
        type: 'BLOCAGE',
        creePar: testUser.id
      }
    });
  });

  afterAll(async () => {
    // Nettoyer
    if (testAllocation) await prisma.ajustementTemps.delete({ where: { id: testAllocation.id } }).catch(() => {});
    if (testBlocage) await prisma.ajustementTemps.delete({ where: { id: testBlocage.id } }).catch(() => {});
    if (testTache) await prisma.tache.delete({ where: { id: testTache.id } }).catch(() => {});
    if (testTraducteur) await prisma.traducteur.delete({ where: { id: testTraducteur.id } }).catch(() => {});
    if (testUser) await prisma.utilisateur.delete({ where: { id: testUser.id } }).catch(() => {});
    
    await prisma.$disconnect();
  });

  it('POST /api/conflicts/detect/allocation/:id - devrait détecter les conflits', async () => {
    const response = await fetch(`${API_BASE}/api/conflicts/detect/allocation/${testAllocation.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.allocationId).toBe(testAllocation.id);
    expect(data.data.count).toBeGreaterThan(0);
    expect(data.data.conflits).toBeInstanceOf(Array);
    expect(data.data.conflits[0]).toHaveProperty('type');
    expect(data.data.conflits[0]).toHaveProperty('explication');
  });

  it('POST /api/conflicts/detect/blocage/:id - devrait détecter les conflits du blocage', async () => {
    const response = await fetch(`${API_BASE}/api/conflicts/detect/blocage/${testBlocage.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.blocageId).toBe(testBlocage.id);
    expect(data.data.count).toBeGreaterThan(0);
  });

  it('POST /api/conflicts/suggest - devrait générer des suggestions', async () => {
    // D'abord récupérer les conflits
    const detectResponse = await fetch(`${API_BASE}/api/conflicts/detect/allocation/${testAllocation.id}`, {
      method: 'POST'
    });
    const detectData = await detectResponse.json();

    // Générer les suggestions
    const response = await fetch(`${API_BASE}/api/conflicts/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conflits: detectData.data.conflits })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.suggestions).toBeInstanceOf(Array);
    expect(data.data.count).toBeGreaterThan(0);
    
    // Vérifier la structure d'une suggestion
    const suggestion = data.data.suggestions[0];
    expect(suggestion).toHaveProperty('id');
    expect(suggestion).toHaveProperty('type');
    expect(suggestion).toHaveProperty('scoreImpact');
    expect(suggestion.scoreImpact).toHaveProperty('total');
    expect(suggestion.scoreImpact).toHaveProperty('niveau');
    expect(suggestion.scoreImpact).toHaveProperty('justification');
  });

  it('POST /api/conflicts/suggest - devrait rejeter un body invalide', async () => {
    const response = await fetch(`${API_BASE}/api/conflicts/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conflits: 'pas un tableau' })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('tableau');
  });

  it('GET /api/conflicts/allocation/:id/full - devrait retourner analyse complète', async () => {
    const response = await fetch(`${API_BASE}/api/conflicts/allocation/${testAllocation.id}/full`);

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('allocationId');
    expect(data.data).toHaveProperty('conflits');
    expect(data.data).toHaveProperty('suggestions');
    expect(data.data).toHaveProperty('hasConflicts');
    expect(data.data).toHaveProperty('conflictCount');
    expect(data.data).toHaveProperty('suggestionCount');
    
    expect(data.data.hasConflicts).toBe(true);
    expect(data.data.conflictCount).toBeGreaterThan(0);
    expect(data.data.suggestionCount).toBeGreaterThan(0);
  });

  it('POST /api/conflicts/report/blocage/:id - devrait générer un rapport complet', async () => {
    const response = await fetch(`${API_BASE}/api/conflicts/report/blocage/${testBlocage.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('blocageId');
    expect(data.data).toHaveProperty('conflits');
    expect(data.data).toHaveProperty('suggestions');
    expect(data.data).toHaveProperty('nbConflits');
    expect(data.data).toHaveProperty('nbSuggestions');
  });
});
