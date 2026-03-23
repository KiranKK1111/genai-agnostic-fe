/**
 * Query Management Custom Hook
 *
 * Provides a simple interface for components to execute queries with caching.
 * Delegates backend routing intelligence to the new backend DecisionEngine.
 *
 * BACKEND HANDLES:
 * - Decision routing (SQL vs FILES vs CHAT)
 * - Schema discovery & normalization
 * - Entity/intent extraction
 * - SQL validation & safety
 *
 * FRONTEND HANDLES:
 * - User input & session management
 * - Cache management
 * - Display of decision & metadata
 */

import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { DynamicResponse, DecisionType, DecisionRouting } from '../api';
import { QueryExecutionResult } from '../services/queryManager';
import {
  startQueryExecution,
  completeQueryExecution,
  updateCacheStats,
} from '../features/querySlice';
import { queryManager } from '../services/queryManager';
import { queryCacheManager } from '../services/queryCacheManager';

export interface UseQueryResult {
  // State
  isLoading: boolean;
  response: DynamicResponse | null;
  error: Error | null;
  executionTimeMs: number | null;
  isCached: boolean;

  // Decision routing from backend  
  decisionRouting: DecisionRouting | null;
  decisionType: DecisionType | null;
  decisionConfidence: number | null;

  // Methods
  executeQuery: (query: string, files?: File[]) => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => any;
}

/**
 * Hook for executing queries with transparent caching and decision routing display.
 * All intelligence is delegated to the backend.
 */
export function useQuery(sessionId: string, token: string): UseQueryResult {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<DynamicResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [decisionRouting, setDecisionRouting] = useState<DecisionRouting | null>(null);
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [decisionConfidence, setDecisionConfidence] = useState<number | null>(null);

  const executeQuery = useCallback(
    async (query: string, files?: File[]) => {
      setIsLoading(true);
      setError(null);

      try {
        // Dispatch execution start
        dispatch(startQueryExecution({ query }));

        // Execute query with manager (handles caching transparently)
        const result: QueryExecutionResult = await queryManager.executeQuery({
          token,
          sessionId,
          query,
          files,
        });

        // Update local state
        setResponse(result.response);
        setExecutionTimeMs(result.executionTimeMs);
        setIsCached(result.cached);

        // Extract decision routing metadata from backend
        if (result.response.decision_routing) {
          setDecisionRouting(result.response.decision_routing);
          setDecisionType(result.response.decision_routing.decision);
          setDecisionConfidence(result.response.decision_routing.confidence);

          // Log decision for debugging
          console.log('Backend Decision Engine Result:', {
            decision: result.response.decision_routing.decision,
            confidence: result.response.decision_routing.confidence,
            reasoning: result.response.decision_routing.reasoning,
          });
        }

        // Dispatch execution complete
        dispatch(completeQueryExecution({
          executionTimeMs: result.executionTimeMs,
          cached: result.cached,
        }));

        // Update cache stats
        const cacheStats = queryCacheManager.getStats();
        dispatch(updateCacheStats({
          hitRate: cacheStats.hitRate,
          memoryUsageMB: cacheStats.memoryUsage / (1024 * 1024),
          entriesCount: cacheStats.totalEntries,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error('Query execution error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [token, sessionId, dispatch]
  );

  const clearCache = useCallback(() => {
    queryCacheManager.invalidateAll();
    setResponse(null);
    setIsCached(false);
    setDecisionRouting(null);
    setDecisionType(null);
    setDecisionConfidence(null);
  }, []);

  const getCacheStats = useCallback(() => {
    return queryCacheManager.exportStats();
  }, []);

  return {
    isLoading,
    response,
    error,
    executionTimeMs,
    isCached,
    decisionRouting,
    decisionType,
    decisionConfidence,
    executeQuery,
    clearCache,
    getCacheStats,
  };
}

/**
 * Hook for monitoring query performance metrics
 */
export function useQueryMetrics() {
  const getMetrics = useCallback(() => {
    return queryManager.exportMetrics();
  }, []);

  const getCacheStats = useCallback(() => {
    return queryCacheManager.getStats();
  }, []);

  const getTopQueries = useCallback(() => {
    return queryCacheManager.getTopEntries(10);
  }, []);

  return {
    getMetrics,
    getCacheStats,
    getTopQueries,
  };
}
