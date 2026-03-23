/**
 * Query Management Redux Slice
 *
 * Manages query execution state and caching statistics.
 * Classification logic moved to backend DecisionEngine.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface QueryMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageExecutionTimeMs: number;
  lastQueryTimestamp: number;
}

export interface QueryCacheState {
  isEnabled: boolean;
  maxSize: number;
  hitRate: number;
  memoryUsageMB: number;
  entriesCount: number;
}

export interface QueryState {
  // Current query execution
  isExecuting: boolean;
  currentQuery: string | null;
  executionTimeMs: number | null;

  // Caching state
  cache: QueryCacheState;

  // Performance metrics
  metrics: QueryMetrics;

  // Query history for analytics
  recentQueries: Array<{
    query: string;
    executionTimeMs: number;
    cached: boolean;
    timestamp: number;
  }>;
}

const initialState: QueryState = {
  isExecuting: false,
  currentQuery: null,
  executionTimeMs: null,

  cache: {
    isEnabled: true,
    maxSize: 50,
    hitRate: 0,
    memoryUsageMB: 0,
    entriesCount: 0,
  },

  metrics: {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageExecutionTimeMs: 0,
    lastQueryTimestamp: 0,
  },

  recentQueries: [],
};

export const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    // Query execution start
    startQueryExecution: (
      state,
      action: PayloadAction<{
        query: string;
      }>
    ) => {
      state.isExecuting = true;
      state.currentQuery = action.payload.query;
      state.executionTimeMs = null;
    },

    // Query execution complete
    completeQueryExecution: (
      state,
      action: PayloadAction<{
        executionTimeMs: number;
        cached: boolean;
      }>
    ) => {
      state.isExecuting = false;
      state.executionTimeMs = action.payload.executionTimeMs;

      // Update metrics
      state.metrics.totalQueries++;
      state.metrics.lastQueryTimestamp = Date.now();

      if (action.payload.cached) {
        state.metrics.cacheHits++;
      } else {
        state.metrics.cacheMisses++;
      }

      // Update average execution time
      const totalTime = state.metrics.averageExecutionTimeMs * (state.metrics.totalQueries - 1);
      state.metrics.averageExecutionTimeMs =
        (totalTime + action.payload.executionTimeMs) / state.metrics.totalQueries;

      // Add to recent queries (keep last 50)
      state.recentQueries.unshift({
        query: state.currentQuery || '',
        executionTimeMs: action.payload.executionTimeMs,
        cached: action.payload.cached,
        timestamp: Date.now(),
      });

      if (state.recentQueries.length > 50) {
        state.recentQueries.pop();
      }
    },

    // Update cache stats
    updateCacheStats: (
      state,
      action: PayloadAction<{
        hitRate: number;
        memoryUsageMB: number;
        entriesCount: number;
      }>
    ) => {
      state.cache.hitRate = action.payload.hitRate;
      state.cache.memoryUsageMB = action.payload.memoryUsageMB;
      state.cache.entriesCount = action.payload.entriesCount;
    },

    // Clear query history
    clearQueryHistory: (state) => {
      state.recentQueries = [];
    },

    // Reset all metrics
    resetMetrics: (state) => {
      state.metrics = initialState.metrics;
    },
  },
});

export const {
  startQueryExecution,
  completeQueryExecution,
  updateCacheStats,
  clearQueryHistory,
  resetMetrics,
} = querySlice.actions;

export default querySlice.reducer;
