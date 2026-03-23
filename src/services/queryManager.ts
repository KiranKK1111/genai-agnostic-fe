/**
 * Query Manager
 *
 * Simplified query execution with transparent caching.
 * The backend now handles all intelligent routing:
 * - Decision Engine: Routes to SQL/FILES/CHAT
 * - Schema Discovery: Finds tables & columns
 * - Entity Parser: Extracts intent & values
 * - Safety Validator: Ensures SQL safety
 *
 * Frontend responsibilities:
 * - Execute queries via unified /query endpoint
 * - Cache results transparently
 * - Display decision routing & metadata
 */

import { DynamicResponse } from '../api';
import { queryCacheManager } from './queryCacheManager';
import { executeAdhocQuery, AdhocQueryOptions } from './adhocQueryHandler';

export interface QueryExecutionOptions {
  token: string;
  sessionId: string;
  query: string;
  files?: File[];
  skipCache?: boolean; // Skip cache lookup/storage
  onProgress?: (progress: number) => void;
}

export interface QueryExecutionResult {
  response: DynamicResponse;
  executionTimeMs: number;
  cached: boolean;
  source: 'cache' | 'api'; // Where the response came from
  timestamp: number;
}

/**
 * Main Query Manager
 *
 * Simplified orchestrator that:
 * 1. Checks cache for existing results
 * 2. Calls backend API if not cached
 * 3. Caches successful responses
 * 4. Returns results with backend metadata
 */
export class QueryManager {
  /**
   * Execute a query with transparent caching
   */
  async executeQuery(options: QueryExecutionOptions): Promise<QueryExecutionResult> {
    const startTime = Date.now();
    const cacheKey = queryCacheManager.generateCacheKey(
      options.query,
      options.sessionId
    );

    // 1. Try cache first (unless skipped)
    if (!options.skipCache) {
      const cachedResponse = queryCacheManager.get<DynamicResponse>(cacheKey);
      if (cachedResponse) {
        if (options.onProgress) {
          options.onProgress(100);
        }

        return {
          response: cachedResponse,
          executionTimeMs: Date.now() - startTime,
          cached: true,
          source: 'cache',
          timestamp: Date.now(),
        };
      }
    }

    // 2. Execute query via API
    if (options.onProgress) {
      options.onProgress(50);
    }

    try {
      const result = await executeAdhocQuery({
        token: options.token,
        sessionId: options.sessionId,
        query: options.query,
        files: options.files,
        onProgress: options.onProgress,
      });

      // 3. Cache successful responses (unless skipped)
      if (!options.skipCache) {
        // Default cache validity: 5 minutes for adhoc queries
        const cacheValidityMs = 5 * 60 * 1000;
        queryCacheManager.set(cacheKey, result.response, cacheValidityMs, {
          source: 'api',
          decisionType: result.response.decision_routing?.decision,
        });
      }

      return {
        response: result.response,
        executionTimeMs: result.executionTimeMs,
        cached: false,
        source: 'api',
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('Query execution failed:', error);

      // Return error response
      const errorResponse: DynamicResponse = {
        type: 'error',
        intent: 'error_handling',
        confidence: 0,
        message: error?.message || 'Failed to process your query. Please try again.',
        metadata: {
          error: error?.error?.message || error?.message,
          executionTimeMs: Date.now() - startTime,
        },
      };

      return {
        response: errorResponse,
        executionTimeMs: Date.now() - startTime,
        cached: false,
        source: 'api',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return queryCacheManager.getStats();
  }

  /**
   * Export comprehensive performance metrics
   */
  exportMetrics() {
    return {
      cache: queryCacheManager.exportStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all caches and reset stats
   */
  reset() {
    queryCacheManager.invalidateAll();
  }
}

// Singleton instance
export const queryManager = new QueryManager();
