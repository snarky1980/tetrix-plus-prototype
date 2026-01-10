/**
 * Service de gestion automatique des statuts de tâches
 * 
 * Flux des statuts:
 * PLANIFIEE → EN_COURS (auto @ heure début)
 * EN_COURS → EN_RETARD (auto si non terminée 30min après deadline)
 * EN_COURS/EN_RETARD → TERMINEE (manuel par traducteur)
 * 
 * Notifications:
 * - Traducteur: quand tâche passe EN_COURS, rappels si EN_RETARD
 * - Conseiller: quand tâche passe EN_RETARD (livraison potentiellement en retard)
 * - Gestionnaire: escalade si EN_RETARD > 2h
 */

import { PrismaClient, StatutTache, TypeNotification } from '@prisma/client';

const prisma = new PrismaClient();

// Délais en millisecondes
const DELAI_RETARD_MS = 30 * 60 * 1000; // 30 minutes
const DELAI_ESCALADE_MS = 2 * 60 * 60 * 1000; // 2 heures
const DELAI_RAPPEL_MS = 30 * 60 * 1000; // Rappel toutes les 30 min

/**
 * Parse un horaire type "9h-17h" ou "9h30-17h30" et retourne les heures
 */
function parseHoraire(horaire: string | null): { debut: number; fin: number } {
  if (!horaire) {
    return { debut: 9, fin: 17 }; // Défaut: 9h-17h
  }
  
  const match = horaire.match(/(\d+)h?(\d*)?\s*-\s*(\d+)h?(\d*)?/);
  if (!match) {
    return { debut: 9, fin: 17 };
  }
  
  const debutH = parseInt(match[1]);
  const debutM = match[2] ? parseInt(match[2]) : 0;
  const finH = parseInt(match[3]);
  const finM = match[4] ? parseInt(match[4]) : 0;
  
  return {
    debut: debutH + debutM / 60,
    fin: finH + finM / 60
  };
}

/**
 * Type pour les tâches avec leurs relations chargées
 */
interface TacheAvecRelations {
  id: string;
  traducteur: { horaire: string | null };
  ajustementsTemps: Array<{ date: Date; heureDebut: string | null }>;
}

/**
 * Calcule l'heure de début d'une tâche basée sur:
 * 1. Le premier ajustement avec heureDebut défini
 * 2. Sinon, l'horaire du traducteur
 * 
 * OPTIMISÉ: Utilise les données déjà chargées au lieu de refaire une requête DB
 */
function calculerHeureDebutTacheFromData(tache: TacheAvecRelations): Date | null {
  const premierAjustement = tache.ajustementsTemps[0];
  if (!premierAjustement) return null;
  
  const dateDebut = new Date(premierAjustement.date);
  
  // Si heureDebut est défini sur l'ajustement, l'utiliser
  if (premierAjustement.heureDebut) {
    const match = premierAjustement.heureDebut.match(/(\d+)h?(\d*)?/);
    if (match) {
      dateDebut.setHours(parseInt(match[1]), match[2] ? parseInt(match[2]) : 0, 0, 0);
      return dateDebut;
    }
  }
  
  // Sinon utiliser l'horaire du traducteur
  const { debut } = parseHoraire(tache.traducteur.horaire);
  dateDebut.setHours(Math.floor(debut), (debut % 1) * 60, 0, 0);
  
  return dateDebut;
}

/**
 * Version async pour compatibilité (charge les données si nécessaire)
 * @deprecated Préférer calculerHeureDebutTacheFromData avec données pré-chargées
 */
async function calculerHeureDebutTache(tacheId: string): Promise<Date | null> {
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    include: {
      traducteur: { select: { horaire: true } },
      ajustementsTemps: {
        where: { type: 'TACHE' },
        orderBy: { date: 'asc' },
        take: 1
      }
    }
  });
  
  if (!tache) return null;
  return calculerHeureDebutTacheFromData(tache);
}

/**
 * Crée une notification
 */
async function creerNotification(
  type: TypeNotification,
  destinataireId: string,
  titre: string,
  message: string,
  tacheId?: string,
  donnees?: Record<string, any>
): Promise<void> {
  await prisma.notification.create({
    data: {
      type,
      destinataireId,
      titre,
      message,
      tacheId,
      donnees: donnees ? JSON.stringify(donnees) : null
    }
  });
}

/**
 * Trouve le conseiller à notifier pour une tâche
 * (celui qui a créé la tâche)
 */
