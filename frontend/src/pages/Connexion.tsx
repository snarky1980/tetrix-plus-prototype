import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Page de connexion
 */
const Connexion: React.FC = () => {
  usePageTitle('Tetrix PLUS - Connexion', 'Accédez à votre compte Tetrix PLUS');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const { connexion } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('tetrix-remember');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEmail(parsed.email || '');
        setMotDePasse(parsed.motDePasse || '');
        setRememberMe(true);
      } catch (e) {
        console.error('Erreur de lecture du stockage local', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    try {
      await connexion(email, motDePasse);
      if (rememberMe) {
        localStorage.setItem('tetrix-remember', JSON.stringify({ email, motDePasse }));
      } else {
        localStorage.removeItem('tetrix-remember');
      }
      navigate('/');
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur de connexion');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>
          Tetrix PLUS
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={afficherMdp ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', paddingRight: '80px' }}
              />
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {afficherMdp ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember" style={{ cursor: 'pointer' }}>
              Mémoriser le mot de passe
            </label>
          </div>

          {erreur && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            style={{
              width: '100%',
              background: '#4CAF50',
              color: 'white',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Connexion;
