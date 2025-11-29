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
  }
};
