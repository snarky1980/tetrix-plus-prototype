import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';
import { config } from './config/env';
import { gestionnaireErreurs } from './middleware/errorHandler';

// Import des routes
import authRoutes from './routes/authRoutes';
import traducteurRoutes from './routes/traducteurRoutes';
import clientRoutes from './routes/clientRoutes';
import sousDomaineRoutes from './routes/sousDomaineRoutes';
import tacheRoutes from './routes/tacheRoutes';
import planificationRoutes from './routes/planificationRoutes';
import repartitionRoutes from './routes/repartitionRoutes';
import importRoutes from './routes/importRoutes';
import optimisationRoutes from './routes/optimisationRoutes';

const app = express();
const prisma = new PrismaClient();

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log des requêtes en développement
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint d'initialisation (pour seeder la base en production)
app.post('/api/init', async (req, res) => {
  try {
    console.log('🌱 Initialisation de la base de données...');

    // Admin user
    const adminEmail = 'admin@tetrix.com';
    let admin = await prisma.utilisateur.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const hash = await bcrypt.hash('password123', 10);
      admin = await prisma.utilisateur.create({
        data: { email: adminEmail, motDePasse: hash, role: Role.ADMIN, actif: true },
      });
      console.log('✓ Admin créé');
    } else {
      console.log('↻ Admin déjà présent');
    }

    // Conseiller
    const conseillerEmail = 'conseiller@tetrix.com';
    let conseiller = await prisma.utilisateur.findUnique({ where: { email: conseillerEmail } });
    if (!conseiller) {
      const hash = await bcrypt.hash('password123', 10);
      conseiller = await prisma.utilisateur.create({
        data: { email: conseillerEmail, motDePasse: hash, role: Role.CONSEILLER, actif: true },
      });
      console.log('✓ Conseiller créé');
    }

    // Traducteur
    const tradEmail = 'traducteur@tetrix.com';
    let tradUser = await prisma.utilisateur.findUnique({ where: { email: tradEmail } });
    if (!tradUser) {
      const hash = await bcrypt.hash('password123', 10);
      tradUser = await prisma.utilisateur.create({
        data: { email: tradEmail, motDePasse: hash, role: Role.TRADUCTEUR, actif: true },
      });
      console.log('✓ Traducteur créé');
    }

    res.json({ 
      success: true, 
      message: 'Base de données initialisée',
      users: {
        admin: adminEmail,
        conseiller: conseillerEmail,
        traducteur: tradEmail,
        password: 'password123'
      }
    });
  } catch (error: any) {
    console.error('Erreur init:', error);
    res.status(500).json({ erreur: error.message });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/traducteurs', traducteurRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sous-domaines', sousDomaineRoutes);
app.use('/api/taches', tacheRoutes);
app.use('/api', planificationRoutes); // Routes planification (plusieurs endpoints)
app.use('/api/repartition', repartitionRoutes);
app.use('/api/import', importRoutes);
app.use('/api/optimisation', optimisationRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({ erreur: 'Route non trouvée' });
});

// ============================================
// GESTIONNAIRE D'ERREURS
// ============================================

app.use(gestionnaireErreurs);

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║       🚀 Tetrix PLUS Backend API          ║
╚════════════════════════════════════════════╝

✓ Serveur démarré sur le port ${PORT}
✓ Environnement: ${config.nodeEnv}
✓ Frontend URL: ${config.frontendUrl}

📝 Documentation API disponible
🔐 Authentification JWT activée
  `);
});

export default app;