async function trouverConseillerPourTache(tacheId: string): Promise<string | null> {
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    select: { creePar: true }
  });
  return tache?.creePar || null;
}

/**
 * Trouve le(s) gestionnaire(s) de la division du traducteur
 */
async function trouverGestionnairesPourTache(tacheId: string): Promise<string[]> {
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    include: {
      traducteur: { select: { divisions: true } }
    }
  });
  
  if (!tache || !tache.traducteur.divisions.length) return [];
  
  // Trouver les gestionnaires ayant accès à ces divisions
  const gestionnaires = await prisma.utilisateur.findMany({
    where: {
      role: 'GESTIONNAIRE',
      actif: true,
      divisionAccess: {
        some: {
          division: {
            nom: { in: tache.traducteur.divisions }
          }
        }
      }
    },
    select: { id: true }
  });
  
  return gestionnaires.map(g => g.id);
}

/**
 * Traite les tâches PLANIFIEE qui devraient passer EN_COURS
 */
export async function traiterTachesPlanifiees(): Promise<{ traitees: number; erreurs: string[] }> {
  const maintenant = new Date();
  const erreurs: string[] = [];
  let traitees = 0;
  
  // Trouver toutes les tâches planifiées
  const tachesPlanifiees = await prisma.tache.findMany({
    where: { statut: 'PLANIFIEE' },
    include: {
      traducteur: { 
        select: { 
          id: true, 
          nom: true, 
          horaire: true,
          utilisateurId: true 
        } 
      },
      ajustementsTemps: {
        where: { type: 'TACHE' },
        orderBy: { date: 'asc' }
      }
    }
  });
  
  for (const tache of tachesPlanifiees) {
    try {
      // OPTIMISÉ: Utiliser les données déjà chargées au lieu de refaire une requête
      const heureDebut = calculerHeureDebutTacheFromData(tache);
      
      if (heureDebut && maintenant >= heureDebut) {
        // Passer la tâche EN_COURS
        await prisma.tache.update({
          where: { id: tache.id },
          data: {
            statut: 'EN_COURS',
            dateDebutEffective: maintenant
          }
        });
        
        // Enregistrer dans l'historique
        await prisma.historiqueTache.create({
          data: {
            tacheId: tache.id,
            action: 'STATUT_CHANGE',
            champModifie: 'statut',
            ancienneValeur: 'PLANIFIEE',
            nouvelleValeur: 'EN_COURS',
            utilisateurId: 'SYSTEME',
            utilisateur: 'Système automatique',
            details: JSON.stringify({ raison: 'Heure de début atteinte' })
          }
        });
        
        // Notifier le traducteur
        await creerNotification(
          'TACHE_EN_COURS',
          tache.traducteur.utilisateurId,
          'Tâche démarrée',
          `La tâche "${tache.numeroProjet}" est maintenant en cours. Deadline: ${tache.dateEcheance.toLocaleString('fr-CA')}`,
          tache.id
        );
        
        traitees++;
        console.log(`[STATUT] Tâche ${tache.numeroProjet} → EN_COURS`);
      }
    } catch (error) {
      erreurs.push(`Erreur tâche ${tache.id}: ${error}`);
    }
  }
  
  return { traitees, erreurs };
}

/**
 * Traite les tâches EN_COURS qui devraient passer EN_RETARD
 */
