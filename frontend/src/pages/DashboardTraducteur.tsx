import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard Traducteur - Structure de base
 * Agent 2 appliquera le design
 * Agent 3 implémentera la logique métier
 */
const DashboardTraducteur: React.FC = () => {
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
        <h1>Mon Planning</h1>
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
          <h2>Résumé</h2>
          <p>Votre planning et vos blocages apparaîtront ici.</p>
          <p style={{ color: '#666', marginTop: '10px' }}>
            Agent 2 créera l'interface visuelle.<br />
            Agent 3 implémentera la logique de planning et blocages.
          </p>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px'
        }}>
          <h2>Calendrier 7 jours</h2>
          <p style={{ color: '#666' }}>
            Calendrier simplifié à venir (Agent 2 + 3)
          </p>
        </div>
      </main>
    </div>
  );
};

export default DashboardTraducteur;
