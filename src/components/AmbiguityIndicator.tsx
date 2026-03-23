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
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import { ChevronDown, ChevronUp, AlertTriangle, HelpCircle } from 'lucide-react';
import { AmbiguityEvent } from '../types/sessionState';

interface AmbiguityIndicatorProps {
  ambiguityEvents: AmbiguityEvent[];
  confidenceThreshold?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClarificationSubmit?: (eventIdx: number, clarification: string) => void;
}

export function AmbiguityIndicator({
  ambiguityEvents,
  confidenceThreshold = 0.6,
  isExpanded = true,
  onToggle,
  onClarificationSubmit,
}: AmbiguityIndicatorProps) {
  const [expanded, setExpanded] = React.useState(isExpanded);
  const [selectedEvent, setSelectedEvent] = React.useState<number | null>(null);
  const [clarificationText, setClarificationText] = React.useState('');
  const theme = useTheme();

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  const unresolved = ambiguityEvents.filter((e) => !e.resolved);
  const resolved = ambiguityEvents.filter((e) => e.resolved);

  const handleClarificationSubmit = () => {
    if (selectedEvent !== null && clarificationText.trim()) {
      onClarificationSubmit?.(selectedEvent, clarificationText);
      setClarificationText('');
      setSelectedEvent(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch {
      return isoString;
    }
  };

  if (!ambiguityEvents || ambiguityEvents.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor:
            theme.palette.mode === 'dark'
              ? 'rgba(96, 165, 250, 0.05)'
              : 'rgba(96, 165, 250, 0.03)',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardHeader
          title="Ambiguity Detection"
          avatar={<HelpCircle size={20} />}
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
              No ambiguity detected. Query is clear! ✓
            </Typography>
          </CardContent>
        </Collapse>
      </Card>
    );
  }

  return (
    <>
      <Card
        sx={{
          backgroundColor:
            unresolved.length > 0
              ? theme.palette.mode === 'dark'
                ? 'rgba(239, 68, 68, 0.05)'
                : 'rgba(239, 68, 68, 0.03)'
              : theme.palette.mode === 'dark'
                ? 'rgba(34, 197, 94, 0.05)'
                : 'rgba(34, 197, 94, 0.03)',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardHeader
          title="Ambiguity Detection"
          avatar={<HelpCircle size={20} />}
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
              {/* Summary */}
              <Box>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`${unresolved.length} Unresolved`}
                    size="small"
                    color={unresolved.length > 0 ? 'error' : 'success'}
                    variant="outlined"
                  />
                  <Chip
                    label={`${resolved.length} Resolved`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`Threshold: ${(confidenceThreshold * 100).toFixed(0)}%`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Box>

              {/* Unresolved Events */}
              {unresolved.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AlertTriangle size={16} />
                    Unresolved Ambiguities
                  </Typography>
                  <Stack spacing={1}>
                    {unresolved.map((event: AmbiguityEvent, idx: number) => (
                      <Alert
                        key={idx}
                        severity="warning"
                        action={
                          <Button
                            color="inherit"
                            size="small"
                            onClick={() => setSelectedEvent(idx)}
                          >
                            Clarify
                          </Button>
                        }
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                            Confidence: {(event.confidence_score * 100).toFixed(0)}%
                          </Typography>
                          <Typography variant="body2">{event.reason}</Typography>
                          {event.suggested_clarifications &&
                            event.suggested_clarifications.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                  Suggested clarifications:
                                </Typography>
                                <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                                  {event.suggested_clarifications.map((sugg, sidx) => (
                                    <li key={sidx}>
                                      <Typography variant="caption">{sugg}</Typography>
                                    </li>
                                  ))}
                                </ul>
                              </Box>
                            )}
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(event.triggered_at)}
                          </Typography>
                        </Stack>
                      </Alert>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Resolved Events */}
              {resolved.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Resolved ({resolved.length})
                  </Typography>
                  <Stack spacing={0.5}>
                    {resolved.map((event: AmbiguityEvent, idx: number) => (
                      <Alert key={idx} severity="success" sx={{ py: 0.5 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">{event.reason}</Typography>
                          {event.user_response && (
                            <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                              User clarified: "{event.user_response}"
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(event.triggered_at)}
                          </Typography>
                        </Stack>
                      </Alert>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Collapse>
      </Card>

      {/* Clarification Dialog */}
      <Dialog open={selectedEvent !== null} onClose={() => setSelectedEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Provide Clarification</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedEvent !== null && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                  Issue:
                </Typography>
                <Alert severity="warning">
                  {unresolved[selectedEvent]?.reason}
                </Alert>
              </Box>

              {unresolved[selectedEvent]?.suggested_clarifications &&
                unresolved[selectedEvent].suggested_clarifications!.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                      Suggested responses:
                    </Typography>
                    <Stack spacing={0.5}>
                      {unresolved[selectedEvent].suggested_clarifications!.map((sugg, idx) => (
                        <Button
                          key={idx}
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setClarificationText(sugg);
                          }}
                        >
                          {sugg}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                )}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                  Your clarification:
                </Typography>
                <textarea
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  placeholder="Please provide clarification..."
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 4,
                    border: `1px solid ${theme.palette.divider}`,
                    fontFamily: 'inherit',
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    minHeight: 80,
                    resize: 'vertical',
                  }}
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Cancel</Button>
          <Button
            onClick={handleClarificationSubmit}
            variant="contained"
            disabled={!clarificationText.trim()}
          >
            Submit Clarification
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
