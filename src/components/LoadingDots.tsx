/**
 * Loading Dots Component
 * Beautiful animated dots loader
 */

import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

const bounce = keyframes`
  0%, 80%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-8px);
  }
`;

interface LoadingDotsProps {
  size?: number;
  gap?: number;
  color?: string;
}

export function LoadingDots({ 
  size = 8, 
  gap = 4,
  color = '#3b82f6' 
}: LoadingDotsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: `${gap}px`,
      }}
    >
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            backgroundColor: color,
            animation: `${bounce} 1.4s infinite ease-in-out`,
            animationDelay: `${index * 0.16}s`,
          }}
        />
      ))}
    </Box>
  );
}
