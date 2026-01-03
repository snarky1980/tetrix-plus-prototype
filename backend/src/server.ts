import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import cron from 'node-cron';
import { PrismaClient, Role } from '@prisma/client';
import { config } from './config/env';
import { gestionnaireErreurs } from './middleware/errorHandler';
import { executerVerificationsStatuts } from './services/tacheStatutService';

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
import utilisateurRoutes from './routes/utilisateurRoutes';
import divisionRoutes from './routes/divisionRoutes';
import statistiquesRoutes from './routes/statistiquesRoutes';
import divisionAccessRoutes from './routes/divisionAccessRoutes';
import conflictRoutes from './routes/conflicts.routes';
import liaisonsRoutes from './routes/liaisons.routes';
import joursFeriesRoutes from './routes/jours-feries.routes';
import adminJoursFeriesRoutes from './routes/adminJoursFeriesRoutes';
import domaineRoutes from './routes/domaineRoutes';
import notificationRoutes from './routes/notificationRoutes';
import referentielRoutes from './routes/referentielRoutes';
import equipeProjetRoutes from './routes/equipeProjetRoutes';
import sessionsAuditRoutes from './routes/sessionsAuditRoutes';

const app = express();
const prisma = new PrismaClient();

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// CORS - Support multiple origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${config.corsOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/statistiques', statistiquesRoutes);
app.use('/api/division-access', divisionAccessRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/liaisons', liaisonsRoutes);
app.use('/api/jours-feries', joursFeriesRoutes);
app.use('/api/admin/jours-feries', adminJoursFeriesRoutes);
app.use('/api/domaines', domaineRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referentiel', referentielRoutes);
app.use('/api/equipes-projet', equipeProjetRoutes);
app.use('/api/admin', sessionsAuditRoutes);

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
const HOST = '0.0.0.0'; // Bind to all interfaces for dev container

app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════╗
║       🚀 Tetrix PLUS Backend API          ║
╚════════════════════════════════════════════╝

✓ Serveur démarré sur le port ${PORT}
✓ Host: ${HOST}
✓ Environnement: ${config.nodeEnv}
✓ Frontend URL: ${config.frontendUrl}

📝 Documentation API disponible
🔐 Authentification JWT activée
  `);

  // ============================================
  // JOBS CRON
  // ============================================
  
  // Vérification des statuts de tâches toutes les 20 minutes
  cron.schedule('*/20 * * * *', async () => {
    console.log(`\n[CRON] ⏰ Démarrage vérification des statuts - ${new Date().toLocaleString('fr-CA')}`);
    try {
      const result = await executerVerificationsStatuts();
      console.log(`[CRON] ✅ Terminé:`, result);
    } catch (error) {
      console.error('[CRON] ❌ Erreur:', error);
    }
  });
  
  console.log('🕐 Job CRON: Vérification statuts tâches toutes les 20 minutes');
  
  // Exécution immédiate au démarrage (optionnel, utile pour tests)
  if (config.nodeEnv === 'development') {
    console.log('[CRON] 🔄 Exécution initiale des vérifications de statuts...');
    executerVerificationsStatuts()
      .then(result => console.log('[CRON] Vérification initiale:', result))
      .catch(err => console.error('[CRON] Erreur vérification initiale:', err));
  }
});

export default app;
