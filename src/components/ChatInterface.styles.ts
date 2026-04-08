/**
 * ChatInterface Styled Components
 * ChatGPT-like responsive layout:
 *  - 100dvh for correct height on mobile browsers (accounts for address bar)
 *  - Zero outer padding on small screens (full-bleed, no rounded card)
 *  - Safe-area insets so nothing hides under notch / home indicator
 *  - User messages: right-aligned pill bubble (max ~80%)
 *  - Assistant messages: full width, minimal bg (matches ChatGPT)
 *  - Consistent md breakpoint (960px) as the mobile/desktop boundary
 */

import { Box, Paper, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';

// ─── Outer shell ─────────────────────────────────────────────────────────────

export const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  // No fixed height — parent (Dashboard.tsx) controls the full-height layout.
  // Using flex: 1 so it fills the remaining space below the shared header.
  flex: 1,
  backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#f5f5f5',
  overflow: 'hidden',
  padding: 0,
  gap: 0,
}));

export const ChatInnerBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  // No border/shadow/padding — keeps layout identical to DashboardPage
  // so toggling between views causes zero shift.
  backgroundColor: 'transparent',
}));

// ─── Messages area ────────────────────────────────────────────────────────────

export const MessagesWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#f5f5f5',
  [theme.breakpoints.down('md')]: {
    backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
  },
}));

export const VirtuosoContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  width: '100%',
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingTop: '20px',
  paddingBottom: '20px',
  boxSizing: 'border-box',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'thin',
  scrollbarColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.18) transparent'
      : 'rgba(0, 0, 0, 0.18) transparent',
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(0, 0, 0, 0.18)',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
    },
  },
  [theme.breakpoints.down('md')]: {
    paddingTop: '12px',
    paddingBottom: '12px',
  },
}));

export const VirtuosoInner = styled(Box)(({ theme }) => ({
  width: '90%',
  maxWidth: '780px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  transition: 'max-width 0.2s ease, padding 0.2s ease',
  [theme.breakpoints.down('lg')]: {
    width: '95%',
    maxWidth: '720px',
  },
  [theme.breakpoints.down('md')]: {
    width: '100%',
    maxWidth: '100%',
    paddingLeft: '16px',
    paddingRight: '16px',
    boxSizing: 'border-box',
  },
  [theme.breakpoints.down('sm')]: {
    paddingLeft: '10px',
    paddingRight: '10px',
  },
}));

// (unused but kept for compatibility)
export const VirtuosoListWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  maxWidth: '780px',
  margin: '0 auto',
  width: '100%',
  paddingTop: '32px',
  paddingBottom: '24px',
  paddingLeft: '20px',
  paddingRight: '20px',
  boxSizing: 'border-box',
  [theme.breakpoints.down('lg')]: {
    maxWidth: '720px',
  },
  [theme.breakpoints.down('md')]: {
    maxWidth: '100%',
    paddingTop: '20px',
    paddingBottom: '12px',
    paddingLeft: '12px',
    paddingRight: '12px',
    gap: '12px',
  },
  [theme.breakpoints.down('sm')]: {
    paddingLeft: '8px',
    paddingRight: '8px',
    gap: '10px',
  },
}));

// ─── Message row wrapper ──────────────────────────────────────────────────────

export const MessageRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginBottom: '8px',
  animation: 'fadeInUp 0.3s ease-out',
  width: '100%',
  boxSizing: 'border-box',
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  [theme.breakpoints.down('md')]: {
    marginBottom: '6px',
  },
}));

// ─── User message ─────────────────────────────────────────────────────────────

export const UserMessageGroup = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  width: '100%',
  gap: 8,
});

export const UserMessageBubble = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
  color: '#ffffff',
  borderRadius: '18px',
  padding: '10px 15px',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  width: 'fit-content',
  maxWidth: '100%',
  boxShadow: '0 2px 8px rgba(13, 71, 161, 0.3)',
  transition: 'box-shadow 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(13, 71, 161, 0.4)',
  },
  [theme.breakpoints.down('md')]: {
    padding: '10px 14px',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '15px',
  },
}));

// ─── Assistant message ────────────────────────────────────────────────────────

export const AssistantMessageGroup = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: '100%',
  gap: 8,
});

export const AssistantHeaderBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginLeft: 0,
  width: '100%',
  justifyContent: 'space-between',
});

export const AssistantMessageBubble = styled(Paper)(({ theme }) => ({
  // ChatGPT style: nearly full-width, very light bg, no heavy border
  backgroundColor:
    theme.palette.mode === 'dark' ? '#1a1a1a' : '#f7f7f7',
  borderRadius: '18px',
  padding: '12px 16px',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: 'none',
  // Full width — assistant messages span the content column
  maxWidth: '100%',
  width: '100%',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  transition: 'background-color 0.2s ease',
  [theme.breakpoints.down('md')]: {
    padding: '10px 14px',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '15px',
  },
}));

export const AssistantContentBubble = styled(Paper)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark' ? '#1a1a1a' : '#f7f7f7',
  borderRadius: '18px',
  padding: '16px 16px 8px 16px',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: 'none',
  width: '100%',
  maxWidth: '100%',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  transition: 'background-color 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  [theme.breakpoints.down('md')]: {
    padding: '14px',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '12px',
    fontSize: '15px',
  },
}));

// ─── Avatar ───────────────────────────────────────────────────────────────────

export const GradientAvatar = styled(Avatar)({
  background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
  width: 36,
  height: 36,
  boxShadow: '0 2px 8px rgba(13, 71, 161, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

// ─── Welcome card ─────────────────────────────────────────────────────────────

export const WelcomeCard = styled(Paper)(({ theme }) => ({
  padding: '20px',
  borderRadius: '12px',
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)'
  }`,
  backgroundColor:
    theme.palette.mode === 'dark' ? '#1a1a1a' : '#f8f9fa',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.1)'
        : 'rgba(59, 130, 246, 0.05)',
    transform: 'translateY(-2px)',
    border:
      theme.palette.mode === 'dark'
        ? '1px solid rgba(59, 130, 246, 0.3)'
        : '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 4px 16px rgba(0, 0, 0, 0.5)'
        : '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  // Touch devices: no hover lift (avoid sticky hover on tap)
  '@media (hover: none)': {
    '&:hover': {
      transform: 'none',
    },
    '&:active': {
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.1)'
          : 'rgba(59, 130, 246, 0.05)',
    },
  },
  [theme.breakpoints.down('md')]: {
    padding: '14px 16px',
  },
}));

// ─── Input area wrappers (kept for backward compat) ───────────────────────────

export const InputContainer = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)'
  }`,
  backgroundColor:
    theme.palette.mode === 'dark' ? '#0d0d0d' : '#ffffff',
  padding: '8px',
}));

export const InputBox = styled(Box)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark' ? '#1a1a1a' : '#f7f7f7',
  borderRadius: '12px',
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)'
  }`,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  '&:focus-within': {
    borderColor: '#3b82f6',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
        : '0 0 0 3px rgba(59, 130, 246, 0.08)',
    backgroundColor:
      theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
  },
}));

export const FileChipsContainer = styled(Box)(({ theme }) => ({
  padding: '12px 16px',
  borderBottom: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)'
  }`,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}));
