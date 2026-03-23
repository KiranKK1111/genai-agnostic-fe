import React from 'react';
import { Box, keyframes } from '@mui/system';
import { useTheme } from '@mui/material';
import { LoadingDots } from './LoadingDots';

// --- Animations ---

const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// --- Component ---

interface QueryProgressStepsProps {
  resetKey?: string | number;
  currentStep?: string;
}

/**
 * QueryProgressSteps
 * * Shows animated step-by-step status while the backend processes
 * Steps appear sequentially; completed steps show a checkmark.
 * The active step pulses to signal work in progress.
 */
export function QueryProgressSteps({ resetKey, currentStep }: QueryProgressStepsProps) {
  const theme = useTheme();

  const activeColor = '#3b82f6';

  // Show a default label immediately while waiting for backend SSE events
  const label = currentStep || 'Processing your query';

  return (
    <Box
      key={`${resetKey}-${label}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: `${fadeSlideIn} 0.3s ease both`,
      }}
    >
      {/* Spinning ring */}
      <Box
        sx={{
          width: 13,
          height: 13,
          borderRadius: '50%',
          border: `2px solid ${activeColor}33`,
          borderTopColor: activeColor,
          animation: `${spin} 0.8s linear infinite`,
          flexShrink: 0,
        }}
      />

      {/* Label */}
      <Box
        component="span"
        sx={{
          fontSize: '15px',
          fontWeight: 500,
          color: activeColor,
          animation: `${pulse} 2s ease-in-out infinite`,
          letterSpacing: '0.01em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {label}
        <LoadingDots size={5} color="#3b82f6" />
      </Box>
    </Box>
  );
}