import { useCallback, useEffect, useState } from 'react';
import { planificationService } from '../services/planificationService';
import { Planification, PlanificationGlobale } from '../types';

export function usePlanification(traducteurId?: string, params?: { dateDebut: string; dateFin: string }) {
  const [planification, setPlanification] = useState<Planification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!traducteurId || !params) return;
    setLoading(true); setError(null);
    try {
      const data = await planificationService.obtenirPlanification(traducteurId, params.dateDebut, params.dateFin);
      setPlanification(data);
    } catch (e: any) {
      setError(e.message || 'Erreur planification');
    } finally { setLoading(false); }
  }, [traducteurId, params?.dateDebut, params?.dateFin]);

  useEffect(() => { refresh(); }, [refresh]);

  return { planification, loading, error, refresh };
}

export function usePlanificationGlobal(params?: {
  dateDebut: string; dateFin: string; division?: string; client?: string; domaine?: string; langueSource?: string; langueCible?: string;
}) {
  const [planificationGlobale, setPlanificationGlobale] = useState<PlanificationGlobale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!params) return;
    setLoading(true); setError(null);
    try {
      const data = await planificationService.obtenirPlanificationGlobale(params);
      setPlanificationGlobale(data);
    } catch (e: any) { setError(e.message || 'Erreur planification globale'); }
    finally { setLoading(false); }
  }, [params?.dateDebut, params?.dateFin, params?.division, params?.client, params?.domaine, params?.langueSource, params?.langueCible]);

  useEffect(() => { refresh(); }, [refresh]);

  return { planificationGlobale, loading, error, refresh };
}
