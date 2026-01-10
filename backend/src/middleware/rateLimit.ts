import rateLimit from 'express-rate-limit';

/**
 * Rate limiter pour les endpoints d'authentification
 * Protection contre brute-force et credential stuffing
 * 
 * Configuration: 10 tentatives max par IP sur 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max par fenêtre
  message: {
    erreur: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Compter toutes les requêtes
  keyGenerator: (req) => {
    // Utiliser X-Forwarded-For pour les proxies (Render, etc.)
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.ip 
      || 'unknown';
  },
});

/**
 * Rate limiter général pour les API
 * Protection contre les abus et DoS
 * 
 * Configuration: 100 requêtes par minute par IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requêtes max par minute
  message: {
    erreur: 'Trop de requêtes. Veuillez ralentir.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.ip 
      || 'unknown';
  },
});

/**
 * Rate limiter strict pour les opérations sensibles
 * (réinitialisation mot de passe, inscription, etc.)
 * 
 * Configuration: 5 tentatives par heure par IP
 */
export const sensibleLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 tentatives max par heure
  message: {
    erreur: 'Trop de tentatives. Veuillez réessayer dans une heure.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.ip 
      || 'unknown';
  },
});
