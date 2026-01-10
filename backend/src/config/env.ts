import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Schéma de validation des variables d'environnement
const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL doit être définie'),
  JWT_SECRET: z.string().min(1).default('changez-moi-en-production'),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().optional(),
});

// Validation au démarrage - crash immédiat si config invalide
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Configuration invalide:');
  parseResult.error.issues.forEach(issue => {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

const env = parseResult.data;

// Validation supplémentaire en production
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'changez-moi-en-production') {
  console.error('❌ JWT_SECRET doit être changé en production');
  process.exit(1);
}

// Construction des origines CORS
const corsOrigins = (() => {
  const origins = env.CORS_ORIGIN 
    ? env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [env.FRONTEND_URL];
  // Toujours inclure localhost en développement
  if (env.NODE_ENV !== 'production') {
    if (!origins.includes('http://localhost:5173')) {
      origins.push('http://localhost:5173');
    }
  }
  return origins;
})();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  databaseUrl: env.DATABASE_URL,
  frontendUrl: env.FRONTEND_URL,
  corsOrigins,
};
