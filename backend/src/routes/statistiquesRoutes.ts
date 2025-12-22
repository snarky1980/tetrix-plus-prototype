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
 * Supporte les filtres: dateDebut, dateFin, divisionId, traducteurId, division (multi), client, domaine, langueSource, langueCible
 */
router.get('/productivite', authentifier, async (req, res) => {
  try {
    const { dateDebut, dateFin, divisionId, traducteurId, division, client, domaine, langueSource, langueCible } = req.query;
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
        filtreDivision = { divisions: { hasSome: [divisionId as string] } };
      } else if (division) {
        // Filtres multiples depuis le planificateur
        const divisionsRequises = (division as string).split(',');
        const divisionsValides = divisionsRequises.filter(d => divisionsAutorisees.includes(d));
        if (divisionsValides.length === 0) {
          return res.status(403).json({ message: 'Vous n\'avez pas accès à ces divisions' });
        }
        filtreDivision = { divisions: { hasSome: divisionsValides } };
      } else {
        filtreDivision = { divisions: { hasSome: divisionsAutorisees } };
      }
    } else if (divisionId) {
      // Pour ADMIN, CONSEILLER - pas de restriction
      filtreDivision = { divisions: { hasSome: [divisionId as string] } };
    } else if (division) {
      // Filtres multiples depuis le planificateur (pour non-gestionnaires)
      const divisionsRequises = (division as string).split(',');
      filtreDivision = { divisions: { hasSome: divisionsRequises } };
    }

    // Préparer les filtres pour tâches (client, domaine)
    let filtreClient: string[] | undefined;
    let filtreDomaine: string[] | undefined;
    
    if (client) {
      filtreClient = (client as string).split(',');
    }
    if (domaine) {
      filtreDomaine = (domaine as string).split(',');
    }

    // Récupérer les tâches dans la période
    // On inclut TOUTES les tâches (PLANIFIEE, EN_COURS, TERMINEE) pour un calcul complet
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
            pairesLinguistiques: true,
          },
        },
        client: { select: { id: true, nom: true } },
        sousDomaine: { 
          select: { 
            nom: true,
            domaineParent: true,
          } 
        },
        paireLinguistique: { select: { langueSource: true, langueCible: true } },
        ajustementsTemps: {
          where: { type: 'TACHE' },
          select: { heures: true, date: true },
        },
      },
    };

    const taches = await prisma.tache.findMany(tachesQuery);

    // Filtrer les tâches selon tous les critères
    let tachesFiltrees = taches;
    
    // Filtre par division (traducteur) - divisions est maintenant un tableau
    if (utilisateur.role === 'GESTIONNAIRE') {
      tachesFiltrees = tachesFiltrees.filter((t: any) => 
        t.traducteur && t.traducteur.divisions?.some((d: string) => divisionsAutorisees.includes(d))
      );
    } else if (Object.keys(filtreDivision).length > 0 && filtreDivision.divisions) {
      const divCibles = Array.isArray(filtreDivision.divisions.hasSome) 
        ? filtreDivision.divisions.hasSome
        : [];
      if (divCibles.length > 0) {
        tachesFiltrees = tachesFiltrees.filter((t: any) => 
          t.traducteur && t.traducteur.divisions?.some((d: string) => divCibles.includes(d))
        );
      }
    }
    
    // Filtre par client
    if (filtreClient && filtreClient.length > 0) {
      tachesFiltrees = tachesFiltrees.filter((t: any) => 
        t.client && filtreClient.includes(t.client.nom)
      );
    }
    
    // Filtre par domaine (utilise domaineParent du sousDomaine)
    if (filtreDomaine && filtreDomaine.length > 0) {
      tachesFiltrees = tachesFiltrees.filter((t: any) => 
        t.sousDomaine?.domaineParent && filtreDomaine.includes(t.sousDomaine.domaineParent)
      );
    }
    
    // Filtre par langues
    const languesSourceFiltre = langueSource ? (langueSource as string).split(',') : [];
    const languesCibleFiltre = langueCible ? (langueCible as string).split(',') : [];
    
    if (languesSourceFiltre.length > 0 || languesCibleFiltre.length > 0) {
      tachesFiltrees = tachesFiltrees.filter((t: any) => {
        if (!t.paireLinguistique) return false;
        const matchSource = languesSourceFiltre.length === 0 || languesSourceFiltre.includes(t.paireLinguistique.langueSource);
        const matchCible = languesCibleFiltre.length === 0 || languesCibleFiltre.includes(t.paireLinguistique.langueCible);
        return matchSource && matchCible;
      });
    }

    // Calculer les stats globales
    // Pour les heures, on utilise les ajustements de temps (heures réellement planifiées/travaillées)
    // Cela reflète mieux le travail effectué, surtout pour les tâches terminées avant l'heure
    const motsTotaux = tachesFiltrees.reduce((sum, t) => sum + (t.compteMots || 0), 0);
    
    // Calcul des heures basé sur ajustements (si disponibles) ou heuresTotal (fallback)
    const heuresTotales = tachesFiltrees.reduce((sum, t: any) => {
      // Si la tâche a des ajustements, utiliser la somme des ajustements
      if (t.ajustementsTemps && t.ajustementsTemps.length > 0) {
        return sum + t.ajustementsTemps.reduce((s: number, aj: any) => s + aj.heures, 0);
      }
      // Sinon utiliser heuresTotal
      return sum + t.heuresTotal;
    }, 0);
    
    const productiviteMoyenne = heuresTotales > 0 ? Math.round(motsTotaux / heuresTotales) : 0;
    
    // Compteur de tâches par statut
    const tachesTerminees = tachesFiltrees.filter((t: any) => t.statut === 'TERMINEE').length;
    const tachesEnCours = tachesFiltrees.filter((t: any) => t.statut === 'EN_COURS').length;
    const tachesPlanifiees = tachesFiltrees.filter((t: any) => t.statut === 'PLANIFIEE').length;

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
        t.traducteur && t.traducteur.divisions?.some((d: string) => divisionsAutorisees.includes(d))
      );
    } else if (Object.keys(filtreDivision).length > 0 && filtreDivision.divisions) {
      const divCibles = filtreDivision.divisions.hasSome || [];
      if (divCibles.length > 0) {
        tachesPrecedentesFiltrees = tachesPrecedentes.filter((t: any) => 
          t.traducteur && t.traducteur.divisions?.some((d: string) => divCibles.includes(d))
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

    // Récupérer TOUS les traducteurs actifs (même sans tâches) - filtrés par division
    let tousLesTraducteurs = await prisma.traducteur.findMany({
      where: {
        actif: true,
        ...filtreDivision,
      },
      select: {
        id: true,
        nom: true,
        divisions: true,
        classification: true,
        specialisations: true,
        pairesLinguistiques: true,
      },
      orderBy: { nom: 'asc' },
    });
    
    // Filtrer par langues si spécifié
    if (languesSourceFiltre.length > 0 || languesCibleFiltre.length > 0) {
      tousLesTraducteurs = tousLesTraducteurs.filter((t: any) => {
        const paires = t.pairesLinguistiques || [];
        if (paires.length === 0) return false;
        return paires.some((p: any) => {
          const matchSource = languesSourceFiltre.length === 0 || languesSourceFiltre.includes(p.langueSource);
          const matchCible = languesCibleFiltre.length === 0 || languesCibleFiltre.includes(p.langueCible);
          return matchSource && matchCible;
        });
      });
    }

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
        tachesTerminees: 0,
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
        // Utiliser ajustements si disponibles
        if (tacheTyped.ajustementsTemps && tacheTyped.ajustementsTemps.length > 0) {
          stats.heures += tacheTyped.ajustementsTemps.reduce((s: number, aj: any) => s + aj.heures, 0);
        } else {
          stats.heures += (tache as any).heuresTotal;
        }
        stats.taches += 1;
        if (tacheTyped.statut === 'TERMINEE') {
          stats.tachesTerminees += 1;
        }
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
      // Un traducteur peut avoir plusieurs divisions - on comptabilise pour chacune
      const divisions = tacheTyped.traducteur.divisions || [];
      for (const div of divisions) {
        if (!parDivision.has(div)) {
          parDivision.set(div, { mots: 0, heures: 0 });
        }
        const stats = parDivision.get(div)!;
        stats.mots += (tache as any).compteMots || 0;
        stats.heures += (tache as any).heuresTotal;
      }
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
        // Statistiques par statut
        tachesTotal: tachesFiltrees.length,
        tachesTerminees,
        tachesEnCours,
        tachesPlanifiees,
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
