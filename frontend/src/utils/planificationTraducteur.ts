import { formatOttawaISO, addDaysOttawa, todayOttawa, parseOttawaDateISO, isWeekendOttawa } from './dateTimeOttawa';

export interface TacheJour {
  numeroProjet: string;
  typeTache: string;
  heures: number;
  heureDebut?: string;
  heureFin?: string;
}

export interface JourPlanification {
  date: string;
  jour: Date;
  capacite: number;
  heuresUtilisees: number;
  taches: TacheJour[];
}

export interface Traducteur {
  id: string;
  nom: string;
  division?: { nom: string };
  heuresDisponibles?: number;
  capaciteHeuresParJour?: number;
}

export async function chargerPlanificationTraducteur(traducteurId: string, nbJours: number = 7): Promise<{ traducteur: any; planification: JourPlanification[] }> {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  
  // Récupérer les infos du traducteur
  const traducteurResponse = await fetch(`${API_URL}/traducteurs/${traducteurId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!traducteurResponse.ok) {
    throw new Error(`Erreur chargement traducteur: ${traducteurResponse.status}`);
  }
  
  const traducteur = await traducteurResponse.json();
  
  // Récupérer les tâches pour les N prochains jours
  const dateDebut = formatOttawaISO(todayOttawa());
  const dateFin = formatOttawaISO(addDaysOttawa(todayOttawa(), nbJours));
  
  const tachesResponse = await fetch(`${API_URL}/taches?traducteurId=${traducteurId}&dateDebut=${dateDebut}&dateFin=${dateFin}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!tachesResponse.ok) {
    throw new Error(`Erreur chargement tâches: ${tachesResponse.status}`);
  }
  
  const taches = await tachesResponse.json();
  
  if (!Array.isArray(taches)) {
    throw new Error('Format de réponse invalide');
  }
  
  // Générer les jours ouvrables
  const joursOuvrables: Date[] = [];
  let currentDate = parseOttawaDateISO(dateDebut);
  const endDate = parseOttawaDateISO(dateFin);
  
  while (currentDate <= endDate) {
    if (!isWeekendOttawa(currentDate)) {
      joursOuvrables.push(new Date(currentDate));
    }
    currentDate = addDaysOttawa(currentDate, 1);
  }
  
  // Organiser par jour
  const planification = joursOuvrables.map((jour: Date) => {
    const dateStr = formatOttawaISO(jour);
    const tachesJour = taches.filter((t: any) => {
      return t.ajustementsTemps?.some((aj: any) => formatOttawaISO(new Date(aj.date)) === dateStr);
    });
    
    const heuresUtilisees = tachesJour.reduce((sum: number, t: any) => {
      const ajustement = t.ajustementsTemps?.find((aj: any) => formatOttawaISO(new Date(aj.date)) === dateStr);
      return sum + (ajustement?.heures || 0);
    }, 0);
    
    return {
      date: dateStr,
      jour: jour,
      capacite: traducteur.capaciteHeuresParJour || 7,
      heuresUtilisees,
      taches: tachesJour.map((t: any) => {
        const ajustement = t.ajustementsTemps?.find((aj: any) => formatOttawaISO(new Date(aj.date)) === dateStr);
        return {
          numeroProjet: t.numeroProjet,
          typeTache: t.typeTache,
          heures: ajustement?.heures || 0,
          heureDebut: ajustement?.heureDebut,
          heureFin: ajustement?.heureFin
        };
      })
    };
  });
  
  return { traducteur, planification };
}

