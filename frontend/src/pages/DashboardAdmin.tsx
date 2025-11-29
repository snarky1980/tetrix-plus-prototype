import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard Admin - Structure de base
 * Agent 2 appliquera le design
 * Agent 3 implémentera la logique métier
 */
const DashboardAdmin: React.FC = () => {
  const { utilisateur, deconnexion } = useAuth();

  return (
    <div className="container">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '20px 0',
        borderBottom: '2px solid #eee'
      }}>
        <h1>Administration</h1>
        <div>
          <span style={{ marginRight: '20px' }}>{utilisateur?.email}</span>
          <button onClick={deconnexion}>Déconnexion</button>
        </div>
      </header>

      <main style={{ marginTop: '30px' }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2>Gestion des traducteurs</h2>
          <p style={{ color: '#666' }}>
            Création, modification, activation/désactivation des traducteurs
          </p>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2>Gestion des clients et domaines</h2>
          <p style={{ color: '#666' }}>
            Gestion des divisions, domaines, sous-domaines, clients
          </p>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px'
        }}>
          <h2>Gestion des utilisateurs</h2>
          <p style={{ color: '#666' }}>
            Gestion des comptes et rôles
          </p>
        </div>
      </main>
    </div>
  );
};

export default DashboardAdmin;
