import React, { useState, useEffect, useCallback, useRef } from 'react'; // useRef kept for dragCounter
import { Box, Alert, Snackbar, Typography, CircularProgress, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { ChatSidebar } from './ChatSidebar';
import { ChatInterface } from './ChatInterface';
import { MoreMenu } from './MoreMenu';
import { Sparkles, Menu } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  newChat,
  selectChat,
  setLoading,
  setError,
  clearError,
  setChatSessionId,
  hydrateChatHistory,
  renameSessionTitle,
} from '../features/chatSlice';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useMessageHandler } from '../hooks/useMessageHandler';

export function Dashboard() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const chats = useSelector((state: RootState) => state.chat.chats);
  const currentChatId = useSelector((state: RootState) => state.chat.currentChatId);
  const loadingChatId = useSelector((state: RootState) => state.chat.loadingChatId);
  const isLoading = loadingChatId === currentChatId && loadingChatId !== null;
  const error = useSelector((state: RootState) => state.chat.error);
  const dispatch = useDispatch<AppDispatch>();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Counter tracks nested dragenter/dragleave pairs to avoid overlay flicker on child elements
  const dragCounterRef = useRef(0);

  // Only show overlay for real file drags, not text selections
  const isFileDrag = (dt: DataTransfer) => Array.from(dt.types).includes('Files');

  const resetDrag = useCallback(() => {
    dragCounterRef.current = 0;
    setIsDragging(false);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) resetDrag();
  }, [resetDrag]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault(); // required to allow drop
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    resetDrag();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      window.dispatchEvent(new CustomEvent('filesDropped', { detail: { files } }));
    }
  }, [resetDrag]);

  useEffect(() => {
    const onDocDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) resetDrag();
    };
    const onDragEnd = () => resetDrag();

    document.addEventListener('dragleave', onDocDragLeave);
    document.addEventListener('dragend', onDragEnd);
    return () => {
      document.removeEventListener('dragleave', onDocDragLeave);
      document.removeEventListener('dragend', onDragEnd);
    };
  }, [resetDrag]);

  const { isInitializing, createNewChat, loadChatHistory, refreshSessions, deleteChatSession, renameChatSession } = useSessionManagement();

  const currentChat = chats.find((c) => c.id === currentChatId) || null;
  const { handleSendMessage, handleRefineResponse, handleClarifyingQuestionConfirm, stopCurrentRequest, currentProgressStep, dismissClarification } = useMessageHandler(
    currentChatId || '',
    currentChat?.sessionId,
    refreshSessions
  );
  // Read pending clarification from Redux (survives page reload)
  const pendingClarification = currentChat?.pendingClarification || null;

  // Wrap handleSendMessage to create a chat first if none exists
  const handleSendMessageWithChat = async (content: string, files?: File[]) => {
    let targetChatId = currentChatId;
    const chatTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;

    // If no chat exists, create one locally first (without backend session yet)
    if (!targetChatId) {
      const chatId = Date.now().toString();
      dispatch(newChat({ title: chatTitle, id: chatId }));
      dispatch(selectChat(chatId));
      targetChatId = chatId;
    } else {
      // If this is the first message in an existing chat (e.g. created via "New Chat" button),
      // update the title locally and on the backend
      const chat = chats.find((c) => c.id === targetChatId);
      if (chat && (!chat.messages || chat.messages.length === 0) && chat.title === 'New Chat') {
        dispatch(renameSessionTitle({ chatId: targetChatId, title: chatTitle }));
        if (chat.sessionId) {
          renameChatSession(targetChatId, chat.sessionId, chatTitle).catch(() => {});
        }
      }
    }

    // Now send the message with the target chatId - this will create the backend session if needed
    handleSendMessage(content, files, targetChatId);
  };

  const handleNewChat = async (): Promise<{ chatId: string; sessionId: string } | null> => {
    const newChatId = Date.now().toString();
    try {
      dispatch(clearError());
      dispatch(setLoading(newChatId));

      const result = await createNewChat();
      if (!result) return null;

      dispatch(newChat({ title: 'New Chat', id: result.chatId }));
      dispatch(selectChat(result.chatId));
      dispatch(setChatSessionId({ chatId: result.chatId, sessionId: result.sessionId }));

      return result;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || 'Failed to create new chat session';
      dispatch(setError(errorMsg));
      return null;
    } finally {
      dispatch(setLoading(null));
    }
  };

  const handleSelectChat = async (chatId: string) => {
    dispatch(selectChat(chatId));

    const chat = chats.find((c) => c.id === chatId);

    if (chat?.sessionId && (!chat.messages || chat.messages.length === 0)) {
      try {
        dispatch(setLoading(chatId));
        const messages = await loadChatHistory(chatId, chat.sessionId);
        if (messages && messages.length > 0) {
          dispatch(
            hydrateChatHistory({
              sessionId: chat.sessionId,
              title: chat.title,
              messages,
            })
          );
        }
      } catch (err: any) {
        dispatch(
          setError(
            err?.response?.data?.detail || 'Failed to load chat history'
          )
        );
      } finally {
        dispatch(setLoading(null));
      }
    }
  };

  // Don't auto-create chat on mount - let user start conversation naturally
  // When user sends first message without a session, it will be created automatically

  if (isInitializing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', '@supports not (height: 100dvh)': { height: '100vh' } }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: 'flex', height: '100dvh', '@supports not (height: 100dvh)': { height: '100vh' }, overflow: 'hidden', flexDirection: 'column', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-screen file drop overlay - covers sidebar + chat area */}
      {isDragging && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            backdropFilter: 'blur(4px)',
            border: '2px dashed #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '16px',
              mb: 2,
            }}
          >
            <Sparkles size={40} color="#3b82f6" />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6', mb: 1 }}>
              Add anything
            </Box>
            <Box sx={{ fontSize: '14px', color: '#94a3b8' }}>
              Drop any file here to add it to the conversation
            </Box>
          </Box>
        </Box>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => dispatch(clearError())}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 1400 }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => dispatch(clearError())}
          sx={{ width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', minWidth: 0 }}>
        <ChatSidebar
          chats={chats.map((c) => ({
            id: c.id,
            sessionId: c.sessionId,
            title: c.title,
            timestamp: new Date(c.createdAt),
          }))}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={deleteChatSession}
          onRenameChat={renameChatSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          {/* Mobile header with hamburger menu */}
          {isMobile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 8px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderBottom: `1px solid ${
                  muiTheme.palette.mode === 'dark'
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(99, 102, 241, 0.1)'
                }`,
                backgroundColor:
                  muiTheme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.85)'
                    : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
                minHeight: 48,
              }}
            >
              <IconButton
                onClick={() => setIsMobileSidebarOpen(true)}
                sx={{ width: 44, height: 44, flexShrink: 0 }}
              >
                <Menu size={22} />
              </IconButton>

              {/* Center: icon + title (matches desktop ChatHeader) */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0, ml: 0.5 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
                  borderRadius: '9px',
                  boxShadow: '0 0 8px rgba(99, 102, 241, 0.3)',
                }}>
                  <Sparkles size={16} color="white" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <Typography
                    noWrap
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                      background:
                        muiTheme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, #e0e7ff, #a5b4fc)'
                          : 'linear-gradient(135deg, #312e81, #6366f1)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    SDM AI Assistant
                  </Typography>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: '0.6rem',
                      lineHeight: 1.2,
                      color: muiTheme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(0,0,0,0.4)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    AI-powered insights for Service Desk
                  </Typography>
                </Box>
              </Box>

              {/* Right: 3-dot menu */}
              <MoreMenu
                onCopy={() => console.log('copy')}
                onShare={() => console.log('share')}
              />
            </Box>
          )}
          <ChatInterface
            key={currentChatId} // Force remount when switching chats
            messages={currentChat?.messages || []}
            onSendMessage={handleSendMessageWithChat}
            onRefineResponse={handleRefineResponse}
            followUpSuggestions={currentChat?.followUpSuggestions}
            isRefining={currentChat?.isRefining || false}
            isLoading={isLoading}
            onStopRequest={stopCurrentRequest}
            currentProgressStep={currentProgressStep}
            onClarifyingQuestionConfirm={handleClarifyingQuestionConfirm}
            pendingClarification={pendingClarification}
            onDismissClarification={dismissClarification}
          />
        </Box>
      </Box>
    </Box>
  );
}