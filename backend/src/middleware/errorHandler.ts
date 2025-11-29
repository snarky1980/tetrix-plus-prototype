import { Request, Response, NextFunction } from 'express';

/**
 * Gestionnaire d'erreurs global
 * Capture toutes les erreurs non gérées
 */
export const gestionnaireErreurs = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Erreur:', err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    erreur: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
