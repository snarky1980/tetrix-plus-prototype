import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';

// Pages
import Connexion from './pages/Connexion';
import DashboardTraducteur from './pages/DashboardTraducteur';
import DashboardConseiller from './pages/DashboardConseiller';
import PlanningGlobal from './pages/PlanningGlobal';
import TacheCreation from './pages/TacheCreation';
import DashboardAdmin from './pages/DashboardAdmin';

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
 * Redirection vers le dashboard approprié selon le rôle
 */
const RedirectionDashboard: React.FC = () => {
  const { utilisateur } = useAuth();

  if (!utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  switch (utilisateur.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'CONSEILLER':
      return <Navigate to="/conseiller" replace />;
    case 'TRADUCTEUR':
      return <Navigate to="/traducteur" replace />;
    default:
      return <Navigate to="/connexion" replace />;
  }
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter basename="/tetrix-plus-prototype">
          <ToastContainer />
          <Routes>
          {/* Route publique */}
          <Route path="/connexion" element={<Connexion />} />

          {/* Redirection racine */}
          <Route path="/" element={<RedirectionDashboard />} />

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
          {/* Sous-routes conseiller (placeholder) */}
          <Route
            path="/conseiller/planning-global"
            element={
              <RouteProtegee rolesAutorises={['CONSEILLER', 'ADMIN']}>
                <PlanningGlobal />
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

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;
