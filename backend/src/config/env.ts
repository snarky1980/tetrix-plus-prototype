import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'changez-moi-en-production',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Support multiple CORS origins (comma-separated)
  // En développement, inclure localhost automatiquement
  corsOrigins: (() => {
    const origins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [process.env.FRONTEND_URL || 'http://localhost:5173'];
    // Toujours inclure localhost en développement
    if (process.env.NODE_ENV !== 'production') {
      if (!origins.includes('http://localhost:5173')) {
        origins.push('http://localhost:5173');
      }
    }
    return origins;
  })(),
};

// Validation des variables d'environnement critiques
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL doit être définie dans .env');
}

if (config.nodeEnv === 'production' && config.jwtSecret === 'changez-moi-en-production') {
  throw new Error('JWT_SECRET doit être changé en production');
}
