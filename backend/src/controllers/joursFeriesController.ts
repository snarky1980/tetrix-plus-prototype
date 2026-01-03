import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '.prisma/client';
import { TypeJourFerie } from '../config/database';
import { parseOttawaDateISO, formatOttawaISO, todayOttawa } from '../utils/dateTimeOttawa';
import { JoursFeriesService } from '../services/joursFeriesService';

// Import direct du client Prisma pour éviter les problèmes de cache TypeScript
const prisma = new PrismaClient();

/**
 * Obtenir tous les jours fériés
 * GET /api/admin/jours-feries
 */
export const obtenirJoursFeries = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { annee, actif } = req.query;
    
    const where: any = {};
    
    if (annee) {
      const anneeNum = parseInt(annee as string, 10);
      const dateDebut = new Date(`${anneeNum}-01-01T00:00:00Z`);
      const dateFin = new Date(`${anneeNum}-12-31T23:59:59Z`);
      where.date = {
        gte: dateDebut,
        lte: dateFin,
      };
    }
    
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }
    
    const joursFeries = await prisma.jourFerie.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    
    res.json(joursFeries);
  } catch (error) {
    console.error('Erreur obtenirJoursFeries:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des jours fériés' });
  }
};

/**
 * Obtenir un jour férié par ID
 * GET /api/admin/jours-feries/:id
 */
export const obtenirJourFerieParId = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const jourFerie = await prisma.jourFerie.findUnique({
      where: { id },
    });
    
    if (!jourFerie) {
      res.status(404).json({ erreur: 'Jour férié non trouvé' });
      return;
    }
    
    res.json(jourFerie);
  } catch (error) {
    console.error('Erreur obtenirJourFerieParId:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération du jour férié' });
  }
};

/**
 * Créer un nouveau jour férié
 * POST /api/admin/jours-feries
 */
export const creerJourFerie = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { date, nom, description, type } = req.body;
    
    if (!date || !nom) {
      res.status(400).json({ erreur: 'La date et le nom sont requis' });
      return;
    }
    
    // Vérifier si un jour férié existe déjà à cette date
    const dateObj = parseOttawaDateISO(date);
    const existant = await prisma.jourFerie.findUnique({
      where: { date: dateObj },
    });
    
    if (existant) {
      res.status(400).json({ erreur: 'Un jour férié existe déjà à cette date' });
      return;
    }
    
    const jourFerie = await prisma.jourFerie.create({
      data: {
        date: dateObj,
        nom,
        description: description || null,
        type: type as TypeJourFerie || 'FEDERAL',
        actif: true,
      },
    });
    
    // Invalider le cache des jours fériés
    JoursFeriesService.invalidateCache();
    
    res.status(201).json(jourFerie);
  } catch (error: any) {
    console.error('Erreur creerJourFerie:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ erreur: 'Un jour férié existe déjà à cette date' });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la création du jour férié' });
    }
  }
};

/**
 * Mettre à jour un jour férié
 * PUT /api/admin/jours-feries/:id
 */
export const mettreAJourJourFerie = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, nom, description, type, actif } = req.body;
    
    // Vérifier si le jour férié existe
    const existant = await prisma.jourFerie.findUnique({
      where: { id },
    });
    
    if (!existant) {
      res.status(404).json({ erreur: 'Jour férié non trouvé' });
      return;
    }
    
    const updateData: any = {};
    
    if (date !== undefined) {
      const dateObj = parseOttawaDateISO(date);
      // Vérifier si un autre jour férié existe à cette date
      const autreExistant = await prisma.jourFerie.findFirst({
        where: {
          date: dateObj,
          id: { not: id },
        },
      });
      if (autreExistant) {
        res.status(400).json({ erreur: 'Un autre jour férié existe déjà à cette date' });
        return;
      }
      updateData.date = dateObj;
    }
    
    if (nom !== undefined) updateData.nom = nom;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type as TypeJourFerie;
    if (actif !== undefined) updateData.actif = actif;
    
    const jourFerie = await prisma.jourFerie.update({
      where: { id },
      data: updateData,
    });
    
    // Invalider le cache des jours fériés
    JoursFeriesService.invalidateCache();
    
    res.json(jourFerie);
  } catch (error: any) {
    console.error('Erreur mettreAJourJourFerie:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ erreur: 'Un jour férié existe déjà à cette date' });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la mise à jour du jour férié' });
    }
  }
};

