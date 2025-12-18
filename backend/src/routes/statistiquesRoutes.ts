import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authentifier } from '../middleware/auth';
import { parseISO, differenceInDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { OTTAWA_TIMEZONE } from '../utils/dateTimeOttawa';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/statistiques/productivite
 * Récupère les statistiques de productivité des traducteurs
 */
router.get('/productivite', authentifier, async (req, res) => {
  try {
    const { dateDebut, dateFin, divisionId, traducteurId } = req.query;
    const utilisateur = (req as any).utilisateur;

    // Validation dates
    if (!dateDebut || !dateFin) {
      return res.status(400).json({ message: 'dateDebut et dateFin sont requis' });
    }

    const debut = toZonedTime(parseISO(dateDebut as string), OTTAWA_TIMEZONE);
    const fin = toZonedTime(parseISO(dateFin as string), OTTAWA_TIMEZONE);

    // Contrôle d'accès : GESTIONNAIRE ne peut voir que les divisions autorisées
    let filtreDivision: any = {};
    let divisionsAutorisees: string[] = [];
    
    if (utilisateur.role === 'GESTIONNAIRE') {
      const accesDiv = await prisma.divisionAccess.findMany({
        where: {
          utilisateurId: utilisateur.id,
          peutLire: true
        },
        include: {
          division: {
            select: { nom: true }
          }
        }
      });

      divisionsAutorisees = accesDiv.map(d => d.division.nom);
      
      if (divisionsAutorisees.length === 0) {
        // Aucune division autorisée
        return res.json({
          resume: {
            motsTotaux: 0,
            heuresTotales: 0,
            productiviteMoyenne: 0,
            tendanceMots: 0,
            tendanceHeures: 0,
            tendanceProductivite: 0
          },
          parTraducteur: [],
          parClient: [],
          parDomaine: []
        });
      }

      // Si une division spécifique est demandée, vérifier qu'elle est autorisée
      if (divisionId) {
        if (!divisionsAutorisees.includes(divisionId as string)) {
          return res.status(403).json({ message: 'Vous n\'avez pas accès à cette division' });
        }
        filtreDivision = { division: divisionId as string };
      } else {
        filtreDivision = divisionsAutorisees.length > 1 
          ? { division: { in: divisionsAutorisees } } 
          : { division: divisionsAutorisees[0] };
      }
    } else if (divisionId) {
      // Pour ADMIN, CONSEILLER - pas de restriction
      filtreDivision = { division: divisionId as string };
    }

    // Récupérer les tâches dans la période
    const tachesQuery: any = {
      where: {
        dateEcheance: {
          gte: debut,
          lte: fin,
        },
        ...(traducteurId ? { traducteurId: traducteurId as string } : {}),
      },
      include: {
        traducteur: {
          select: {
            id: true,
            nom: true,
            division: true,
            classification: true,
            specialisations: true,
          },
        },
        client: { select: { nom: true } },
        sousDomaine: { select: { nom: true } },
      },
    };

    const taches = await prisma.tache.findMany(tachesQuery);

    // Filtrer par division si nécessaire
    let tachesFiltrees = taches;
    if (utilisateur.role === 'GESTIONNAIRE') {
      tachesFiltrees = taches.filter((t: any) => 
        t.traducteur && divisionsAutorisees.includes(t.traducteur.division)
      );
    } else if (Object.keys(filtreDivision).length > 0 && filtreDivision.division) {
      const divCible = typeof filtreDivision.division === 'string' 
        ? filtreDivision.division 
        : null;
      if (divCible) {
        tachesFiltrees = taches.filter((t: any) => 
          t.traducteur && t.traducteur.division === divCible
        );
      }
    }

    // Calculer les stats globales
    const motsTotaux = tachesFiltrees.reduce((sum, t) => sum + (t.compteMots || 0), 0);
    const heuresTotales = tachesFiltrees.reduce((sum, t) => sum + t.heuresTotal, 0);
    const productiviteMoyenne = heuresTotales > 0 ? Math.round(motsTotaux / heuresTotales) : 0;

    // Calculer période précédente pour tendance
    const nbJours = differenceInDays(fin, debut);
    const debutPrecedent = new Date(debut);
    debutPrecedent.setDate(debutPrecedent.getDate() - nbJours);
    const finPrecedent = new Date(debut);

    const tachesPrecedentes = await prisma.tache.findMany({
      where: {
        dateEcheance: {
          gte: debutPrecedent,
          lt: finPrecedent,
        },
        ...(traducteurId ? { traducteurId: traducteurId as string } : {}),
      },
      include: {
        traducteur: {
          select: {
            id: true,
            division: true,
          },
        },
      },
    });

    let tachesPrecedentesFiltrees = tachesPrecedentes;
    if (utilisateur.role === 'GESTIONNAIRE') {
      tachesPrecedentesFiltrees = tachesPrecedentes.filter((t: any) => 
        t.traducteur && divisionsAutorisees.includes(t.traducteur.division)
      );
    } else if (Object.keys(filtreDivision).length > 0 && filtreDivision.division) {
      const divCible = typeof filtreDivision.division === 'string' 
        ? filtreDivision.division 
        : null;
      if (divCible) {
        tachesPrecedentesFiltrees = tachesPrecedentes.filter((t: any) => 
          t.traducteur && t.traducteur.division === divCible
        );
      }
    }

    const motsPrecedents = tachesPrecedentesFiltrees.reduce((sum, t) => sum + (t.compteMots || 0), 0);
    const heuresPrecedentes = tachesPrecedentesFiltrees.reduce((sum, t) => sum + t.heuresTotal, 0);
    const productivitePrecedente = heuresPrecedentes > 0 ? motsPrecedents / heuresPrecedentes : 0;

    const tendanceMots = motsPrecedents > 0 ? ((motsTotaux - motsPrecedents) / motsPrecedents) * 100 : 0;
    const tendanceHeures = heuresPrecedentes > 0 ? ((heuresTotales - heuresPrecedentes) / heuresPrecedentes) * 100 : 0;
    const tendanceProductivite = productivitePrecedente > 0 
      ? ((productiviteMoyenne - productivitePrecedente) / productivitePrecedente) * 100 
      : 0;

    // Récupérer TOUS les traducteurs actifs (même sans tâches)
    const tousLesTraducteurs = await prisma.traducteur.findMany({
      where: {
        actif: true,
        ...filtreDivision,
      },
      select: {
        id: true,
        nom: true,
        division: true,
        classification: true,
        specialisations: true,
      },
      orderBy: { nom: 'asc' },
    });

    // Stats par traducteur - initialiser avec TOUS les traducteurs
    const parTraducteur = new Map<string, any>();
    
    // Initialiser tous les traducteurs avec des stats à zéro
    for (const trad of tousLesTraducteurs) {
      parTraducteur.set(trad.id, {
        id: trad.id,
        nom: trad.nom,
        division: trad.division,
        classification: trad.classification,
        specialisations: trad.specialisations,
        mots: 0,
        heures: 0,
        taches: 0,
      });
    }
    
    // Ajouter les stats des tâches
    for (const tache of tachesFiltrees) {
      const tacheTyped = tache as any;
      if (!tacheTyped.traducteur) continue;

      const tradId = (tache as any).traducteurId;
      const stats = parTraducteur.get(tradId);
      if (stats) {
        stats.mots += (tache as any).compteMots || 0;
        stats.heures += (tache as any).heuresTotal;
        stats.taches += 1;
      }
    }

    // Calculer productivité et tendance par traducteur
    const statsParTraducteur = Array.from(parTraducteur.values()).map(stat => {
      const productivite = stat.heures > 0 ? Math.round(stat.mots / stat.heures) : 0;

      // Tendance individuelle
      const tachesTradPrecedentes = tachesPrecedentesFiltrees.filter(t => t.traducteurId === stat.id);
      const motsPrecedentsTrad = tachesTradPrecedentes.reduce((sum, t) => sum + (t.compteMots || 0), 0);
      const heuresPrecedentesTrad = tachesTradPrecedentes.reduce((sum, t) => sum + t.heuresTotal, 0);
      const productivitePrecedenteTrad = heuresPrecedentesTrad > 0 ? motsPrecedentsTrad / heuresPrecedentesTrad : 0;
      const tendance = productivitePrecedenteTrad > 0
        ? ((productivite - productivitePrecedenteTrad) / productivitePrecedenteTrad) * 100
        : 0;

      return {
        ...stat,
        productivite,
        tendance: Math.round(tendance * 10) / 10, // 1 décimale
      };
    });

    // Trier par productivité décroissante
    statsParTraducteur.sort((a, b) => b.productivite - a.productivite);

    // Stats par division
    const parDivision = new Map<string, { mots: number; heures: number }>();
    for (const tache of tachesFiltrees) {
      const tacheTyped = tache as any;
      if (!tacheTyped.traducteur) continue;
      const div = tacheTyped.traducteur.division;
      if (!parDivision.has(div)) {
        parDivision.set(div, { mots: 0, heures: 0 });
      }
      const stats = parDivision.get(div)!;
      stats.mots += (tache as any).compteMots || 0;
      stats.heures += (tache as any).heuresTotal;
    }

    const statsParDivision = Array.from(parDivision.entries()).map(([division, stats]) => ({
      division,
      productiviteMoyenne: stats.heures > 0 ? Math.round(stats.mots / stats.heures) : 0,
    }));

    // Stats par type de texte (spécialisations)
    const parTypeTexte = new Map<string, { mots: number; heures: number }>();
    for (const tache of tachesFiltrees) {
      if (!tache.specialisation) continue;
      const type = tache.specialisation;
      if (!parTypeTexte.has(type)) {
        parTypeTexte.set(type, { mots: 0, heures: 0 });
      }
      const stats = parTypeTexte.get(type)!;
      stats.mots += tache.compteMots || 0;
      stats.heures += tache.heuresTotal;
    }

    const statsParTypeTexte = Array.from(parTypeTexte.entries()).map(([type, stats]) => ({
      type,
      productiviteMoyenne: stats.heures > 0 ? Math.round(stats.mots / stats.heures) : 0,
    }));

    // Générer alertes
    const alertes: any[] = [];
    const seuilBaisse = -15; // -15%
    const seuilHaut = 20; // +20%

    for (const stat of statsParTraducteur) {
      if (stat.tendance <= seuilBaisse) {
        alertes.push({
          type: 'warning',
          message: `${stat.nom}: Productivité en baisse de ${Math.abs(Math.round(stat.tendance))}% - Recommandation: Vérifier charge de travail`,
          traducteurId: stat.id,
        });
      } else if (stat.tendance >= seuilHaut) {
        alertes.push({
          type: 'success',
          message: `${stat.nom}: Excellente performance avec +${Math.round(stat.tendance)}% de productivité`,
          traducteurId: stat.id,
        });
      }
    }

    // Traducteurs sous-performants
    const sousPerformants = statsParTraducteur.filter(s => s.productivite < productiviteMoyenne * 0.8);
    if (sousPerformants.length > 0) {
      alertes.push({
        type: 'info',
        message: `${sousPerformants.length} traducteur(s) sous ${Math.round(productiviteMoyenne * 0.8)} mots/h (80% de la moyenne: ${productiviteMoyenne} m/h)`,
      });
    }

    // Nombre de traducteurs actifs
    const traducteursActifs = new Set(tachesFiltrees.map(t => t.traducteurId)).size;

    // Réponse
    res.json({
      vueEnsemble: {
        motsTotaux,
        heuresTotales: Math.round(heuresTotales * 10) / 10,
        productiviteMoyenne,
        traducteursActifs,
        tendanceMots: Math.round(tendanceMots * 10) / 10,
        tendanceHeures: Math.round(tendanceHeures * 10) / 10,
        tendanceProductivite: Math.round(tendanceProductivite * 10) / 10,
      },
      parTraducteur: statsParTraducteur,
      parDivision: statsParDivision,
      parTypeTexte: statsParTypeTexte,
      alertes,
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur lors du calcul des statistiques' });
  }
});

export default router;
