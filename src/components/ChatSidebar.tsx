import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  InputAdornment,
  Collapse,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  SwipeableDrawer,
  useTheme as useMuiTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  X as CloseIcon,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface Chat {
  id: string;
  sessionId?: string;
  title: string;
  timestamp: Date | string;
}

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string, sessionId: string) => Promise<void>;
  onRenameChat?: (chatId: string, sessionId: string, title: string) => Promise<void>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SidebarContainer = styled(Box)(({ theme }) => ({
  height: '100dvh',
  '@supports not (height: 100dvh)': { height: '100vh' },
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette?.mode === 'dark' ? '#0d0d0d' : '#f5f5f5',
  borderRight: `1px solid ${
    theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(0, 0, 0, 0.08)'
  }`,
  transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  willChange: 'width',
  // Inside mobile drawer, no border needed
  [theme.breakpoints.down('md')]: {
    borderRight: 'none',
  },
}));

const GradientAvatar = styled(Avatar)({
  background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
});

const GradientButton = styled(Button)({
  background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
  color: '#ffffff',
  fontWeight: 500,
  textTransform: 'none',
  '&:hover': {
    background: 'linear-gradient(135deg, #0a3d8f 0%, #1256a0 100%)',
  },
});

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>(({ theme, isActive }) => ({
  borderRadius: 6,
  margin: '0px 8px',
  padding: '8px 10px',
  backgroundColor: isActive
    ? theme.palette.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.15)'
      : 'rgba(226, 232, 240, 0.5)'
    : 'transparent',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.1)'
        : 'rgba(226, 232, 240, 0.4)',
    '& .chat-actions': { opacity: 1 },
  },
  // Hover reveal on pointer devices; always visible on touch devices
  '& .chat-actions': { opacity: 0, transition: 'opacity 0.15s' },
  '@media (hover: none)': {
    '& .chat-actions': { opacity: 1 },
  },
}));