/**
 * Supprimer un jour férié
 * DELETE /api/admin/jours-feries/:id
 */
export const supprimerJourFerie = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Vérifier si le jour férié existe
    const existant = await prisma.jourFerie.findUnique({
      where: { id },
    });
    
    if (!existant) {
      res.status(404).json({ erreur: 'Jour férié non trouvé' });
      return;
    }
    
    await prisma.jourFerie.delete({
      where: { id },
    });
    
    // Invalider le cache des jours fériés
    JoursFeriesService.invalidateCache();
    
    res.status(204).send();
  } catch (error) {
    console.error('Erreur supprimerJourFerie:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression du jour férié' });
  }
};

/**
 * Importer des jours fériés par lot
 * POST /api/admin/jours-feries/import
 */
export const importerJoursFeries = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { joursFeries } = req.body;
    
    if (!Array.isArray(joursFeries) || joursFeries.length === 0) {
      res.status(400).json({ erreur: 'Liste de jours fériés requise' });
      return;
    }
    
    const resultats = {
      crees: 0,
      ignores: 0,
      erreurs: [] as string[],
    };
    
    for (const jf of joursFeries) {
      try {
        if (!jf.date || !jf.nom) {
          resultats.erreurs.push(`Date ou nom manquant: ${JSON.stringify(jf)}`);
          continue;
        }
        
        const dateObj = parseOttawaDateISO(jf.date);
        
        // Vérifier si existe déjà
        const existant = await prisma.jourFerie.findUnique({
          where: { date: dateObj },
        });
        
        if (existant) {
          resultats.ignores++;
          continue;
        }
        
        await prisma.jourFerie.create({
          data: {
            date: dateObj,
            nom: jf.nom,
            description: jf.description || null,
            type: (jf.type as TypeJourFerie) || 'FEDERAL',
            actif: true,
          },
        });
        
        resultats.crees++;
      } catch (err: any) {
        resultats.erreurs.push(`Erreur pour ${jf.date}: ${err.message}`);
      }
    }
    
    // Invalider le cache si des jours ont été créés
    if (resultats.crees > 0) {
      JoursFeriesService.invalidateCache();
    }
    
    res.json(resultats);
  } catch (error) {
    console.error('Erreur importerJoursFeries:', error);
    res.status(500).json({ erreur: "Erreur lors de l'import des jours fériés" });
  }
};

/**
 * Pré-remplir avec les jours fériés officiels d'une année
 * POST /api/admin/jours-feries/preremplir/:annee
 */
export const preremplirAnnee = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const annee = parseInt(req.params.annee, 10);
    
    if (isNaN(annee) || annee < 2024 || annee > 2030) {
      res.status(400).json({ erreur: 'Année invalide (2024-2030)' });
      return;
    }
    
    // Jours fériés fédéraux canadiens avec dates calculées
    const joursFeriesFederaux = calculerJoursFeriesFederaux(annee);
    
    const resultats = {
      crees: 0,
      ignores: 0,
    };
    
    for (const jf of joursFeriesFederaux) {
      const existant = await prisma.jourFerie.findUnique({
        where: { date: jf.date },
      });
      
      if (existant) {
        resultats.ignores++;
        continue;
      }
      
      await prisma.jourFerie.create({
        data: {
          date: jf.date,
          nom: jf.nom,
          description: jf.description,
          type: 'FEDERAL',
          actif: true,
        },
      });
      
      resultats.crees++;
    }
    
    // Invalider le cache si des jours ont été créés
    if (resultats.crees > 0) {
      JoursFeriesService.invalidateCache();
    }
    
    res.json({
      message: `Jours fériés ${annee} pré-remplis`,
      ...resultats,
    });
  } catch (error) {
    console.error('Erreur preremplirAnnee:', error);
    res.status(500).json({ erreur: 'Erreur lors du pré-remplissage' });
  }
};

