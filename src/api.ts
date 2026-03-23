import axios from "axios";

/**
 * API helper module — aligned with genai-agnostic-be backend.
 *
 * Backend architecture:
 *   POST /api/chat        → SSE stream (main chat endpoint)
 *   POST /api/chat/upload → SSE stream (file upload)
 *   POST /api/chat/clarify → JSON (clarification response)
 *   GET  /api/chat/sessions → JSON (list sessions)
 *   GET  /api/chat/session/{id} → JSON (get session messages)
 *   DELETE /api/chat/session/{id} → JSON (delete session)
 *   PUT  /api/chat/session/{id}/rename → JSON (rename session)
 *   POST /api/chat/message/{id}/react → JSON (like/dislike)
 *   POST /api/chat/cancel/{id} → JSON (cancel generation)
 *   POST /api/auth/login → JSON (login)
 *   POST /api/auth/register → JSON (register)
 *   GET  /admin/health → JSON (health check)
 */

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_URL,
});

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  created_at: string;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface NewSessionResponse {
  success: boolean;
  session_id: string;
}

export interface SessionSummary {
  id: string;
  session_id: string; // alias for id
  created_at: string;
  updated_at?: string;
  last_updated?: string;
  title?: string;
  message_count?: number;
}

export interface SessionsResponse {
  user_id: string;
  sessions: SessionSummary[];
}

// ============================================================================
// MESSAGE & HISTORY TYPES
// ============================================================================

export interface MessageSchema {
  id: string;
  role: "user" | "assistant";
  content: string;
  content_sql?: string;
  metadata?: Record<string, any>;
  follow_ups?: any[];
  reaction?: "like" | "dislike" | null;
  created_at?: string;
  query?: string;
  queried_at?: string;
  responded_at?: string;
  updated_at?: string;
  response?: any;
  feedback?: "LIKED" | "DISLIKED" | null;
  response_metadata?: any;
}

export interface SessionHistoryResponse {
  session_id: string;
  messages: MessageSchema[];
}

// ============================================================================
// SSE EVENT TYPES (from backend stream)
// ============================================================================

export interface SSEEvent {
  type: string;
  [key: string]: any;
}

export interface ProgressEvent {
  step: string;
  label: string;
}

// ============================================================================
// QUERY & RESPONSE TYPES
// ============================================================================

export type DecisionType = "RUN_SQL" | "ANALYZE_FILES" | "CHAT";

export interface DecisionRouting {
  decision: DecisionType;
  confidence: number;
  reasoning?: string;
}

export interface ClarifyingQuestionOption {
  value: string;
  label: string;
  description?: string;
  similarity?: number;
}

export interface ClarifyingQuestion {
  type?: "binary" | "multiple_choice" | "missing_parameter" | "value_input" | "entity_disambiguation" | "ambiguous_table" | "ambiguous_value" | "ambiguous_column" | string;
  question: string;
  options?: Array<string | ClarifyingQuestionOption>;
  mode?: string;
  required_field?: string;
  input_type?: "number" | "string" | "date";
}

export interface ColumnMeta {
  name: string;
  label?: string;
  datatype: "number" | "string" | "date" | "boolean";
  semantic_role?: string;
  format_hint?: string;
  nullable?: boolean;
}

export interface DataPayload {
  kind: "sql_result" | "file_table" | "document_extract" | "chat_context" | "none";
  columns: ColumnMeta[];
  rows: Record<string, any>[];
  row_count: number;
  truncated: boolean;
  total_available_rows?: number;
}

export type ArtifactType = "stat_card" | "table" | "bar_chart" | "line_chart" | "bar_chart_horizontal" | "pie_chart" | "summary_block" | "text_block";

export interface RenderArtifact {
  id: string;
  type: ArtifactType;
  title?: string;
  order: number;
  [key: string]: any;
}

export interface Visualization {
  chart_id: string;
  type: "pie" | "bar" | "line" | "table" | "scatter" | string;
  title?: string;
  data?: any[];
  config?: any;
}

