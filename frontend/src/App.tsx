import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { ToastContainer } from './components/ui/Toast';

// Pages
import Connexion from './pages/Connexion';
import DashboardTraducteur from './pages/DashboardTraducteur';
import DashboardConseiller from './pages/DashboardConseiller';
import PlanificationGlobale from './pages/PlanificationGlobale';
import TacheCreation from './pages/TacheCreation';
import DashboardAdmin from './pages/DashboardAdmin';
import { GestionProfils } from './pages/GestionProfils';
import StatistiquesProductivite from './pages/StatistiquesProductivite';

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
 * Redirection vers la planification globale après login
 */
const RedirectionDashboard: React.FC = () => {
  const { utilisateur } = useAuth();

  if (!utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  // Tous les utilisateurs vont vers la planification globale
  return <Navigate to="/planification-globale" replace />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <UserPreferencesProvider>
          <BrowserRouter basename="/">
            <ToastContainer />
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
              <RouteProtegee rolesAutorises={['CONSEILLER', 'ADMIN']}>
                <DashboardConseiller />
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

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
        </UserPreferencesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
