import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
} from '@mui/material';
import { ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react';
import { QueryState, Entity } from '../types/sessionState';

interface SessionStateDebuggerProps {
  queryState: QueryState | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function SessionStateDebugger({
  queryState,
  isExpanded = true,
  onToggle,
}: SessionStateDebuggerProps) {
  const [expanded, setExpanded] = React.useState(isExpanded);
  const theme = useTheme();

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  if (!queryState) {
    return (
      <Card
        sx={{
          backgroundColor:
            theme.palette.mode === 'dark'
              ? 'rgba(59, 130, 246, 0.05)'
              : 'rgba(59, 130, 246, 0.03)',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardHeader
          title="Session State Debugger"
          avatar={<Brain size={20} />}
          action={
            <IconButton onClick={handleToggle} size="small">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </IconButton>
          }
          sx={{ pb: 1 }}
        />
        <Collapse in={expanded} timeout="auto">
          <CardContent>
            <Typography color="textSecondary" variant="body2">
              No session state available yet. Start a chat to populate.
            </Typography>
          </CardContent>
        </Collapse>
      </Card>
    );
  }

  const confidenceColor =
    (queryState.classification_confidence ?? 0) > 0.75
      ? 'success'
      : (queryState.classification_confidence ?? 0) > 0.6
        ? 'warning'
        : 'error';

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch {
      return isoString;
    }
  };

  return (
    <Card
      sx={{
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(59, 130, 246, 0.05)'
            : 'rgba(59, 130, 246, 0.03)',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardHeader
        title="Session State Debugger"
        avatar={<Brain size={20} />}
        action={
          <IconButton onClick={handleToggle} size="small">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
        }
        sx={{ pb: 1 }}
      />
      <Collapse in={expanded} timeout="auto">
        <CardContent>
          <Stack spacing={2}>
            {/* Intent & Confidence */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Intent Classification
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={queryState.last_classified_intent || 'Unclassified'}
                  size="small"
                  variant="outlined"
                  sx={{
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(139, 92, 246, 0.1)'
                        : 'rgba(139, 92, 246, 0.05)',
                  }}
                />
                <Chip
                  label={`Confidence: ${((queryState.classification_confidence ?? 0) * 100).toFixed(0)}%`}
                  size="small"
                  color={confidenceColor}
                  variant="outlined"
                />
              </Stack>
              <Typography variant="caption" color="textSecondary">
                Last updated: {formatDate(queryState.last_state_update)}
              </Typography>
            </Box>

            <Divider />

            {/* Entities */}
            {queryState.entities && queryState.entities.length > 0 && (
              <>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Extracted Entities ({queryState.entities.length})
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                          <TableCell>Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell align="right">Confidence</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queryState.entities.map((entity: Entity, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{entity.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={entity.type}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>
                              {entity.value || '—'}
                            </TableCell>
                            <TableCell align="right">
                              {entity.confidence
                                ? `${(entity.confidence * 100).toFixed(0)}%`
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                <Divider />
              </>
            )}

            {/* Ambiguity Score */}
            {queryState.ambiguity_score !== undefined && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Zap size={16} />
                  Ambiguity Score
                </Typography>
                <Box
                  sx={{
                    height: 8,
                    backgroundColor: theme.palette.divider,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${queryState.ambiguity_score * 100}%`,
                      backgroundColor:
                        queryState.ambiguity_score > 0.6 ? '#ef4444' : '#10b981',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                  {(queryState.ambiguity_score * 100).toFixed(0)}% ambiguous
                  {queryState.ambiguity_score > 0.6 && ' — would trigger clarification'}
                </Typography>
              </Box>
            )}

            {/* User Clarifications */}
            {queryState.user_clarifications && queryState.user_clarifications.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    User Clarifications
                  </Typography>
                  <Stack spacing={0.5}>
                    {queryState.user_clarifications.map((clarification, idx) => (
                      <Typography key={idx} variant="body2" sx={{ pl: 2, fontStyle: 'italic' }}>
                        • {clarification}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Collapse>
    </Card>
  );
}