export interface DynamicResponse {
  id?: string;
  type: string;
  success?: boolean;
  sql?: string;
  intent: string;
  confidence: number;
  message: string;
  visualizations?: Visualization[];
  related_queries?: string[];
  clarifying_question?: string | ClarifyingQuestion | null;
  error?: string | null;
  decision_routing?: DecisionRouting;
  assistant?: {
    role?: string;
    title?: string | null;
    content?: Array<{
      type: "paragraph" | "table" | "bullets" | "numbered" | "callout" | "code";
      text?: string;
      items?: string[];
      headers?: string[];
      rows?: (string | number)[][];
      [key: string]: any;
    }>;
  };
  followups?: Array<{ id: string; text: string }>;
  routing?: {
    type: string;
    intent: string;
    confidence: number;
  };
  data?: DataPayload;
  render_artifacts?: RenderArtifact[];
  suggested_questions?: string[];
  execution_meta?: {
    sql?: string;
    execution_time_ms?: number;
    warnings?: string[];
  };
  metadata?: Record<string, any>;
}

export interface DynamicResponseWrapper {
  success: boolean;
  response: DynamicResponse;
  timestamp?: number | string;
  original_query?: string;
  id: string;
}

export type FeedbackValue = "LIKED" | "DISLIKED" | null;

// Types used by components (kept for compatibility)
export type ConfidenceLevel = 'VERY_CONFIDENT' | 'CONFIDENT' | 'MODERATE' | 'LOW' | 'VERY_LOW';

export interface IntelligentModalResponse {
  success: boolean;
  query_type?: 'DATABASE_QUERY' | 'FILE_ANALYSIS';
  results?: { rows?: any[]; row_count?: number; columns?: string[]; summary?: string };
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  risk_score: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message?: string;
  metadata?: Record<string, any>;
  warnings?: string[];
  improvements?: string[];
  related_queries?: string[];
  clarifying_question?: string | ClarifyingQuestion | null;
}

export interface StatCardArtifact {
  id: string;
  type: 'stat_card';
  title?: string;
  order: number;
  value: number | string;
  label: string;
  subtitle?: string;
  format_hint?: string;
}

export interface TableArtifact {
  id: string;
  type: 'table';
  title?: string;
  order: number;
  columns: string[];
  rows: any[][];
  row_count: number;
  truncated: boolean;
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
}

export interface ChartArtifact {
  id: string;
  type: 'bar_chart' | 'line_chart' | 'bar_chart_horizontal' | 'pie_chart';
  title?: string;
  order: number;
  x_axis: { field: string; label: string };
  y_axis: { field: string; label: string };
  series: Array<{ field: string; label: string }>;
  stacked: boolean;
  data_ref: string;
}

export interface VisualizationType {
  name: string;
  description: string;
}

export interface ResponseType {
  name: string;
  description: string;
  visualizations: VisualizationType[];
}

export interface CapabilitiesResponse {
  response_types: ResponseType[];
  supported_file_types: string[];
}

export interface HealthResponse {
  status: string;
}

type UploadInput =
  | File[]
  | FileList
  | Array<File | Blob | string | null | undefined>
  | null
  | undefined;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function normalizeFiles(input: UploadInput): Array<File | Blob> {
  if (!input) return [];
  const arr: any[] =
    input instanceof FileList ? Array.from(input) : Array.isArray(input) ? input : [];
  const cleaned = arr.filter((x) => x != null);
  const bad = cleaned.filter((x) => !(x instanceof File) && !(x instanceof Blob));
  if (bad.length > 0) {
    throw new Error(`Invalid files input. Expected File/Blob.`);
  }
  return cleaned as Array<File | Blob>;
}

// ============================================================================
// SSE STREAM CONSUMER
// ============================================================================

/**
 * Parse a backend SSE stream and yield typed events.
 * The backend sends: event: <type>\ndata: <json>\n\n
 */
