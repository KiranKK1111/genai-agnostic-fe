import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SessionMetadata } from '../types/sessionState';

// A single message in a chat. Assistant messages may include a
// response object returned from the backend.
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // Response returned from the backend; undefined for user messages
  response?: any;
  // Metadata about the response (stored separately in backend)
  response_metadata?: any;
  // Follow-up suggestions from dynamic response generation
  relatedQueries?: string[];
  // Confidence score from the model
  confidence?: number;
  // Whether this is a refined response
  isRefinement?: boolean;
  // Attachments (file names) included with user messages
  attachments?: string[];
  // Maps filename → backend file_id UUID so chips can trigger downloads
  attachmentIds?: Record<string, string>;
  // Maps filename → { size: bytes, type: mime/ext } for display in chips
  attachmentMeta?: Record<string, { size?: number; type?: string }>;
  // Clarifying question from the backend if message/data is ambiguous
  clarifyingQuestion?: string | null;
  // Original query for clarifying question confirmation
  originalQuery?: string;
  // Backend session state metadata (QueryState, tool_calls_log, ambiguity_events)
  sessionMetadata?: SessionMetadata;
  backendMessageId?: string; // Store backend message ID for potential future use (e.g. feedback)
  feedback?: 'LIKED' | 'DISLIKED' | null; // Store user feedback on the message
  isNew?: boolean; // Flag to indicate if this message is newly added and not yet acknowledged by the backend
}

