import { useCallback, useEffect, useState } from 'react';
import { planningService } from '../services/planningService';
import { Planning, PlanningGlobal } from '../types';

export function usePlanning(traducteurId?: string, params?: { dateDebut: string; dateFin: string }) {
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!traducteurId || !params) return;
    setLoading(true); setError(null);
    try {
      const data = await planningService.obtenirPlanning(traducteurId, params.dateDebut, params.dateFin);
      setPlanning(data);
    } catch (e: any) {
      setError(e.message || 'Erreur planning');
    } finally { setLoading(false); }
  }, [traducteurId, params?.dateDebut, params?.dateFin]);

  useEffect(() => { refresh(); }, [refresh]);

  return { planning, loading, error, refresh };
}

export function usePlanningGlobal(params?: {
  dateDebut: string; dateFin: string; division?: string; client?: string; domaine?: string; langueSource?: string; langueCible?: string;
}) {
  const [planningGlobal, setPlanningGlobal] = useState<PlanningGlobal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!params) return;
    setLoading(true); setError(null);
    try {
      const data = await planningService.obtenirPlanningGlobal(params);
      setPlanningGlobal(data);
    } catch (e: any) { setError(e.message || 'Erreur planning global'); }
    finally { setLoading(false); }
  }, [params?.dateDebut, params?.dateFin, params?.division, params?.client, params?.domaine, params?.langueSource, params?.langueCible]);

  useEffect(() => { refresh(); }, [refresh]);

  return { planningGlobal, loading, error, refresh };
}
