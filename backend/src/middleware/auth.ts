import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role } from '@prisma/client';
import { playgroundGuard } from './playgroundGuard';

// Extension du type Request pour inclure l'utilisateur authentifié
export interface AuthRequest extends Request {
  utilisateur?: {
    id: string;
    email: string;
    role: Role;
    isPlayground?: boolean;
  };
}

/**
 * Middleware d'authentification JWT
 * Vérifie le token et ajoute les infos utilisateur à la requête
 */
export const authentifier = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ erreur: 'Token d\'authentification manquant' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: Role;
      isPlayground?: boolean;
    };

    req.utilisateur = decoded;
    
    // Appliquer le guard playground pour les comptes démo
    playgroundGuard(req, res, next);
  } catch (error) {
    res.status(401).json({ erreur: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware pour vérifier les rôles autorisés
 * @param rolesAutorises - Liste des rôles qui peuvent accéder à la route
 */
export const verifierRole = (...rolesAutorises: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.utilisateur) {
      res.status(401).json({ erreur: 'Non authentifié' });
      return;
    }

    // Les comptes Playground ont accès à TOUTES les routes (sandbox mode)
    if (req.utilisateur.isPlayground) {
      next();
      return;
    }

    if (!rolesAutorises.includes(req.utilisateur.role)) {
      res.status(403).json({ 
        erreur: 'Accès refusé : permissions insuffisantes' 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware pour vérifier qu'un traducteur accède uniquement à ses propres données
 */
export const verifierAccesTraducteur = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const { role, isPlayground } = req.utilisateur!;
  const traducteurId = req.params.traducteurId || req.body.traducteurId;

  // Les comptes Playground ont accès à tous les traducteurs (sandbox mode)
  if (isPlayground) {
    next();
    return;
  }

  // Admin et Conseiller peuvent accéder à tous les traducteurs
  if (role === 'ADMIN' || role === 'CONSEILLER') {
    next();
    return;
  }

  // Traducteur ne peut accéder qu'à ses propres données
  // La vérification complète sera faite dans le contrôleur avec la DB
  if (role === 'TRADUCTEUR') {
    req.body._verifierAccesTraducteur = true;
  }

  next();
};

/**
 * Middleware pour vérifier l'accès à une division
 * @param typeAcces - Type d'accès requis ('lire', 'ecrire', 'gerer')
 */
export const verifierAccesDivision = (
  typeAcces: 'lire' | 'ecrire' | 'gerer' = 'lire'
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.utilisateur) {
        res.status(401).json({ erreur: 'Non authentifié' });
        return;
      }

      const { role, id: utilisateurId, isPlayground } = req.utilisateur;

      // Les comptes Playground ont accès à toutes les divisions (sandbox mode)
      if (isPlayground) {
        next();
        return;
      }

      // Les admins ont accès à tout
      if (role === 'ADMIN') {
        next();
        return;
      }

      // Récupérer l'ID de la division depuis les params ou le body
      const divisionId = req.params.divisionId || req.body.divisionId;

      if (!divisionId) {
        res.status(400).json({ erreur: 'ID de division requis' });
        return;
      }

      // Vérifier l'accès dans la base de données
      const { UtilisateurService } = await import('../services/utilisateurService');
      const aAcces = await UtilisateurService.verifierAccesDivision(
        utilisateurId,
        divisionId,
        typeAcces
      );

      if (!aAcces) {
        res.status(403).json({ 
          erreur: `Accès refusé : vous n'avez pas les permissions nécessaires pour ${typeAcces} cette division` 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Erreur verifierAccesDivision:', error);
      res.status(500).json({ erreur: 'Erreur lors de la vérification des accès' });
    }
  };
};
