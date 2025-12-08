import api from './api';

export interface JATPreviewParams {
  traducteurId: string;
  heuresTotal: number;
  dateEcheance: string; // YYYY-MM-DD
}

export interface RepartitionItem { date: string; heures: number }

export const repartitionService = {
  async previewJAT(params: JATPreviewParams): Promise<RepartitionItem[]> {
    const { data } = await api.get<{ repartition: RepartitionItem[] }>(
      '/repartition/jat-preview',
      { params }
    );
    return data.repartition;
  },

  repartitionUniforme(heuresTotal: number, dateDebut: string, dateFin: string): RepartitionItem[] {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const jours = Math.floor((fin.getTime() - debut.getTime()) / (1000*60*60*24)) + 1;
    if (jours <= 0) throw new Error('Intervalle invalide');
    const base = heuresTotal / jours;
    const items: RepartitionItem[] = [];
    let cumul = 0;
    for (let i = 0; i < jours; i++) {
      const d = new Date(debut.getTime() + i*86400000);
      const iso = d.toISOString().split('T')[0];
      let h = parseFloat(base.toFixed(4));
      cumul += h;
      items.push({ date: iso, heures: h });
    }
    const diff = parseFloat((heuresTotal - cumul).toFixed(4));
    if (Math.abs(diff) >= 0.0001) {
      items[items.length - 1].heures = parseFloat((items[items.length - 1].heures + diff).toFixed(4));
    }
    return items;
  },

  validerRepartitionLocale(repartition: RepartitionItem[], heuresTotal: number): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];
    const somme = parseFloat(repartition.reduce((s, r) => s + r.heures, 0).toFixed(4));
    const attendu = parseFloat(heuresTotal.toFixed(4));
    if (somme !== attendu) erreurs.push(`Somme (${somme}) différente des heures totales (${attendu}).`);
    repartition.forEach(r => { if (r.heures < 0) erreurs.push(`Heures négatives (${r.date}).`); });
    return { valide: erreurs.length === 0, erreurs };
  },

  // Fonction utilitaire pour vérifier si un jour est un weekend
  estWeekend(date: Date): boolean {
    const jour = date.getDay();
    return jour === 0 || jour === 6; // 0 = dimanche, 6 = samedi
  },

  // Calculer la répartition équilibrée entre dateDebut et dateFin (excluant weekends)
  calculerRepartitionEquilibree(params: { heuresTotal: number; dateDebut: string; dateFin: string }): Promise<RepartitionItem[]> {
    return new Promise((resolve, reject) => {
      try {
        const { heuresTotal, dateDebut, dateFin } = params;
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        
        // Calculer le nombre de jours dans l'intervalle
        const totalJours = Math.floor((fin.getTime() - debut.getTime()) / (1000*60*60*24)) + 1;
        if (totalJours <= 0) {
          reject(new Error('Intervalle de dates invalide'));
          return;
        }
        
        // Compter uniquement les jours ouvrables (lundi à vendredi)
        const joursOuvrables: string[] = [];
        for (let i = 0; i < totalJours; i++) {
          const dateCourante = new Date(debut.getTime() + i * 86400000);
          if (!this.estWeekend(dateCourante)) {
            joursOuvrables.push(dateCourante.toISOString().split('T')[0]);
          }
        }
        
        if (joursOuvrables.length === 0) {
          reject(new Error('Aucun jour ouvrable dans l\'intervalle (uniquement des weekends)'));
          return;
        }
        
        // Répartir uniformément sur les jours ouvrables
        const heuresParJour = heuresTotal / joursOuvrables.length;
        const items: RepartitionItem[] = [];
        let cumul = 0;
        
        for (const date of joursOuvrables) {
          const h = parseFloat(heuresParJour.toFixed(4));
          cumul += h;
          items.push({ date, heures: h });
        }
        
        // Ajuster la dernière valeur pour compenser les erreurs d'arrondi
        const diff = parseFloat((heuresTotal - cumul).toFixed(4));
        if (Math.abs(diff) >= 0.0001) {
          items[items.length - 1].heures = parseFloat((items[items.length - 1].heures + diff).toFixed(4));
        }
        
        resolve(items);
      } catch (error: any) {
        reject(error);
      }
    });
  },

  // Calculer la répartition PEPS (Première Entrée Première Sortie) - remplit à pleine capacité depuis dateDebut
  calculerRepartitionPEPS(params: { heuresTotal: number; dateDebut: string; dateEcheance: string; capaciteParJour?: number }): Promise<RepartitionItem[]> {
    return new Promise((resolve, reject) => {
      try {
        const { heuresTotal, dateDebut, dateEcheance, capaciteParJour = 7.5 } = params;
        const debut = new Date(dateDebut);
        const fin = new Date(dateEcheance);
        
        // Calculer le nombre de jours dans l'intervalle
        const totalJours = Math.floor((fin.getTime() - debut.getTime()) / (1000*60*60*24)) + 1;
        if (totalJours <= 0) {
          reject(new Error('Intervalle de dates invalide (dateDebut doit être avant dateEcheance)'));
          return;
        }
        
        // Compter uniquement les jours ouvrables (lundi à vendredi)
        const joursOuvrables: string[] = [];
        for (let i = 0; i < totalJours; i++) {
          const dateCourante = new Date(debut.getTime() + i * 86400000);
          if (!this.estWeekend(dateCourante)) {
            joursOuvrables.push(dateCourante.toISOString().split('T')[0]);
          }
        }
        
        if (joursOuvrables.length === 0) {
          reject(new Error('Aucun jour ouvrable dans l\'intervalle (uniquement des weekends)'));
          return;
        }
        
        // PEPS = Remplir à PLEINE CAPACITÉ jour après jour depuis le début
        const items: RepartitionItem[] = [];
        let restant = heuresTotal;
        
        for (const date of joursOuvrables) {
          if (restant <= 0) break;
          
          // Allouer le minimum entre capacité et heures restantes
          const alloue = Math.min(capaciteParJour, restant);
          items.push({ date, heures: parseFloat(alloue.toFixed(4)) });
          restant -= alloue;
        }
        
        // Vérifier si toutes les heures ont été allouées
        if (restant > 0.0001) {
          reject(new Error(`Capacité insuffisante : ${restant.toFixed(2)}h restantes après allocation sur tous les jours ouvrables`));
          return;
        }
        
        resolve(items);
      } catch (error: any) {
        reject(error);
      }
    });
  }
};
