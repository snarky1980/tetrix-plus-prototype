import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware de validation avec Zod
 * @param schema - Schéma Zod pour valider body, query ou params
 */
export const valider = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const erreurs = error.errors.map(err => ({
          champ: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          erreur: 'Données invalides',
          details: erreurs,
        });
      } else {
        res.status(500).json({ erreur: 'Erreur de validation' });
      }
    }
  };
};
