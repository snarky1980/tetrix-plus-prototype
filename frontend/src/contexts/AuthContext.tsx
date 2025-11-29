import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Utilisateur } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  utilisateur: Utilisateur | null;
  estAuthentifie: boolean;
  connexion: (email: string, motDePasse: string) => Promise<void>;
  deconnexion: () => void;
  chargement: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Vérifier si un utilisateur est déjà connecté
    const utilisateurStocke = authService.obtenirUtilisateurCourant();
    if (utilisateurStocke) {
      setUtilisateur(utilisateurStocke);
    }
    setChargement(false);
  }, []);

  const connexion = async (email: string, motDePasse: string) => {
    const reponse = await authService.connexion(email, motDePasse);
    setUtilisateur(reponse.utilisateur);
  };

  const deconnexion = () => {
    authService.deconnexion();
    setUtilisateur(null);
  };

  return (
    <AuthContext.Provider
      value={{
        utilisateur,
        estAuthentifie: !!utilisateur,
        connexion,
        deconnexion,
        chargement,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
