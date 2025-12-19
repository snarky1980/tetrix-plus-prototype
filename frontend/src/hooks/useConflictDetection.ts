import { useState, useCallback } from 'react';
import { conflictService, type ConflictAnalysisResult } from '../services/conflictService';

export function useConflictDetection() {
  const [analysis, setAnalysis] = useState<ConflictAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeAllocation = useCallback(async (allocationId: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await conflictService.analyzeAllocation(allocationId);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      const message = err.response?.data?.erreur || err.message || 'Erreur lors de l\'analyse';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const checkHasConflicts = useCallback(async (allocationId: string) => {
    try {
      return await conflictService.hasConflicts(allocationId);
    } catch {
      return false;
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isAnalyzing,
    error,
    analyzeAllocation,
    checkHasConflicts,
    clearAnalysis,
  };
}
