import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role } from '.prisma/client';

interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  isPlayground?: boolean;
}

interface SessionInfo {
  id: string;
  utilisateurId: string;
  adresseIp: string | null;
  userAgent: string | null;
  actif: boolean;
  dernierAcces: Date;
  expireA: Date;
  creeLe: Date;
  utilisateur: {
    email: string;
    nom: string | null;
    prenom: string | null;
    role: Role;
  };
}

/**
 * Service de gestion des sessions utilisateurs
 * Permet le suivi des connexions et la déconnexion forcée
 */
class SessionService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  /**
   * Créer une nouvelle session lors de la connexion
   */
  async creerSession(
    utilisateurId: string,
    token: string,
    adresseIp?: string,
    userAgent?: string
  ): Promise<string> {
    const expireA = new Date();
    expireA.setHours(expireA.getHours() + this.TOKEN_EXPIRY_HOURS);

    const session = await prisma.session.create({
      data: {
        utilisateurId,
        token,
        adresseIp: adresseIp || null,
        userAgent: userAgent || null,
        expireA,
      },
    });

    return session.id;
  }

  /**
   * Mettre à jour le dernier accès d'une session
   */
  async mettreAJourDernierAcces(token: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { token, actif: true },
        data: { dernierAcces: new Date() },
      });
    } catch (error) {
      // Silently fail - ne pas bloquer les requêtes
    }
  }

  /**
   * Invalider une session (déconnexion)
   */
  async invaliderSession(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token },
      data: { actif: false },
    });
  }

  /**
   * Invalider une session par ID (déconnexion forcée par admin)
   */
  async invaliderSessionParId(sessionId: string): Promise<{ utilisateurId: string } | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { utilisateurId: true },
    });

    if (session) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { actif: false },
      });
    }

    return session;
  }

  /**
   * Invalider toutes les sessions d'un utilisateur
   */
  async invaliderToutesSessionsUtilisateur(utilisateurId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { utilisateurId, actif: true },
      data: { actif: false },
    });

    return result.count;
  }

  /**
   * Vérifier si une session est valide
   */
  async verifierSession(token: string): Promise<boolean> {
    const session = await prisma.session.findUnique({
      where: { token },
      select: { actif: true, expireA: true },
    });

    if (!session) return false;
    if (!session.actif) return false;
    if (session.expireA < new Date()) {
      // Session expirée, la désactiver
      await this.invaliderSession(token);
      return false;
    }

    return true;
  }

  /**
   * Récupérer les sessions actives
   */
  async getSessionsActives(options: {
    utilisateurId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    sessions: SessionInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      actif: true,
      expireA: { gt: new Date() },
    };

    if (options.utilisateurId) {
      where.utilisateurId = options.utilisateurId;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              email: true,
              nom: true,
              prenom: true,
              role: true,
            },
          },
        },
        orderBy: { dernierAcces: 'desc' },
        skip,
        take: limit,
      }),
      prisma.session.count({ where }),
    ]);

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer l'historique des sessions (incluant inactives)
   */
  async getHistoriqueSessions(options: {
    utilisateurId?: string;
    actif?: boolean;
    dateDebut?: Date;
    dateFin?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    sessions: SessionInfo[];
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
    if (options.actif !== undefined) {
      where.actif = options.actif;
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

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              email: true,
              nom: true,
              prenom: true,
              role: true,
            },
          },
        },
        orderBy: { creeLe: 'desc' },
        skip,
        take: limit,
      }),
      prisma.session.count({ where }),
    ]);

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Nettoyer les sessions expirées
   */
  async nettoyerSessionsExpirees(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expireA: { lt: new Date() } },
          { actif: false, creeLe: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Sessions inactives > 7 jours
        ],
      },
    });

    return result.count;
  }

  /**
   * Obtenir les statistiques des sessions
   */
  async getStatistiques(): Promise<{
    sessionsActives: number;
    utilisateursConnectes: number;
    sessionsAujourdHui: number;
    sessionsSemaine: number;
  }> {
    const maintenant = new Date();
    const debutJournee = new Date(maintenant.setHours(0, 0, 0, 0));
    const debutSemaine = new Date(maintenant);
    debutSemaine.setDate(debutSemaine.getDate() - 7);

    const [actives, utilisateursConnectes, aujourdHui, semaine] = await Promise.all([
      prisma.session.count({
        where: { actif: true, expireA: { gt: new Date() } },
      }),
      prisma.session.findMany({
        where: { actif: true, expireA: { gt: new Date() } },
        select: { utilisateurId: true },
        distinct: ['utilisateurId'],
      }),
      prisma.session.count({
        where: { creeLe: { gte: debutJournee } },
      }),
      prisma.session.count({
        where: { creeLe: { gte: debutSemaine } },
      }),
    ]);

    return {
      sessionsActives: actives,
      utilisateursConnectes: utilisateursConnectes.length,
      sessionsAujourdHui: aujourdHui,
      sessionsSemaine: semaine,
    };
  }

  /**
   * Décoder un token JWT (sans vérification de session)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }
}

export const sessionService = new SessionService();
export default sessionService;
