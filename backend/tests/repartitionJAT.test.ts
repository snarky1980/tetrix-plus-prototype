/**
 * Tests pour la logique JAT avec plages horaires
 * 
 * Scénario de test utilisateur:
 * - Traducteur: Julie-Marie Bissonnette
 * - Horaire: 10h-18h
 * - Tâche: 5 heures
 * - Échéance: Mardi 17 décembre 2025 à 12:00
 * 
 * Résultat attendu:
 * - Lundi 16 décembre: 3h (15h-18h) - FIN DE JOURNÉE
 * - Mardi 17 décembre: 2h (10h-12h) - DÉBUT DE JOURNÉE jusqu'à échéance
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { repartitionJusteATemps } from '../src/services/repartitionService';
import prisma from '../src/config/database';

describe('Répartition JAT - Logique à rebours', () => {
  let traducteurId: string;

  beforeAll(async () => {
    // Trouver Julie-Marie Bissonnette ou créer un traducteur de test
    const traducteur = await prisma.traducteur.findFirst({
      where: {
        nom: { contains: 'Bissonnette' },
        horaire: '10h-18h'
      }
    });

    if (traducteur) {
      traducteurId = traducteur.id;
    } else {
      // Créer un traducteur de test
      const created = await prisma.traducteur.create({
        data: {
          nom: 'Test Traducteur JAT',
          division: 'Droit 2',
          horaire: '10h-18h',
          capaciteHeuresParJour: 6,
          actif: true
        }
      });
      traducteurId = created.id;
    }
  });

  it('devrait allouer les heures en fin de journée pour les jours avant l\'échéance', async () => {
    const resultat = await repartitionJusteATemps(
      traducteurId,
      5, // 5 heures
      '2025-12-17T12:00:00', // Mardi 17 décembre à 12h
      { debug: true, modeTimestamp: true }
    );

    console.log('\n=== Résultat JAT ===');
    resultat.forEach(r => {
      console.log(`${r.date}: ${r.heures}h ${r.heureDebut ? `(${r.heureDebut}-${r.heureFin})` : ''}`);
    });

    // Vérifier qu'on a bien 2 jours
    expect(resultat.length).toBe(2);

    // Vérifier le lundi 16 décembre
    const lundi = resultat.find(r => r.date === '2025-12-16');
    expect(lundi).toBeDefined();
    expect(lundi!.heures).toBe(3);
    expect(lundi!.heureDebut).toBe('15h'); // 18h - 3h = 15h
    expect(lundi!.heureFin).toBe('18h');

    // Vérifier le mardi 17 décembre
    const mardi = resultat.find(r => r.date === '2025-12-17');
    expect(mardi).toBeDefined();
    expect(mardi!.heures).toBe(2);
    expect(mardi!.heureDebut).toBe('10h'); // Début de journée
    expect(mardi!.heureFin).toBe('12h'); // Échéance
  });

  it('devrait gérer correctement une tâche qui traverse la pause midi', async () => {
    const resultat = await repartitionJusteATemps(
      traducteurId,
      4, // 4 heures
      '2025-12-17T15:00:00', // Mardi 17 décembre à 15h
      { debug: true, modeTimestamp: true }
    );

    console.log('\n=== Résultat JAT avec pause ===');
    resultat.forEach(r => {
      console.log(`${r.date}: ${r.heures}h ${r.heureDebut ? `(${r.heureDebut}-${r.heureFin})` : ''}`);
    });

    // Le jour de l'échéance devrait avoir des heures allouées
    const mardi = resultat.find(r => r.date === '2025-12-17');
    expect(mardi).toBeDefined();
    
    // Si 4h à partir de 10h: 10h-11h (1h) + 11h-12h (1h) + 13h-14h (1h) + 14h-15h (1h) = 15h
    // Donc heureDebut = 10h, heureFin = 15h (en sautant 12h-13h)
    expect(mardi!.heureDebut).toBe('10h');
  });
});
