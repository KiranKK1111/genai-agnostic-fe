import React, { useState, useRef, useCallback, memo } from 'react';
import {
  Box,
  IconButton,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  TextareaAutosize,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Send, Paperclip, X, Square } from 'lucide-react';

// ─── Styled Components ────────────────────────────────────────────────────────

/**
 * Outer container.
 * Key behaviour:
 *  - paddingBottom uses env(safe-area-inset-bottom) so content never hides
 *    behind the iOS home indicator or Android gesture bar.
 *  - On mobile we use a smaller top/side padding to maximise chat space.
 */
const InputContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : 'transparent',
  padding: '12px 16px 20px 16px',
  // Safe area: add bottom inset (notch / home indicator) on top of design padding
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

const FileChipsContainer = styled(Box)(({ theme }) => ({
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  borderBottom: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)'
  }`,
}));

/**
 * Expanding textarea.
 * - fontSize 16px on mobile prevents iOS from auto-zooming the page when
 *   the user taps into the input.
 * - minHeight / maxHeight scale down on small screens.
 */
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
  // Prevent iOS auto-zoom (triggered when font < 16px)
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatInputAreaProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading: boolean;
  onStopRequest?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ChatInputArea = memo(
  ({ onSendMessage, isLoading, onStopRequest }: ChatInputAreaProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [input, setInput] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Listen for files dropped onto the Dashboard drag overlay
    React.useEffect(() => {
      const handleFilesDropped = (event: Event) => {
        const e = event as CustomEvent;
        if (e.detail?.files) setAttachedFiles(e.detail.files);
      };
      window.addEventListener('filesDropped', handleFilesDropped);
      return () => window.removeEventListener('filesDropped', handleFilesDropped);
    }, []);

    const handleSubmit = useCallback(
      (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          onSendMessage(input.trim(), attachedFiles);
          setInput('');
          setAttachedFiles([]);
        }
      },
      [input, isLoading, attachedFiles, onSendMessage]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Enter sends on all devices; Shift+Enter inserts a newline
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e);
        }
      },
      [handleSubmit]
    );

    const handleFileAttachmentClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          setAttachedFiles(Array.from(e.target.files));
          e.target.value = ''; // allow re-selecting the same file
        }
      },
      []
    );

    const handleRemoveFile = useCallback((index: number) => {
      setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Touch-target size: 44px on mobile (Apple HIG), 36px on desktop
    const btnSize = isMobile ? 44 : 36;
    const iconSize = isMobile ? 22 : 20;

    return (
      <InputContainer>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Centred column — matches the max-width of the message column */}
        <Box
          sx={{
            maxWidth: { xs: '100%', md: 780 },
            margin: '0 auto',
            width: '100%',
          }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              backgroundColor:
                theme.palette.mode === 'dark' ? '#2f2f2f' : '#f4f4f4',
              borderRadius: '26px',
              border: `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)'
              }`,
              overflow: 'hidden',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
              '&:focus-within': {
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.25)',
                backgroundColor:
                  theme.palette.mode === 'dark' ? '#2f2f2f' : '#ffffff',
              },
            }}
          >
            {/* File attachment chips */}
            {attachedFiles.length > 0 && (
              <FileChipsContainer>
                {attachedFiles.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    size="small"
                    onDelete={() => handleRemoveFile(index)}
                    deleteIcon={<X size={14} />}
                    sx={{
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      fontSize: '12px',
                      height: '26px',
                      '& .MuiChip-deleteIcon': {
                        color: '#64748b',
                        marginLeft: '4px',
                        '&:hover': { color: '#ef4444' },
                      },
                    }}
                  />
                ))}
              </FileChipsContainer>
            )}

            {/* Input row: attach | textarea | send/stop */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 0.5,
                padding: isMobile ? '6px 6px 6px 2px' : '8px 8px 8px 4px',
                minHeight: isMobile ? '56px' : '52px',
              }}
            >
              {/* Attach */}
              <Tooltip title="Attach files (PDF, CSV, XLSX, JSON, TXT)">
                <IconButton
                  size="small"
                  onClick={handleFileAttachmentClick}
                  sx={{
                    color:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.5)'
                        : 'rgba(0, 0, 0, 0.5)',
                    width: btnSize,
                    height: btnSize,
                    flexShrink: 0,
                    touchAction: 'manipulation',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.85)'
                          : 'rgba(0, 0, 0, 0.85)',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <Paperclip size={iconSize} />
                </IconButton>
              </Tooltip>

              {/* Expanding textarea */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', py: isMobile ? '10px' : '6px'
 }}>
                <StyledTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isMobile
                      ? 'Message SDM AI...'
                      : 'Ask about SDM analytics, reports, incidents...'
                  }
                  minRows={1}
                  maxRows={isMobile ? 5 : 8}
                />
              </Box>

              {/* Stop / Send */}
              {isLoading && onStopRequest ? (
                <Tooltip title="Stop generating">
                  <IconButton
                    onClick={onStopRequest}
                    sx={{
                      color:
                        theme.palette.mode === 'dark' ? '#fff' : '#000',
                      width: btnSize,
                      height: btnSize,
                      flexShrink: 0,
                      touchAction: 'manipulation',
                      transition: 'color 0.15s ease',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.8)'
                            : 'rgba(0, 0, 0, 0.8)',
                      },
                    }}
                  >
                    <Square size={isMobile ? 18 : 16} fill="currentColor" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title={input.trim() ? 'Send message' : 'Enter a message'}>
                  <span>
                    <IconButton
                      type="submit"
                      disabled={!input.trim()}
                      sx={{
                        color: input.trim()
                          ? theme.palette.mode === 'dark'
                            ? '#fff'
                            : '#000'
                          : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.3)'
                          : 'rgba(0, 0, 0, 0.3)',
                        width: btnSize,
                        height: btnSize,
                        flexShrink: 0,
                        touchAction: 'manipulation',
                        transition: 'color 0.15s ease',
                        '&:hover:not(:disabled)': {
                          backgroundColor: 'transparent',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.8)'
                              : 'rgba(0, 0, 0, 0.8)',
                        },
                        '&:disabled': {
                          backgroundColor: 'transparent',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.3)'
                              : 'rgba(0, 0, 0, 0.3)',
                        },
                      }}
                    >
                      <Send size={iconSize} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Footer hint */}
          <Box
            sx={{
              textAlign: 'center',
              mt: 1,
              color:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.35)'
                  : 'rgba(0, 0, 0, 0.35)',
              fontSize: '11px',
              [theme.breakpoints.down('md')]: { fontSize: '10px', mt: 0.5 },
            }}
          >
            AI-powered insights for Service Desk Management
          </Box>
        </Box>
      </InputContainer>
    );
  }
);

ChatInputArea.displayName = 'ChatInputArea';
