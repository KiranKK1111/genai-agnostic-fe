/**
 * Adhoc Query Handler
 * 
 * Handles dynamic, real-time queries that require computation.
 * These queries are not cached and are computed on-demand.
 * 
 * INTEGRATION WITH NEW BACKEND ARCHITECTURE:
 * - Calls the unified /query endpoint
 * - Backend uses DecisionEngine to route to SQL/FILES/CHAT intelligently
 * - Backend discovers schema dynamically at runtime
 * - Backend uses HybridMatcher for semantic table/column matching
 * - Backend validates SQL safety before execution
 * - Backend is database-agnostic (works with any schema)
 * 
 * The backend handles:
 * 1. Decision routing (RUN_SQL | ANALYZE_FILES | CHAT)
 * 2. Schema discovery & normalization
 * 3. Entity/intent parsing
 * 4. Semantic matching (find right tables/columns)
 * 5. SQL safety validation
 * 6. Parameterized query generation
 */

import { sendDynamicQuery, DynamicResponseWrapper, DecisionType } from '../api';
import { DynamicResponse } from '../api';

export interface AdhocQueryOptions {
  token: string;
  sessionId: string;
  query: string;
  files?: File[];
  timeout?: number; // milliseconds
  priority?: 'high' | 'normal' | 'low'; // For future queue management
  onProgress?: (progress: number) => void; // 0-100
}

export interface AdhocQueryResult {
  response: DynamicResponse;
  executionTimeMs: number;
  cached: false;
  isAdhoc: true;
  timestamp: number;
  decisionType?: DecisionType;
  decisionConfidence?: number;
}

/**
 * Execute an adhoc query by calling the backend API
 * 
 * The backend now uses intelligent decision routing to understand what the user wants
 * and routes accordingly:
 * - RUN_SQL: Natural language queries against database (schema-agnostic)
 * - ANALYZE_FILES: File analysis and content extraction
 * - CHAT: General conversation and knowledge questions
 */
export async function executeAdhocQuery(
  options: AdhocQueryOptions
): Promise<AdhocQueryResult> {
  const startTime = Date.now();
  
  try {
    // Call backend API for dynamic query processing
    // Backend uses new architecture features:
    // - Schema discovery (SchemaCatalog)
    // - Entity parsing (EntityParser)
    // - Decision routing (DecisionEngine)
    // - Semantic matching (HybridMatcher)
    // - Safety validation (SQLSafetyValidator)
    const result: DynamicResponseWrapper = await sendDynamicQuery(
      options.token,
      options.sessionId,
      options.query,
      options.files
    );

    const executionTimeMs = Date.now() - startTime;

    // If progress callback provided, signal completion
    if (options.onProgress) {
      options.onProgress(100);
    }

    // Extract decision metadata from response
    const decisionRouting = result.response.decision_routing || 
                          { decision: 'RUN_SQL' as DecisionType, confidence: 0.5 };
    
    return {
      response: result.response,
      executionTimeMs,
      cached: false,
      isAdhoc: true,
      timestamp: Date.now(),
      decisionType: decisionRouting.decision,
      decisionConfidence: decisionRouting.confidence,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    
    console.error('Adhoc query execution error:', error);
    
    // Return error response
    throw {
      executionTimeMs,
      error,
      timestamp: Date.now(),
    };
  }
}

/**
 * Validate adhoc query is appropriate (not better served by frequent query)
 */
export function validateAdhocQuery(query: string): {
  valid: boolean;
  warning?: string;
} {
  // Check query length
  if (query.length < 5) {
    return {
      valid: false,
      warning: 'Query too short to process effectively',
    };
  }

  if (query.length > 5000) {
    return {
      valid: false,
      warning: 'Query exceeds maximum length limit',
    };
  }

  return { valid: true };
}

/**
 * Estimate query complexity (useful for priority/timeout settings)
 */
export function estimateQueryComplexity(query: string): 'simple' | 'moderate' | 'complex' {
  const queryLower = query.toLowerCase();
  
  // Complex indicators
  let complexityScore = 0;
  
  // Check for complex keywords
  const complexKeywords = [
    'compare', 'correlation', 'forecast', 'predict', 'trend',
    'anomal', 'optimization', 'root cause', 'impact analysis'
  ];
  
  complexKeywords.forEach(kw => {
    if (queryLower.includes(kw)) complexityScore += 2;
  });
  
  // Check for multiple conditions
  const conditions = (query.match(/and|or|but/gi) || []).length;
  complexityScore += conditions * 0.5;
  
  // Check for time-based queries
  if (/yesterday|last week|last month|year to date|ytd/i.test(query)) {
    complexityScore += 1;
  }
  
  // Check for comparison queries
  if (/vs|versus|compare|difference/i.test(query)) {
    complexityScore += 1.5;
  }

  if (complexityScore > 4) return 'complex';
  if (complexityScore > 2) return 'moderate';
  return 'simple';
}

/**
 * Get suggested timeout based on query complexity
 */
export function getSuggestedTimeout(complexity: 'simple' | 'moderate' | 'complex'): number {
  const timeouts = {
    simple: 5000,      // 5 seconds
    moderate: 15000,   // 15 seconds
    complex: 30000,    // 30 seconds
  };
  return timeouts[complexity];
}

/**
 * QueryExecutor service for managing both frequent and adhoc queries
 */
export class QueryExecutor {
  private activeQueries: Map<string, Promise<any>> = new Map();
  private queryStats: Map<string, { count: number; totalTime: number }> = new Map();

  /**
   * Execute adhoc query with deduplication
   * If the same query is already in progress, return the existing promise
   */
  async executeWithDedup(options: AdhocQueryOptions): Promise<AdhocQueryResult> {
    const queryHash = this.hashQuery(options.query, options.sessionId);
    
    // Return existing promise if query is already in progress
    if (this.activeQueries.has(queryHash)) {
      return this.activeQueries.get(queryHash)!;
    }

    // Execute and store promise
    const promise = executeAdhocQuery(options);
    this.activeQueries.set(queryHash, promise);

    try {
      const result = await promise;
      this.recordQueryStats(queryHash, result.executionTimeMs);
      return result;
    } finally {
      this.activeQueries.delete(queryHash);
    }
  }

  /**
   * Record query statistics
   */
  private recordQueryStats(queryHash: string, executionTimeMs: number): void {
    const existing = this.queryStats.get(queryHash) || { count: 0, totalTime: 0 };
    existing.count++;
    existing.totalTime += executionTimeMs;
    this.queryStats.set(queryHash, existing);
  }

  /**
   * Get average execution time for a query
   */
  getAverageExecutionTime(query: string, sessionId: string): number {
    const queryHash = this.hashQuery(query, sessionId);
    const stats = this.queryStats.get(queryHash);
    
    if (!stats || stats.count === 0) return 0;
    return stats.totalTime / stats.count;
  }

  /**
   * Get top slow queries
   */
  getSlowQueries(limit: number = 10): Array<{
    query: string;
    avgTimeMs: number;
    count: number;
  }> {
    return Array.from(this.queryStats.entries())
      .map(([hash, stats]) => ({
        query: hash,
        avgTimeMs: stats.totalTime / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgTimeMs - a.avgTimeMs)
      .slice(0, limit);
  }

  /**
   * Clear query statistics
   */
  clearStats(): void {
    this.queryStats.clear();
  }

  /**
   * Hash query for deduplication
   */
  private hashQuery(query: string, sessionId: string): string {
    const input = `${query}|${sessionId}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `adhoc_${Math.abs(hash)}`;
  }
}

// Singleton instance
export const queryExecutor = new QueryExecutor();