export function afficherPlanificationPopout(traducteur: Traducteur, planification: JourPlanification[]) {
  const popout = window.open('', '_blank', 'width=900,height=900,left=100,top=100,resizable=yes,scrollbars=yes');
  
  if (!popout) {
    alert('Impossible d\'ouvrir la fenêtre. Veuillez autoriser les pop-ups pour ce site.');
    return;
  }
  
  // Dates par défaut
  const aujourdhui = new Date().toISOString().split('T')[0];
  const dans7jours = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Générer le HTML de la fenêtre pop-out
  popout.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planification - ${traducteur.nom}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .info-card {
      background: rgba(255,255,255,0.1);
      padding: 16px;
      border-radius: 6px;
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .info-item {
      text-align: center;
    }
    .info-label {
      font-size: 12px;
      opacity: 0.9;
    }
    .info-value {
      font-size: 20px;
      font-weight: bold;
      margin-top: 4px;
    }
    .controls {
      padding: 16px 24px;
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    .controls-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    .date-controls {
      display: flex;
      gap: 12px;
      align-items: end;
      flex-wrap: wrap;
    }
    .date-field {
      flex: 1;
      min-width: 150px;
    }
    .date-field label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .date-field input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      color: #374151;
    }
    .date-field input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
    }
    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
    .quick-buttons {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .btn-quick {
      padding: 6px 12px;
      font-size: 12px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-quick:hover {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    .content {
      padding: 24px;
    }
    .day-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .day-header {
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-title {
      font-weight: 600;
      font-size: 14px;
      color: #374151;
    }
    .day-hours {
      font-size: 13px;
      color: #6b7280;
    }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 16px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-green { background: #10b981; }
    .progress-orange { background: #f59e0b; }
    .progress-red { background: #ef4444; }
    .tasks-list {
      padding: 0 16px 16px 16px;
    }
    .task-item {
      background: white;
      padding: 10px 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 3px solid #667eea;
      font-size: 13px;
    }
    .task-header {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .task-details {
      color: #6b7280;
      display: flex;
      gap: 12px;
    }
    .empty-day {
      padding: 16px;
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
    }
    .stats-footer {
      background: #f9fafb;
      padding: 16px 24px;
      border-top: 2px solid #e5e7eb;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #374151;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }
    .error {
      background: #fee2e2;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 16px 24px;
      border: 1px solid #fca5a5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Planification - ${traducteur.nom}</h1>
      <div class="info-card">
        <div class="info-item">
          <div class="info-label">Division</div>
          <div class="info-value">${traducteur.division?.nom || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Heures disponibles</div>
          <div class="info-value">${traducteur.heuresDisponibles || 0}h</div>
        </div>
        <div class="info-item">
          <div class="info-label">Capacité/jour</div>
          <div class="info-value">${traducteur.capaciteHeuresParJour || 7}h</div>
        </div>
      </div>
    </div>
    
    <div class="controls">
      <div class="controls-title">Période de planification</div>
      <div class="date-controls">
        <div class="date-field">
          <label for="dateDebut">Date de début</label>
          <input type="date" id="dateDebut" value="${aujourdhui}">
        </div>
        <div class="date-field">
          <label for="dateFin">Date de fin</label>
          <input type="date" id="dateFin" value="${dans7jours}">
        </div>
        <button class="btn btn-primary" onclick="chargerPeriode()">📊 Actualiser</button>
      </div>
      <div class="quick-buttons">
        <button class="btn-quick" onclick="setPeriode(7)">7 jours</button>
        <button class="btn-quick" onclick="setPeriode(14)">14 jours</button>
        <button class="btn-quick" onclick="setPeriode(30)">30 jours</button>
        <button class="btn-quick" onclick="setPeriode(60)">60 jours</button>
        <button class="btn-quick" onclick="setMoisCourant()">Mois en cours</button>
        <button class="btn-quick" onclick="setMoisProchain()">Mois prochain</button>
      </div>
    </div>
    
    <div id="content" class="content">
      ${generateDaysHTML(planification)}
    </div>
    
    <div id="stats" class="stats-footer">
      ${generateStatsHTML(planification)}
    </div>
  </div>
  
  <script>
    const traducteurId = '${traducteur.id}';
    const apiUrl = window.opener ? (window.opener.import?.meta?.env?.VITE_API_URL || '/api') : '/api';
    const token = window.opener ? window.opener.localStorage.getItem('token') : null;
    
    function setPeriode(jours) {
      const debut = new Date();
      const fin = new Date(Date.now() + jours * 24 * 60 * 60 * 1000);
      document.getElementById('dateDebut').value = debut.toISOString().split('T')[0];
      document.getElementById('dateFin').value = fin.toISOString().split('T')[0];
      chargerPeriode();
    }
    
    function setMoisCourant() {
      const now = new Date();
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      document.getElementById('dateDebut').value = debut.toISOString().split('T')[0];
      document.getElementById('dateFin').value = fin.toISOString().split('T')[0];
      chargerPeriode();
    }
    
    function setMoisProchain() {
      const now = new Date();
      const debut = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const fin = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      document.getElementById('dateDebut').value = debut.toISOString().split('T')[0];
      document.getElementById('dateFin').value = fin.toISOString().split('T')[0];
      chargerPeriode();
    }
    
    async function chargerPeriode() {
      const dateDebut = document.getElementById('dateDebut').value;
      const dateFin = document.getElementById('dateFin').value;
      
      if (!dateDebut || !dateFin) {
        alert('Veuillez sélectionner les deux dates');
        return;
      }
      
      if (new Date(dateDebut) > new Date(dateFin)) {
        alert('La date de début doit être avant la date de fin');
        return;
      }
      
      const content = document.getElementById('content');
      const stats = document.getElementById('stats');
      content.innerHTML = '<div class="loading">⏳ Chargement des données...</div>';
      stats.innerHTML = '';
      
      try {
        const response = await fetch(
          \`\${apiUrl}/taches?traducteurId=\${traducteurId}&dateDebut=\${dateDebut}&dateFin=\${dateFin}\`,
          { headers: { 'Authorization': \`Bearer \${token}\` } }
        );
        
        if (!response.ok) {
          throw new Error(\`Erreur \${response.status}\`);
        }
        
        const taches = await response.json();
        
        if (!Array.isArray(taches)) {
          throw new Error('Format de réponse invalide');
        }
        
        // Générer les jours ouvrables dans la période
        const joursOuvrables = [];
        let current = new Date(dateDebut);
        const end = new Date(dateFin);
        
        while (current <= end) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Pas samedi/dimanche
            joursOuvrables.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
        
        // Organiser les tâches par jour
        const planification = joursOuvrables.map(jour => {
          const dateStr = jour.toISOString().split('T')[0];
          const tachesJour = taches.filter(t => 
            t.ajustementsTemps?.some(aj => aj.date.startsWith(dateStr))
          );
          
          const heuresUtilisees = tachesJour.reduce((sum, t) => {
            const ajustement = t.ajustementsTemps?.find(aj => aj.date.startsWith(dateStr));
            return sum + (ajustement?.heures || 0);
          }, 0);
          
          return {
            date: dateStr,
            jour: jour,
            capacite: ${traducteur.capaciteHeuresParJour || 7},
            heuresUtilisees,
            taches: tachesJour.map(t => {
              const ajustement = t.ajustementsTemps?.find(aj => aj.date.startsWith(dateStr));
              return {
                numeroProjet: t.numeroProjet,
                typeTache: t.typeTache,
                heures: ajustement?.heures || 0,
                heureDebut: ajustement?.heureDebut,
                heureFin: ajustement?.heureFin
              };
            })
          };
        });
        
        content.innerHTML = generateDaysHTML(planification);
        stats.innerHTML = generateStatsHTML(planification);
        
      } catch (error) {
        console.error('Erreur:', error);
        content.innerHTML = \`<div class="error">❌ Erreur de chargement: \${error.message}</div>\`;
      }
    }
    
    function generateDaysHTML(planification) {
      if (!planification || planification.length === 0) {
        return '<div class="empty-day">Aucun jour ouvrable dans cette période</div>';
      }
      
      return planification.map(jour => {
        const pourcentage = jour.capacite > 0 ? (jour.heuresUtilisees / jour.capacite) * 100 : 0;
        const couleurBarre = pourcentage >= 90 ? 'progress-red' : pourcentage >= 70 ? 'progress-orange' : 'progress-green';
        const dateFormatee = new Date(jour.date + 'T12:00:00').toLocaleDateString('fr-CA', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        return \`
          <div class="day-card">
            <div class="day-header">
              <span class="day-title">\${dateFormatee}</span>
              <span class="day-hours">\${jour.heuresUtilisees.toFixed(1)}h / \${jour.capacite}h (\${pourcentage.toFixed(0)}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill \${couleurBarre}" style="width: \${Math.min(pourcentage, 100)}%"></div>
            </div>
            \${jour.taches.length > 0 ? \`
              <div class="tasks-list">
                \${jour.taches.map(t => \`
                  <div class="task-item">
                    <div class="task-header">\${t.numeroProjet} - \${t.typeTache}</div>
                    <div class="task-details">
                      <span>⏱️ \${t.heures.toFixed(1)}h</span>
                      \${t.heureDebut && t.heureFin ? \`<span>🕐 \${t.heureDebut} - \${t.heureFin}</span>\` : ''}
                    </div>
                  </div>
                \`).join('')}
              </div>
            \` : \`
              <div class="empty-day">Aucune tâche planifiée</div>
            \`}
          </div>
        \`;
      }).join('');
    }
    
    function generateStatsHTML(planification) {
      if (!planification || planification.length === 0) return '';
      
      const totalHeures = planification.reduce((sum, j) => sum + j.heuresUtilisees, 0);
      const totalCapacite = planification.reduce((sum, j) => sum + j.capacite, 0);
      const chargeGlobale = totalCapacite > 0 ? (totalHeures / totalCapacite) * 100 : 0;
      
      return \`
        <div class="stat-item">
          <div class="stat-label">Total heures planifiées</div>
          <div class="stat-value">\${totalHeures.toFixed(1)}h</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Capacité totale</div>
          <div class="stat-value">\${totalCapacite}h</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Charge moyenne</div>
          <div class="stat-value">\${chargeGlobale.toFixed(0)}%</div>
        </div>
      \`;
    }
  </script>
</body>
</html>
  `);
  popout.document.close();
}

function generateDaysHTML(planification: JourPlanification[]): string {
  return planification.map(jour => {
    const pourcentage = jour.capacite > 0 ? (jour.heuresUtilisees / jour.capacite) * 100 : 0;
    const couleurBarre = pourcentage >= 90 ? 'progress-red' : pourcentage >= 70 ? 'progress-orange' : 'progress-green';
    const dateFormatee = new Date(jour.date).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
      <div class="day-card">
        <div class="day-header">
          <span class="day-title">${dateFormatee}</span>
          <span class="day-hours">${jour.heuresUtilisees.toFixed(1)}h / ${jour.capacite}h (${pourcentage.toFixed(0)}%)</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${couleurBarre}" style="width: ${Math.min(pourcentage, 100)}%"></div>
        </div>
        ${jour.taches.length > 0 ? `
          <div class="tasks-list">
            ${jour.taches.map(t => `
              <div class="task-item">
                <div class="task-header">${t.numeroProjet} - ${t.typeTache}</div>
                <div class="task-details">
                  <span>⏱️ ${t.heures.toFixed(1)}h</span>
                  ${t.heureDebut && t.heureFin ? `<span>🕐 ${t.heureDebut} - ${t.heureFin}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-day">Aucune tâche planifiée</div>
        `}
      </div>
    `;
  }).join('');
}

function generateStatsHTML(planification: JourPlanification[]): string {
  const totalHeures = planification.reduce((sum, j) => sum + j.heuresUtilisees, 0);
  const totalCapacite = planification.reduce((sum, j) => sum + j.capacite, 0);
  const chargeGlobale = totalCapacite > 0 ? (totalHeures / totalCapacite) * 100 : 0;
  
  return `
    <div class="stat-item">
      <div class="stat-label">Total heures planifiées</div>
      <div class="stat-value">${totalHeures.toFixed(1)}h</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">Capacité totale</div>
      <div class="stat-value">${totalCapacite}h</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">Charge moyenne</div>
      <div class="stat-value">${chargeGlobale.toFixed(0)}%</div>
    </div>
  `;
}
