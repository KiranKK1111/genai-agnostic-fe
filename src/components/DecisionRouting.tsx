/**
 * Decision Routing Component
 * 
 * Displays what the backend DecisionEngine decided to do with the user's query.
 * Shows the decision type (SQL | FILES | CHAT) and confidence score.
 * 
 * NEW ARCHITECTURE FEATURE:
 * The backend's DecisionEngine intelligently routes queries to:
 * - RUN_SQL: Natural language SQL queries (database-agnostic)
 * - ANALYZE_FILES: File content analysis and extraction
 * - CHAT: Conversational responses and general knowledge
 */

import React from 'react';
import {
  Box,
  Tooltip,
  useTheme,
  alpha,
  styled as muiStyled,
} from '@mui/material';
import { useTheme as useThemeMUI } from '@mui/material/styles';
import {
  Database,
  FileText,
  MessageCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { DecisionRouting as DecisionRoutingType, DecisionType } from '../api';

interface DecisionRoutingProps {
  decision?: DecisionRoutingType | null;
  isLoading?: boolean;
  compact?: boolean;
  onError?: boolean;
}

const DecisionContainer = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '6px',
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
}));

const DecisionBadge = muiStyled(Box, {
  shouldForwardProp: (prop) => prop !== 'decision',
})<{ decision: DecisionType }>(({ theme, decision }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  backgroundColor:
    decision === 'RUN_SQL'
      ? alpha(theme.palette.info.main, 0.15)
      : decision === 'ANALYZE_FILES'
      ? alpha(theme.palette.warning.main, 0.15)
      : decision === 'CHAT'
      ? alpha(theme.palette.success.main, 0.15)
      : alpha(theme.palette.grey[500], 0.15),
  color:
    decision === 'RUN_SQL'
      ? theme.palette.info.main
      : decision === 'ANALYZE_FILES'
      ? theme.palette.warning.main
      : decision === 'CHAT'
      ? theme.palette.success.main
      : theme.palette.grey[700],
}));

const ConfidenceBar = muiStyled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  fontWeight: 500,
}));

const ConfidenceIndicator = muiStyled(Box, {
  shouldForwardProp: (prop) => prop !== 'confidence',
})<{ confidence: number }>(({ theme, confidence }) => ({
  width: '40px',
  height: '4px',
  backgroundColor:
    confidence >= 0.8
      ? theme.palette.success.main
      : confidence >= 0.6
      ? theme.palette.warning.main
      : theme.palette.error.main,
  borderRadius: '2px',
  boxShadow: `0 0 8px ${alpha(
    confidence >= 0.8
      ? theme.palette.success.main
      : confidence >= 0.6
      ? theme.palette.warning.main
      : theme.palette.error.main,
    0.3
  )}`,
}));

function getDecisionIcon(decision: DecisionType) {
  switch (decision) {
    case 'RUN_SQL':
      return <Database size={14} />;
    case 'ANALYZE_FILES':
      return <FileText size={14} />;
    case 'CHAT':
      return <MessageCircle size={14} />;
    default:
      return null;
  }
}

function getDecisionLabel(decision: DecisionType): string {
  switch (decision) {
    case 'RUN_SQL':
      return 'Database Query';
    case 'ANALYZE_FILES':
      return 'File Analysis';
    case 'CHAT':
      return 'Conversation';
    default:
      return 'Processing';
  }
}

function getDecisionDescription(decision: DecisionType): string {
  switch (decision) {
    case 'RUN_SQL':
      return 'Backend discovered this is a natural language database query. Schema was auto-discovered and tables matched semantically.';
    case 'ANALYZE_FILES':
      return 'Backend detected file content analysis. Files will be processed and analyzed for insights.';
    case 'CHAT':
      return 'Backend routed this to general conversation as it\'s a knowledge question not related to your database.';
    default:
      return 'Processing your query...';
  }
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'Very Confident';
  if (confidence >= 0.8) return 'Confident';
  if (confidence >= 0.6) return 'Moderate';
  if (confidence >= 0.4) return 'Lower';
  return 'Uncertain';
}

export const DecisionRouting: React.FC<DecisionRoutingProps> = ({
  decision,
  isLoading = false,
  compact = false,
  onError = false,
}) => {
  const theme = useTheme();

  if (onError) {
    return (
      <DecisionContainer sx={{ backgroundColor: alpha(theme.palette.error.main, 0.08) }}>
        <AlertCircle size={16} color={theme.palette.error.main} />
        <Box sx={{ fontSize: 12, color: theme.palette.error.main }}>
          Query Processing Error
        </Box>
      </DecisionContainer>
    );
  }

  if (isLoading) {
    return (
      <DecisionContainer>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${theme.palette.primary.main}`,
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
            '@keyframes spin': {
              to: { transform: 'rotate(360deg)' },
            },
          }}
        />
        <Box sx={{ fontSize: 12 }}>Analyzing query...</Box>
      </DecisionContainer>
    );
  }

  if (!decision) {
    return null;
  }

  if (compact) {
    return (
      <Tooltip
        title={`${getDecisionLabel(decision.decision)}\nConfidence: ${(decision.confidence * 100).toFixed(0)}%\n\n${getDecisionDescription(decision.decision)}`}
        arrow
      >
        <DecisionBadge decision={decision.decision}>
          {getDecisionIcon(decision.decision)}
          <span>{getDecisionLabel(decision.decision)}</span>
          <Box component="span" sx={{ opacity: 0.7 }}>
            {(decision.confidence * 100).toFixed(0)}%
          </Box>
        </DecisionBadge>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <DecisionContainer>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircle
              size={16}
              color={
                decision.confidence >= 0.8
                  ? theme.palette.success.main
                  : theme.palette.warning.main
              }
            />
            <Box sx={{ fontSize: 13, fontWeight: 600 }}>
              {getDecisionLabel(decision.decision)}
            </Box>
          </Box>

          <Box sx={{ ml: 6, fontSize: 12, color: theme.palette.text.secondary }}>
            {getDecisionDescription(decision.decision)}
          </Box>

          {decision.reasoning && (
            <Box sx={{ ml: 6, fontSize: 11, color: theme.palette.text.secondary, mt: 1, fontStyle: 'italic' }}>
              Reason: {decision.reasoning}
            </Box>
          )}

          <ConfidenceBar sx={{ ml: 6, mt: 1.5 }}>
            <span>Confidence:</span>
            <ConfidenceIndicator confidence={decision.confidence} />
            <span>
              {(decision.confidence * 100).toFixed(0)}% ({getConfidenceLabel(decision.confidence)})
            </span>
          </ConfidenceBar>
        </Box>
      </DecisionContainer>
    </Box>
  );
};

export default DecisionRouting;
