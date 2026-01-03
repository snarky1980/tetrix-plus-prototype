import prisma from '../config/database';
import type { ActionAudit, Prisma } from '@prisma/client';

interface AuditLogData {
  utilisateurId?: string | null;
  action: ActionAudit;
  entite: string;
  entiteId?: string | null;
  details?: Record<string, unknown> | null;
  adresseIp?: string | null;
  userAgent?: string | null;
  succes?: boolean;
}

/**
 * Service d'audit pour tracer les actions critiques
 * Utilisé pour la conformité gouvernementale et les enquêtes
 */
class AuditService {
  /**
   * Enregistrer une action d'audit
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          utilisateurId: data.utilisateurId,
          action: data.action,
          entite: data.entite,
          entiteId: data.entiteId,
          details: data.details as Prisma.InputJsonValue | undefined,
          adresseIp: data.adresseIp,
          userAgent: data.userAgent,
          succes: data.succes ?? true,
        },
      });
    } catch (error) {
      // Ne pas bloquer l'opération principale si l'audit échoue
      console.error('[AuditService] Erreur lors de l\'enregistrement:', error);
    }
  }

  /**
   * Enregistrer une connexion réussie
   */
  async logConnexion(
    utilisateurId: string,
    adresseIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      utilisateurId,
      action: 'CONNEXION',
      entite: 'Utilisateur',
      entiteId: utilisateurId,
      adresseIp,
      userAgent,
      succes: true,
    });
  }

  /**
   * Enregistrer une tentative de connexion échouée
   */
  async logConnexionEchouee(
    email: string,
    adresseIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      utilisateurId: null,
      action: 'CONNEXION_ECHOUEE',
      entite: 'Utilisateur',
      details: { email },
      adresseIp,
      userAgent,
      succes: false,
    });
  }

  /**
   * Enregistrer une déconnexion
   */
  async logDeconnexion(
    utilisateurId: string,
    adresseIp?: string
  ): Promise<void> {
    await this.log({
      utilisateurId,
      action: 'DECONNEXION',
      entite: 'Utilisateur',
      entiteId: utilisateurId,
      adresseIp,
    });
  }

  /**
   * Enregistrer une déconnexion forcée par admin
   */
  async logSessionForcee(
    adminId: string,
    utilisateurCibleId: string,
    sessionId: string
  ): Promise<void> {
    await this.log({
      utilisateurId: adminId,
      action: 'SESSION_FORCEE',
      entite: 'Session',
      entiteId: sessionId,
      details: { utilisateurCibleId },
    });
  }

  /**
   * Enregistrer une action sur une tâche
   */
  async logTache(
    utilisateurId: string,
    action: 'TACHE_CREEE' | 'TACHE_MODIFIEE' | 'TACHE_SUPPRIMEE' | 'STATUT_TACHE_CHANGE' | 'TACHE_ASSIGNEE',
    tacheId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      utilisateurId,
      action,
      entite: 'Tache',
      entiteId: tacheId,
      details,
    });
  }

  /**
   * Enregistrer une action sur un utilisateur
   */
  async logUtilisateur(
    utilisateurId: string,
    action: 'UTILISATEUR_CREE' | 'UTILISATEUR_MODIFIE' | 'UTILISATEUR_SUPPRIME' | 'MOT_DE_PASSE_CHANGE' | 'ROLE_MODIFIE',
    utilisateurCibleId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      utilisateurId,
      action,
      entite: 'Utilisateur',
      entiteId: utilisateurCibleId,
      details,
    });
  }

  /**
   * Enregistrer une action sur un traducteur
   */
  async logTraducteur(
    utilisateurId: string,
    action: 'TRADUCTEUR_CREE' | 'TRADUCTEUR_MODIFIE' | 'TRADUCTEUR_SUPPRIME' | 'CAPACITE_MODIFIEE',
    traducteurId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      utilisateurId,
      action,
      entite: 'Traducteur',
      entiteId: traducteurId,
      details,
    });
  }

  /**
   * Enregistrer une action sur les jours fériés
   */
  async logJourFerie(
    utilisateurId: string,
    action: 'JOUR_FERIE_CREE' | 'JOUR_FERIE_MODIFIE' | 'JOUR_FERIE_SUPPRIME',
    jourFerieId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      utilisateurId,
      action,
      entite: 'JourFerie',
      entiteId: jourFerieId,
      details,
    });
  }

  /**
   * Récupérer les logs d'audit avec filtres
   */
  async getLogs(options: {
    utilisateurId?: string;
    action?: ActionAudit;
    entite?: string;
    dateDebut?: Date;
    dateFin?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    logs: Array<{
      id: string;
      utilisateurId: string | null;
      action: ActionAudit;
      entite: string;
      entiteId: string | null;
      details: unknown;
      adresseIp: string | null;
      succes: boolean;
      creeLe: Date;
      utilisateur: { email: string; nom: string | null; prenom: string | null } | null;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    
    if (options.utilisateurId) {
      where.utilisateurId = options.utilisateurId;
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.entite) {
      where.entite = options.entite;
    }
    if (options.dateDebut || options.dateFin) {
      where.creeLe = {};
      if (options.dateDebut) {
        (where.creeLe as Record<string, Date>).gte = options.dateDebut;
      }
      if (options.dateFin) {
        (where.creeLe as Record<string, Date>).lte = options.dateFin;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              email: true,
              nom: true,
              prenom: true,
            },
          },
        },
        orderBy: { creeLe: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer les statistiques d'audit
   */
  async getStatistiques(jours: number = 30): Promise<{
    totalConnexions: number;
    connexionsEchouees: number;
    actionsParType: Array<{ action: ActionAudit; count: number }>;
    utilisateursActifs: number;
  }> {
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - jours);

    const [connexions, echouees, actionsParType, utilisateursActifs] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: 'CONNEXION',
          creeLe: { gte: dateDebut },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'CONNEXION_ECHOUEE',
          creeLe: { gte: dateDebut },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { creeLe: { gte: dateDebut } },
        _count: { action: true },
      }),
      prisma.auditLog.findMany({
        where: {
          action: 'CONNEXION',
          creeLe: { gte: dateDebut },
        },
        select: { utilisateurId: true },
        distinct: ['utilisateurId'],
      }),
    ]);

    return {
      totalConnexions: connexions,
      connexionsEchouees: echouees,
      actionsParType: actionsParType.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      utilisateursActifs: utilisateursActifs.length,
    };
  }
}

export const auditService = new AuditService();
export default auditService;
