import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FormulaireTache } from '../components/taches/FormulaireTache';

const TacheCreation: React.FC = () => {
  const navigate = useNavigate();

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

      {/* Card avec formulaire */}
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>📋 Créer une nouvelle tâche</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireTache
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
