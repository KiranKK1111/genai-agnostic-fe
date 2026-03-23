/**
 * Message Handler Hook
 *
 * Handles sending messages and receiving responses via SSE streaming.
 * Uses the backend's POST /api/chat SSE endpoint — progress events
 * come through the same stream via the onEvent callback.
 */

import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import {
  addUserMessage,
  addAssistantMessage,
  setLoading,
  setError,
  clearError,
  updateMessageWithMetadata,
  setFollowUpSuggestions,
  setChatSessionId,
} from '../features/chatSlice';
import type { ChatMessage } from '../features/chatSlice';
import { sendQuery, stopMessage, submitClarification } from '../api';
import type { ClarifyingQuestion, SSEEvent } from '../api';
import { useAuth } from '../contexts/AuthContext';

export function useMessageHandler(
  chatId: string,
  sessionId: string | undefined,
  refreshSessions?: () => Promise<void>
) {
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [currentProgressStep, setCurrentProgressStep] = useState<string>("");

  // Step queue — ensures each label is visible for a minimum duration
  const stepQueueRef = useRef<string[]>([]);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushStepQueue = useCallback(() => {
    const next = stepQueueRef.current.shift();
    if (next === undefined) {
      stepTimerRef.current = null;
      return;
    }
    setCurrentProgressStep(next);
    stepTimerRef.current = setTimeout(flushStepQueue, 700);
  }, []);

  const enqueueStep = useCallback((label: string) => {
    stepQueueRef.current.push(label);
    if (!stepTimerRef.current) {
      flushStepQueue();
    }
  }, [flushStepQueue]);

  const clearStepQueue = useCallback(() => {
    stepQueueRef.current = [];
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    setCurrentProgressStep("");
  }, []);

  const extractClarifyingQuestionText = (
    cq: string | ClarifyingQuestion | null | undefined,
    response?: any
  ): string | null => {
    const metaCq = response?.metadata?.clarification_question;
    if (metaCq) {
      if (typeof metaCq === "string") return metaCq;
      if (typeof metaCq === "object" && metaCq.question) return metaCq.question;
    }
    if (cq) {
      if (typeof cq === "string") return cq;
      if (typeof cq === "object" && cq.question) return cq.question;
    }
    return null;
  };

  const handleSendMessage = useCallback(
    async (content: string, files?: File[], overrideChatId?: string) => {
      if (!token) return;

      const effectiveChatId = overrideChatId || chatId;
      if (!effectiveChatId) {
        console.error('[MessageHandler] No chatId available');
        return;
      }

      abortControllerRef.current?.abort();
      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      // Add user message immediately for instant visual feedback
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        attachments: files ? files.map(f => f.name) : undefined,
      };
      dispatch(addUserMessage({ chatId: effectiveChatId, message: userMessage }));
      dispatch(setLoading(true));
      dispatch(clearError());

      // Use existing session or let backend auto-create
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        dispatch(setChatSessionId({ chatId: effectiveChatId, sessionId: currentSessionId }));
        if (refreshSessions) {
          refreshSessions().catch(err =>
            console.warn("[MessageHandler] Failed to refresh sessions:", err)
          );
        }
      }

      clearStepQueue();

      try {
        // Single SSE stream — progress events come via onEvent callback
        const responseWrapper = await sendQuery(
          token,
          currentSessionId!,
          content,
          files,
          newAbortController.signal,
          undefined,
          // onEvent callback: receive real-time SSE events for progress
          (event: SSEEvent) => {
            if (event.type === "step" && event.label) {
              enqueueStep(event.label);
            }
          }
        );

        const response = responseWrapper.response;
        const databaseMessageId = responseWrapper.id || response?.id;

        // Check if backend returned a session_id (in session_meta event)
        const backendSessionId = response?.metadata?.session_id;
        if (backendSessionId && backendSessionId !== currentSessionId) {
          dispatch(setChatSessionId({ chatId: effectiveChatId, sessionId: backendSessionId }));
        }

        // Check for session title from backend
        const sessionTitle = response?.metadata?.session_title;
        if (sessionTitle && refreshSessions) {
          refreshSessions().catch(() => {});
        }

        const messageId = (Date.now() + 1).toString();

        const clarifyingQuestionText = extractClarifyingQuestionText(
          response.clarifying_question,
          response
        );

        // Build message content
        let messageContent = '';
        if (response.assistant?.content && Array.isArray(response.assistant.content)) {
          const textParts: string[] = response.assistant.content
            .filter((b: any) => b.text && typeof b.text === "string")
            .map((b: any) => {
              if (b.type === "bullets" || b.type === "numbered") {
                return (b.items as string[])?.join("\n") ?? b.text;
              }
              return b.text as string;
            });
          messageContent = textParts.join("\n\n");
        }
        if (!messageContent) {
          messageContent = response.message || '';
        }
        if (!messageContent || messageContent.trim() === '') {
          messageContent = clarifyingQuestionText || 'Query processed successfully';
        }

        // Extract follow-ups
        const followups: string[] =
          (response.suggested_questions?.length ? response.suggested_questions : null) ??
          response.followups?.map((f: any) => f.text) ??
          response.related_queries ??
          [];

        const assistantMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: messageContent,
          timestamp: new Date().toISOString(),
          response: response,
          relatedQueries: followups,
          confidence: response.routing?.confidence || response.confidence,
          clarifyingQuestion: clarifyingQuestionText,
          originalQuery: content,
          backendMessageId: databaseMessageId,
          feedback: null,
        };

        dispatch(addAssistantMessage({ chatId: effectiveChatId, message: assistantMessage }));
        dispatch(
          updateMessageWithMetadata({
            chatId: effectiveChatId,
            messageId,
            relatedQueries: followups,
            confidence: response.routing?.confidence || response.confidence,
            isRefinement: false,
          })
        );
        dispatch(
          setFollowUpSuggestions({
            chatId: effectiveChatId,
            suggestions: followups && followups.length > 0 ? followups : [],
          })
        );
      } catch (err: any) {
        const isCanceled =
          err.name === 'AbortError' ||
          err.name === 'CanceledError' ||
          err.code === 'ERR_CANCELED' ||
          err.message === 'canceled' ||
          newAbortController.signal.aborted;

        if (isCanceled) {
          console.log("[MessageHandler] Request was canceled");
          return;
        }

        const errorMsg =
          err?.response?.data?.detail ||
          err?.message ||
          'An error occurred while processing your request.';
        dispatch(setError(errorMsg));

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        };
        dispatch(addAssistantMessage({ chatId: effectiveChatId, message: assistantMessage }));
      } finally {
        clearStepQueue();
        dispatch(setLoading(false));
      }
    },
    [token, sessionId, chatId, dispatch, enqueueStep, clearStepQueue, refreshSessions]
  );

  const handleRefineResponse = useCallback(
    async (feedback: string) => {
      await handleSendMessage(feedback);
    },
    [handleSendMessage]
  );

  const handleClarifyingQuestionConfirm = useCallback(
    async (confirmation: string, _originalQuery: string, clarificationType?: string) => {
      if (!token || !sessionId) return;

      try {
        // Call /clarify endpoint first so backend has the selection in session state
        if (clarificationType) {
          try {
            await submitClarification(token, sessionId, clarificationType, confirmation);
          } catch (clarifyErr) {
            // /clarify may fail but we still send the chat message as fallback
            console.warn('[MessageHandler] /clarify failed, falling back to chat message:', clarifyErr);
          }
        }
        // Then send as chat message to trigger the pipeline
        await handleSendMessage(confirmation);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        const errorMsg =
          (typeof detail === 'string' ? detail : null) ||
          err?.message ||
          'Failed to process clarification';
        dispatch(setError(errorMsg));
      }
    },
    [token, sessionId, dispatch, handleSendMessage]
  );

  const stopCurrentRequest = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearStepQueue();
    dispatch(setLoading(false));

    // Tell backend to cancel (uses session_id, not message_id)
    if (sessionId && token) {
      try {
        await stopMessage(token, sessionId);
      } catch (err) {
        console.warn("[MessageHandler] stopMessage API error:", err);
      }
    }
  }, [token, sessionId, dispatch, clearStepQueue]);

  return {
    handleSendMessage,
    handleRefineResponse,
    handleClarifyingQuestionConfirm,
    stopCurrentRequest,
    currentProgressStep
  };
}
