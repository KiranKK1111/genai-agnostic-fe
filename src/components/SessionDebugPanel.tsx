import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Drawer,
  Divider,
  Stack,
  Typography,
  Badge,
  useTheme,
} from '@mui/material';
import { ChevronDown, ChevronUp, Bug, X } from 'lucide-react';
import { SessionStateDebugger } from './SessionStateDebugger';
import { ToolExecutionHistory } from './ToolExecutionHistory';
import { AmbiguityIndicator } from './AmbiguityIndicator';
import type { SessionMetadata } from '../types/sessionState';

interface SessionDebugPanelProps {
  sessionMetadata: SessionMetadata | undefined;
  isOpen?: boolean;
  onClose?: () => void;
  onClarificationSubmit?: (eventIdx: number, clarification: string) => void;
}

export function SessionDebugPanel({
  sessionMetadata,
  isOpen = false,
  onClose,
  onClarificationSubmit,
}: SessionDebugPanelProps) {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    sessionState: true,
    toolHistory: true,
    ambiguity: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!sessionMetadata) {
    return null;
  }

  const unresolvedAmbiguities = sessionMetadata.ambiguity_events?.filter((e) => !e.resolved) || [];
  const totalToolCalls = sessionMetadata.tool_calls_log?.length || 0;

  const drawerContent = (
    <Box sx={{ width: 500, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bug size={24} />
          <Typography variant="h6">Debug Panel</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Stack spacing={2}>
        {/* Session State Section */}
        <Card
          sx={{
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(59, 130, 246, 0.05)'
                : 'rgba(59, 130, 246, 0.03)',
          }}
        >
          <CardHeader
            title="Session State"
            action={
              <IconButton
                onClick={() => toggleSection('sessionState')}
                size="small"
              >
                {expandedSections.sessionState ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </IconButton>
            }
            sx={{ pb: 0 }}
          />
          {expandedSections.sessionState && (
            <CardContent>
              <SessionStateDebugger
                queryState={sessionMetadata.session_state}
                isExpanded={true}
              />
            </CardContent>
          )}
        </Card>

        {/* Tool History Section */}
        {totalToolCalls > 0 && (
          <Card
            sx={{
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(34, 197, 94, 0.05)'
                  : 'rgba(34, 197, 94, 0.03)',
            }}
          >
            <CardHeader
              title={
                <Badge
                  badgeContent={totalToolCalls}
                  color="success"
                  sx={{ mr: 1 }}
                >
                  <Typography variant="subtitle1">Tool Calls</Typography>
                </Badge>
              }
              action={
                <IconButton
                  onClick={() => toggleSection('toolHistory')}
                  size="small"
                >
                  {expandedSections.toolHistory ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </IconButton>
              }
              sx={{ pb: 0 }}
            />
            {expandedSections.toolHistory && (
              <CardContent>
                <ToolExecutionHistory
                  toolCalls={sessionMetadata.tool_calls_log}
                  isExpanded={true}
                />
              </CardContent>
            )}
          </Card>
        )}

        {/* Ambiguity Detection Section */}
        {(sessionMetadata.ambiguity_events?.length ?? 0) > 0 && (
          <Card
            sx={{
              backgroundColor:
                unresolvedAmbiguities.length > 0
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(239, 68, 68, 0.05)'
                    : 'rgba(239, 68, 68, 0.03)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(34, 197, 94, 0.05)'
                    : 'rgba(34, 197, 94, 0.03)',
            }}
          >
            <CardHeader
              title={
                <Badge
                  badgeContent={unresolvedAmbiguities.length}
                  color={unresolvedAmbiguities.length > 0 ? 'error' : 'success'}
                  sx={{ mr: 1 }}
                >
                  <Typography variant="subtitle1">Ambiguity Detection</Typography>
                </Badge>
              }
              action={
                <IconButton
                  onClick={() => toggleSection('ambiguity')}
                  size="small"
                >
                  {expandedSections.ambiguity ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </IconButton>
              }
              sx={{ pb: 0 }}
            />
            {expandedSections.ambiguity && (
              <CardContent>
                <AmbiguityIndicator
                  ambiguityEvents={sessionMetadata.ambiguity_events}
                  confidenceThreshold={sessionMetadata.confidence_threshold}
                  isExpanded={true}
                  onClarificationSubmit={onClarificationSubmit}
                />
              </CardContent>
            )}
          </Card>
        )}
      </Stack>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor:
            theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
