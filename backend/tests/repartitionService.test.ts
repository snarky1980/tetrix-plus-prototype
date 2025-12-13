import { describe, it, expect } from 'vitest';
import prisma from '../src/config/database';
import { repartitionUniforme, repartitionJusteATemps, repartitionEquilibree, repartitionPEPS } from '../src/services/repartitionService';

// NOTE: Ces tests n'utilisent pas de données persistantes complexes; ils utilisent l'état actuel DB.
// Pour fiabilité, on crée un traducteur jetable quand nécessaire.

describe('repartitionService.repartitionUniforme', () => {
  it('répartit uniformément et somme exacte', () => {
    const total = 10;
    const debut = new Date('2025-01-06'); // lundi
    const fin = new Date('2025-01-10'); // vendredi
    const rep = repartitionUniforme(total, debut, fin);
    expect(rep.length).toBeGreaterThan(0); // Number of days may vary based on weekend logic
    const somme = parseFloat(rep.reduce((s, r) => s + r.heures, 0).toFixed(4));
    expect(somme).toBe(total);
  });
  it('ajuste la dernière valeur pour compenser flottants', () => {
    const total = 1; // sur 3 jours
    const rep = repartitionUniforme(total, new Date('2025-02-01'), new Date('2025-02-03'));
    const somme = parseFloat(rep.reduce((s, r) => s + r.heures, 0).toFixed(4));
    expect(somme).toBe(total);
  });
});

describe('repartitionService.repartitionJusteATemps', () => {
  it('alloue à rebours puis retourne trié asc', async () => {
    // Créer traducteur de test
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'JAT Testeur',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 5,
        classification: 'A',
        utilisateur: { create: { email: `jat_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 3); // 4 jours fenêtre (0..3)
    const rep = await repartitionJusteATemps(traducteur.id, 10, echeance); // capacité totale 20
    expect(rep.length).toBeGreaterThan(0);
    // Vérifier tri asc
    const dates = rep.map(r => r.date);
    const sorted = [...dates].sort((a,b) => a.localeCompare(b));
    expect(dates).toEqual(sorted);
    const somme = parseFloat(rep.reduce((s,r)=> s + r.heures,0).toFixed(4));
    expect(somme).toBe(10);
  });
  it('jette une erreur si capacité insuffisante', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'JAT Cap Insuff',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 2,
        classification: 'A',
        utilisateur: { create: { email: `jat_insuff_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 1); // 2 jours capacité 4h
    await expect(repartitionJusteATemps(traducteur.id, 10, echeance)).rejects.toThrow();
  });

  it('accepte une échéance string AAAA-MM-JJ sans décalage', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'JAT String Date',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 6,
        classification: 'A',
        utilisateur: { create: { email: `jat_string_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 2);
    const echeanceStr = echeance.toISOString().split('T')[0];
    const rep = await repartitionJusteATemps(traducteur.id, 6, echeanceStr);
    const dernier = rep[rep.length - 1];
    expect(dernier.date).toBe(echeanceStr);
  });

  it('normalise aussi les strings ISO avec heure', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'JAT DateTime ISO',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 6,
        classification: 'A',
        utilisateur: { create: { email: `jat_iso_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 4);
    const echeanceStr = echeance.toISOString().split('T')[0];
    const isoAvecHeure = `${echeanceStr}T12:30:00.000Z`;
    const rep = await repartitionJusteATemps(traducteur.id, 5, isoAvecHeure);
    const dates = rep.map(r => r.date);
    expect(dates[dates.length - 1]).toBe(echeanceStr);
    expect(dates.every(d => d <= echeanceStr)).toBe(true);
  });
});

describe('repartitionService.repartitionEquilibree', () => {
  it('répartit les heures sur les jours ouvrables restants', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'Equilibre Test',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 6,
        classification: 'A',
        utilisateur: { create: { email: `equilibre_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    await prisma.ajustementTemps.create({
      data: {
        traducteurId: traducteur.id,
        date: new Date('2025-01-08'),
        heures: 2,
        type: 'TACHE',
        creePar: traducteur.utilisateurId,
      }
    });

    const rep = await repartitionEquilibree(traducteur.id, 12, '2025-01-06', '2025-01-10');
    expect(rep.length).toBeGreaterThan(0);
    expect(rep.every(r => ![0,6].includes(new Date(r.date).getDay()))).toBe(true);
    const somme = parseFloat(rep.reduce((s, r) => s + r.heures, 0).toFixed(4));
    expect(somme).toBeCloseTo(12, 4);
  });

  it('signale capacité insuffisante', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'Equilibre Limit',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 3,
        classification: 'A',
        utilisateur: { create: { email: `equilibre_limit_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    await expect(
      repartitionEquilibree(traducteur.id, 50, '2025-01-06', '2025-01-10')
    ).rejects.toThrow('Capacité insuffisante');
  });
});

describe('repartitionService.repartitionPEPS', () => {
  it('remplit depuis la date de début en respectant la capacité restante', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'PEPS Test',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 5,
        horaire: '08:00-14:00', // 5h net
        classification: 'A',
        utilisateur: { create: { email: `peps_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    await prisma.ajustementTemps.create({
      data: {
        traducteurId: traducteur.id,
        date: new Date('2025-02-10'),
        heures: 4,
        type: 'TACHE',
        creePar: traducteur.utilisateurId,
      }
    });

    const rep = await repartitionPEPS(traducteur.id, 12, '2025-02-10', '2025-02-14');
    expect(rep[0].date).toBe('2025-02-10');
    expect(rep.every(r => r.heures <= 5)).toBe(true);
    const somme = parseFloat(rep.reduce((s, r) => s + r.heures, 0).toFixed(4));
    expect(somme).toBeCloseTo(12, 4);
  });

  it('échoue si la période ne suffit pas', async () => {
    const traducteur = await prisma.traducteur.create({
      data: {
        nom: 'PEPS Limit',
        division: 'TEST',
        domaines: [],
        clientsHabituels: [],
        capaciteHeuresParJour: 4,
        classification: 'A',
        utilisateur: { create: { email: `peps_limit_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    await expect(
      repartitionPEPS(traducteur.id, 40, '2025-03-03', '2025-03-07')
    ).rejects.toThrow('Capacité insuffisante');
  });
});
