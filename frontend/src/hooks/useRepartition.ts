import { useState, useCallback } from 'react';
import { repartitionService, RepartitionItem } from '../services/repartitionService';

interface UseRepartitionOptions {
  traducteurId: string;
  heuresTotal: number;
  dateEcheance: string; // YYYY-MM-DD
}

export function useRepartition(options: UseRepartitionOptions) {
  const { traducteurId, heuresTotal, dateEcheance } = options;
  const [jatPreview, setJatPreview] = useState<RepartitionItem[] | null>(null);
  const [uniforme, setUniforme] = useState<RepartitionItem[] | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [loadingJAT, setLoadingJAT] = useState(false);

  const genererUniforme = useCallback((dateDebut: string, dateFin: string) => {
    try {
      const rep = repartitionService.repartitionUniforme(heuresTotal, dateDebut, dateFin);
      const v = repartitionService.validerRepartitionLocale(rep, heuresTotal);
      setUniforme(rep);
      setErreurs(v.erreurs);
    } catch (e: any) {
      setErreurs([e.message || 'Erreur répartition uniforme']);
    }
  }, [heuresTotal]);

  const previewJAT = useCallback(async () => {
    setLoadingJAT(true); setErreurs([]);
    try {
      const result = await repartitionService.previewJAT({ traducteurId, heuresTotal, dateEcheance });
      const v = repartitionService.validerRepartitionLocale(result.repartition, heuresTotal);
      setJatPreview(result.repartition);
      setErreurs(v.erreurs);
    } catch (e: any) {
      setErreurs([e.message || 'Erreur preview JAT']);
    } finally { setLoadingJAT(false); }
  }, [traducteurId, heuresTotal, dateEcheance]);

  return {
    jatPreview,
    uniforme,
    erreurs,
    loadingJAT,
    genererUniforme,
    previewJAT,
  };
}
