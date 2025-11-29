import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role } from '@prisma/client';

// Extension du type Request pour inclure l'utilisateur authentifié
export interface AuthRequest extends Request {
  utilisateur?: {
    id: string;
    email: string;
    role: Role;
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
    };

    req.utilisateur = decoded;
    next();
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
  const { role } = req.utilisateur!;
  const traducteurId = req.params.traducteurId || req.body.traducteurId;

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
