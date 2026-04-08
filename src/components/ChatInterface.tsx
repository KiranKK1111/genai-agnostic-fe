import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { ChatInputArea } from './ChatInputArea';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageRow } from './MessageRow';
import { QueryProgressSteps } from './QueryProgressSteps';

import { ClarificationPopup } from './ClarificationPopup';
import {
  MessagesWrapper,
  VirtuosoContainer,
  VirtuosoInner,
} from './ChatInterface.styles';
import type { ChatInterfaceProps, Message } from './ChatInterface.types';

export type { Message, ChatInterfaceProps };

export function ChatInterface({
  messages,
  onSendMessage,
  onRefineResponse,
  onClarifyingQuestionConfirm,
  followUpSuggestions,
  isRefining,
  isLoading,
  onStopRequest,
  currentProgressStep,
  pendingClarification,
  onDismissClarification,
}: ChatInterfaceProps) {
  const theme = useTheme();
  // Use md (960px) — same boundary as Dashboard and ChatSidebar so
  // all components agree on what counts as "mobile"
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [loadingKey, setLoadingKey] = useState(0);
  const userHasScrolledRef = useRef(false);
  const autoScrollTimerRef = useRef<number | null>(null);

  // Increment loading key when loading starts
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading && !prevLoadingRef.current) {
      setLoadingKey((k) => k + 1);
    }
    prevLoadingRef.current = isLoading ?? false;
  }, [isLoading]);

  // Detect if user is at bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 100;
      const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(isBottom);
      
      // If user scrolls up, mark that they've scrolled
      if (!isBottom) {
        userHasScrolledRef.current = true;
      }
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages arrive (always — user just sent or received a message)
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    if (hasNewMessage) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      // Reset scroll flag so typewriter auto-scroll also works for this new message
      userHasScrolledRef.current = false;
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load or session switch (component remount)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && messages.length > 0) {
      // Use rAF to ensure DOM has rendered the messages before scrolling
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      userHasScrolledRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = runs once on mount (session switch triggers remount via key=)

  // Monitor content height changes during typewriter animation
  useEffect(() => {
    const container = scrollContainerRef.current;
    const inner = innerContainerRef.current;
    if (!container || !inner) return;

    // Check if any message is currently being typed (has isNew flag)
    const hasTypingAnimation = messages.some((m) => m.isNew === true);

    if (!hasTypingAnimation) return;

    // Use ResizeObserver to detect content height changes during typing
    const resizeObserver = new ResizeObserver(() => {
      // Only auto-scroll if user hasn't manually scrolled up
      if (isAtBottom || !userHasScrolledRef.current) {
        // Clear any pending scroll timer
        if (autoScrollTimerRef.current) {
          cancelAnimationFrame(autoScrollTimerRef.current);
        }
        
        // Use requestAnimationFrame for smooth scrolling during typing
        autoScrollTimerRef.current = requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    });

    resizeObserver.observe(inner);

    return () => {
      resizeObserver.disconnect();
      if (autoScrollTimerRef.current) {
        cancelAnimationFrame(autoScrollTimerRef.current);
      }
    };
  }, [messages, isAtBottom]);

  // Auto-scroll when follow-up suggestions appear
  useEffect(() => {
    if (followUpSuggestions && followUpSuggestions.length > 0 && !isLoading) {
      const container = scrollContainerRef.current;
      if (container && (isAtBottom || !userHasScrolledRef.current)) {
        // Small delay to ensure suggestions are rendered
        setTimeout(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [followUpSuggestions, isLoading, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      userHasScrolledRef.current = false; // Reset scroll flag
    }
  }, []);

  // Stable callback refs to prevent MessageRow re-renders
  const onSendMessageRef = useRef(onSendMessage);
  const onRefineResponseRef = useRef(onRefineResponse);
  const onClarifyingQuestionConfirmRef = useRef(onClarifyingQuestionConfirm);
  
  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
    onRefineResponseRef.current = onRefineResponse;
    onClarifyingQuestionConfirmRef.current = onClarifyingQuestionConfirm;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Messages Area */}
        <MessagesWrapper sx={{ position: 'relative' }}>
          {messages.length === 0 ? (
            <WelcomeScreen onSendMessage={onSendMessage} />
          ) : (
            <>
              <VirtuosoContainer ref={scrollContainerRef}>
                <VirtuosoInner ref={innerContainerRef}>
                  {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    const previousUserMessage = message.role === 'assistant' && index > 0 && messages[index - 1]?.role === 'user'
                      ? messages[index - 1].content
                      : undefined;
                    
                    return (
                      <MessageRow
                        key={message.id}
                        message={message}
                        index={index}
                        totalMessages={messages.length}
                        isLoading={isLastMessage ? isLoading : false}
                        isRefining={isLastMessage ? isRefining : false}
                        followUpSuggestions={isLastMessage ? followUpSuggestions : undefined}
                        onSendMessage={onSendMessage}
                        onRefineResponse={isLastMessage ? onRefineResponse : undefined}
                        previousUserMessage={previousUserMessage}
                        onClarifyingQuestionConfirm={
                          isLastMessage &&
                          (message.clarifyingQuestion ||
                            (message as any).response?.metadata?.clarification_question)
                            ? (confirmation, clarificationType) =>
                                onClarifyingQuestionConfirm?.(confirmation, message.originalQuery || message.content, clarificationType)
                            : undefined
                        }
                      />
                    );
                  })}
                  
                  {/* Loading Indicator */}
                  {isLoading && (
                    <Box
                      sx={{
                        padding: '12px 0 4px 4px',
                        animation: 'fadeIn 0.3s ease-in',
                      }}
                    >
                      <QueryProgressSteps resetKey={loadingKey} currentStep={currentProgressStep} />
                    </Box>
                  )}
                  
                  <div ref={messagesEndRef} />
                </VirtuosoInner>
              </VirtuosoContainer>

              {/* Scroll to Bottom Button */}
              {!isAtBottom && messages.length > 0 && (
                <Box
                  onClick={scrollToBottom}
                  sx={{
                    position: 'absolute',
                    // Keep above the input area; isMobile adds extra clearance
                    bottom: isMobile ? 12 : 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: { xs: 44, md: 40 },
                    height: { xs: 44, md: 40 },
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.3s ease',
                    zIndex: 101,
                    touchAction: 'manipulation',
                    '&:hover': {
                      backgroundColor: '#2563eb',
                      boxShadow: '0 6px 16px rgba(59, 130, 246, 0.5)',
                      transform: 'translateX(-50%) translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateX(-50%) translateY(0)',
                      backgroundColor: '#1d4ed8',
                    },
                  }}
                >
                  <ChevronDown size={isMobile ? 22 : 24} color="white" />
                </Box>
              )}
            </>
          )}
        </MessagesWrapper>

        {/* Input Area — replaced by ClarificationPopup when a clarification is pending */}
        {pendingClarification && onClarifyingQuestionConfirm ? (
          <ClarificationPopup
            clarification={pendingClarification}
            onConfirm={(value, clarificationType) =>
              onClarifyingQuestionConfirm(value, '', clarificationType)
            }
            onDismiss={onDismissClarification || (() => {})}
          />
        ) : (
          <ChatInputArea
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            onStopRequest={onStopRequest}
          />
        )}
    </Box>
  );
}