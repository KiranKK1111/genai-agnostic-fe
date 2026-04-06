/**
 * ClarificationPopup — replaces the ChatInputArea when a clarifying question is active.
 * Claude-inspired vertical option list design with numbered options.
 * Respects support_for_custom_replies flag from backend.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextareaAutosize,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Send, X, ChevronRight, Pencil } from 'lucide-react';
import type { ClarifyingQuestion } from '../api';

// ─── Styled Components ──────────────────────────────────────────────────────

const InputContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : 'transparent',
  padding: '12px 16px 20px 16px',
  paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
  [theme.breakpoints.down('md')]: {
    padding: '10px 12px 16px 12px',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '8px 8px 12px 8px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
  },
}));

const StyledTextarea = styled(TextareaAutosize)(({ theme }) => ({
  flex: 1,
  border: 'none',
  outline: 'none',
  resize: 'none',
  backgroundColor: 'transparent',
  color: theme.palette.mode === 'dark' ? '#fff' : '#000',
  fontSize: '14px',
  lineHeight: '1.6',
  fontFamily: 'inherit',
  padding: '0',
  minHeight: '24px',
  maxHeight: '200px',
  overflowY: 'auto',
  [theme.breakpoints.down('md')]: {
    fontSize: '16px',
    maxHeight: '140px',
  },
  '&::placeholder': {
    color:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.4)'
        : 'rgba(0, 0, 0, 0.4)',
  },
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '3px',
  },
}));

// ─── Props ──────────────────────────────────────────────────────────────────

interface ClarificationPopupProps {
  clarification: ClarifyingQuestion;
  onConfirm: (value: string, clarificationType: string) => void;
  onDismiss: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClarificationPopup({ clarification, onConfirm, onDismiss }: ClarificationPopupProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [customInput, setCustomInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isTextInput = clarification.mode === 'text_input';
  const isMultiSelect = clarification.mode === 'multi_select' || clarification.type === 'viz_type';
  const allowCustomReplies = isTextInput || (clarification.support_for_custom_replies !== false && !isMultiSelect);
  const hasCustomText = customInput.trim().length > 0;
  const hasSelection = selected.length > 0;
  const canSend = hasCustomText || hasSelection;

  const options = isTextInput ? [] : (clarification.options || []);
  const totalOptions = options.length;

  useEffect(() => {
    if (allowCustomReplies || isTextInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [allowCustomReplies, isTextInput]);

  // Keyboard shortcuts: Escape to dismiss, number keys to select options
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Escape always dismisses (cancels entire flow)
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }

      // Don't capture number keys if typing in the custom input
      if (document.activeElement === inputRef.current) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= totalOptions) {
        const opt = options[num - 1];
        const value = typeof opt === 'string' ? opt : opt.value || opt.label;
        handleOptionClick(value, num - 1);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [options, totalOptions, selected, onDismiss]);

  const handleOptionClick = (value: string, _idx?: number) => {
    if (isMultiSelect) {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      // Single select — send immediately
      onConfirm(value, clarification.type || '');
    }
  };

  const handleSend = () => {
    if (hasCustomText) {
      onConfirm(customInput.trim(), clarification.type || '');
    } else if (hasSelection) {
      onConfirm(selected.join(','), clarification.type || '');
    }
  };

  // Skip = proceed with defaults (not cancel)
  const handleSkip = () => {
    onConfirm('__default', clarification.type || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (canSend) {
        e.preventDefault();
        handleSend();
      }
    }
    if (e.key === 'Escape') {
      onDismiss();
    }
  };

  return (
    <InputContainer>
      <Box
        sx={{
          maxWidth: { xs: '100%', md: 780 },
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Main card */}
        <Box
          sx={{
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderRadius: '16px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 4px 24px rgba(0, 0, 0, 0.4)'
              : '0 4px 24px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header: Question + navigation + close */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              px: 2.5,
              pt: 2,
              pb: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.85)',
                lineHeight: 1.5,
                flex: 1,
                pr: 1,
                '& strong': { fontWeight: 700 },
              }}
              dangerouslySetInnerHTML={{
                __html: clarification.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
              }}
            />

            <IconButton
              size="small"
              onClick={onDismiss}
              sx={{
                color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)',
                width: 28,
                height: 28,
                flexShrink: 0,
                mt: -0.5,
                '&:hover': {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              <X size={16} />
            </IconButton>
          </Box>

          {/* Hint text — shown for text_input mode (e.g. available fields) */}
          {isTextInput && clarification.hint && (
            <Box sx={{ px: 2.5, pb: 1 }}>
              <Typography
                sx={{
                  fontSize: '12px',
                  color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                  lineHeight: 1.4,
                }}
              >
                {clarification.hint}
              </Typography>
            </Box>
          )}

          {/* Options list — vertical, one per line */}
          {options.length > 0 && (
            <Box sx={{ px: 1, pb: allowCustomReplies ? 0 : 1 }}>
              {options.map((opt, idx) => {
                const label = typeof opt === 'string' ? opt : opt.label;
                const value = typeof opt === 'string' ? opt : opt.value || opt.label;
                const description = typeof opt === 'string' ? undefined : opt.description;
                const isSelected = selected.includes(value);
                const isHovered = hoveredIdx === idx;

                return (
                  <Box
                    key={value || `opt-${idx}`}
                    onClick={() => handleOptionClick(value, idx)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      mx: 0.5,
                      cursor: 'pointer',
                      borderRadius: '10px',
                      transition: 'all 0.15s ease',
                      backgroundColor: isSelected
                        ? isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'
                        : isHovered
                          ? isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                          : 'transparent',
                      border: isSelected
                        ? `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`
                        : '1px solid transparent',
                      '&:active': {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    {/* Number badge */}
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: isSelected
                          ? '#3b82f6'
                          : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)',
                        color: isSelected
                          ? '#fff'
                          : isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {idx + 1}
                    </Box>

                    {/* Label + description */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: isSelected ? 500 : 400,
                          color: isSelected
                            ? isDark ? '#93bbfd' : '#2563eb'
                            : isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.8)',
                          lineHeight: 1.4,
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {label}
                      </Typography>
                      {description && (
                        <Typography
                          sx={{
                            fontSize: '12px',
                            color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                            lineHeight: 1.3,
                            mt: 0.25,
                          }}
                        >
                          {description}
                        </Typography>
                      )}
                    </Box>

                    {/* Arrow for single-select hover */}
                    {!isMultiSelect && isHovered && (
                      <ChevronRight
                        size={16}
                        style={{
                          color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Checkmark for multi-select */}
                    {isMultiSelect && isSelected && (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '6px',
                          backgroundColor: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '12px',
                          color: '#fff',
                        }}
                      >
                        ✓
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Note — shown when backend sends a note (e.g. high record count warning) */}
          {clarification.note && (
            <Box
              sx={{
                mx: 2,
                mb: 1,
                mt: 0.5,
                px: 2,
                py: 1.5,
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.06)',
                border: `1px solid ${isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.25)'}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  color: isDark ? 'rgba(250, 204, 21, 0.85)' : 'rgba(161, 98, 7, 0.9)',
                  '& strong': {
                    fontWeight: 600,
                  },
                }}
                dangerouslySetInnerHTML={{
                  __html: clarification.note
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </Box>
          )}

          {/* Custom reply input — only shown when support_for_custom_replies is true */}
          {allowCustomReplies && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1,
                mx: 0.5,
                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                }}
              >
                <Pencil size={14} style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
              </Box>

              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StyledTextarea
                  ref={inputRef}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={clarification.placeholder || "Something else"}
                  minRows={1}
                  maxRows={isMobile ? 3 : 4}
                />
              </Box>

              {/* Send when typing, Skip when empty — same position */}
              {hasCustomText ? (
                <Tooltip title="Send answer">
                  <IconButton
                    size="small"
                    onClick={handleSend}
                    sx={{
                      color: '#3b82f6',
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
                      },
                    }}
                  >
                    <Send size={16} />
                  </IconButton>
                </Tooltip>
              ) : (
                <Button
                  size="small"
                  onClick={handleSkip}
                  sx={{
                    textTransform: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    flexShrink: 0,
                    color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '6px',
                    px: 1.5,
                    py: 0.5,
                    minWidth: 0,
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                    },
                  }}
                >
                  Skip
                </Button>
              )}
            </Box>
          )}

          {/* Footer for multi-select only: Skip + Send */}
          {!allowCustomReplies && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                pb: 1.5,
                pt: 0.5,
              }}
            >
              <Button
                size="small"
                onClick={handleSkip}
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.5,
                  minWidth: 0,
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  },
                }}
              >
                Skip
              </Button>

              {isMultiSelect && hasSelection && (
                <Tooltip title="Send selection">
                  <IconButton
                    size="small"
                    onClick={handleSend}
                    sx={{
                      color: '#3b82f6',
                      width: 32,
                      height: 32,
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
                      },
                    }}
                  >
                    <Send size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {/* Footer hint */}
        <Box
          sx={{
            textAlign: 'center',
            mt: 1,
            color: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
            fontSize: '11px',
          }}
        >
          AI-powered insights for Service Desk Management
        </Box>
      </Box>
    </InputContainer>
  );
}
