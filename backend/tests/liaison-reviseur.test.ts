import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { 
  creerLiaison, 
  obtenirLiaisonsTraducteur, 
  verifierDisponibiliteCombinee,
  obtenirReviseursPotentiels,
  supprimerLiaison
} from '../src/services/liaisonReviseurService';

const prisma = new PrismaClient();

describe('🔗 Service de liaison traducteur-réviseur', () => {
  let traducteurTR01Id: string;
  let traducteurTR02Id: string;
  let reviseurTR03Id: string;
  let reviseurTR03BisId: string;
  let divisionId: string;
  let utilisateurId: string;

  beforeEach(async () => {
    // Nettoyage
    await prisma.liaisonReviseur.deleteMany({});
    await prisma.traducteur.deleteMany({});
    await prisma.division.deleteMany({});
    await prisma.utilisateur.deleteMany({});

    // Création de l'utilisateur
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        motDePasse: 'test123',
        nom: 'Test',
        prenom: 'User',
        role: 'CONSEILLER',
      },
    });
    utilisateurId = utilisateur.id;

    // Création de la division
    const division = await prisma.division.create({
      data: {
        code: `DIV-${Date.now()}`,
        nom: 'Division Test',
      },
    });
    divisionId = division.id;

    // Créer les utilisateurs d'abord
    const user01 = await prisma.utilisateur.create({
      data: {
        email: `tr01-${Date.now()}@example.com`,
        motDePasse: 'test',
        role: 'TRADUCTEUR',
      },
    });

    const user02 = await prisma.utilisateur.create({
      data: {
        email: `tr02-${Date.now()}@example.com`,
        motDePasse: 'test',
        role: 'TRADUCTEUR',
      },
    });

    const user03 = await prisma.utilisateur.create({
      data: {
        email: `tr03-${Date.now()}@example.com`,
        motDePasse: 'test',
        role: 'TRADUCTEUR',
      },
    });

    const user03bis = await prisma.utilisateur.create({
      data: {
        email: `tr03bis-${Date.now()}@example.com`,
        motDePasse: 'test',
        role: 'TRADUCTEUR',
      },
    });

    // Création des traducteurs TR01
    const tr01 = await prisma.traducteur.create({
      data: {
        nom: 'Traducteur TR01',
        divisions: ['TEST'],
        classification: 'TT4',
        utilisateurId: user01.id,
        capaciteHeuresParJour: 7,
        horaire: '08:00-16:00',
        actif: true,
        specialisations: ['juridique'],
        categorie: 'TR01',
        necessiteRevision: true,
      },
    });
    traducteurTR01Id = tr01.id;

    // Création des traducteurs TR02
    const tr02 = await prisma.traducteur.create({
      data: {
        nom: 'Traducteur TR02',
        divisions: ['TEST'],
        classification: 'TT5',
        utilisateurId: user02.id,
        capaciteHeuresParJour: 7,
        horaire: '09:00-17:00',
        actif: true,
        specialisations: ['technique'],
        categorie: 'TR02',
        necessiteRevision: true,
      },
    });
    traducteurTR02Id = tr02.id;

    // Création des réviseurs TR03
    const tr03 = await prisma.traducteur.create({
      data: {
        nom: 'Réviseur TR03',
        divisions: ['TEST'],
        classification: 'TT6',
        utilisateurId: user03.id,
        capaciteHeuresParJour: 7,
        horaire: '08:00-18:00',
        actif: true,
        specialisations: ['juridique', 'technique'],
        categorie: 'TR03',
        necessiteRevision: false,
      },
    });
    reviseurTR03Id = tr03.id;

    const tr03bis = await prisma.traducteur.create({
      data: {
        nom: 'Réviseur TR03 Bis',
        divisions: ['TEST'],
        classification: 'TT6',
        utilisateurId: user03bis.id,
        capaciteHeuresParJour: 5,
        horaire: '10:00-18:00',
        actif: true,
        specialisations: ['juridique'],
        categorie: 'TR03',
        necessiteRevision: false,
      },
    });
    reviseurTR03BisId = tr03bis.id;
  });

  it('✅ Crée une liaison traducteur-réviseur', async () => {
    const liaison = await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03Id,
      estPrincipal: true,
      actif: true,
    });

    expect(liaison).toBeDefined();
    expect(liaison.traducteurId).toBe(traducteurTR01Id);
    expect(liaison.reviseurId).toBe(reviseurTR03Id);
    expect(liaison.estPrincipal).toBe(true);
    expect(liaison.actif).toBe(true);
  });

  it('✅ Récupère les liaisons d\'un traducteur', async () => {
    // Créer plusieurs liaisons
    await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03Id,
      estPrincipal: true,
      actif: true,
    });

    await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03BisId,
      estPrincipal: false,
      actif: true,
    });

    const liaisons = await obtenirLiaisonsTraducteur(traducteurTR01Id);

    expect(liaisons).toHaveLength(2);
    expect(liaisons[0].estPrincipal).toBe(true); // Principal en premier
    expect(liaisons[1].estPrincipal).toBe(false);
  });

  it('✅ Vérifie la disponibilité d\'un couple traducteur-réviseur', async () => {
    // Créer une liaison
    await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03Id,
      estPrincipal: true,
      actif: true,
    });

    const dateEcheance = new Date();
    dateEcheance.setDate(dateEcheance.getDate() + 7); // Dans 7 jours

    const resultat = await verifierDisponibiliteCombinee(
      traducteurTR01Id,
      5, // 5 heures de traduction
      dateEcheance
    );

    expect(resultat).toBeDefined();
    expect(resultat.traducteurDisponible).toBe(true);
    expect(resultat.disponibiliteCombinee).toBe(true);
  });

  it('✅ Trouve des réviseurs disponibles pour un traducteur', async () => {
    // Créer des liaisons
    await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03Id,
      estPrincipal: true,
      actif: true,
    });

    await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03BisId,
      estPrincipal: false,
      actif: true,
    });

    const reviseurs = await obtenirReviseursPotentiels('TEST');

    expect(reviseurs).toBeDefined();
    expect(reviseurs.length).toBeGreaterThan(0);
    expect(reviseurs[0].categorie).toBe('TR03'); // Doit être TR03
  });

  it('✅ Supprime une liaison', async () => {
    const liaison = await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03Id,
      estPrincipal: true,
      actif: true,
    });

    await supprimerLiaison(liaison.id);

    const liaisons = await obtenirLiaisonsTraducteur(traducteurTR01Id);
    expect(liaisons).toHaveLength(0);
  });

  it('⚠️ Détecte un conflit d\'horaire traducteur-réviseur', async () => {
    // Créer une liaison
    await creerLiaison({
      traducteurId: traducteurTR01Id,
      reviseurId: reviseurTR03BisId,
      estPrincipal: true,
      actif: true,
    });

    // TR01: 08:00-16:00, TR03Bis: 10:00-18:00
    // Demande d'échéance dans 1 jour avec 10 heures (difficile)
    const dateEcheance = new Date();
    dateEcheance.setDate(dateEcheance.getDate() + 1); // Dans 1 jour

    const resultat = await verifierDisponibiliteCombinee(
      traducteurTR01Id,
      10, // 10 heures de traduction
      dateEcheance
    );

    expect(resultat).toBeDefined();
    expect(resultat.delaiRespecte).toBeDefined();
  });
});
