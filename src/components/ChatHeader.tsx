import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { Sparkles } from 'lucide-react';
import { MoreMenu } from './MoreMenu';

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.3), 0 0 0 rgba(99, 102, 241, 0); }
  50% { box-shadow: 0 0 12px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.15); }
`;

const IconContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
  animation: `${pulseGlow} 3s ease-in-out infinite`,
  flexShrink: 0,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: -1,
    borderRadius: '11px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #3b82f6)',
    zIndex: -1,
    opacity: 0.4,
    filter: 'blur(4px)',
  },
});

const GradientTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1rem',
  letterSpacing: '-0.01em',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 30%, #a5b4fc 60%, #818cf8 100%)'
      : 'linear-gradient(135deg, #312e81 0%, #4338ca 30%, #6366f1 60%, #818cf8 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  animation: `${shimmer} 6s linear infinite`,
  userSelect: 'none',
}));

interface ChatHeaderProps {
  title?: string;
  showIcon?: boolean;
  onCopy?: () => void;
  onRefresh?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
}

export function ChatHeader({
  title = 'SDM AI Assistant',
  showIcon = true,
  onCopy,
  onRefresh,
  onShare,
  isLoading = false,
}: ChatHeaderProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const customItems = [];
  if (onRefresh) {
    customItems.push({
      label: 'Refresh',
      onClick: onRefresh,
    });
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 2 },
        py: { xs: 0.75, sm: 1 },
        minHeight: { xs: 48, sm: 52 },
        borderBottom: `1px solid ${
          theme.palette.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.15)'
            : 'rgba(99, 102, 241, 0.1)'
        }`,
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.6)'
            : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left side: Icon and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
        {showIcon && (
          <IconContainer>
            <Sparkles size={isSmall ? 16 : 18} color="white" />
          </IconContainer>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <GradientTitle noWrap>
            {title}
          </GradientTitle>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.4)'
                : 'rgba(0, 0, 0, 0.4)',
              fontSize: '0.65rem',
              lineHeight: 1.2,
              letterSpacing: '0.04em',
              mt: -0.25,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            AI-powered insights for Service Desk
          </Typography>
        </Box>
      </Box>

      {/* Right side: 3-dot menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MoreMenu
          onCopy={onCopy}
          onShare={onShare}
          customItems={customItems}
        />
      </Box>
    </Box>
  );
}