export function ChatSidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}: ChatSidebarProps) {
  const { logout, username } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [searchQuery, setSearchQuery] = useState('');
  const [chatsExpanded, setChatsExpanded] = useState(true);

  // Inline rename state
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog
  const [deleteDialogChatId, setDeleteDialogChatId] = useState<string | null>(null);

  const handleSelectChat = (chatId: string) => {
    if (renamingChatId) return; // don't switch while renaming
    onSelectChat(chatId);
    if (isMobile && onMobileClose) onMobileClose();
  };

  const handleNewChat = () => {
    onNewChat();
    if (isMobile && onMobileClose) onMobileClose();
  };

  // Click on session title to start inline rename
  const startRename = useCallback(
    (e: React.MouseEvent, chat: Chat) => {
      e.stopPropagation();
      setRenamingChatId(chat.id);
      setRenameValue(chat.title);
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 50);
    },
    []
  );

  const commitRename = useCallback(
    async (chat: Chat) => {
      if (renamingChatId !== chat.id) return;
      const trimmed = renameValue.trim();
      if (trimmed && trimmed !== chat.title && onRenameChat && chat.sessionId) {
        await onRenameChat(chat.id, chat.sessionId, trimmed);
      }
      setRenamingChatId(null);
    },
    [renameValue, onRenameChat, renamingChatId]
  );

  const confirmDelete = useCallback(
    async (chat: Chat) => {
      setDeleteDialogChatId(null);
      if (onDeleteChat && chat.sessionId) {
        await onDeleteChat(chat.id, chat.sessionId);
      }
    },
    [onDeleteChat]
  );

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chatToDelete = chats.find((c) => c.id === deleteDialogChatId);

  const sidebarWidth = isMobile ? 280 : isCollapsed ? 60 : 260;

  const sidebarContent = (
    <SidebarContainer sx={{ width: sidebarWidth }}>
      {/* Expanded Content */}
      <Box
        sx={{
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? 'none' : 'auto',
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GradientAvatar sx={{ width: 32, height: 32 }}>
                <Sparkles size={16} />
              </GradientAvatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                SDM AI
              </Typography>
            </Box>
            <IconButton onClick={isMobile ? onMobileClose : onToggleCollapse} size="small">
              {isMobile ? <CloseIcon size={20} /> : <PanelLeft size={20} />}
            </IconButton>
          </Box>

          <GradientButton fullWidth startIcon={<Plus size={18} />} onClick={handleNewChat} sx={{ mb: 2 }}>
            New chat
          </GradientButton>

          <TextField
            fullWidth
            size="small"
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <CloseIcon size={14} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

        <Divider />

        {/* Chat List */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            py: 0,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              borderRadius: '4px',
            },
          }}
        >
          {/* Your Chats Section */}
          <Box>
            <ListItemButton
              onClick={() => setChatsExpanded(!chatsExpanded)}
              sx={{ px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {chatsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <MessageCircle size={16} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>
                Your Chats
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {chats.length}
              </Typography>
            </ListItemButton>

            <Collapse in={chatsExpanded} timeout="auto" unmountOnExit>
              {filteredChats.length === 0 ? (
                <Box sx={{ px: 2, py: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {chats.length === 0 ? 'No chats yet' : 'No chats match search'}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ py: 0, px: 1 }}>
                  {filteredChats.map((chat) => (
                    <ListItem key={chat.id} disablePadding sx={{ mb: 0.25 }}>
                      {renamingChatId === chat.id ? (
                        // Inline rename — appears when user clicks on the session title
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mx: 1,
                            my: 0.25,
                            width: '100%',
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <MessageSquare size={14} />
                          </ListItemIcon>
                          <TextField
                            inputRef={renameInputRef}
                            size="small"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitRename(chat);
                              }
                              if (e.key === 'Escape') setRenamingChatId(null);
                            }}
                            onBlur={() => commitRename(chat)}
                            autoFocus
                            fullWidth
                            sx={{
                              '& .MuiInputBase-input': {
                                fontSize: '0.8rem',
                                py: 0.5,
                                px: 1,
                              },
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '6px',
                              },
                            }}
                          />
                        </Box>
                      ) : (
                        <StyledListItemButton
                          isActive={currentChatId === chat.id}
                          onClick={() => handleSelectChat(chat.id)}
                          sx={{ borderRadius: 1, pl: 2 }}
                        >
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <MessageSquare size={14} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography
                                variant="caption"
                                noWrap
                                onDoubleClick={(e) => {
                                  // Double-click on title to rename
                                  if (onRenameChat) startRename(e, chat);
                                }}
                                sx={{
                                  fontSize: '0.8rem',
                                  display: 'block',
                                  userSelect: 'none',
                                }}
                              >
                                {chat.title.length > 28
                                  ? `${chat.title.substring(0, 28)}\u2026`
                                  : chat.title}
                              </Typography>
                            }
                          />
                          {/* Delete icon — no edit icon, rename is triggered by clicking the title */}
                          {onDeleteChat && (
                            <Box className="chat-actions" sx={{ display: 'flex' }}>
                              <Tooltip title="Delete" placement="top">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialogChatId(chat.id);
                                  }}
                                  sx={{
                                    p: 0.5,
                                    '&:hover': { color: 'error.main' },
                                  }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </StyledListItemButton>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Collapse>
          </Box>
        </Box>

        <Divider />

        {/* Footer */}
        <Box sx={{ p: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              backgroundColor:
                theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.6)',
              mb: 1.5,
            }}
          >
            <GradientAvatar sx={{ width: 32, height: 32 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {username.charAt(0).toUpperCase()}
              </Typography>
            </GradientAvatar>
            <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }} noWrap>
              {username}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<LogOut size={16} />}
              onClick={logout}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Collapsed Content (desktop only) */}
      {!isMobile && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 60,
            height: '100%',
            opacity: isCollapsed ? 1 : 0,
            pointerEvents: isCollapsed ? 'auto' : 'none',
            transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: '12px',
            backgroundColor: theme === 'dark' ? '#0d0d0d' : '#f5f5f5',
          }}
        >
          <IconButton onClick={onToggleCollapse} color="primary">
            <PanelLeft size={20} />
          </IconButton>
          <IconButton onClick={handleNewChat} color="primary">
            <Plus size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={toggleTheme} color="primary">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </IconButton>
          <GradientAvatar sx={{ width: 24, height: 24 }}>
            <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 600 }}>
              {username.charAt(0).toUpperCase()}
            </Typography>
          </GradientAvatar>
          <IconButton onClick={logout} color="primary">
            <LogOut size={20} />
          </IconButton>
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteDialogChatId}
        onClose={() => setDeleteDialogChatId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{chatToDelete?.title}" will be permanently deleted. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogChatId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => chatToDelete && confirmDelete(chatToDelete)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </SidebarContainer>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="left"
        open={isMobileOpen}
        onOpen={() => {/* controlled externally */}}
        onClose={() => onMobileClose?.()}
        // Allow swipe-to-open from the left edge (20px hit zone)
        swipeAreaWidth={20}
        disableSwipeToOpen={false}
        disableDiscovery={false}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '75vw', sm: 280 },
            maxWidth: 300,
            boxSizing: 'border-box',
            borderRight: 'none',
            // Safe-area padding so nothing hides behind notch
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          },
        }}
      >
        {sidebarContent}
      </SwipeableDrawer>
    );
  }

  return sidebarContent;
}
