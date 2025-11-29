import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'changez-moi-en-production',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validation des variables d'environnement critiques
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL doit être définie dans .env');
}

if (config.nodeEnv === 'production' && config.jwtSecret === 'changez-moi-en-production') {
  throw new Error('JWT_SECRET doit être changé en production');
}
