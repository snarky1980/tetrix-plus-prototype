import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { gestionnaireErreurs } from './middleware/errorHandler';

// Import des routes
import authRoutes from './routes/authRoutes';
import traducteurRoutes from './routes/traducteurRoutes';
import clientRoutes from './routes/clientRoutes';
import sousDomaineRoutes from './routes/sousDomaineRoutes';
import tacheRoutes from './routes/tacheRoutes';
import planningRoutes from './routes/planningRoutes';
import repartitionRoutes from './routes/repartitionRoutes';

const app = express();

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

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/traducteurs', traducteurRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sous-domaines', sousDomaineRoutes);
app.use('/api/taches', tacheRoutes);
app.use('/api', planningRoutes); // Routes planning (plusieurs endpoints)
app.use('/api/repartition', repartitionRoutes);

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
