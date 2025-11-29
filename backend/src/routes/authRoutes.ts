import { Router } from 'express';
import { connexion, inscription } from '../controllers/authController';
import { valider } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Schémas de validation
const connexionSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    motDePasse: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  }),
});

const inscriptionSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    motDePasse: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    role: z.enum(['ADMIN', 'CONSEILLER', 'TRADUCTEUR']).optional(),
  }),
});

/**
 * POST /api/auth/connexion
 * Connexion utilisateur
 */
router.post('/connexion', valider(connexionSchema), connexion);

/**
 * POST /api/auth/inscription
 * Inscription (Admin uniquement en production)
 */
router.post('/inscription', valider(inscriptionSchema), inscription);

export default router;
