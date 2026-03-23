import React from 'react';
import {
  Box,
  Typography,
  Chip,
  InputBase,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Paperclip } from 'lucide-react';
import { AnalysisInsights } from './AnalysisInsights';
import { MarkdownRenderer, autoCloseMarkdown } from './MarkdownRenderer';
import { ResponseBeautifier } from './ResponseBeautifier';
import { ClarifyingQuestionHandler } from './ClarifyingQuestionHandler';
import { DecisionRouting } from './DecisionRouting';
import { VisualizationRouter } from './visualizations/VisualizationRouter';
import {
  MessageRow as MessageRowStyled,
  UserMessageGroup,
  UserMessageBubble,
  AssistantMessageGroup,
  AssistantHeaderBox,
  AssistantContentBubble,
  GradientAvatar,
} from './ChatInterface.styles';
import { Sparkles, BarChart3, LineChart, PieChart, Table2, RefreshCw, ThumbsUp, ThumbsDown, Send, Pencil } from 'lucide-react';
import type { Message } from './ChatInterface.types';
import type { IntelligentModalResponse, ClarifyingQuestion, FeedbackValue } from '../api';
import { submitMessageFeedback } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { BarChartConfig, type BarChartConfig as BarChartConfigType } from './visualizations/BarChartConfig';
import { useTypewriter } from '../hooks/useTypeWriter';

function resolveClarifyingQuestion(response: any): ClarifyingQuestion | null {
  const cq = response?.metadata?.clarification_question ?? response?.clarifying_question;
  if (!cq) return null;
  if (typeof cq === 'object') return cq as ClarifyingQuestion;
  // Plain string - wrap as a ClarifyingQuestion
  return { type: 'missing_parameter', question: cq as string };
}

interface MessageRowProps {
  message: Message;
  index: number;
  totalMessages: number;
  isLoading: boolean;
  isRefining?: boolean;
  followUpSuggestions?: string[];
  previousUserMessage?: string;
  onSendMessage: (content: string) => void;
  onRefineResponse?: (feedback: string) => void;
  onClarifyingQuestionConfirm?: (confirmation: string, clarificationType?: string) => void;
}

