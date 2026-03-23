/**
 * Session State Types
 * Mirrors backend QueryState from session_state JSONB column
 */

export interface Entity {
  name: string;
  type: 'table' | 'column' | 'metric' | 'filter' | 'aggregation';
  value?: string;
  confidence?: number;
}

export interface QueryState {
  last_classified_intent: string | null;
  entities: Entity[];
  ambiguity_score?: number;
  classification_confidence?: number;
  last_state_update?: string; // ISO timestamp
  user_clarifications?: string[];
  follow_up_queries?: Array<{
    query: string;
    context: string;
    suggested_at: string;
  }>;
  [key: string]: unknown; // Allow for additional fields from backend
}

export interface ToolCall {
  tool_id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
  result: string | Record<string, unknown> | null;
  status: 'pending' | 'success' | 'error';
  error?: string;
  executed_at: string; // ISO timestamp
  execution_time_ms?: number;
}

export interface AmbiguityEvent {
  triggered_at: string;
  confidence_score: number;
  reason: string;
  suggested_clarifications?: string[];
  user_response?: string;
  resolved: boolean;
}

export interface SessionMetadata {
  session_state: QueryState | null;
  tool_calls_log: ToolCall[];
  ambiguity_events: AmbiguityEvent[];
  state_updated_at?: string;
  confidence_threshold?: number; // Default 0.6
}

export interface ChatMessageWithMetadata {
  sessionMetadata?: SessionMetadata;
  [key: string]: unknown;
}
