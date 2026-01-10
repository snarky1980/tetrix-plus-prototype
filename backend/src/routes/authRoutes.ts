import { Router } from 'express';
import { connexion, inscription, reinitialiserMotDePasse, setupInitial } from '../controllers/authController';
import { valider } from '../middleware/validation';
import { authentifier } from '../middleware/auth';
import { authLimiter, sensibleLimiter } from '../middleware/rateLimit';
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

const reinitialiserMotDePasseSchema = z.object({
  body: z.object({
    nouveauMotDePasse: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  }),
});

/**
 * POST /api/auth/connexion
 * Connexion utilisateur
 * Rate limited: 10 tentatives / 15 min
 */
router.post('/connexion', authLimiter, valider(connexionSchema), connexion);

/**
 * POST /api/auth/inscription
 * Inscription (Admin uniquement en production)
 * Rate limited: 5 tentatives / heure
 */
router.post('/inscription', sensibleLimiter, valider(inscriptionSchema), inscription);

/**
 * PUT /api/auth/reinitialiser-mot-de-passe/:id
 * Réinitialiser le mot de passe d'un utilisateur (Admin uniquement)
 * Rate limited: 5 tentatives / heure
 */
router.put('/reinitialiser-mot-de-passe/:id', sensibleLimiter, authentifier, valider(reinitialiserMotDePasseSchema), reinitialiserMotDePasse);

/**
 * POST /api/auth/setup
 * Setup initial - créer ou réinitialiser le compte conseiller (protégé par secret)
 * Rate limited: 5 tentatives / heure
 */
router.post('/setup', sensibleLimiter, setupInitial);

export default router;
