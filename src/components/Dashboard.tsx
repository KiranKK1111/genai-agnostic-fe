import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Box, Alert, Snackbar, Typography, CircularProgress, IconButton, useTheme, useMediaQuery, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ChatSidebar } from './ChatSidebar';
import { ChatInterface } from './ChatInterface';
import { ChatHeader } from './ChatHeader'; // used for dashboard-mode header only
import { Sparkles, Menu, MessageSquare, LayoutDashboard } from 'lucide-react';
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

const DashboardPage = lazy(() => import('./dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));

export function Dashboard() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const chats = useSelector((state: RootState) => state.chat.chats);
  const currentChatId = useSelector((state: RootState) => state.chat.currentChatId);
  const loadingChatId = useSelector((state: RootState) => state.chat.loadingChatId);
  const isLoading = loadingChatId === currentChatId && loadingChatId !== null;
  const error = useSelector((state: RootState) => state.chat.error);
  const dispatch = useDispatch<AppDispatch>();

  const [viewMode, setViewMode] = useState<'chat' | 'dashboard'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragCounterRef = useRef(0);

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
    e.preventDefault();
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
  const pendingClarification = currentChat?.pendingClarification || null;

  const handleSendMessageWithChat = async (content: string, files?: File[]) => {
    // Auto-switch to chat when user sends a message
    setViewMode('chat');

    let targetChatId = currentChatId;
    const chatTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;

    if (!targetChatId) {
      const chatId = Date.now().toString();
      dispatch(newChat({ title: chatTitle, id: chatId }));
      dispatch(selectChat(chatId));
      targetChatId = chatId;
    } else {
      const chat = chats.find((c) => c.id === targetChatId);
      if (chat && (!chat.messages || chat.messages.length === 0) && chat.title === 'New Chat') {
        dispatch(renameSessionTitle({ chatId: targetChatId, title: chatTitle }));
        if (chat.sessionId) {
          renameChatSession(targetChatId, chat.sessionId, chatTitle).catch(() => {});
        }
      }
    }

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

      // Switch to chat view when creating a new chat
      setViewMode('chat');

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
    // Auto-switch to chat when selecting a session
    setViewMode('chat');

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
      {/* File drop overlay */}
      {isDragging && (
        <Box
          sx={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(59, 130, 246, 0.08)', backdropFilter: 'blur(4px)',
            border: '2px dashed #3b82f6', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '16px', mb: 2 }}>
            <Sparkles size={40} color="#3b82f6" />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6', mb: 1 }}>Add anything</Box>
            <Box sx={{ fontSize: '14px', color: '#94a3b8' }}>Drop any file here to add it to the conversation</Box>
          </Box>
        </Box>
      )}

      <Snackbar
        open={!!error} autoHideDuration={5000}
        onClose={() => dispatch(clearError())}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 1400 }}
      >
        <Alert severity="error" variant="filled" onClose={() => dispatch(clearError())} sx={{ width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', minWidth: 0 }}>
        {/* Sidebar — always visible */}
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

        {/* Main content area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          {/* Mobile header — only shown on mobile */}
          {isMobile && (
            <Box
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 8px', position: 'sticky', top: 0, zIndex: 10,
                borderBottom: `1px solid ${muiTheme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)'}`,
                backgroundColor: muiTheme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
                minHeight: 48,
              }}
            >
              <IconButton onClick={() => setIsMobileSidebarOpen(true)} sx={{ width: 44, height: 44, flexShrink: 0 }}>
                <Menu size={22} />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0, ml: 0.5 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)', borderRadius: '9px',
                  boxShadow: '0 0 8px rgba(13, 71, 161, 0.3)',
                }}>
                  <Sparkles size={16} color="white" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <Typography noWrap sx={{
                    fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', lineHeight: 1.2,
                    background: muiTheme.palette.mode === 'dark' ? 'linear-gradient(135deg, #e0e7ff, #a5b4fc)' : 'linear-gradient(135deg, #312e81, #6366f1)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    SDM AI Assistant
                  </Typography>
                </Box>
              </Box>
              <ToggleButtonGroup
                value={viewMode} exclusive
                onChange={(_, v) => v && setViewMode(v)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': { px: 1, py: 0.25, border: 'none' },
                  '& .Mui-selected': {
                    bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(99,102,241,0.25) !important' : 'rgba(99,102,241,0.12) !important',
                    color: `${muiTheme.palette.primary.main} !important`,
                  },
                }}
              >
                <ToggleButton value="dashboard"><LayoutDashboard size={16} /></ToggleButton>
                <ToggleButton value="chat"><MessageSquare size={16} /></ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* Desktop header — always visible, single instance to prevent layout shift */}
          {!isMobile && (
            <ChatHeader viewMode={viewMode} onViewModeChange={setViewMode} />
          )}

          {/* Content: Dashboard or Chat */}
          {viewMode === 'dashboard' ? (
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress size={28} /></Box>}>
              <DashboardPage />
            </Suspense>
          ) : (
            <ChatInterface
              key={currentChatId}
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
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
