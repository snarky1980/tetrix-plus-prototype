import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastContainer } from './components/ui/Toast';

// Pages chargées immédiatement (critiques pour l'auth)
import Connexion from './pages/Connexion';

// Pages chargées en lazy loading (code splitting)
const DashboardTraducteur = lazy(() => import('./pages/DashboardTraducteur'));
const DashboardConseiller = lazy(() => import('./pages/DashboardConseiller'));
const DashboardGestionnaire = lazy(() => import('./pages/DashboardGestionnaire'));
const PlanificationGlobale = lazy(() => import('./pages/PlanificationGlobale'));
const TacheCreation = lazy(() => import('./pages/TacheCreation'));
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'));
const GestionProfils = lazy(() => import('./pages/GestionProfils').then(m => ({ default: m.GestionProfils })));
const StatistiquesProductivite = lazy(() => import('./pages/StatistiquesProductivite'));
const ConflictResolution = lazy(() => import('./pages/ConflictResolution'));
const LiaisonsPage = lazy(() => import('./pages/LiaisonsPage'));

// Composant de chargement pour Suspense
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

/**
 * Route protégée - nécessite authentification
 */
const RouteProtegee: React.FC<{
  children: React.ReactElement;
  rolesAutorises?: string[];
}> = ({ children, rolesAutorises }) => {
  const { estAuthentifie, utilisateur, chargement } = useAuth();

  if (chargement) {
    return <div>Chargement...</div>;
  }

  if (!estAuthentifie) {
    return <Navigate to="/connexion" replace />;
  }

  if (rolesAutorises && utilisateur && !rolesAutorises.includes(utilisateur.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Redirection vers le bon dashboard après login selon le rôle
 */
const RedirectionDashboard: React.FC = () => {
  const { utilisateur } = useAuth();

  if (!utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  // Redirection selon le rôle
  switch (utilisateur.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'CONSEILLER':
      return <Navigate to="/conseiller" replace />;
    case 'GESTIONNAIRE':
      return <Navigate to="/gestionnaire" replace />;
    case 'TRADUCTEUR':
      return <Navigate to="/traducteur" replace />;
    default:
      return <Navigate to="/planification-globale" replace />;
  }
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <UserPreferencesProvider>
            <BrowserRouter 
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ToastContainer />
              <Suspense fallback={<PageLoader />}>
                <Routes>
          {/* Route publique */}
          <Route path="/connexion" element={<Connexion />} />

          {/* Redirection racine */}
          <Route path="/" element={<RedirectionDashboard />} />

          {/* Planification globale - accessible à tous les utilisateurs authentifiés */}
          <Route
            path="/planification-globale"
            element={
              <RouteProtegee>
                <PlanificationGlobale />
              </RouteProtegee>
            }
          />

          {/* Routes protégées par rôle */}
          <Route
            path="/traducteur"
            element={
              <RouteProtegee rolesAutorises={['TRADUCTEUR']}>
                <DashboardTraducteur />
              </RouteProtegee>
            }
          />

          <Route
            path="/conseiller/*"
            element={
              <RouteProtegee rolesAutorises={['CONSEILLER', 'GESTIONNAIRE', 'ADMIN']}>
                <DashboardConseiller />
              </RouteProtegee>
            }
          />

          <Route
            path="/gestionnaire"
            element={
              <RouteProtegee rolesAutorises={['GESTIONNAIRE', 'ADMIN']}>
                <DashboardGestionnaire />
              </RouteProtegee>
            }
          />
          <Route
            path="/conseiller/creation-tache"
            element={
              <RouteProtegee rolesAutorises={['CONSEILLER', 'ADMIN']}>
                <TacheCreation />
              </RouteProtegee>
            }
          />

          <Route
            path="/admin/*"
            element={
              <RouteProtegee rolesAutorises={['ADMIN']}>
                <DashboardAdmin />
              </RouteProtegee>
            }
          />

          <Route
            path="/admin/gestion-profils"
            element={
              <RouteProtegee rolesAutorises={['ADMIN']}>
                <GestionProfils />
              </RouteProtegee>
            }
          />

          {/* Statistiques de productivité - CONSEILLER et GESTIONNAIRE */}
          <Route
            path="/statistiques-productivite"
            element={
              <RouteProtegee rolesAutorises={['CONSEILLER', 'GESTIONNAIRE', 'ADMIN']}>
                <StatistiquesProductivite />
              </RouteProtegee>
            }
          />

          {/* Résolution des conflits - CONSEILLER et GESTIONNAIRE */}
          <Route
            path="/conflict-resolution"
            element={
              <RouteProtegee rolesAutorises={['CONSEILLER', 'GESTIONNAIRE', 'ADMIN']}>
                <ConflictResolution />
              </RouteProtegee>
            }
          />

          {/* Liaisons Traducteur-Réviseur - CONSEILLER et GESTIONNAIRE */}
          <Route
            path="/liaisons"
            element={
              <RouteProtegee rolesAutorises={['CONSEILLER', 'GESTIONNAIRE', 'ADMIN']}>
                <LiaisonsPage />
              </RouteProtegee>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </UserPreferencesProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