// A chat consists of a local id, a backend session id, a title and a list of messages.
export interface Chat {
  id: string;
  /**
   * The backend session id assigned by the server. When creating a new chat
   * locally this will be undefined until the first message is sent and the
   * API returns a session id. We keep it here to associate subsequent
   * messages with the same conversation on the server.
   */
  sessionId?: string;
  /**
   * The title of the chat. This is set to the first user message up to
   * 50 characters when the conversation starts and can be updated later.
   */
  title: string;
  /**
   * All messages exchanged in this chat. The structure of each message
   * includes the role (user or assistant), the raw text content and an
   * optional `response` object when the assistant returns structured
   * data or visualisation instructions.
   */
  messages: ChatMessage[];
  /**
   * ISO timestamp representing when this chat was created. Useful for
   * sorting chats and displaying relative timestamps.
   */
  createdAt: string;
  /**
   * Tracks if this chat has been synced with the backend.
   */
  isSynced?: boolean;
  /**
   * Current follow-up suggestions for the last assistant message.
   * These are displayed to help guide user exploration.
   */
  followUpSuggestions?: string[];
  /**
   * Tracks if the last message is being refined.
   */
  isRefining?: boolean;
  /**
   * Latest session-level metadata (QueryState, tool_calls, ambiguity events)
   * Updated with each message. Used for debugging/monitoring.
   */
  sessionMetadata?: SessionMetadata;
  /**
   * Pending clarification question to display as popup (survives page reload).
   */
  pendingClarification?: any | null;
}

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  /** ID of the chat currently loading/streaming. null = nothing loading. */
  loadingChatId: string | null;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  loadingChatId: null,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Create a new chat locally; sessionId will be assigned when the first message is sent
    /**
     * Create a new chat locally. If an id is provided it will be used,
     * otherwise a new id based on the current timestamp will be generated.
     * A chat is prepended to the chats list and becomes the current chat.
     */
    newChat(state, action: PayloadAction<{ title: string; id?: string }>) {
      const id = action.payload.id ?? Date.now().toString();
      const now = new Date().toISOString();
      state.chats.unshift({
        id,
        title: action.payload.title,
        messages: [],
        createdAt: now,
        isSynced: false,
      });
      state.currentChatId = id;
      state.error = null;
    },

    selectChat(state, action: PayloadAction<string | null>) {
      // Clear isNew on the outgoing chat's messages so typewriter
      // doesn't replay when switching back to it later
      if (state.currentChatId && state.currentChatId !== action.payload) {
        const outgoing = state.chats.find((c) => c.id === state.currentChatId);
        if (outgoing) {
          outgoing.messages.forEach((m) => { m.isNew = false; });
        }
      }
      state.currentChatId = action.payload;
    },

    setLoading(state, action: PayloadAction<string | null>) {
      state.loadingChatId = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    clearError(state) {
      state.error = null;
    },

    addUserMessage(state, action: PayloadAction<{ chatId: string; message: ChatMessage }>) {
      const { chatId, message } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.messages.push(message);
        // Auto-set title from first message
        if (chat.messages.length === 1) {
          chat.title = message.content.slice(0, 50);
        }
      }
    },

    addAssistantMessage(state, action: PayloadAction<{ chatId: string; message: ChatMessage }>) {
      const { chatId, message } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        // Only typewrite if this chat is currently visible
        const isCurrent = state.currentChatId === chatId;
        chat.messages.push({ ...message, isNew: isCurrent });
      }
    },

    setChatSessionId(state, action: PayloadAction<{ chatId: string; sessionId: string }>) {
      const { chatId, sessionId } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.sessionId = sessionId;
        chat.isSynced = true;
      }
    },

    /**
     * Hydrate chats from backend history. This is called after fetching
     * from the server to populate local state with remote data.
     */
    hydrateChatHistory(
      state,
      action: PayloadAction<{
        sessionId: string;
        title: string;
        messages: ChatMessage[];
      }>
    ) {
      const { sessionId, title, messages } = action.payload;
      console.log('[Redux] hydrateChatHistory called:', { sessionId, title, messageCount: messages.length });
      // Check if chat already exists locally
      let chat = state.chats.find((c) => c.sessionId === sessionId);
      console.log('[Redux] Found chat:', chat?.id, 'with', chat?.messages?.length, 'existing messages');

      if (!chat) {
        const id = Date.now().toString();
        chat = {
          id,
          sessionId,
          title,
          messages: [],
          createdAt: new Date().toISOString(),
          isSynced: true,
        };
        console.log('[Redux] Created new chat:', id);
        state.chats.unshift(chat);
      }
      // Update messages and title
      chat.messages = messages;
      chat.title = title;
      console.log('[Redux] Updated chat with', messages.length, 'messages');
    },

    /**
     * Load sessions from backend. This replaces the chat list with
     * sessions fetched from the server.
     */
    loadSessions(
      state,
      action: PayloadAction<
        Array<{ sessionId: string; createdAt: string; title?: string; messageCount?: number; lastUpdated?: string }>
      >
    ) {
      const sessions = action.payload;
      
      // Create a map of existing chats by sessionId for quick lookup
      const existingChatsBySessionId = new Map<string, typeof state.chats[0]>();
      state.chats.forEach(chat => {
        if (chat.sessionId) {
          existingChatsBySessionId.set(chat.sessionId, chat);
        }
      });
      
      // Track which sessionIds were found in the backend response
      const foundSessionIds = new Set<string>();
      
      // Build the new chats array from backend sessions
      const newChats = sessions.map((session) => {
        foundSessionIds.add(session.sessionId);
        
        // Check if we already have a local chat with this sessionId
        const existingChat = existingChatsBySessionId.get(session.sessionId);
        if (existingChat) {
          // Keep the existing chat with its messages and title
          return {
            ...existingChat,
            isSynced: true,
          };
        }
        // Create a new chat entry for this session
        return {
          id: session.sessionId,
          sessionId: session.sessionId,
          title: session.title || 'New Chat',
          messages: [],
          createdAt: session.createdAt,
          isSynced: true,
        };
      });
      
      // Keep local chats that:
      // 1. Haven't been synced to a session yet (no sessionId)
      // 2. OR have a sessionId but weren't in the backend list (race condition protection)
      //    AND have messages (to avoid keeping stale empty chats)
      const localChatsToKeep = state.chats.filter((c) => {
        if (!c.sessionId) return true; // Keep unsynced chats
        if (!foundSessionIds.has(c.sessionId) && c.messages.length > 0) {
          // Keep this chat - it has messages but wasn't in backend list (race condition)
          console.log('[Redux loadSessions] Preserving local chat with messages not in backend list:', c.id, c.sessionId);
          return true;
        }
        return false;
      });
      
      state.chats = [...newChats, ...localChatsToKeep];
    },

    /**
     * Clear all chats from the local store.
     */
    clearChats(state) {
      state.chats = [];
      state.currentChatId = null;
      state.loadingChatId = null;
      state.error = null;
    },

    /**
     * Delete a specific chat.
     */
    deleteChat(state, action: PayloadAction<string>) {
      const chatId = action.payload;
      state.chats = state.chats.filter((c) => c.id !== chatId);
      if (state.currentChatId === chatId) {
        state.currentChatId = state.chats.length > 0 ? state.chats[0].id : null;
      }
    },

    /**
     * Rename a session locally (optimistic update before API call).
     */
    renameSessionTitle(
      state,
      action: PayloadAction<{ chatId: string; title: string }>
    ) {
      const { chatId, title } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId || c.sessionId === chatId);
      if (chat) {
        chat.title = title;
      }
    },

    /**
     * Set/clear pending clarification for a chat (survives page reload via backend).
     */
    setPendingClarification(
      state,
      action: PayloadAction<{ chatId: string; clarification: any | null }>
    ) {
      const { chatId, clarification } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.pendingClarification = clarification;
      }
    },

    /**
     * Set follow-up suggestions for a chat from the last assistant response.
     */
    setFollowUpSuggestions(
      state,
      action: PayloadAction<{ chatId: string; suggestions: string[] }>
    ) {
      const { chatId, suggestions } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.followUpSuggestions = suggestions;
      }
    },

    /**
     * Update a message with follow-up suggestions and confidence score.
     */
    updateMessageWithMetadata(
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        relatedQueries?: string[];
        confidence?: number;
        isRefinement?: boolean;
      }>
    ) {
      const { chatId, messageId, relatedQueries, confidence, isRefinement } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const message = chat.messages.find((m) => m.id === messageId);
        if (message) {
          if (relatedQueries) message.relatedQueries = relatedQueries;
          if (confidence !== undefined) message.confidence = confidence;
          if (isRefinement !== undefined) message.isRefinement = isRefinement;
        }
      }
    },

    /**
     * Mark a chat as being refined.
     */
    setRefining(
      state,
      action: PayloadAction<{ chatId: string; isRefining: boolean }>
    ) {
      const { chatId, isRefining } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.isRefining = isRefining;
      }
    },

    /**
     * Replace a message's clarifying question with the confirmed response.
     * Used when user confirms a clarifying question and backend returns query results.
     */
    replaceClarifyingQuestionWithResponse(
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        response: any;
        newContent: string;
      }>
    ) {
      const { chatId, messageId, response, newContent } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const message = chat.messages.find((m) => m.id === messageId);
        if (message) {
          message.response = response;
          message.content = newContent;
          message.clarifyingQuestion = null;
          message.confidence = response.confidence_score;
          message.relatedQueries = response.related_queries;
        }
      }
    },


    updateMessageFeedback(
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        feedback: 'LIKED' | 'DISLIKED' | null;
      }>
    ) {
      const { chatId, messageId, feedback } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);

      if (chat) {
        const message = chat.messages.find((m) => m.id === messageId);
        if (message) {
          message.feedback = feedback;
        }
      }
    },

    /**
     * Attach backend file_id UUIDs to a user message so its chips can download.
     * Merges into any existing attachmentIds (supports multi-file sessions).
     */
    updateMessageAttachmentIds(
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        attachmentIds: Record<string, string>;
      }>
    ) {
      const { chatId, messageId, attachmentIds } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const message = chat.messages.find((m) => m.id === messageId);
        if (message) {
          message.attachmentIds = { ...message.attachmentIds, ...attachmentIds };
        }
      }
    },

    /**
     * Update session metadata (QueryState, tool_calls_log, ambiguity_events)
     * for a chat. Called when backend returns updated session state.
     */
    updateSessionMetadata(
      state,
      action: PayloadAction<{
        chatId: string;
        sessionMetadata: SessionMetadata;
      }>
    ) {
      const { chatId, sessionMetadata } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.sessionMetadata = sessionMetadata;
      }
    },

    /**
     * Update a message's session metadata
     */
    updateMessageSessionMetadata(
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        sessionMetadata: SessionMetadata;
      }>
    ) {
      const { chatId, messageId, sessionMetadata } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const message = chat.messages.find((m) => m.id === messageId);
        if (message) {
          message.sessionMetadata = sessionMetadata;
        }
      }
    },
  },
});

export const {
  newChat,
  selectChat,
  setLoading,
  setError,
  clearError,
  addUserMessage,
  addAssistantMessage,
  setChatSessionId,
  hydrateChatHistory,
  loadSessions,
  clearChats,
  deleteChat,
  renameSessionTitle,
  setPendingClarification,
  setFollowUpSuggestions,
  updateMessageWithMetadata,
  setRefining,
  replaceClarifyingQuestionWithResponse,
  updateSessionMetadata,
  updateMessageSessionMetadata,
  updateMessageFeedback,
  updateMessageAttachmentIds,
} = chatSlice.actions;

export default chatSlice.reducer;
