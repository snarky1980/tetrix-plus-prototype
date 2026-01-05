import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FormulaireTache } from '../components/taches/FormulaireTache';

const TacheCreation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Récupérer le traducteur pré-sélectionné depuis l'URL
  const traducteurId = searchParams.get('traducteurId') || undefined;
  const traducteurNom = searchParams.get('traducteurNom') || undefined;

  return (
    <AppLayout titre="Créer une tâche">
      {/* Barre de navigation */}
      <div className="mb-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
        <Button
          variant="outline"
          onClick={() => navigate('/conseiller')}
          className="flex items-center gap-2"
        >
          ← Portail Conseiller
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/planification-globale')}>
            📅 Planification
          </Button>
          <Button variant="ghost" onClick={() => navigate('/liaisons')}>
            🔗 Liaisons
          </Button>
          <Button variant="ghost" onClick={() => navigate('/statistiques-productivite')}>
            📊 Statistiques
          </Button>
          <Button variant="ghost" onClick={() => navigate('/profils')}>
            👤 Profils
          </Button>
        </div>
      </div>

      {/* Indicateur de traducteur pré-sélectionné */}
      {traducteurNom && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-green-700">
            ✋ Tâche pour <strong>{traducteurNom}</strong> (disponible)
          </span>
          <button 
            onClick={() => navigate('/conseiller/creation-tache')}
            className="text-xs text-green-600 hover:text-green-800 hover:underline"
          >
            Changer
          </button>
        </div>
      )}

      {/* Card avec formulaire */}
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>📋 Créer une nouvelle tâche</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireTache
            traducteurIdInitial={traducteurId}
            onSuccess={() => {
              navigate('/conseiller');
            }}
            onCancel={() => {
              navigate(-1);
            }}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TacheCreation;