async function* consumeSSEStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  if (!response.ok || !response.body) {
    throw new Error(`SSE stream failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "message";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            yield { type: currentEventType, ...data };
          } catch {
            // malformed JSON — skip
          }
          currentEventType = "message";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export async function registerUser(
  username: string,
  password: string
): Promise<UserResponse> {
  const res = await apiClient.post<UserResponse>("/api/auth/register", {
    username,
    password,
  });
  return res.data;
}

export async function loginUser(
  username: string,
  password: string
): Promise<TokenResponse> {
  // Backend returns { token, user } — map to { access_token }
  const res = await apiClient.post("/api/auth/login", { username, password });
  return { access_token: res.data.token };
}

// ============================================================================
// SESSION MANAGEMENT API
// ============================================================================

/**
 * Create a new chat session.
 * Backend auto-creates sessions on first message, but we can pre-create via
 * sending an empty init or by just generating a local ID.
 */
export async function createNewSession(
  _token: string
): Promise<NewSessionResponse> {
  // Backend doesn't have a dedicated "new_session" endpoint.
  // Sessions are auto-created when the first message is sent.
  // We generate a local session ID — the backend will create it on first chat.
  return {
    success: true,
    session_id: crypto.randomUUID(),
  };
}

/**
 * List all chat sessions.
 * Backend: GET /api/chat/sessions → returns array of session objects
 */
export async function listSessions(
  token: string,
  _page: number = 1,
  _pageSize: number = 20
): Promise<SessionsResponse> {
  const res = await apiClient.get("/api/chat/sessions", {
    headers: getAuthHeaders(token),
  });
  // Backend returns flat array; wrap in SessionsResponse format
  const sessions: SessionSummary[] = (res.data || []).map((s: any) => ({
    id: s.id,
    session_id: String(s.id),
    created_at: s.created_at,
    last_updated: s.updated_at,
    title: s.title,
    message_count: s.message_count,
  }));
  return { user_id: "local", sessions };
}

/**
 * Get session chat history.
 * Backend: GET /api/chat/session/{id} → { session_id, messages[] }
 */
export async function getSessionHistory(
  token: string,
  sessionId: string
): Promise<SessionHistoryResponse> {
  const res = await apiClient.get(`/api/chat/session/${sessionId}`, {
    headers: getAuthHeaders(token),
  });
  // Map backend messages to frontend format
  const parseJsonField = (val: any, fallback: any = undefined) => {
    if (val == null) return fallback;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return fallback; }
    }
    return val;
  };
  const messages: MessageSchema[] = (res.data.messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    content_sql: m.content_sql,
    metadata: parseJsonField(m.metadata, {}),
    query: m.role === "user" ? m.content : undefined,
    queried_at: m.created_at,
    responded_at: m.created_at,
    response: m.role === "assistant" ? { message: m.content, sql: m.content_sql } : undefined,
    feedback: m.reaction === "like" ? "LIKED" : m.reaction === "dislike" ? "DISLIKED" : null,
    follow_ups: parseJsonField(m.follow_ups, []),
  }));
  return { session_id: sessionId, messages };
}

/**
 * Delete a session.
 * Backend: DELETE /api/chat/session/{id}
 */
export async function deleteSession(
  token: string,
  sessionId: string
): Promise<{ success: boolean; session_id: string }> {
  await apiClient.delete(`/api/chat/session/${sessionId}`, {
    headers: getAuthHeaders(token),
  });
  return { success: true, session_id: sessionId };
}

/**
 * Rename a session.
 * Backend: PUT /api/chat/session/{id}/rename?title=...
 */
export async function renameSession(
  token: string,
  sessionId: string,
  title: string
): Promise<{ success: boolean; session_id: string; title: string }> {
  await apiClient.put(
    `/api/chat/session/${sessionId}/rename`,
    null,
    { headers: getAuthHeaders(token), params: { title } }
  );
  return { success: true, session_id: sessionId, title };
}

// ============================================================================
// CHAT API — SSE STREAMING
// ============================================================================

/**
 * Callback type for SSE events during streaming.
 * Components use this to update progress steps in real-time.
 */
export type SSEEventCallback = (event: SSEEvent) => void;

/**
 * Send a chat message via SSE stream.
 * Consumes the SSE stream, accumulates events into a DynamicResponseWrapper.
 *
 * Backend: POST /api/chat → SSE stream with events:
 *   typing_start, step, query_plan, text_delta, text_done,
 *   data, follow_ups, clarification, error, session_meta, done
 */
export async function sendQuery(
  token: string,
  sessionId: string,
  query: string,
  files?: UploadInput,
  signal?: AbortSignal,
  _trackingId?: string,
  onEvent?: SSEEventCallback
): Promise<DynamicResponseWrapper> {
  const normalizedFiles = normalizeFiles(files);
  const hasFiles = normalizedFiles.length > 0;

  let response: Response;

  if (hasFiles) {
    // File upload: POST /api/chat/upload (multipart/form-data)
    const formData = new FormData();
    formData.append("message", query);
    formData.append("session_id", sessionId);
    normalizedFiles.forEach((f) => formData.append("file", f));

    response = await fetch(`${API_URL}/api/chat/upload`, {
      method: "POST",
      headers: { ...getAuthHeaders(token) },
      body: formData,
      signal,
    });
  } else {
    // Regular chat: POST /api/chat (JSON body → SSE response)
    response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: query, session_id: sessionId }),
      signal,
    });
  }

  // Accumulate SSE events into a structured response
  let messageContent = "";
  let sql = "";
  let dataRows: any[] = [];
  let dataColumns: string[] = [];
  let rowCount = 0;
  let truncated = false;
  let followUps: string[] = [];
  let clarification: ClarifyingQuestion | null = null;
  let errorMsg: string | null = null;
  let messageId = "";
  let sessionTitle = "";
  let intent = "CHAT";
  let confidence = 1.0;
  let vizConfig: any = null;

  for await (const event of consumeSSEStream(response, signal)) {
    // Forward event to callback for real-time UI updates (progress steps)
    if (onEvent) {
      onEvent(event);
    }

    switch (event.type) {
      case "step":
        // Progress step — forwarded via onEvent callback
        break;

      case "text_delta":
        messageContent += event.delta || "";
        break;

      case "text_done":
        messageContent = event.content || messageContent;
        break;

      case "data":
        dataRows = event.rows || [];
        dataColumns = event.columns || [];
        rowCount = event.row_count || 0;
        sql = event.sql || sql;
        truncated = event.truncated || false;
        break;

      case "follow_ups":
        followUps = (event.suggestions || []).map((s: any) =>
          typeof s === "string" ? s : s.text || s.label || ""
        );
        break;

      case "clarification":
        clarification = event.clarification || event;
        break;

      case "error":
        errorMsg = event.message || "An error occurred";
        break;

      case "session_meta":
        sessionTitle = event.session_title || "";
        if (event.session_id) {
          // Backend assigned a real session ID
          sessionId = event.session_id;
        }
        break;

      case "viz_config":
        vizConfig = event.config || null;
        break;

      case "query_plan":
        // Extract intent from query plan if available
        break;

      case "done":
        messageId = event.message_id || "";
        break;

      default:
        break;
    }
  }

  // Build the DynamicResponse from accumulated events
  const dynamicResponse: DynamicResponse = {
    id: messageId,
    type: dataRows.length > 0 ? "data_query" : "standard",
    success: !errorMsg,
    sql: sql || undefined,
    intent,
    confidence,
    message: messageContent,
    related_queries: followUps,
    clarifying_question: clarification
      ? (clarification.question || JSON.stringify(clarification))
      : null,
    error: errorMsg,
    metadata: {
      row_count: rowCount,
      column_names: dataColumns,
      execution_time_ms: 0,
      session_title: sessionTitle || undefined,
    },
  };

  // Add data payload if we have rows
  if (dataRows.length > 0) {
    dynamicResponse.data = {
      kind: "sql_result",
      columns: dataColumns.map((c) => ({ name: c, datatype: "string" as const })),
      rows: dataRows,
      row_count: rowCount,
      truncated,
    };

    // Also set legacy_data for components that use it
    (dynamicResponse as any).legacy_data = dataRows;

    // Auto-create visualizations so viz type icons appear and data renders
    const primaryType = vizConfig?.viz_type || "table";
    const availableViews = vizConfig?.available_views || ["table", "bar", "pie", "line"];
    if (!dynamicResponse.visualizations) {
      dynamicResponse.visualizations = [
        {
          chart_id: "auto-viz",
          type: primaryType,
          title: "Data",
          data: dataRows,
          config: { available_views: availableViews, primary_view: primaryType },
        },
      ];
    }
  }

  // If clarification, format as clarifying_question object for ClarifyingQuestionHandler
  if (clarification) {
    dynamicResponse.clarifying_question = clarification;
  }

  return {
    success: !errorMsg,
    response: dynamicResponse,
    timestamp: Date.now(),
    original_query: query,
    id: messageId,
  };
}

// ============================================================================
// PROGRESS STREAM (kept for backward compatibility — now driven by onEvent)
// ============================================================================

export async function* openProgressStream(
  _token: string,
  _messageId: string,
  _signal?: AbortSignal
): AsyncGenerator<ProgressEvent> {
  // In the new architecture, progress events come through the main SSE stream
  // via the onEvent callback in sendQuery(). This function is kept as a no-op
  // for backward compatibility — it yields nothing and returns immediately.
  return;
}

// ============================================================================
// MESSAGE ACTIONS API
// ============================================================================

export async function stopMessage(
  token: string,
  sessionId: string
): Promise<{ success: boolean }> {
  const res = await apiClient.post(
    `/api/chat/cancel/${sessionId}`,
    {},
    { headers: getAuthHeaders(token) }
  );
  return res.data;
}

export async function submitMessageFeedback(
  token: string,
  messageId: string,
  feedback: FeedbackValue
): Promise<void> {
  // Map LIKED/DISLIKED to backend's like/dislike
  const reaction = feedback === "LIKED" ? "like" : feedback === "DISLIKED" ? "dislike" : null;
  await apiClient.post(
    `/api/chat/message/${messageId}/react`,
    { reaction },
    { headers: getAuthHeaders(token) }
  );
}

/**
 * Submit clarification response.
 * Backend: POST /api/chat/clarify
 */
export async function submitClarification(
  token: string,
  sessionId: string,
  clarificationType: string,
  selectedValues: any
): Promise<void> {
  await apiClient.post(
    "/api/chat/clarify",
    {
      session_id: sessionId,
      clarification_type: clarificationType,
      selected_values: selectedValues,
    },
    { headers: getAuthHeaders(token) }
  );
}

// ============================================================================
// HEALTH & CAPABILITIES
// ============================================================================

export async function checkHealth(): Promise<HealthResponse> {
  const res = await apiClient.get<HealthResponse>("/admin/health");
  return res.data;
}

/**
 * Get capabilities — returns static defaults since backend doesn't have this endpoint.
 */
export async function getCapabilities(
  _token: string
): Promise<CapabilitiesResponse> {
  return {
    response_types: [
      {
        name: "data_query",
        description: "Database queries with visualizations",
        visualizations: [
          { name: "table", description: "Tabular data" },
          { name: "bar", description: "Bar chart" },
          { name: "line", description: "Line chart" },
          { name: "pie", description: "Pie chart" },
        ],
      },
      { name: "file_query", description: "File analysis", visualizations: [] },
      { name: "standard", description: "General conversation", visualizations: [] },
    ],
    supported_file_types: ["txt", "json", "xlsx", "pdf", "csv", "docx"],
  };
}

export async function getExamples(_token: string): Promise<Record<string, string>> {
  return {
    data_query: "Show me all customers from Hyderabad",
    file_query: "Analyze the uploaded CSV file",
    standard: "What tables are available?",
  };
}

// ============================================================================
// BACKWARDS COMPATIBILITY WRAPPERS
// ============================================================================

export async function sendChatMessage(
  token: string,
  message: string,
  sessionId?: string | null,
  files?: UploadInput
): Promise<DynamicResponseWrapper> {
  if (!sessionId) throw new Error("Session ID is required");
  return sendQuery(token, sessionId, message, files);
}

export async function sendDynamicQuery(
  token: string,
  sessionId: string,
  query: string,
  files?: UploadInput
): Promise<DynamicResponseWrapper> {
  return sendQuery(token, sessionId, query, files);
}
