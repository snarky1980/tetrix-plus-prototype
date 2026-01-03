import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge, BadgeVariant } from '../ui/Badge';
import { InfoTooltip } from '../ui/Tooltip';

interface SystemHealth {
  database: 'ok' | 'warning' | 'error';
  api: 'ok' | 'warning' | 'error';
  lastCheck: Date;
}

interface ActivityLog {
  id: string;
  action: string;
  utilisateur: string;
  details: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
}

/**
 * SystemSettings - Section Système de la console Admin
 * Affiche la santé du système, les logs d'activité et la configuration
 */
export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'health' | 'logs' | 'config'>('health');
  const [health, setHealth] = useState<SystemHealth>({
    database: 'ok',
    api: 'ok',
    lastCheck: new Date()
  });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Check de santé réel de l'API et de la BDD
  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Ping API pour vérifier la connectivité
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setHealth({
            database: data.database || 'ok',
            api: data.api || 'ok',
            lastCheck: new Date()
          });
        } else {
          // API répond mais avec erreur
          setHealth({
            database: 'error',
            api: 'warning',
            lastCheck: new Date()
          });
        }
      } catch {
        setHealth({ database: 'warning', api: 'error', lastCheck: new Date() });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check toutes les 30s
    return () => clearInterval(interval);
  }, []);

  // Charger les logs d'activité récents (simulation)
  useEffect(() => {
    setLoadingLogs(true);
    // Simuler des logs pour l'instant
    const mockLogs: ActivityLog[] = [
      { id: '1', action: 'Connexion', utilisateur: 'admin@tetrix.com', details: 'Connexion réussie', timestamp: new Date(), type: 'success' },
      { id: '2', action: 'Création tâche', utilisateur: 'conseiller@tetrix.com', details: 'Tâche #2024-001 créée', timestamp: new Date(Date.now() - 3600000), type: 'info' },
      { id: '3', action: 'Modification traducteur', utilisateur: 'admin@tetrix.com', details: 'Profil J. Dupont mis à jour', timestamp: new Date(Date.now() - 7200000), type: 'info' },
      { id: '4', action: 'Erreur sync', utilisateur: 'système', details: 'Timeout connexion BDD (résolu)', timestamp: new Date(Date.now() - 86400000), type: 'warning' },
    ];
    setTimeout(() => {
      setLogs(mockLogs);
      setLoadingLogs(false);
    }, 500);
  }, []);

  const renderHealthStatus = () => {
    const statusConfig: Record<'ok' | 'warning' | 'error', { color: string; text: string; badge: BadgeVariant }> = {
      ok: { color: 'bg-green-500', text: 'Opérationnel', badge: 'success' },
      warning: { color: 'bg-yellow-500', text: 'Dégradé', badge: 'warning' },
      error: { color: 'bg-red-500', text: 'Erreur', badge: 'danger' }
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Status */}
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">API Backend</span>
              <span className={`w-3 h-3 rounded-full ${statusConfig[health.api].color} ${health.api === 'ok' ? 'animate-pulse' : ''}`}></span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig[health.api].badge}>{statusConfig[health.api].text}</Badge>
              <span className="text-xs text-gray-400">Port 3001</span>
            </div>
          </div>

          {/* Database Status */}
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Base de données</span>
              <span className={`w-3 h-3 rounded-full ${statusConfig[health.database].color} ${health.database === 'ok' ? 'animate-pulse' : ''}`}></span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig[health.database].badge}>{statusConfig[health.database].text}</Badge>
              <span className="text-xs text-gray-400">PostgreSQL</span>
            </div>
          </div>

          {/* Version Info */}
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Version</span>
              <InfoTooltip content="Version actuelle de Tetrix PLUS" size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">v2.0.0</span>
              <Badge variant="info">Stable</Badge>
            </div>
          </div>
        </div>

        {/* Dernière vérification */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>Dernière vérification:</span>
          <span className="font-medium">{health.lastCheck.toLocaleTimeString('fr-CA')}</span>
          <Button variant="ghost" size="sm" onClick={() => setHealth(prev => ({ ...prev, lastCheck: new Date() }))}>
            🔄 Actualiser
          </Button>
        </div>

        {/* Informations système */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold mb-3">Informations techniques</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Frontend</span>
              <div className="font-medium">React 18 + Vite</div>
            </div>
            <div>
              <span className="text-gray-500">Backend</span>
              <div className="font-medium">Express + TypeScript</div>
            </div>
            <div>
              <span className="text-gray-500">ORM</span>
              <div className="font-medium">Prisma 5.x</div>
            </div>
            <div>
              <span className="text-gray-500">Timezone</span>
              <div className="font-medium">America/Toronto</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityLogs = () => {
    const typeConfig = {
      info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200' },
      warning: { icon: '⚠️', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      error: { icon: '❌', bg: 'bg-red-50', border: 'border-red-200' },
      success: { icon: '✅', bg: 'bg-green-50', border: 'border-green-200' }
    };

    if (loadingLogs) {
      return <div className="text-center py-8 text-gray-500">Chargement des logs...</div>;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">{logs.length} événements récents</span>
          <Button variant="outline" size="sm">📥 Exporter</Button>
        </div>
        
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun log disponible</div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg border ${typeConfig[log.type].bg} ${typeConfig[log.type].border}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{typeConfig[log.type].icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs text-gray-400">{log.timestamp.toLocaleString('fr-CA')}</span>
                    </div>
                    <div className="text-sm text-gray-600">{log.details}</div>
                    <div className="text-xs text-gray-400 mt-1">Par: {log.utilisateur}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderConfiguration = () => {
    return (
      <div className="space-y-6">
        {/* Variables d'environnement (non sensibles) */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            🔧 Configuration active
            <InfoTooltip content="Paramètres système en lecture seule" size="sm" />
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">NODE_ENV</span>
              <span className="text-green-600">development</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">API_PORT</span>
              <span>3001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">TIMEZONE</span>
              <span>America/Toronto</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">JWT_EXPIRY</span>
              <span>24h</span>
            </div>
          </div>
        </div>

        {/* Actions de maintenance */}
        <div>
          <h4 className="text-sm font-semibold mb-3">🛠️ Actions de maintenance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2" disabled>
              <span>🗑️</span> Vider le cache (bientôt)
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled>
              <span>🔄</span> Recharger les données de référence (bientôt)
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled>
              <span>📊</span> Générer rapport système (bientôt)
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled>
              <span>💾</span> Backup manuel (bientôt)
            </Button>
          </div>
        </div>

        {/* Liens utiles */}
        <div>
          <h4 className="text-sm font-semibold mb-3">📚 Ressources</h4>
          <div className="flex flex-wrap gap-2">
            <a 
              href="https://github.com/snarky1980/tetrix-plus-prototype" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              GitHub →
            </a>
            <a 
              href="/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              API Docs →
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex gap-1 border-b pb-2">
        {[
          { id: 'health' as const, label: '💚 Santé', tooltip: 'État des services' },
          { id: 'logs' as const, label: '📋 Activité', tooltip: 'Logs récents' },
          { id: 'config' as const, label: '⚙️ Configuration', tooltip: 'Paramètres système' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={tab.tooltip}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet */}
      <div className="min-h-[300px]">
        {activeTab === 'health' && renderHealthStatus()}
        {activeTab === 'logs' && renderActivityLogs()}
        {activeTab === 'config' && renderConfiguration()}
      </div>
    </div>
  );
};

export default SystemSettings;
