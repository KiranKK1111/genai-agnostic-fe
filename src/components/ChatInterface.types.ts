/**
 * ChatInterface Types
 * TypeScript interfaces and types for ChatInterface component
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasCharts?: boolean;
  timestamp: Date | string;
  response?: any;
  attachments?: string[];
  clarifyingQuestion?: string | null;
  originalQuery?: string;
  backendMessageId?: string;
  feedback?: 'LIKED' | 'DISLIKED' | null;
  isNew?: boolean; // Flag to indicate if the message is newly added
}

export interface ChatInterfaceProps {
  /**
   * The list of messages to display. Each message can optionally
   * include a `response` object returned from the backend which
   * contains datasets and visualisation metadata.
   */
  messages: Message[];
  /**
   * Called when the user submits a new message. If files are
   * attached they will be passed along in the array. The parent
   * component is responsible for invoking the backend and updating
   * state.
   */
  onSendMessage: (content: string, files?: File[]) => void;
  /**
   * Called when the user wants to refine the last response.
   * The feedback string describes how to refine the response.
   */
  onRefineResponse?: (feedback: string) => void;
  /**
   * Called when the user confirms a clarifying question.
   * Sends the confirmation value and original query.
   */
  onClarifyingQuestionConfirm?: (confirmation: string, originalQuery: string, clarificationType?: string) => void;
  /**
   * Follow-up suggestions based on the last assistant response.
   * These are contextual questions that can be clicked to send.
   */
  followUpSuggestions?: string[];
  /**
   * Whether the response is currently being refined.
   */
  isRefining?: boolean;
  /** Whether a request to the backend is currently pending. */
  isLoading: boolean;
  /** Optional callback fired when the user wants to stop a request. */
  onStopRequest?: () => void;
  currentProgressStep?: string;
  /** Pending clarification to show as a popup above the input box. */
  pendingClarification?: import('../api').ClarifyingQuestion | null;
  /** Dismiss the clarification popup without answering. */
  onDismissClarification?: () => void;
}

export interface WelcomeCardItem {
  title: string;
  description: string;
  prompt: string;
}
