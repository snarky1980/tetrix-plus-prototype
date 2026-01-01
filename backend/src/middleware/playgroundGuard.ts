/**
 * Middleware Playground Guard
 * 
 * Intercepte les requêtes d'écriture (POST, PUT, PATCH, DELETE) pour les comptes
 * playground et simule une réponse de succès sans persister les données.
 * 
 * Permet aux utilisateurs de tester l'application sans modifier la base de données.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Routes exemptées du guard (lecture seule ou nécessaires pour la navigation)
const EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/refresh',
];

// Routes partiellement exemptées (GET autorisé, mais écriture bloquée)
const READ_ONLY_ROUTES = [
  '/api/traducteurs',
  '/api/taches',
  '/api/planification',
  '/api/divisions',
  '/api/utilisateurs',
  '/api/clients',
  '/api/domaines',
  '/api/paires-linguistiques',
  '/api/notifications',
];

/**
 * Vérifie si la route est exemptée du guard
 */
function isExemptRoute(path: string): boolean {
  return EXEMPT_ROUTES.some(route => path.startsWith(route));
}

/**
 * Génère une réponse simulée selon le type d'opération
 */
function generateMockResponse(method: string, path: string, body: unknown): unknown {
  const timestamp = new Date().toISOString();
  
  // Pour les créations (POST), retourner un objet avec un faux ID
  if (method === 'POST') {
    return {
      ...(typeof body === 'object' && body !== null ? body : {}),
      id: `playground-mock-${Date.now()}`,
      creeLe: timestamp,
      modifieLe: timestamp,
      _playground: true,
      _message: 'Mode démo : cette modification n\'a pas été enregistrée',
    };
  }
  
  // Pour les mises à jour (PUT, PATCH), retourner le body avec timestamp mis à jour
  if (method === 'PUT' || method === 'PATCH') {
    return {
      ...(typeof body === 'object' && body !== null ? body : {}),
      modifieLe: timestamp,
      _playground: true,
      _message: 'Mode démo : cette modification n\'a pas été enregistrée',
    };
  }
  
  // Pour les suppressions (DELETE), retourner un message de succès
  if (method === 'DELETE') {
    return {
      success: true,
      _playground: true,
      _message: 'Mode démo : cette suppression n\'a pas été effectuée',
    };
  }
  
  return { _playground: true };
}

/**
 * Middleware qui intercepte les requêtes d'écriture pour les comptes playground
 */
export function playgroundGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  // Laisser passer si pas d'utilisateur ou si pas un compte playground
  if (!req.utilisateur?.isPlayground) {
    return next();
  }
  
  // Laisser passer les routes exemptées
  if (isExemptRoute(req.path)) {
    return next();
  }
  
  // Laisser passer les requêtes GET (lecture)
  if (req.method === 'GET') {
    return next();
  }
  
  // Intercepter les requêtes d'écriture (POST, PUT, PATCH, DELETE)
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (writeMethods.includes(req.method)) {
    console.log(`🎮 [Playground] Requête ${req.method} interceptée: ${req.path}`);
    console.log(`   Utilisateur: ${req.utilisateur.email}`);
    
    // Générer une réponse simulée
    const mockResponse = generateMockResponse(req.method, req.path, req.body);
    
    // Ajouter un header pour indiquer le mode playground
    res.setHeader('X-Playground-Mode', 'true');
    
    // Retourner une réponse de succès simulée
    const statusCode = req.method === 'POST' ? 201 : 200;
    res.status(statusCode).json(mockResponse);
    return;
  }
  
  // Par défaut, laisser passer
  next();
}

/**
 * Middleware pour ajouter l'info playground dans les headers de réponse
 */
export function playgroundHeader(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.utilisateur?.isPlayground) {
    res.setHeader('X-Playground-Mode', 'true');
  }
  next();
}
