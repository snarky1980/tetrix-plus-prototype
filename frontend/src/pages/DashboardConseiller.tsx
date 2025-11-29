import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard Conseiller - Structure de base
 * Agent 2 appliquera le design
 * Agent 3 implémentera la logique métier
 */
const DashboardConseiller: React.FC = () => {
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
        <h1>Gestion de la planification</h1>
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
          <h2>Recherche de traducteurs</h2>
          <p style={{ color: '#666' }}>
            Filtres multi-critères à venir (division, client, domaine, paires linguistiques, période)
          </p>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2>Planning global</h2>
          <p style={{ color: '#666' }}>
            Vue multi-traducteurs à venir
          </p>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px'
        }}>
          <h2>Créer une tâche</h2>
          <p style={{ color: '#666' }}>
            Formulaire de création avec répartition automatique (juste-à-temps) et manuelle
          </p>
        </div>
      </main>
    </div>
  );
};

export default DashboardConseiller;
