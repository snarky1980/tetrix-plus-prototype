import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config/env';
import { auditService } from '../services/auditService';
import { sessionService } from '../services/sessionService';

// Helper pour extraire l'IP et le User-Agent
const getClientInfo = (req: Request) => ({
  adresseIp: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});

/**
 * Connexion d'un utilisateur
 * POST /api/auth/connexion
 */
export const connexion = async (req: Request, res: Response): Promise<void> => {
  const { adresseIp, userAgent } = getClientInfo(req);
  
  try {
    const { email, motDePasse } = req.body;

    // Rechercher l'utilisateur
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      include: {
        traducteur: true,
      },
    });

    if (!utilisateur || !utilisateur.actif) {
      // Logger la tentative échouée
      await auditService.logConnexionEchouee(email, adresseIp, userAgent);
      res.status(401).json({ erreur: 'Identifiants invalides' });
      return;
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!motDePasseValide) {
      // Logger la tentative échouée
      await auditService.logConnexionEchouee(email, adresseIp, userAgent);
      res.status(401).json({ erreur: 'Identifiants invalides' });
      return;
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
        isPlayground: utilisateur.isPlayground,
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Créer une session et logger la connexion
    await Promise.all([
      sessionService.creerSession(utilisateur.id, token, adresseIp, userAgent),
      auditService.logConnexion(utilisateur.id, adresseIp, userAgent),
    ]);

    res.json({
      token,
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
        traducteurId: utilisateur.traducteur?.id,
        isPlayground: utilisateur.isPlayground,
      },
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ erreur: 'Erreur lors de la connexion' });
  }
};

/**
 * Inscription d'un nouvel utilisateur (Admin uniquement en production)
 * POST /api/auth/inscription
 */
export const inscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, motDePasse, role } = req.body;

    // Vérifier si l'email existe déjà
    const utilisateurExistant = await prisma.utilisateur.findUnique({
      where: { email },
    });

    if (utilisateurExistant) {
      res.status(400).json({ erreur: 'Cet email est déjà utilisé' });
      return;
    }

    // Hasher le mot de passe
    const motDePasseHash = await bcrypt.hash(motDePasse, 10);

    // Créer l'utilisateur
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email,
        motDePasse: motDePasseHash,
        role: role || 'TRADUCTEUR',
      },
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
      },
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'inscription' });
  }
};

/**
 * Setup initial - Créer un compte conseiller si aucun utilisateur n'existe
 * POST /api/auth/setup
 * Sécurisé: ne fonctionne que si la base est vide ou si un secret est fourni
 */
export const setupInitial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { secret } = req.body;
    const SETUP_SECRET = process.env.SETUP_SECRET || 'tetrix-setup-2024';

    // Vérifier le secret
    if (secret !== SETUP_SECRET) {
      res.status(403).json({ erreur: 'Secret invalide' });
      return;
    }

    // Vérifier si le compte conseiller existe déjà
    const conseillerExistant = await prisma.utilisateur.findUnique({
      where: { email: 'conseiller@tetrix.com' },
    });

    if (conseillerExistant) {
      // Réinitialiser le mot de passe
      const motDePasseHash = await bcrypt.hash('password123', 10);
      await prisma.utilisateur.update({
        where: { email: 'conseiller@tetrix.com' },
        data: { motDePasse: motDePasseHash, actif: true },
      });
      res.json({ message: 'Compte conseiller réinitialisé', email: 'conseiller@tetrix.com', motDePasse: 'password123' });
      return;
    }

    // Créer le compte conseiller
    const motDePasseHash = await bcrypt.hash('password123', 10);
    const conseiller = await prisma.utilisateur.create({
      data: {
        email: 'conseiller@tetrix.com',
        motDePasse: motDePasseHash,
        role: 'CONSEILLER',
        actif: true,
      },
    });

    res.status(201).json({
      message: 'Compte conseiller créé',
      email: conseiller.email,
      motDePasse: 'password123',
    });
  } catch (error) {
    console.error('Erreur setup:', error);
    res.status(500).json({ erreur: 'Erreur lors du setup' });
  }
};

/**
 * Réinitialiser le mot de passe d'un utilisateur
 * PUT /api/auth/reinitialiser-mot-de-passe/:id
 */
export const reinitialiserMotDePasse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nouveauMotDePasse } = req.body;

    if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
      res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    // Vérifier que l'utilisateur existe
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
    });

    if (!utilisateur) {
      res.status(404).json({ erreur: 'Utilisateur non trouvé' });
      return;
    }

    // Hasher le nouveau mot de passe
    const motDePasseHash = await bcrypt.hash(nouveauMotDePasse, 10);

    // Mettre à jour le mot de passe
    await prisma.utilisateur.update({
      where: { id },
      data: { motDePasse: motDePasseHash },
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ erreur: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};
