/**
 * Welcome Screen Component
 * Displays welcome message and suggested prompts when no messages exist
 */

import React from 'react';
import { Box, Avatar, Typography } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { WelcomeCard } from './ChatInterface.styles';
import type { WelcomeCardItem } from './ChatInterface.types';

interface WelcomeScreenProps {
  onSendMessage: (prompt: string) => void;
}

const welcomeCards: WelcomeCardItem[] = [
  {
    title: 'Annual Maintenance Report',
    description: 'View pie charts and bar graphs',
    prompt: 'Give SDM PIE chart and bar graph for last annual maintenance',
  },
  {
    title: 'Incident Trends',
    description: 'Analyze incident patterns',
    prompt: 'Show me incident trends',
  },
  {
    title: 'Top Issues',
    description: 'Identify common problems',
    prompt: 'What are the top issues?',
  },
  {
    title: 'Resolution Report',
    description: 'Review performance metrics',
    prompt: 'Generate resolution report',
  },
];

export function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        // Tighter on mobile to leave more space for cards
        padding: { xs: '24px 16px', sm: '32px 20px', md: '40px 20px' },
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      <Avatar
        sx={{
          width: { xs: 60, sm: 72, md: 80 },
          height: { xs: 60, sm: 72, md: 80 },
          marginBottom: { xs: 2, sm: 2.5, md: 3 },
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
        }}
      >
        <Sparkles size={32} />
      </Avatar>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          marginBottom: 1.5,
          fontSize: { xs: '1.4rem', sm: '1.7rem', md: '2rem' },
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Welcome to SDM GEN-AI
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          maxWidth: 500,
          marginBottom: { xs: 2.5, sm: 3, md: 4 },
          fontSize: { xs: '14px', sm: '15px', md: '16px' },
        }}
      >
        Your intelligent assistant for Service Desk Management analytics and insights.
      </Typography>

    </Box>
  );
}