function MessageRowComponent({
  message,
  index,
  totalMessages,
  isLoading,
  isRefining,
  followUpSuggestions,
  previousUserMessage,
  onSendMessage,
  onRefineResponse,
  onClarifyingQuestionConfirm,
}: MessageRowProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  
  const isLastAssistantMessage = 
    index === totalMessages - 1 && message.role === 'assistant' && !isLoading;

  const [selectedVizType, setSelectedVizType] = React.useState<string>('table');
  const [barChartConfig, setBarChartConfig] = React.useState<BarChartConfigType | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackValue | null>(null);

  const { token } = useAuth();

  // --- Inline prompt editing ---
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(message.content);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const startEditing = () => {
    if (isLoading) return; // don't edit while a response is in flight
    setEditText(message.content);
    setIsEditing(true);

    // focus textarea after React renders it
    setTimeout(() => {
      const el = editTextareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditText(message.content);
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || isLoading) return;
    setIsEditing(false);
    onSendMessage(trimmed);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    }
    if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Typewriter: animate only freshly generated messages (isNew=true)
  const { displayed: typedContent, isDone: typingDone } = useTypewriter({
    text: message.content,
    active: message.role === 'assistant' && message.isNew === true,
    wps: 40, // words per second
  });

  const handleFeedback = async (value: 'LIKED' | 'DISLIKED') => {
    const newFeedback: FeedbackValue = feedback === value ? null : value;
    setFeedback(newFeedback); // optimistic update
    
    console.log('[Feedback] Debug Info:', {
      messageId: message.id,
      backendMessageId: message.backendMessageId,
      hasToken: !!token,
      feedbackValue: newFeedback,
      responseId: message.response?.id,
    });
    
    if (!message.backendMessageId) {
      console.warn('[Feedback] Skipping API call - backendMessageId is missing.');
      console.warn('[Feedback] Message structure:', {
        id: message.id,
        role: message.role,
        timestamp: message.timestamp,
        hasResponse: !!message.response,
        responseKeys: message.response ? Object.keys(message.response) : [],
      });
      console.warn('[Feedback] Full message object:', message);
      return;
    }

    if (!token) {
      console.warn('[Feedback] Skipping API call - auth token is missing.');
      return;
    }

    try {
      console.log(`[Feedback] Submitting ${newFeedback} feedback for message ${message.backendMessageId}`);
      await submitMessageFeedback(token, message.backendMessageId, newFeedback);
      console.log('[Feedback] Successfully submitted feedback');
    } catch (err) {
      console.error('[Feedback] API error:', err);
      setFeedback(feedback); // revert on error
    }
  };

  // Initialize selectedVizType from primary_view when response changes
  React.useEffect(() => {
    const vizs = message.response?.visualizations;
    if (!vizs) return;
    const config = Array.isArray(vizs) ? vizs[0]?.config : vizs.config;
    const primaryView = config?.primary_view;
    if (primaryView) {
      setSelectedVizType(primaryView);
    } else {
      setSelectedVizType('table');
    }
  }, [message.response?.visualizations]);

  const vizIcons: Record<string, any> = {
    bar: BarChart3,
    line: LineChart,
    pie: PieChart,
    table: Table2,
  };

  const availableVizTypes = React.useMemo(() => {
    const vizs = message.response?.visualizations;
    if (!vizs) return [];
    // Support both legacy object format and array format
    if (Array.isArray(vizs)) {
      const views = vizs[0]?.config?.available_views;
      return Array.isArray(views) ? views : [];
    }
    return vizs.config?.available_views || [];
  }, [message.response?.visualizations]);

  return (
    <MessageRowStyled>
      {message.role === 'user' ? (
        <UserMessageGroup>
          {isEditing ? (
            /* --- Inline edit mode --- */
            <Box
              sx={{
                width: 'fit-content',
                maxWidth: '100%',
                minWidth: isMobile ? '60%' : '40%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                alignSelf: 'flex-end',
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  cancelEditing();
                }
              }}
            >
              {/* Textarea + file chips container */}
              <Box
                sx={{
                  background: isDark
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #3b82f6',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.18)',
                }}
              >
                <InputBase
                  inputRef={editTextareaRef}
                  multiline
                  fullWidth
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  inputProps={{ tabIndex: 0 }}
                  sx={{
                    fontSize: isMobile ? '13px' : '14px',
                    lineHeight: 1.6,
                    fontWeight: 500,
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    width: '100%',
                    '& textarea': {
                      resize: 'none',
                      caretColor: '#3b82f6',
                    },
                  }}
                />

                {/* Show attached files inside the edit box */}
                {message.attachments && message.attachments.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.75,
                      flexWrap: 'wrap',
                      mt: 1,
                      pt: 1,
                      borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                    }}
                  >
                    {message.attachments.map((fileName: string, idx: number) => (
                      <Chip
                        key={idx}
                        icon={<Paperclip size={12} />}
                        label={fileName}
                        size="small"
                        sx={{
                          fontSize: '11px',
                          height: '24px',
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          border: 'none',
                          '& .MuiChip-icon': {
                            marginLeft: '4px !important',
                            color: '#3b82f6',
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Action row */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pr: 0.5 }}>
                <Box
                  component="button"
                  tabIndex={0}
                  onClick={submitEdit}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 14px',
                    cursor: editText.trim() ? 'pointer' : 'not-allowed',
                    opacity: editText.trim() ? 1 : 0.45,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    transition: 'all 0.15s ease',
                    boxShadow: editText.trim() ? '0 2px 8px rgba(59, 130, 246, 0.35)' : 'none',
                    '&:hover': editText.trim() ? {
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)',
                      transform: 'translateY(-1px)',
                    } : {},
                  }}
                >
                  <Send size={12} />
                  Send
                </Box>
              </Box>

              {/* Hint */}
              <Typography
                variant="caption"
                sx={{
                  fontSize: '11px',
                  color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.35)',
                  textAlign: 'right',
                  pr: 0.5,
                  mt: -0.5,
                }}
              >
                Enter to send • Shift+Enter for new line • Esc to cancel
              </Typography>
            </Box>
          ) : (
            /* --- Normal bubble --- */
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                flexDirection: 'column',
                width: 'fit-content',
                alignItems: 'flex-end',
                alignSelf: 'flex-end',
                '&:hover .edit-pencil': { opacity: 1 },
              }}
            >
              <UserMessageBubble
                elevation={0}
                onClick={startEditing}
                sx={{
                  cursor: isLoading ? 'default' : 'text',
                  transition: 'all 0.2s ease',
                  '&:hover': !isLoading ? {
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.45)',
                    transform: 'translateY(-1px)',
                  } : {},
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: isMobile ? '13px' : '14px',
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {message.content}
                </Typography>
              </UserMessageBubble>

              {/* Attachment chips */}
              {!isEditing && message.attachments && message.attachments.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    paddingRight: '8px',
                  }}
                >
                  {message.attachments.map((fileName: string, idx: number) => (
                    <Chip
                      key={idx}
                      icon={<Paperclip size={14} />}
                      label={fileName}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        borderRadius: '20px',
                        border: `1.5px solid ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                        color: '#3b82f6',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.12)',
                          borderColor: '#3b82f6',
                          boxShadow: theme.palette.mode === 'dark'
                            ? '0 4px 12px rgba(59, 130, 246, 0.2)'
                            : '0 2px 8px rgba(59, 130, 246, 0.15)',
                        },
                        '& .MuiChip-icon': {
                          marginLeft: '4px !important',
                          color: '#3b82f6',
                        },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </UserMessageGroup>
      ) : (
        <AssistantMessageGroup>
          <AssistantHeaderBox>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <GradientAvatar sx={{ width: 32, height: 32 }}>
                <Sparkles size={16} />
              </GradientAvatar>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'text.secondary',
                }}
              >
                SDM AI Assistant
              </Typography>
            </Box>

            {/* Visualization Type Icons */}
            {message.response?.visualizations && availableVizTypes.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {availableVizTypes.map((type: string) => {
                  const IconComponent = vizIcons[type] || Table2;
                  const isActive = selectedVizType === type;
                  return (
                    <Box
                      key={type}
                      onClick={() => setSelectedVizType(type)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isActive
                          ? '#3b82f6'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.05)',
                        color: isActive
                          ? '#ffffff'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'rgba(0, 0, 0, 0.6)',
                        '&:hover': {
                          backgroundColor: isActive ? '#3b82f6' : isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                        },
                      }}
                      title={type}
                    >
                      <IconComponent size={16} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </AssistantHeaderBox>

          <AssistantContentBubble elevation={0} sx={{ position: 'relative' }}>
            {/* Analysis Insights */}
            {message.response && (message.response as IntelligentModalResponse).confidence_score !== undefined && (
              <Box sx={{ mb: 2 }}>
                <AnalysisInsights response={message.response as IntelligentModalResponse} />
              </Box>
            )}

            {/* Decision Routing - New Architecture Feature */}
            {message.response && message.response.decision_routing && (
              <Box sx={{ mb: 2 }}>
                <DecisionRouting
                  decision={message.response.decision_routing}
                  isLoading={false}
                  onError={message.response.success}
                />
              </Box>
            )}

            {/* Assistant Title/Header - from structured response */}
            {message.response?.assistant?.title && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: isDark ? '#ffffff' : '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {message.response.assistant.title}
                </Typography>
              </Box>
            )}

            {/* Structured response - always shown via ResponseBeautifier.
                During typewriter animation, text animates while tables/charts render immediately.
                For plain-text responses (no assistant.content), animate via MarkdownRenderer.
                Skip text rendering when message is a clarifying question — the ClarifyingQuestionHandler renders it. */}
            {resolveClarifyingQuestion(message.response) ? null :
            message.response?.assistant?.content && Array.isArray(message.response.assistant.content) ? (
              <ResponseBeautifier
                content={message.response.assistant.content}
                isMobile={isMobile}
                selectedVizType={selectedVizType}
                response={message.response}
                renderArtifacts={message.response?.render_artifacts}
                dataPayload={message.response?.data}
                typedContent={message.isNew ? typedContent : undefined}
                typingDone={!message.isNew || typingDone}
              />
            ) : (!typingDone && message.isNew) ? (
              /* Plain-text typewriter animation */
              <Box sx={{ position: 'relative' }}>
                <MarkdownRenderer
                  content={autoCloseMarkdown(typedContent)}
                  isMobile={isMobile}
                />
                {/* Blinking cursor appended after typed content */}
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    backgroundColor: '#3b82f6',
                    ml: '1px',
                    verticalAlign: 'text-bottom',
                    animation: 'twCursor 0.7s step-end infinite',
                    '@keyframes twCursor': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                />
              </Box>
            ) : (
              /* Static plain-text / markdown fallback */
              <MarkdownRenderer content={message.content} isMobile={isMobile} />
            )}

            {/* Data visualization — render when response.data exists but no assistant.content */}
            {!message.response?.assistant?.content &&
              message.response?.visualizations &&
              Array.isArray(message.response.visualizations) &&
              message.response.visualizations.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <VisualizationRouter
                    visualization={{
                      ...message.response.visualizations[0],
                      type: selectedVizType || message.response.visualizations[0].type,
                    }}
                    selectedType={selectedVizType}
                    barChartConfig={barChartConfig}
                  />
                </Box>
              )}

            {/* Clarifying Question - interactive buttons/chips */}
            {(() => {
              const cq = resolveClarifyingQuestion(message.response);
              if (!cq) return null;
              // The question text is already shown above via message.content;
              // pass hideQuestion so it isn't rendered twice.
              // If this is NOT the last assistant message, the user already answered
              const isAnswered = !isLastAssistantMessage;
              return (
                <ClarifyingQuestionHandler
                  clarifyingQuestion={cq}
                  originalQuery={message.originalQuery || message.content}
                  isLoading={isLoading}
                  isAnswered={isAnswered}
                  onConfirm={(confirmation) => {
                    if (onClarifyingQuestionConfirm) {
                      onClarifyingQuestionConfirm(confirmation, cq.type);
                    } else {
                      onSendMessage(confirmation);
                    }
                  }}
                />
              );
            })()}
          </AssistantContentBubble>

          {/* Follow-up Suggestions - shown only after typing completes */}
          {isLastAssistantMessage && (typingDone || !message.isNew) && followUpSuggestions && followUpSuggestions.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '11px',
                  color: 'text.secondary',
                  display: 'block',
                  marginBottom: 1,
                }}
              >
                Suggested follow-ups
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {followUpSuggestions.map((suggestion: string, idx: number) => (
                  <Chip
                    key={idx}
                    label={suggestion}
                    onClick={() => onSendMessage(suggestion)}
                    size="small"
                    variant="outlined"
                    sx={{
                      '&:hover': {
                        borderColor: '#3b82f6',
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Action bar - outside the bubble, hidden for clarifying question messages */}
          {!resolveClarifyingQuestion(message.response) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              ml: 0.5,
              mt: 0.25,
            }}
          >
            {/* Retry - only for the last assistant message */}
            {isLastAssistantMessage && (
              <Box
                onClick={() => {
                  if (previousUserMessage) onSendMessage(previousUserMessage);
                }}
                title="Retry"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.38)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)',
                  },
                }}
              >
                <RefreshCw size={14} />
              </Box>
            )}

            {/* Divider */}
            <Box sx={{ width: '1px', height: 14, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)', mx: 0.25 }} />

            {/* Thumbs up */}
            <Box
              onClick={() => handleFeedback('LIKED')}
              title="Good response"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '6px',
                cursor: 'pointer',
                color: feedback === 'LIKED' ? '#10b981' : isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.38)',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: feedback === 'LIKED' ? 'rgba(16, 185, 129, 0.1)' : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  color: feedback === 'LIKED' ? '#10b981' : isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)',
                },
              }}
            >
              <ThumbsUp size={14} fill={feedback === 'LIKED' ? 'currentColor' : 'none'} />
            </Box>

            {/* Thumbs down */}
            <Box
              onClick={() => handleFeedback('DISLIKED')}
              title="Bad response"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '6px',
                cursor: 'pointer',
                color: feedback === 'DISLIKED' ? '#ef4444' : isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.38)',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: feedback === 'DISLIKED' ? 'rgba(239, 68, 68, 0.1)' : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  color: feedback === 'DISLIKED' ? '#ef4444' : isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)',
                },
              }}
            >
              <ThumbsDown size={14} fill={feedback === 'DISLIKED' ? 'currentColor' : 'none'} />
            </Box>
          </Box>
          )}
        </AssistantMessageGroup>
      )}
    </MessageRowStyled>
  );
}

// Memoize MessageRow to prevent unnecessary re-renders
// Only re-render if message content, loading state, or suggestions change
export const MessageRow = React.memo(MessageRowComponent, (prevProps, nextProps) => {
  // Custom comparison to avoid re-renders
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.backendMessageId === nextProps.message.backendMessageId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isRefining === nextProps.isRefining &&
    prevProps.index === nextProps.index &&
    prevProps.totalMessages === nextProps.totalMessages &&
    JSON.stringify(prevProps.followUpSuggestions) === JSON.stringify(nextProps.followUpSuggestions) &&
    prevProps.previousUserMessage === nextProps.previousUserMessage
  );
});