/**
 * Page Mes Notes - Notes personnelles de l'utilisateur
 * 
 * Chaque utilisateur peut gérer ses propres notes privées.
 * Accessible à tous les rôles authentifiés.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import NotesPanel from '../components/common/NotesPanel';

const MesNotes: React.FC = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();

  if (!utilisateur) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  // Déterminer le lien de retour selon le rôle
  const getRetourPath = () => {
    switch (utilisateur.role) {
      case 'ADMIN':
        return '/admin';
      case 'CONSEILLER':
        return '/conseiller';
      case 'GESTIONNAIRE':
        return '/gestionnaire';
      case 'TRADUCTEUR':
        return '/traducteur';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(getRetourPath())}
                className="flex items-center gap-2"
              >
                ← Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  📝 Mes Notes
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Notes personnelles et privées
                </p>
              </div>
            </div>

            <div className="text-right text-sm text-gray-500">
              <div className="font-medium">{utilisateur.email}</div>
              <div className="text-xs capitalize">{utilisateur.role.toLowerCase()}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-600">
                Cet espace vous permet de créer et gérer vos notes personnelles. 
                Ces notes sont <strong>privées par défaut</strong> et ne sont visibles que par vous.
              </p>
            </div>

            <NotesPanel
              entiteType="UTILISATEUR"
              entiteId={utilisateur.id}
              titre=""
              compact={false}
            />
          </div>
        </div>

        {/* Aide */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Conseils</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Utilisez les catégories pour organiser vos notes (Générale, Procédure, etc.)</li>
            <li>• Épinglez les notes importantes pour les garder en haut de la liste</li>
            <li>• Joignez des fichiers (PDF, documents) à vos notes</li>
            <li>• Utilisez la recherche pour retrouver rapidement une note</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default MesNotes;
