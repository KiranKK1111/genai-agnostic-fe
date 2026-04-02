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
  setPendingClarification as setPendingClarificationAction,
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

  // Helper to set/clear pending clarification in Redux (survives reload)
  const setPendingClarification = useCallback(
    (clar: ClarifyingQuestion | null) => {
      const targetChatId = chatId;
      if (targetChatId) {
        dispatch(setPendingClarificationAction({ chatId: targetChatId, clarification: clar }));
      }
    },
    [chatId, dispatch]
  );

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

  // Flag to suppress user bubble when sending a clarification reply
  const isClarificationReplyRef = useRef(false);

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

      // Skip user bubble for clarification replies — the Q&A pair will be shown instead
      if (!isClarificationReplyRef.current) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          attachments: files ? files.map(f => f.name) : undefined,
        };
        dispatch(addUserMessage({ chatId: effectiveChatId, message: userMessage }));
      }
      isClarificationReplyRef.current = false;
      dispatch(setLoading(effectiveChatId));
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

        // If this is a clarification-only response (no data, no real content),
        // show it as a popup above the input box instead of an inline message.
        const hasClarification = response.clarifying_question && typeof response.clarifying_question === 'object';
        const hasData = (response.visualizations?.length ?? 0) > 0 || (response.data?.rows?.length ?? 0) > 0;
        const isClarificationOnly = hasClarification && !hasData && !response.message?.trim();

        if (isClarificationOnly) {
          const cq = response.clarifying_question as ClarifyingQuestion;
          setPendingClarification(cq);
          clearStepQueue();
          dispatch(setLoading(null));
          return;
        }

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

        // Clear popup and reset chain
        setPendingClarification(null);

        // Emit accumulated clarification Q&A pairs as a single user message
        // (sent by backend via clarification_qa SSE event when all clarifications are resolved)
        const qaPairs = (response as any).clarification_qa;
        if (qaPairs && Array.isArray(qaPairs) && qaPairs.length > 0) {
          const qaText = qaPairs
            .map((p: any) => `Q: ${p.question}\nA: ${p.answer}`)
            .join('\n\n');
          const qaMessage: ChatMessage = {
            id: (Date.now() - 1).toString(),
            role: 'user',
            content: qaText,
            timestamp: new Date().toISOString(),
          };
          dispatch(addUserMessage({ chatId: effectiveChatId, message: qaMessage }));
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
          clarifyingQuestion: null, // No longer stored inline
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
        dispatch(setLoading(null));
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

      // Dismiss the popup immediately
      setPendingClarification(null);
      // Suppress the user bubble — Q&A pairs will be emitted from the backend
      // response via the clarification_qa SSE event when all clarifications are done
      isClarificationReplyRef.current = true;

      try {
        // Call /clarify endpoint first so backend has the selection in session state
        if (clarificationType) {
          try {
            await submitClarification(token, sessionId, clarificationType, confirmation);
          } catch (clarifyErr) {
            console.warn('[MessageHandler] /clarify failed, falling back to chat message:', clarifyErr);
          }
        }
        // Send as chat message to trigger the pipeline
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
    [token, sessionId, chatId, dispatch, handleSendMessage, setPendingClarification]
  );

  const stopCurrentRequest = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearStepQueue();
    dispatch(setLoading(null));

    // Tell backend to cancel (uses session_id, not message_id)
    if (sessionId && token) {
      try {
        await stopMessage(token, sessionId);
      } catch (err) {
        console.warn("[MessageHandler] stopMessage API error:", err);
      }
    }
  }, [token, sessionId, dispatch, clearStepQueue]);

  const dismissClarification = useCallback(() => {
    setPendingClarification(null);

    // Show a friendly acknowledgement so the user knows the flow was cancelled
    const effectiveChatId = chatId;
    if (effectiveChatId) {
      const dismissMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Got it, standing by! Let me know what you need next.',
        timestamp: new Date().toISOString(),
      };
      dispatch(addAssistantMessage({ chatId: effectiveChatId, message: dismissMsg }));
    }

    // Clear clarification state on the backend so it doesn't persist across messages
    if (token && sessionId) {
      submitClarification(token, sessionId, '__dismissed', '__dismissed').catch(() => {});
    }
  }, [chatId, dispatch, token, sessionId, setPendingClarification]);

  return {
    handleSendMessage,
    handleRefineResponse,
    handleClarifyingQuestionConfirm,
    stopCurrentRequest,
    currentProgressStep,
    dismissClarification,
  };
}