/**
 * Calcule les jours fériés fédéraux pour une année donnée
 */
function calculerJoursFeriesFederaux(annee: number): Array<{ date: Date; nom: string; description?: string }> {
  const feries: Array<{ date: Date; nom: string; description?: string }> = [];
  
  // 1. Jour de l'An (1er janvier)
  feries.push({
    date: new Date(Date.UTC(annee, 0, 1)),
    nom: "Jour de l'An",
    description: 'Congé fédéral',
  });
  
  // 2. Vendredi saint (variable - 2 jours avant Pâques)
  const paques = calculerPaques(annee);
  const vendrediSaint = new Date(paques);
  vendrediSaint.setDate(paques.getDate() - 2);
  feries.push({
    date: vendrediSaint,
    nom: 'Vendredi saint',
    description: 'Congé fédéral',
  });
  
  // 3. Lundi de Pâques (1 jour après Pâques)
  const lundiPaques = new Date(paques);
  lundiPaques.setDate(paques.getDate() + 1);
  feries.push({
    date: lundiPaques,
    nom: 'Lundi de Pâques',
    description: 'Congé fédéral',
  });
  
  // 4. Fête de la Reine / Victoria Day (lundi précédant le 25 mai)
  const feteReine = calculerLundiPrecedant(annee, 4, 25); // Mai = mois 4
  feries.push({
    date: feteReine,
    nom: 'Fête de la Reine (Victoria Day)',
    description: 'Lundi précédant le 25 mai',
  });
  
  // 5. Fête du Canada (1er juillet)
  let feteCanada = new Date(Date.UTC(annee, 6, 1));
  // Si tombe un dimanche, observé le lundi
  if (feteCanada.getUTCDay() === 0) {
    feteCanada = new Date(Date.UTC(annee, 6, 2));
    feries.push({
      date: feteCanada,
      nom: 'Fête du Canada (observé)',
      description: 'Observé le 2 juillet (1er juillet tombe dimanche)',
    });
  } else {
    feries.push({
      date: feteCanada,
      nom: 'Fête du Canada',
      description: 'Congé fédéral',
    });
  }
  
  // 6. Fête du Travail (premier lundi de septembre)
  const feteTravail = calculerPremierLundi(annee, 8); // Septembre = mois 8
  feries.push({
    date: feteTravail,
    nom: 'Fête du Travail',
    description: 'Premier lundi de septembre',
  });
  
  // 7. Journée nationale de la vérité et de la réconciliation (30 septembre)
  let verite = new Date(Date.UTC(annee, 8, 30));
  if (verite.getUTCDay() === 0) {
    verite = new Date(Date.UTC(annee, 9, 1)); // Observé le lundi si dimanche
    feries.push({
      date: verite,
      nom: 'Journée nationale de la vérité et de la réconciliation (observé)',
      description: 'Observé le 1er octobre',
    });
  } else if (verite.getUTCDay() === 6) {
    verite = new Date(Date.UTC(annee, 8, 29)); // Observé le vendredi si samedi
    feries.push({
      date: verite,
      nom: 'Journée nationale de la vérité et de la réconciliation (observé)',
      description: 'Observé le 29 septembre',
    });
  } else {
    feries.push({
      date: verite,
      nom: 'Journée nationale de la vérité et de la réconciliation',
      description: 'Congé fédéral',
    });
  }
  
  // 8. Action de grâces (deuxième lundi d'octobre)
  const actionGraces = calculerDeuxiemeLundi(annee, 9); // Octobre = mois 9
  feries.push({
    date: actionGraces,
    nom: 'Action de grâces',
    description: "Deuxième lundi d'octobre",
  });
  
  // 9. Jour du Souvenir (11 novembre)
  let souvenir = new Date(Date.UTC(annee, 10, 11));
  if (souvenir.getUTCDay() === 0) {
    souvenir = new Date(Date.UTC(annee, 10, 12));
    feries.push({
      date: souvenir,
      nom: 'Jour du Souvenir (observé)',
      description: 'Observé le 12 novembre',
    });
  } else if (souvenir.getUTCDay() === 6) {
    souvenir = new Date(Date.UTC(annee, 10, 10));
    feries.push({
      date: souvenir,
      nom: 'Jour du Souvenir (observé)',
      description: 'Observé le 10 novembre',
    });
  } else {
    feries.push({
      date: souvenir,
      nom: 'Jour du Souvenir',
      description: 'Congé fédéral',
    });
  }
  
  // 10. Noël (25 décembre)
  let noel = new Date(Date.UTC(annee, 11, 25));
  if (noel.getUTCDay() === 0) {
    feries.push({
      date: new Date(Date.UTC(annee, 11, 26)),
      nom: 'Noël (observé)',
      description: 'Observé le 26 décembre',
    });
  } else if (noel.getUTCDay() === 6) {
    feries.push({
      date: new Date(Date.UTC(annee, 11, 24)),
      nom: 'Noël (observé)',
      description: 'Observé le 24 décembre',
    });
  } else {
    feries.push({
      date: noel,
      nom: 'Noël',
      description: 'Congé fédéral',
    });
  }
  
  // 11. Lendemain de Noël (26 décembre)
  let lendemainNoel = new Date(Date.UTC(annee, 11, 26));
  if (lendemainNoel.getUTCDay() === 0) {
    feries.push({
      date: new Date(Date.UTC(annee, 11, 27)),
      nom: 'Lendemain de Noël (observé)',
      description: 'Observé le 27 décembre',
    });
  } else if (lendemainNoel.getUTCDay() === 6) {
    feries.push({
      date: new Date(Date.UTC(annee, 11, 28)),
      nom: 'Lendemain de Noël (observé)',
      description: 'Observé le 28 décembre',
    });
  } else {
    feries.push({
      date: lendemainNoel,
      nom: 'Lendemain de Noël',
      description: 'Congé fédéral',
    });
  }
  
  return feries;
}