export async function traiterTachesEnRetard(): Promise<{ traitees: number; erreurs: string[] }> {
  const maintenant = new Date();
  const erreurs: string[] = [];
  let traitees = 0;
  
  // Trouver les tâches EN_COURS dont la deadline + 30min est dépassée
  const tachesEnCours = await prisma.tache.findMany({
    where: {
      statut: 'EN_COURS',
      dateEcheance: {
        lt: new Date(maintenant.getTime() - DELAI_RETARD_MS)
      }
    },
    include: {
      traducteur: { 
        select: { 
          id: true, 
          nom: true,
          utilisateurId: true,
          divisions: true
        } 
      }
    }
  });
  
  for (const tache of tachesEnCours) {
    try {
      // Passer la tâche EN_RETARD
      await prisma.tache.update({
        where: { id: tache.id },
        data: {
          statut: 'EN_RETARD'
        }
      });
      
      // Enregistrer dans l'historique
      await prisma.historiqueTache.create({
        data: {
          tacheId: tache.id,
          action: 'STATUT_CHANGE',
          champModifie: 'statut',
          ancienneValeur: 'EN_COURS',
          nouvelleValeur: 'EN_RETARD',
          utilisateurId: 'SYSTEME',
          utilisateur: 'Système automatique',
          details: JSON.stringify({ raison: 'Délai dépassé de 30 minutes' })
        }
      });
      
      // Notifier le traducteur
      await creerNotification(
        'TACHE_EN_RETARD',
        tache.traducteur.utilisateurId,
        '⚠️ Tâche en retard',
        `La tâche "${tache.numeroProjet}" n'a pas été terminée à temps. Veuillez la compléter et la fermer dès que possible.`,
        tache.id
      );
      
      // Notifier le conseiller
      const conseillerId = await trouverConseillerPourTache(tache.id);
      if (conseillerId) {
        await creerNotification(
          'TACHE_EN_RETARD',
          conseillerId,
          '⚠️ Livraison potentiellement en retard',
          `La tâche "${tache.numeroProjet}" assignée à ${tache.traducteur.nom} n'a pas été terminée à temps.`,
          tache.id,
          { traducteurId: tache.traducteur.id, traducteurNom: tache.traducteur.nom }
        );
      }
      
      traitees++;
      console.log(`[STATUT] Tâche ${tache.numeroProjet} → EN_RETARD`);
    } catch (error) {
      erreurs.push(`Erreur tâche ${tache.id}: ${error}`);
    }
  }
  
  return { traitees, erreurs };
}

/**
 * Envoie des rappels pour les tâches EN_RETARD non fermées
 * et escalade aux gestionnaires si > 2h
 */
export async function envoyerRappelsEtEscalades(): Promise<{ rappels: number; escalades: number }> {
  const maintenant = new Date();
  let rappels = 0;
  let escalades = 0;
  
  const tachesEnRetard = await prisma.tache.findMany({
    where: { statut: 'EN_RETARD' },
    include: {
      traducteur: { 
        select: { 
          id: true, 
          nom: true,
          utilisateurId: true,
          divisions: true
        } 
      }
    }
  });
  
  for (const tache of tachesEnRetard) {
    const tempsRetard = maintenant.getTime() - tache.dateEcheance.getTime();
    
    // Vérifier si un rappel a été envoyé récemment
    const dernierRappel = await prisma.notification.findFirst({
      where: {
        tacheId: tache.id,
        type: 'RAPPEL_FERMETURE',
        destinataireId: tache.traducteur.utilisateurId
      },
      orderBy: { creeLe: 'desc' }
    });
    
    const dernierRappelTime = dernierRappel?.creeLe.getTime() || 0;
    
    // Envoyer un rappel toutes les 30 minutes
    if (maintenant.getTime() - dernierRappelTime > DELAI_RAPPEL_MS) {
      await creerNotification(
        'RAPPEL_FERMETURE',
        tache.traducteur.utilisateurId,
        '🔔 Rappel: Fermez votre tâche',
        `La tâche "${tache.numeroProjet}" est toujours en retard. Veuillez la terminer pour libérer votre temps.`,
        tache.id
      );
      rappels++;
    }
    
    // Escalade aux gestionnaires si > 2h de retard
    if (tempsRetard > DELAI_ESCALADE_MS) {
      const dernierEscalade = await prisma.notification.findFirst({
        where: {
          tacheId: tache.id,
          type: 'ESCALADE_GESTIONNAIRE'
        },
        orderBy: { creeLe: 'desc' }
      });
      
      // Une seule escalade par tâche (ou toutes les 2h si on veut répéter)
      if (!dernierEscalade) {
        const gestionnaires = await trouverGestionnairesPourTache(tache.id);
        
        for (const gestionnaireId of gestionnaires) {
          await creerNotification(
            'ESCALADE_GESTIONNAIRE',
            gestionnaireId,
            '🚨 Escalade: Tâche en retard > 2h',
            `La tâche "${tache.numeroProjet}" de ${tache.traducteur.nom} est en retard depuis plus de 2 heures.`,
            tache.id,
            { traducteurId: tache.traducteur.id, traducteurNom: tache.traducteur.nom }
          );
        }
        
        // Aussi notifier le conseiller de l'escalade
        const conseillerId = await trouverConseillerPourTache(tache.id);
        if (conseillerId) {
          await creerNotification(
            'ESCALADE_GESTIONNAIRE',
            conseillerId,
            '🚨 Escalade: Tâche en retard > 2h',
            `La tâche "${tache.numeroProjet}" de ${tache.traducteur.nom} a été escaladée (retard > 2h).`,
            tache.id
          );
        }
        
        escalades++;
      }
    }
  }
  
  return { rappels, escalades };
}

