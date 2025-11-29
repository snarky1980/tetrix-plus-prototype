import { describe, it, expect } from 'vitest';
import prisma from '../src/config/database';
import { repartitionUniforme, repartitionJusteATemps } from '../src/services/repartitionService';

// NOTE: Ces tests n'utilisent pas de données persistantes complexes; ils utilisent l'état actuel DB.
// Pour fiabilité, on crée un traducteur jetable quand nécessaire.

describe('repartitionService.repartitionUniforme', () => {
  it('répartit uniformément et somme exacte', () => {
    const total = 10;
    const debut = new Date('2025-01-01');
    const fin = new Date('2025-01-05'); // 5 jours
    const rep = repartitionUniforme(total, debut, fin);
    expect(rep.length).toBe(5);
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
        utilisateur: { create: { email: `jat_insuff_${Date.now()}@test.local`, motDePasse: 'x', role: 'TRADUCTEUR' } }
      }
    });
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 1); // 2 jours capacité 4h
    await expect(repartitionJusteATemps(traducteur.id, 10, echeance)).rejects.toThrow();
  });
});
