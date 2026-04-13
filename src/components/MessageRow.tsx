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
import { Sparkles, ChartColumn, ChartLine, ChartPie, ChartScatter, Table2, CircleDot, RefreshCw, ThumbsUp, ThumbsDown, Send, Pencil, Download, Plus, X } from 'lucide-react';
import type { Message } from './ChatInterface.types';
import type { IntelligentModalResponse, ClarifyingQuestion, FeedbackValue } from '../api';
import { submitMessageFeedback, downloadFile } from '../api';
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
  onSendMessage: (content: string, files?: File[]) => void;
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

  // Q&A pair messages (clarification exchanges) are read-only and non-editable
  const isQAPair = message.role === 'user' && message.content.startsWith('Q:');

  const [selectedVizType, setSelectedVizType] = React.useState<string>('table');
  const [barChartConfig, setBarChartConfig] = React.useState<BarChartConfigType | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackValue | null>(message.feedback || null);

  const { token } = useAuth();

  // --- Inline prompt editing ---
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(message.content);
  const [editNewFiles, setEditNewFiles] = React.useState<File[]>([]);
  const [editRemovedAttachments, setEditRemovedAttachments] = React.useState<Set<string>>(new Set());
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const filePickerOpenRef = React.useRef(false);

  const startEditing = () => {
    if (isLoading) return; // don't edit while a response is in flight
    setEditText(message.content);
    setEditNewFiles([]);
    setEditRemovedAttachments(new Set());
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
    setEditNewFiles([]);
    setEditRemovedAttachments(new Set());
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || isLoading) return;
    setIsEditing(false);
    onSendMessage(trimmed, editNewFiles.length > 0 ? editNewFiles : undefined);
    setEditNewFiles([]);
    setEditRemovedAttachments(new Set());
  };

  const handleAddEditFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setEditNewFiles((prev) => [...prev, ...Array.from(files)]);
    // reset so the same file can be picked again after removal
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const removeExistingAttachment = (fileName: string) => {
    setEditRemovedAttachments((prev) => {
      const next = new Set(prev);
      next.add(fileName);
      return next;
    });
  };

  const removeNewEditFile = (idx: number) => {
    setEditNewFiles((prev) => prev.filter((_, i) => i !== idx));
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

  // Listen for external viz-type switching (used during PDF export to capture
  // each visualization variant of this message)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.messageId === message.id && typeof detail?.vizType === 'string') {
        setSelectedVizType(detail.vizType);
      }
    };
    window.addEventListener('viz:force-type', handler);
    return () => window.removeEventListener('viz:force-type', handler);
  }, [message.id]);

  const vizIcons: Record<string, any> = {
    table: Table2,
    bar: ChartColumn,
    line: ChartLine,
    pie: ChartPie,
    donut: CircleDot,
    scatter: ChartScatter,
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
    <MessageRowStyled
      data-message-id={message.id}
      data-viz-types={Array.isArray(message.response?.visualizations) && availableVizTypes.length > 0 ? availableVizTypes.join(',') : undefined}
    >
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
                // Don't cancel if the file picker dialog is currently open
                if (filePickerOpenRef.current) return;
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

                {/* File management row — existing kept + new added, with "+" button */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.75,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    mt: 1,
                    pt: 1,
                    borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                  }}
                >
                  {/* "+" add-files button */}
                  <Box
                    component="button"
                    type="button"
                    onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                    onClick={() => {
                      filePickerOpenRef.current = true;
                      editFileInputRef.current?.click();
                      // Clear the flag shortly after — picker is modal, blur
                      // fires during click but dialog closes before re-focus
                      setTimeout(() => { filePickerOpenRef.current = false; }, 400);
                    }}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      height: 30,
                      px: 1.2,
                      borderRadius: '15px',
                      border: `1.5px dashed ${isDark ? 'rgba(21, 101, 192, 0.6)' : 'rgba(13, 71, 161, 0.5)'}`,
                      background: 'transparent',
                      color: isDark ? '#60a5fa' : '#0d47a1',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: isDark ? 'rgba(21, 101, 192, 0.15)' : 'rgba(13, 71, 161, 0.08)',
                        borderStyle: 'solid',
                      },
                    }}
                  >
                    <Plus size={13} />
                    Add file
                  </Box>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    onChange={handleAddEditFiles}
                    style={{ display: 'none' }}
                  />

                  {/* Existing attachments (filtered: hide removed) */}
                  {message.attachments &&
                    message.attachments
                      .filter((fn: string) => !editRemovedAttachments.has(fn))
                      .map((fileName: string, idx: number) => (
                        <Box
                          key={`existing-${idx}`}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 30,
                            pl: 1,
                            pr: 0.6,
                            borderRadius: '15px',
                            background: isDark ? 'rgba(21, 101, 192, 0.18)' : 'rgba(13, 71, 161, 0.1)',
                            gap: 0.5,
                          }}
                        >
                          <Paperclip size={11} color={isDark ? '#60a5fa' : '#0d47a1'} />
                          <Typography
                            sx={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: isDark ? '#e0e0e0' : '#0d47a1',
                              maxWidth: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fileName}
                          </Typography>
                          <Box
                            component="button"
                            type="button"
                            onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                            onClick={() => removeExistingAttachment(fileName)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              border: 'none',
                              borderRadius: '50%',
                              background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                              color: isDark ? '#fff' : '#333',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                background: isDark ? '#ef4444' : '#dc2626',
                                color: '#fff',
                              },
                            }}
                          >
                            <X size={14} strokeWidth={2.5} />
                          </Box>
                        </Box>
                      ))}

                  {/* Newly added files */}
                  {editNewFiles.map((f, idx) => (
                    <Box
                      key={`new-${idx}`}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 26,
                        pl: 1,
                        pr: 0.5,
                        borderRadius: '13px',
                        background: isDark ? 'rgba(46, 125, 50, 0.22)' : 'rgba(46, 125, 50, 0.1)',
                        gap: 0.5,
                      }}
                    >
                      <Paperclip size={11} color={isDark ? '#66bb6a' : '#2e7d32'} />
                      <Typography
                        sx={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: isDark ? '#e0e0e0' : '#1b5e20',
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.name}
                      </Typography>
                      <Box
                        component="button"
                        type="button"
                        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                        onClick={() => removeNewEditFile(idx)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          border: 'none',
                          borderRadius: '50%',
                          background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                          color: isDark ? '#fff' : '#333',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            background: isDark ? '#ef4444' : '#dc2626',
                            color: '#fff',
                          },
                        }}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </Box>
                    </Box>
                  ))}
                </Box>
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
                '&:hover .edit-pencil': { opacity: isQAPair ? 0 : 1 },
              }}
            >
              <UserMessageBubble
                elevation={0}
                onClick={isQAPair ? undefined : startEditing}
                sx={{
                  cursor: isLoading || isQAPair ? 'default' : 'text',
                  transition: 'all 0.2s ease',
                  '&:hover': !isLoading && !isQAPair ? {
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.45)',
                    transform: 'translateY(-1px)',
                  } : {},
                }}
              >
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    fontSize: isMobile ? '13px' : '14px',
                    lineHeight: 1.5,
                    fontWeight: 500,
                    whiteSpace: 'pre-wrap',
                    '& strong': { fontWeight: 700 },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
              </UserMessageBubble>

              {/* Attachment cards */}
              {!isEditing && message.attachments && message.attachments.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    mt: 1,
                  }}
                >
                  {message.attachments.map((fileName: string, idx: number) => {
                    const fileId = message.attachmentIds?.[fileName];
                    const canDownload = !!fileId;
                    const meta = message.attachmentMeta?.[fileName];
                    // Format file size (B / KB / MB)
                    const fmtSize = (bytes?: number) => {
                      if (!bytes && bytes !== 0) return '';
                      if (bytes < 1024) return `${bytes} B`;
                      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                    };
                    // Get extension from filename or mime type
                    const ext = (fileName.split('.').pop() || meta?.type?.split('/').pop() || 'FILE').toUpperCase();
                    const sizeStr = fmtSize(meta?.size);
                    const isDark = theme.palette.mode === 'dark';

                    return (
                      <Box
                        key={idx}
                        onClick={canDownload && token ? () => {
                          downloadFile(token, fileId!, fileName).catch(() => {});
                        } : undefined}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.2,
                          py: 0.7,
                          maxWidth: 240,
                          borderRadius: '10px',
                          border: `1px solid ${isDark ? 'rgba(21, 101, 192, 0.4)' : 'rgba(13, 71, 161, 0.25)'}`,
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(13, 71, 161, 0.15), rgba(21, 101, 192, 0.08))'
                            : 'linear-gradient(135deg, rgba(13, 71, 161, 0.06), rgba(21, 101, 192, 0.03))',
                          cursor: canDownload ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          '&:hover': canDownload ? {
                            transform: 'translateY(-1px)',
                            borderColor: '#1565c0',
                            boxShadow: isDark
                              ? '0 4px 12px rgba(13, 71, 161, 0.3)'
                              : '0 4px 12px rgba(13, 71, 161, 0.15)',
                            background: isDark
                              ? 'linear-gradient(135deg, rgba(13, 71, 161, 0.25), rgba(21, 101, 192, 0.15))'
                              : 'linear-gradient(135deg, rgba(13, 71, 161, 0.1), rgba(21, 101, 192, 0.06))',
                          } : {},
                        }}
                      >
                        {/* File-type icon block */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 30,
                            height: 30,
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: 0.3,
                            flexShrink: 0,
                          }}
                        >
                          {ext.length <= 4 ? ext : <Paperclip size={14} />}
                        </Box>
                        {/* Filename + size */}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isDark ? '#e0e0e0' : '#212529',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.3,
                            }}
                          >
                            {fileName}
                          </Typography>
                          {sizeStr && (
                            <Typography
                              sx={{
                                fontSize: '10px',
                                fontWeight: 500,
                                color: isDark ? '#999' : '#6c757d',
                                lineHeight: 1.3,
                              }}
                            >
                              {sizeStr}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
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

            {/* Visualization Type Icons — only show when multiple viz types are available */}
            {message.response?.visualizations && availableVizTypes.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  alignItems: 'center',
                  p: 0.4,
                  borderRadius: '8px',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
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
                        width: 30,
                        height: 30,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isActive
                          ? 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)'
                          : 'transparent',
                        color: isActive
                          ? '#ffffff'
                          : isDark
                            ? '#999'
                            : '#6c757d',
                        boxShadow: isActive ? '0 2px 6px rgba(13, 71, 161, 0.35)' : 'none',
                        '&:hover': {
                          background: isActive
                            ? 'linear-gradient(135deg, #0a3d8f 0%, #1256a0 100%)'
                            : isDark
                              ? 'rgba(21, 101, 192, 0.15)'
                              : 'rgba(13, 71, 161, 0.08)',
                          color: isActive ? '#ffffff' : isDark ? '#60a5fa' : '#0d47a1',
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
                <Box
                  sx={{ mt: 2 }}
                  data-viz-capture
                  data-viz-label={`${(selectedVizType || message.response.visualizations[0].type).toString().toUpperCase()} view`}
                >
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

            {/* Divider — only when retry button is visible */}
            {isLastAssistantMessage && (
              <Box sx={{ width: '1px', height: 14, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)', mx: 0.25 }} />
            )}

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