/**
 * Terminer une tâche manuellement (par le traducteur)
 */
export async function terminerTache(
  tacheId: string, 
  utilisateurId: string,
  utilisateurNom: string,
  commentaire?: string
): Promise<{ success: boolean; message: string }> {
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    include: {
      traducteur: { select: { utilisateurId: true, nom: true } }
    }
  });
  
  if (!tache) {
    return { success: false, message: 'Tâche non trouvée' };
  }
  
  // Vérifier que c'est bien le traducteur assigné (ou un admin/conseiller)
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: { role: true }
  });
  
  const estTraducteurAssigne = tache.traducteur.utilisateurId === utilisateurId;
  const estSuperviseur = utilisateur?.role === 'ADMIN' || utilisateur?.role === 'CONSEILLER' || utilisateur?.role === 'GESTIONNAIRE';
  
  if (!estTraducteurAssigne && !estSuperviseur) {
    return { success: false, message: 'Non autorisé à terminer cette tâche' };
  }
  
  if (tache.statut === 'TERMINEE') {
    return { success: false, message: 'Tâche déjà terminée' };
  }
  
  if (tache.statut === 'PLANIFIEE') {
    return { success: false, message: 'Impossible de terminer une tâche non démarrée' };
  }
  
  const ancienStatut = tache.statut;
  const maintenant = new Date();
  
  // Mettre à jour la tâche
  await prisma.tache.update({
    where: { id: tacheId },
    data: {
      statut: 'TERMINEE',
      dateFinEffective: maintenant,
      commentaireCloture: commentaire || null,
      modifiePar: utilisateurId
    }
  });
  
  // Enregistrer dans l'historique
  await prisma.historiqueTache.create({
    data: {
      tacheId,
      action: 'STATUT_CHANGE',
      champModifie: 'statut',
      ancienneValeur: ancienStatut,
      nouvelleValeur: 'TERMINEE',
      utilisateurId,
      utilisateur: utilisateurNom,
      details: JSON.stringify({ 
        commentaire: commentaire || null,
        enRetard: ancienStatut === 'EN_RETARD',
        terminePar: estTraducteurAssigne ? 'traducteur' : 'superviseur'
      })
    }
  });
  
  // Notifier le traducteur (confirmation)
  await creerNotification(
    'TACHE_TERMINEE',
    tache.traducteur.utilisateurId,
    '✅ Tâche terminée',
    `La tâche "${tache.numeroProjet}" a été marquée comme terminée.`,
    tacheId
  );
  
  // Si terminée en retard, notifier le conseiller
  if (ancienStatut === 'EN_RETARD') {
    const conseillerId = await trouverConseillerPourTache(tacheId);
    if (conseillerId) {
      await creerNotification(
        'TACHE_TERMINEE',
        conseillerId,
        '✅ Tâche en retard terminée',
        `La tâche "${tache.numeroProjet}" de ${tache.traducteur.nom} a été terminée (était en retard).`,
        tacheId,
        { enRetard: true, commentaire }
      );
    }
  }
  
  return { success: true, message: 'Tâche terminée avec succès' };
}

/**
 * Exécute toutes les vérifications de statut (appelé par le CRON)
 */
export async function executerVerificationsStatuts(): Promise<{
  planifiees: { traitees: number; erreurs: string[] };
  enRetard: { traitees: number; erreurs: string[] };
  rappels: { rappels: number; escalades: number };
}> {
  console.log(`[CRON] Vérification des statuts de tâches - ${new Date().toISOString()}`);
  
  const planifiees = await traiterTachesPlanifiees();
  const enRetard = await traiterTachesEnRetard();
  const rappels = await envoyerRappelsEtEscalades();
  
  console.log(`[CRON] Résultat: ${planifiees.traitees} → EN_COURS, ${enRetard.traitees} → EN_RETARD, ${rappels.rappels} rappels, ${rappels.escalades} escalades`);
  
  return { planifiees, enRetard, rappels };
}

export default {
  traiterTachesPlanifiees,
  traiterTachesEnRetard,
  envoyerRappelsEtEscalades,
  terminerTache,
  executerVerificationsStatuts
};