/**
 * Calcule la date de Pâques pour une année donnée (algorithme de Oudin)
 */
function calculerPaques(annee: number): Date {
  const G = annee % 19;
  const C = Math.floor(annee / 100);
  const H = (C - Math.floor(C / 4) - Math.floor((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - Math.floor(H / 28) * (1 - Math.floor(29 / (H + 1)) * Math.floor((21 - G) / 11));
  const J = (annee + Math.floor(annee / 4) + I + 2 - C + Math.floor(C / 4)) % 7;
  const L = I - J;
  const mois = 3 + Math.floor((L + 40) / 44);
  const jour = L + 28 - 31 * Math.floor(mois / 4);
  return new Date(Date.UTC(annee, mois - 1, jour));
}

/**
 * Calcule le premier lundi d'un mois
 */
function calculerPremierLundi(annee: number, mois: number): Date {
  const premierJour = new Date(Date.UTC(annee, mois, 1));
  const jourSemaine = premierJour.getUTCDay();
  const decalage = jourSemaine === 0 ? 1 : jourSemaine === 1 ? 0 : 8 - jourSemaine;
  return new Date(Date.UTC(annee, mois, 1 + decalage));
}

/**
 * Calcule le deuxième lundi d'un mois
 */
function calculerDeuxiemeLundi(annee: number, mois: number): Date {
  const premierLundi = calculerPremierLundi(annee, mois);
  return new Date(Date.UTC(annee, mois, premierLundi.getUTCDate() + 7));
}

/**
 * Calcule le lundi précédant une date spécifique
 */
function calculerLundiPrecedant(annee: number, mois: number, jour: number): Date {
  const date = new Date(Date.UTC(annee, mois, jour));
  const jourSemaine = date.getUTCDay();
  // Si c'est lundi, c'est le lundi précédant (7 jours avant)
  const decalage = jourSemaine === 1 ? 7 : (jourSemaine === 0 ? 6 : jourSemaine - 1);
  return new Date(Date.UTC(annee, mois, jour - decalage));
}
