import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

/**
 * Page de connexion - Design moderne avec thème Echo BT-CTD
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-4">
      {/* Éléments décoratifs en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md p-8 backdrop-blur-sm bg-white/95 shadow-xl border-0 ring-1 ring-black/5">
        {/* En-tête avec logo stylisé */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white text-2xl font-bold mb-4 shadow-lg shadow-primary/25">
            T+
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Tetrix PLUS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Système de gestion des traductions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Champ Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-primary">
              Adresse courriel
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.gc.ca"
                className="pl-10"
                error={!!erreur}
              />
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-primary">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <Input
                id="password"
                type={afficherMdp ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-10 pr-20"
                error={!!erreur}
              />
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-primary hover:text-primary/70 transition-colors"
              >
                {afficherMdp ? (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Masquer
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Afficher
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Case à cocher "Se souvenir" */}
          <div className="flex items-center gap-3">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
              Mémoriser mes identifiants
            </label>
          </div>

          {/* Message d'erreur */}
          {erreur && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{erreur}</span>
            </div>
          )}

          {/* Bouton de connexion */}
          <Button
            type="submit"
            variant="primaire"
            full
            loading={chargement}
            className="mt-6 py-3 text-base"
          >
            {chargement ? 'Connexion en cours...' : 'Se connecter'}
          </Button>
        </form>

        {/* Pied de page */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-muted-foreground">
            Tetrix PLUS · Prototype
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Connexion;
